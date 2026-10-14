import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import readline from 'readline';
import { createClient } from '@supabase/supabase-js';

const ACCOUNT_ID = 'a79a3d48-a0a4-4b33-9a57-a105a8feb326';
const NEW_STORE_104_FILE = 'D:\\Downloads\\104new info.csv';

function normalize10DigitPhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return null;
}

async function main() {
  console.log('====================================================');
  console.log('🔄 Re-tagging Store 104 with 104new info.csv');
  console.log('====================================================');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const sb = createClient(supabaseUrl, serviceKey);

  // 1. Get tag for Store: Store 104
  const { data: tag, error: tagErr } = await sb
    .from('tags')
    .select('id, name, color')
    .eq('account_id', ACCOUNT_ID)
    .ilike('name', '%Store 104%')
    .single();

  if (tagErr || !tag) {
    console.error('❌ Could not find tag for Store 104:', tagErr);
    process.exit(1);
  }
  console.log(`✅ Found tag: "${tag.name}" (${tag.id})`);

  // 2. Count existing contact_tags for Store 104
  const { count: oldCount, error: countErr } = await sb
    .from('contact_tags')
    .select('contact_id', { count: 'exact', head: true })
    .eq('tag_id', tag.id);

  console.log(`Current tagged contacts for Store 104: ${oldCount ?? 0}`);

  // 3. Remove existing contact_tags for Store 104
  console.log(`🗑️ Removing previous incorrect Store 104 tags from contact_tags...`);
  const { error: delErr } = await sb
    .from('contact_tags')
    .delete()
    .eq('tag_id', tag.id);

  if (delErr) {
    console.error('❌ Error deleting old Store 104 contact_tags:', delErr);
    process.exit(1);
  }
  console.log(`✅ Successfully cleared old Store 104 contact_tags.`);

  // 4. Load Precision Optics contacts
  console.log('\n📥 Loading Precision Optics contacts from Supabase...');
  const phoneToContactIdMap = new Map();
  let from = 0;
  const CHUNK = 1000;
  let totalContacts = 0;

  while (true) {
    const { data: rows, error: recErr } = await sb
      .from('contacts')
      .select('id, phone')
      .eq('account_id', ACCOUNT_ID)
      .range(from, from + CHUNK - 1);

    if (recErr) {
      console.error('❌ Error loading contacts:', recErr);
      process.exit(1);
    }
    if (!rows || rows.length === 0) break;

    for (const r of rows) {
      totalContacts++;
      const norm = normalize10DigitPhone(r.phone);
      if (norm) {
        phoneToContactIdMap.set(norm, r.id);
      }
    }

    if (rows.length < CHUNK) break;
    from += CHUNK;
  }
  console.log(`✅ Loaded ${totalContacts} contacts (${phoneToContactIdMap.size} unique 10-digit phones).`);

  // 5. Read new CSV file: 104new info.csv
  if (!fs.existsSync(NEW_STORE_104_FILE)) {
    console.error(`❌ File not found: ${NEW_STORE_104_FILE}`);
    process.exit(1);
  }

  console.log(`\n📂 Scanning ${NEW_STORE_104_FILE}...`);
  const fileStream = fs.createReadStream(NEW_STORE_104_FILE);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  const matchedContactIds = new Set();
  const filePhones = new Set();

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue; // Skip header

    const cols = line.split(',');
    for (const col of cols) {
      const norm = normalize10DigitPhone(col);
      if (norm) {
        filePhones.add(norm);
        const contactId = phoneToContactIdMap.get(norm);
        if (contactId) {
          matchedContactIds.add(contactId);
        }
      }
    }
  }

  console.log(`   Lines scanned: ${lineNum}`);
  console.log(`   Unique 10-digit phones in file: ${filePhones.size}`);
  console.log(`   Matched contacts in Precision Optics: ${matchedContactIds.size}`);

  // 6. Batch insert into contact_tags
  console.log(`\n💾 Inserting ${matchedContactIds.size} new contact_tags for "${tag.name}"...`);
  const pairsToInsert = Array.from(matchedContactIds).map((cid) => ({
    contact_id: cid,
    tag_id: tag.id,
  }));

  const INSERT_CHUNK = 1000;
  let inserted = 0;

  for (let i = 0; i < pairsToInsert.length; i += INSERT_CHUNK) {
    const chunk = pairsToInsert.slice(i, i + INSERT_CHUNK);
    const { error: insertErr } = await sb
      .from('contact_tags')
      .upsert(chunk, { onConflict: 'contact_id,tag_id', ignoreDuplicates: true });

    if (insertErr) {
      console.error(`❌ Error inserting chunk ${i}:`, insertErr);
      process.exit(1);
    }
    inserted += chunk.length;
    process.stdout.write(`   Progress: ${inserted} / ${pairsToInsert.length}...\r`);
  }

  console.log(`\n\n🎉 Done! Successfully re-tagged ${matchedContactIds.size} contacts with "${tag.name}".`);
}

main().catch(console.error);
