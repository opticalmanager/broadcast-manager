#!/usr/bin/env node
/**
 * scripts/tag-precision-optics-stores.mjs
 *
 * Scans 4 store CSV files from D:\Downloads:
 *  1. amarpali sector 76 - CUSTOMER_INFO (9).csv -> Store: Amarpali 76
 *  2. CUSTOMER_INFO (7) - CUSTOMER_INFO (7).csv  -> Store: Gaur City
 *  3. 104 - 104.csv                              -> Store: Store 104
 *  4. CUSTOMER_INFO (8) - CUSTOMER_INFO (8).csv  -> Store: Spectrum Mall
 *
 * Matches strictly against existing Precision Optics contacts by normalized
 * 10-digit phone number. Does NOT add any new contacts.
 *
 * Supports multi-store tagging (if a contact appears in multiple store CSVs,
 * they receive all matching store tags).
 */

import fs from 'fs';
import readline from 'readline';
import { createClient } from '@supabase/supabase-js';

const ACCOUNT_ID = 'a79a3d48-a0a4-4b33-9a57-a105a8feb326';
const OWNER_USER_ID = '3074a2d5-cffc-48af-86ec-0d12567aa8b1';

const STORES = [
  {
    name: 'Store: Amarpali 76',
    color: '#10b981', // Emerald
    filePath: 'D:\\Downloads\\amarpali sector 76 - CUSTOMER_INFO (9).csv',
  },
  {
    name: 'Store: Gaur City',
    color: '#3b82f6', // Blue
    filePath: 'D:\\Downloads\\CUSTOMER_INFO (7) - CUSTOMER_INFO (7).csv',
  },
  {
    name: 'Store: Store 104',
    color: '#8b5cf6', // Violet
    filePath: 'D:\\Downloads\\104new info.csv',
  },
  {
    name: 'Store: Spectrum Mall',
    color: '#f59e0b', // Amber
    filePath: 'D:\\Downloads\\CUSTOMER_INFO (8) - CUSTOMER_INFO (8).csv',
  },
];

function normalize10DigitPhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return null;
}

