import type { SupabaseClient } from '@supabase/supabase-js';
import { isPausedError } from '@/lib/broadcast-status';
import { getBlacklistedContactIds, getBlacklistedPhones } from '@/lib/contacts/blacklist';

export type AudienceType = 'all' | 'tags' | 'custom_field' | 'csv';
export type CustomFieldOperator = 'is' | 'is_not' | 'contains';

export interface CustomFieldFilter {
  fieldId: string;
  operator: CustomFieldOperator;
  value: string;
}

export interface AudienceConfig {
  type: AudienceType;
  tagIds?: string[];
  customField?: CustomFieldFilter;
  csvContacts?: { phone: string; name?: string }[];
  excludeTagIds?: string[];
  excludeAlreadySentThisTemplate?: boolean;
  excludeFailedSends?: boolean;
}

export interface AudienceReachResult {
  estimatedCount: number;
  dedupCount: number;
  rawBaseCount: number;
}

/**
 * Calculates audience reach with deduplication and exclusion filters.
 * All DB queries are paginated to prevent PostgREST's default 1,000-row limit
 * from truncating large contact or recipient datasets.
 */
export async function calculateAudienceReach(
  supabase: SupabaseClient,
  audience: AudienceConfig,
  options?: {
    templateName?: string | null;
    accountId?: string | null;
  }
): Promise<AudienceReachResult> {
  const { templateName, accountId } = options ?? {};

  // Partial / unconfigured audience handling
  if (
    (audience.type === 'tags' && (!audience.tagIds || audience.tagIds.length === 0)) ||
    (audience.type === 'custom_field' && (!audience.customField?.fieldId || !audience.customField.value)) ||
    (audience.type === 'csv' && (!audience.csvContacts || audience.csvContacts.length === 0))
  ) {
    return { estimatedCount: 0, dedupCount: 0, rawBaseCount: 0 };
  }

  // 1. Fetch past recipients for template deduplication if enabled
  const dedupExcludeSet = new Set<string>();
  if (audience.excludeAlreadySentThisTemplate && templateName) {
    let pastBroadcastsQuery = supabase
      .from('broadcasts')
      .select('id')
      .eq('template_name', templateName);

    if (accountId) {
      pastBroadcastsQuery = pastBroadcastsQuery.eq('account_id', accountId);
    }

    const { data: pastBroadcasts } = await pastBroadcastsQuery;

    if (pastBroadcasts && pastBroadcasts.length > 0) {
      const pastIds = pastBroadcasts.map((b) => b.id);
      const CHUNK = 500;
      for (let i = 0; i < pastIds.length; i += CHUNK) {
        const slice = pastIds.slice(i, i + CHUNK);
        let from = 0;
        const PAGE = 1000;
        while (true) {
          const q = supabase
            .from('broadcast_recipients')
            .select('contact_id, status, error_message')
            .in('broadcast_id', slice)
            .range(from, from + PAGE - 1);

          const { data: rows, error } = await q;
          if (error || !rows || rows.length === 0) break;
          for (const r of rows) {
            if (!r.contact_id) continue;
            const isPaused =
              r.status === 'paused' ||
              (r.status === 'failed' && isPausedError(r.error_message));

            // Paused contacts NEVER count as failed contacts and have not received the template.
            if (isPaused || r.status === 'pending') {
              continue;
            }

            if (r.status === 'failed') {
              if (audience.excludeFailedSends) {
                dedupExcludeSet.add(r.contact_id);
              }
              continue;
            }

            // Truly sent, delivered, read, replied
            dedupExcludeSet.add(r.contact_id);
          }
          if (rows.length < PAGE) break;
          from += PAGE;
        }
      }
    }
  }

  // 2. Handle CSV audience type
  if (audience.type === 'csv' && audience.csvContacts) {
    const blacklistedPhones = accountId
      ? await getBlacklistedPhones(supabase, accountId)
      : new Set<string>();

    const nonBlacklistedCsv = audience.csvContacts.filter(
      (c) => !blacklistedPhones.has(c.phone.replace(/\D/g, ''))
    );
    const rawTotal = audience.csvContacts.length;

    if (audience.excludeAlreadySentThisTemplate && dedupExcludeSet.size > 0) {
      const excludedContactIds = Array.from(dedupExcludeSet);
      const excludedPhones = new Set<string>();
      const CHUNK = 500;
      for (let i = 0; i < excludedContactIds.length; i += CHUNK) {
        const slice = excludedContactIds.slice(i, i + CHUNK);
        const { data: matched } = await supabase
          .from('contacts')
          .select('id, phone')
          .in('id', slice);
        for (const c of matched ?? []) {
          const norm = c.phone?.replace(/\D/g, '');
          if (norm) excludedPhones.add(norm);
        }
      }

      const remaining = nonBlacklistedCsv.filter(
        (c) => !excludedPhones.has(c.phone.replace(/\D/g, ''))
      );
      const deduped = rawTotal - remaining.length;
      return {
        estimatedCount: remaining.length,
        dedupCount: deduped,
        rawBaseCount: rawTotal,
      };
    }
    const deduped = rawTotal - nonBlacklistedCsv.length;
    return {
      estimatedCount: nonBlacklistedCsv.length,
      dedupCount: deduped,
      rawBaseCount: rawTotal,
    };
  }

  // 3. Collect tag exclusion IDs and strictly exclude blacklisted contacts
  const excludeTagSet = new Set<string>();

  // Strict Blacklist Rule: contacts tagged 'blacklisted' are never included in broadcasts
  if (accountId) {
    const blacklistedIds = await getBlacklistedContactIds(supabase, accountId);
    for (const id of blacklistedIds) {
      excludeTagSet.add(id);
    }
  }

  if (audience.excludeTagIds && audience.excludeTagIds.length > 0) {
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data: excludeRows, error } = await supabase
        .from('contact_tags')
        .select('contact_id')
        .in('tag_id', audience.excludeTagIds)
        .range(from, from + PAGE - 1);
      if (error || !excludeRows || excludeRows.length === 0) break;
      for (const r of excludeRows) {
        if (r.contact_id) excludeTagSet.add(r.contact_id);
      }
      if (excludeRows.length < PAGE) break;
      from += PAGE;
    }
  }

  // 4. Handle "all" audience type
  if (audience.type === 'all') {
    let countQuery = supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });
    if (accountId) {
      countQuery = countQuery.eq('account_id', accountId);
    }
    const { count } = await countQuery;
    const rawTotal = count ?? 0;

    const combinedExclude = new Set<string>([
      ...Array.from(excludeTagSet),
      ...Array.from(dedupExcludeSet),
    ]);

    let dedupOnly = 0;
    for (const id of dedupExcludeSet) {
      if (!excludeTagSet.has(id)) dedupOnly++;
    }

    const estimated = Math.max(0, rawTotal - combinedExclude.size);
    return {
      estimatedCount: estimated,
      dedupCount: dedupOnly,
      rawBaseCount: rawTotal,
    };
  }

  // 5. Handle "tags" audience type
  if (audience.type === 'tags' && audience.tagIds && audience.tagIds.length > 0) {
    const baseIds = new Set<string>();
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('contact_tags')
        .select('contact_id')
        .in('tag_id', audience.tagIds)
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      for (const r of data) {
        if (r.contact_id) baseIds.add(r.contact_id);
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }

    let dedupDeductions = 0;
    for (const id of baseIds) {
      if (!excludeTagSet.has(id) && dedupExcludeSet.has(id)) {
        dedupDeductions++;
      }
    }
    const effective = [...baseIds].filter(
      (id) => !excludeTagSet.has(id) && !dedupExcludeSet.has(id)
    );
    return {
      estimatedCount: effective.length,
      dedupCount: dedupDeductions,
      rawBaseCount: baseIds.size,
    };
  }

  // 6. Handle "custom_field" audience type
  if (audience.type === 'custom_field' && audience.customField) {
    const { fieldId, operator, value } = audience.customField;
    const baseIds = new Set<string>();
    let from = 0;
    const PAGE = 1000;
    while (true) {
      let q = supabase
        .from('contact_custom_values')
        .select('contact_id')
        .eq('custom_field_id', fieldId)
        .range(from, from + PAGE - 1);
      if (operator === 'is') q = q.eq('value', value);
      else if (operator === 'is_not') q = q.neq('value', value);
      else q = q.ilike('value', `%${value}%`);

      const { data, error } = await q;
      if (error || !data || data.length === 0) break;
      for (const r of data) {
        if (r.contact_id) baseIds.add(r.contact_id);
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }

    let dedupDeductions = 0;
    for (const id of baseIds) {
      if (!excludeTagSet.has(id) && dedupExcludeSet.has(id)) {
        dedupDeductions++;
      }
    }
    const effective = [...baseIds].filter(
      (id) => !excludeTagSet.has(id) && !dedupExcludeSet.has(id)
    );
    return {
      estimatedCount: effective.length,
      dedupCount: dedupDeductions,
      rawBaseCount: baseIds.size,
    };
  }

  return { estimatedCount: 0, dedupCount: 0, rawBaseCount: 0 };
}
