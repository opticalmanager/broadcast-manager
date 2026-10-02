import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns a set of contact IDs that have the 'blacklisted' tag in the given account.
 * Paginates in chunks of 1000 to safely bypass PostgREST's default row ceiling.
 */
export async function getBlacklistedContactIds(
  db: SupabaseClient,
  accountId: string
): Promise<Set<string>> {
  const { data: tags } = await db
    .from('tags')
    .select('id, name')
    .eq('account_id', accountId);

  const tag = (tags ?? []).find(
    (t: { name?: string | null }) => t.name?.trim().toLowerCase() === 'blacklisted'
  );

  if (!tag) return new Set();

  const blacklisted = new Set<string>();
  let from = 0;
  const CHUNK = 1000;
  while (true) {
    const { data: rows, error } = await db
      .from('contact_tags')
      .select('contact_id')
      .eq('tag_id', tag.id)
      .range(from, from + CHUNK - 1);

    if (error || !rows || rows.length === 0) break;
    for (const r of rows) {
      if (r.contact_id) blacklisted.add(r.contact_id);
    }
    if (rows.length < CHUNK) break;
    from += CHUNK;
  }

  return blacklisted;
}

/**
 * Returns normalized phone numbers for all blacklisted contacts in an account.
 */
export async function getBlacklistedPhones(
  db: SupabaseClient,
  accountId: string
): Promise<Set<string>> {
  const blacklistedIds = await getBlacklistedContactIds(db, accountId);
  const phones = new Set<string>();

  if (blacklistedIds.size === 0) return phones;

  const idList = Array.from(blacklistedIds);
  const CHUNK = 100;
  for (let i = 0; i < idList.length; i += CHUNK) {
    const chunk = idList.slice(i, i + CHUNK);
    const { data: contacts } = await db
      .from('contacts')
      .select('phone')
      .in('id', chunk);

    for (const c of contacts ?? []) {
      const norm = c.phone?.replace(/\D/g, '');
      if (norm) phones.add(norm);
    }
  }

  return phones;
}