async function run() {
  console.log('====================================================');
  console.log('🚀 Precision Optics Multi-Store Tagging Script');
  console.log('====================================================');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
    process.exit(1);
  }

  const sb = createClient(supabaseUrl, serviceKey);

  // 1. Verify account
  const { data: account, error: accErr } = await sb
    .from('accounts')
    .select('id, name')
    .eq('id', ACCOUNT_ID)
    .single();

  if (accErr || !account) {
    console.error('❌ Could not find Precision Optics account:', accErr);
    process.exit(1);
  }
  console.log(`✅ Target Account: ${account.name} (${account.id})`);

  // 2. Ensure store tags exist
  console.log('\n🏷️  Verifying Store Tags...');
  const { data: existingTags, error: tagErr } = await sb
    .from('tags')
    .select('id, name, color')
    .eq('account_id', ACCOUNT_ID);

  if (tagErr) {
    console.error('❌ Error fetching tags:', tagErr);
    process.exit(1);
  }

  const tagIdMap = new Map(); // storeName -> tagId

  for (const store of STORES) {
    let match = (existingTags ?? []).find(
      (t) => t.name.trim().toLowerCase() === store.name.trim().toLowerCase()
    );

    if (!match) {
      console.log(`   ➕ Creating Tag: "${store.name}" with color ${store.color}`);
      const { data: newTag, error: createTagErr } = await sb
        .from('tags')
        .insert({
          user_id: OWNER_USER_ID,
          account_id: ACCOUNT_ID,
          name: store.name,
          color: store.color,
        })
        .select('id, name, color')
        .single();

      if (createTagErr || !newTag) {
        console.error(`❌ Failed to create tag "${store.name}":`, createTagErr);
        process.exit(1);
      }
      match = newTag;
    } else {
      console.log(`   ✓ Found existing Tag: "${match.name}" (${match.id})`);
    }

    tagIdMap.set(store.name, match.id);
  }

  // 3. Load all existing contacts for Precision Optics
  console.log('\n📥 Loading Precision Optics contacts from Supabase...');
  const phoneToContactIdMap = new Map(); // 10-digit phone -> contact_id
  let loadedCount = 0;
  let from = 0;
  const CHUNK = 1000;

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
      loadedCount++;
      const norm = normalize10DigitPhone(r.phone);
      if (norm) {
        phoneToContactIdMap.set(norm, r.id);
      }
    }

    if (rows.length < CHUNK) break;
    from += CHUNK;
  }

  console.log(`✅ Loaded ${loadedCount.toLocaleString()} contacts into memory (${phoneToContactIdMap.size.toLocaleString()} unique 10-digit phones).`);

  // 4. Scan each CSV file
  console.log('\n📂 Scanning 4 Store CSV files in D:\\Downloads...');
  const contactToStoresMap = new Map(); // contact_id -> Set of tag_ids
  const storeMatchStats = new Map(); // storeName -> count

  for (const store of STORES) {
    storeMatchStats.set(store.name, 0);

    if (!fs.existsSync(store.filePath)) {
      console.error(`❌ CSV File not found: ${store.filePath}`);
      process.exit(1);
    }

    const tagId = tagIdMap.get(store.name);
    const fileStream = fs.createReadStream(store.filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineNum = 0;
    let matchedInStore = 0;

    for await (const line of rl) {
      lineNum++;
      if (lineNum === 1) continue; // Skip header

      const cols = line.split(',');
      // Look for phone candidates in all columns
      const phonesInLine = new Set();
      for (const col of cols) {
        const norm = normalize10DigitPhone(col);
        if (norm) phonesInLine.add(norm);
      }

      for (const phone of phonesInLine) {
        const contactId = phoneToContactIdMap.get(phone);
        if (contactId) {
          matchedInStore++;
          const tagsSet = contactToStoresMap.get(contactId) ?? new Set();
          tagsSet.add(tagId);
          contactToStoresMap.set(contactId, tagsSet);
        }
      }
    }

    storeMatchStats.set(store.name, matchedInStore);
    console.log(`   ✓ ${store.name}: ${lineNum.toLocaleString()} rows scanned → ${matchedInStore.toLocaleString()} matches to Precision Optics contacts.`);
  }

  // 5. Calculate multi-store distribution
  console.log('\n📊 Matching & Distribution Analysis:');
  let singleStoreCount = 0;
  let twoStoreCount = 0;
  let threeStoreCount = 0;
  let fourStoreCount = 0;

  for (const tagsSet of contactToStoresMap.values()) {
    if (tagsSet.size === 1) singleStoreCount++;
    else if (tagsSet.size === 2) twoStoreCount++;
    else if (tagsSet.size === 3) threeStoreCount++;
    else if (tagsSet.size >= 4) fourStoreCount++;
  }

  const totalContactsTagged = contactToStoresMap.size;
  const multiStoreTotal = twoStoreCount + threeStoreCount + fourStoreCount;

  console.log(`   • Total Unique Contacts Matched & Tagged: ${totalContactsTagged.toLocaleString()} / ${loadedCount.toLocaleString()}`);
  console.log(`   • Contacts in exactly 1 store: ${singleStoreCount.toLocaleString()}`);
  console.log(`   • Contacts in 2 stores: ${twoStoreCount.toLocaleString()}`);
  console.log(`   • Contacts in 3 stores: ${threeStoreCount.toLocaleString()}`);
  console.log(`   • Contacts in all 4 stores: ${fourStoreCount.toLocaleString()}`);
  console.log(`   • Multi-Store Customers Total: ${multiStoreTotal.toLocaleString()}`);
  console.log(`   • Contacts with no store data: ${(loadedCount - totalContactsTagged).toLocaleString()}`);

  // 6. Batch Insert into contact_tags
  console.log('\n💾 Writing mappings to Supabase contact_tags...');
  const pairsToInsert = [];
  for (const [contactId, tagsSet] of contactToStoresMap.entries()) {
    for (const tagId of tagsSet) {
      pairsToInsert.push({
        contact_id: contactId,
        tag_id: tagId,
      });
    }
  }

  console.log(`   Total (contact_id, tag_id) pairs to persist: ${pairsToInsert.length.toLocaleString()}`);

  const INSERT_CHUNK = 1000;
  let insertedCount = 0;

  for (let i = 0; i < pairsToInsert.length; i += INSERT_CHUNK) {
    const chunk = pairsToInsert.slice(i, i + INSERT_CHUNK);
    const { error: insertErr } = await sb
      .from('contact_tags')
      .upsert(chunk, { onConflict: 'contact_id,tag_id', ignoreDuplicates: true });

    if (insertErr) {
      console.error(`❌ Error inserting contact_tags chunk ${i}:`, insertErr);
      process.exit(1);
    }

    insertedCount += chunk.length;
    process.stdout.write(`   Progress: ${insertedCount.toLocaleString()} / ${pairsToInsert.length.toLocaleString()} pairs...\r`);
  }

  console.log(`\n\n🎉 Successfully completed! All ${totalContactsTagged.toLocaleString()} contacts have been tagged across the 4 stores.`);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
