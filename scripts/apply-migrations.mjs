#!/usr/bin/env node
/**
 * WACRM Supabase Migration Runner
 *
 * Usage:
 *   1. Direct Postgres Connection String:
 *      node scripts/apply-migrations.mjs "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
 *      OR set DATABASE_URL in .env.local / environment
 *
 *   2. Supabase DB Password (auto-constructs connection for project in .env.local):
 *      node scripts/apply-migrations.mjs --password "YOUR_DB_PASSWORD"
 *
 *   3. Supabase Management API Personal Access Token:
 *      node scripts/apply-migrations.mjs --token "sbp_xxxxxxxxxxxx"
 *      OR set SUPABASE_ACCESS_TOKEN in environment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env.local if exists
const envLocalPath = path.join(rootDir, '.env.local');
const envVars = {};
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        envVars[key] = value;
      }
    }
  });
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

// Parse CLI args
const args = process.argv.slice(2);
let connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || envVars.DATABASE_URL || envVars.SUPABASE_DB_URL;
let dbPassword = process.env.SUPABASE_DB_PASSWORD || envVars.SUPABASE_DB_PASSWORD;
let accessToken = process.env.SUPABASE_ACCESS_TOKEN || envVars.SUPABASE_ACCESS_TOKEN;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--password' || arg === '-p') {
    dbPassword = args[++i];
  } else if (arg === '--token' || arg === '-t') {
    accessToken = args[++i];
  } else if (arg === '--url' || arg === '-u') {
    connectionString = args[++i];
  } else if (!arg.startsWith('-') && !connectionString) {
    if (arg.startsWith('postgres://') || arg.startsWith('postgresql://')) {
      connectionString = arg;
    } else if (arg.startsWith('sbp_')) {
      accessToken = arg;
    }
  }
}

// Get all migrations in order
const migrationsDir = path.join(rootDir, 'supabase', 'migrations');
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort((a, b) => parseInt(a.split('_')[0], 10) - parseInt(b.split('_')[0], 10));

console.log('='.repeat(65));
console.log('  WACRM SUPABASE MIGRATION RUNNER');
console.log('='.repeat(65));
console.log(`Detected Supabase Project Ref: ${projectRef || 'Not configured in .env.local'}`);
console.log(`Found ${migrationFiles.length} migration files in supabase/migrations/\n`);

async function runViaManagementApi(token, ref) {
  console.log(`[Method: Supabase Management API] Executing against project: ${ref}...`);
  for (let i = 0; i < migrationFiles.length; i++) {
    const file = migrationFiles[i];
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    process.stdout.write(`[${i + 1}/${migrationFiles.length}] Applying ${file}... `);
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.log(`FAILED!\nError: HTTP ${res.status}: ${errText}`);
      process.exit(1);
    }
    console.log('SUCCESS');
  }

  // Run verification query
  const verifyPath = path.join(rootDir, 'supabase', 'ci', 'verify-schema.sql');
  if (fs.existsSync(verifyPath)) {
    process.stdout.write('Running schema verification smoke test... ');
    const verifySql = fs.readFileSync(verifyPath, 'utf8');
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: verifySql }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.log(`FAILED!\n${errText}`);
      process.exit(1);
    }
    console.log('PASSED');
  }
  console.log('\nAll migrations applied and verified successfully!');
}

async function runViaPostgres(connStr) {
  console.log(`[Method: Direct Postgres] Connecting to database...`);
  const client = new pg.Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database successfully.\n');

    for (let i = 0; i < migrationFiles.length; i++) {
      const file = migrationFiles[i];
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      process.stdout.write(`[${i + 1}/${migrationFiles.length}] Applying ${file}... `);
      await client.query(sql);
      console.log('SUCCESS');
    }

    // Run verification query
    const verifyPath = path.join(rootDir, 'supabase', 'ci', 'verify-schema.sql');
    if (fs.existsSync(verifyPath)) {
      process.stdout.write('Running schema verification smoke test... ');
      const verifySql = fs.readFileSync(verifyPath, 'utf8');
      await client.query(verifySql);
      console.log('PASSED');
    }

    console.log('\nAll migrations applied and verified successfully!');
  } catch (err) {
    console.error('\nDatabase Migration Error:', err.message);
    if (err.position) {
      console.error(`Position: ${err.position}`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function main() {
  if (accessToken && projectRef) {
    await runViaManagementApi(accessToken, projectRef);
    return;
  }

  if (dbPassword && projectRef) {
    // Try standard Supabase direct pooler URL formats
    const poolerUrl = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
    // Also try direct db url
    const directUrl = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
    
    // Default to direct connection string
    connectionString = directUrl;
  }

  if (connectionString) {
    await runViaPostgres(connectionString);
    return;
  }

  console.log(`
No database credentials provided.

You have multiple easy options to apply all migrations to your Supabase project '${projectRef}':

================================================================================
OPTION 1: ONE-CLICK IN SUPABASE SQL EDITOR (RECOMMENDED & INSTANT)
================================================================================
1. Open your Supabase Dashboard:
   https://supabase.com/dashboard/project/${projectRef}/sql/new

2. Copy the entire contents of the combined migration file we generated:
   supabase/combined_migrations.sql

3. Paste it into the SQL Editor and click "Run" (or Ctrl+Enter).

All 42 migrations and schema verifications will execute in exact order!

================================================================================
OPTION 2: RUN VIA NODE WITH YOUR DATABASE CONNECTION STRING
================================================================================
Run in your terminal:
   node scripts/apply-migrations.mjs "postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres"

(You can find your database connection string in Supabase Dashboard -> Project Settings -> Database)

================================================================================
OPTION 3: RUN VIA SUPABASE PERSONAL ACCESS TOKEN
================================================================================
Generate a token at: https://supabase.com/dashboard/account/tokens
Then run:
   node scripts/apply-migrations.mjs --token "sbp_xxxxxxxxxxxx"
================================================================================
`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
