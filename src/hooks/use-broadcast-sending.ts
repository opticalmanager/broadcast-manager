'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import {
  BATCH_SEND_ATTEMPTS,
  batchRetryDelayMs,
} from '@/lib/broadcast-retry';
import { normalizeKey } from '@/lib/contacts/dedupe';
import { filterAlreadySentContacts } from '@/lib/broadcast-dedup';
import { getBlacklistedContactIds } from '@/lib/contacts/blacklist';
import { Contact, MessageTemplate } from '@/types';

export type CustomFieldOperator = 'is' | 'is_not' | 'contains';

export interface CustomFieldFilter {
  fieldId: string;
  operator: CustomFieldOperator;
  value: string;
}

export interface AudienceConfig {
  type: 'all' | 'tags' | 'custom_field' | 'csv';
  tagIds?: string[];
  customField?: CustomFieldFilter;
  csvContacts?: { phone: string; name?: string }[];
  /** Contacts carrying any of these tags are subtracted from the result. */
  excludeTagIds?: string[];
  /** Exclude contacts who have already received this template */
  excludeAlreadySentThisTemplate?: boolean;
  /** When excluding already-sent, also exclude failed sends */
  excludeFailedSends?: boolean;
}

/**
 * Variable mapping — each template placeholder (by key, usually "1",
 * "2", …) is resolved at send time. `field` maps to a built-in contact
 * field (name/phone/email/company); `custom_field` maps to a
 * contact_custom_values.value row keyed by the custom_fields.id stored
 * in `value`.
 */
export type VariableMapping =
  | { type: 'static'; value: string }
  | { type: 'field'; value: string }
  | { type: 'custom_field'; value: string };

interface BroadcastPayload {
  name: string;
  template: MessageTemplate;
  audience: AudienceConfig;
  variables: Record<string, VariableMapping>;
  /**
   * Media URL for an IMAGE/VIDEO/DOCUMENT header. Required at send
   * time for media-header templates — Meta rejects the send without
   * it. Passed through as `messageParams.headerMediaUrl`; the builder
   * falls back to the template's stored URL only when this is empty.
   */
  headerMediaUrl?: string;
}

interface UseBroadcastSendingReturn {
  createAndSendBroadcast: (payload: BroadcastPayload) => Promise<string>;
  isProcessing: boolean;
  progress: number;
}

/**
 * Meta rate-limit buffer. 10 per batch + 1 s pause matches the spec
 * and keeps us comfortably under Meta's per-phone-number messaging
 * rate so a large broadcast never trips the upstream limiter.
 *
 * Note this shape when touching `RATE_LIMITS.broadcast`: a campaign is
 * many calls to `/api/whatsapp/broadcast`, not one. A 1 000-recipient
 * send is ~100 calls over several minutes, and a bucket sized for
 * "one call per campaign" throttles most of it away (issue #472).
 */
const SEND_BATCH_SIZE = 10;
const SEND_BATCH_DELAY_MS = 1000;

/** `broadcast_recipients` inserts are independent of the send rate. */
const INSERT_BATCH_SIZE = 200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BroadcastApiResult {
  phone: string;
  status: 'sent' | 'failed';
  whatsapp_message_id?: string;
  error?: string;
}

/** contactId → (customFieldId → value). */
type CustomValueIndex = Map<string, Map<string, string>>;

/**
 * Per-contact resolution of custom-field placeholders. Static and
 * built-in-field mappings resolve synchronously; custom fields read
 * from a pre-built index to avoid N+1 queries during the send loop.
 */
export function resolveVariables(
  variables: Record<string, VariableMapping>,
  contact: Contact,
  customValues?: Map<string, string>,
): string[] {
  // Keys are typically "1","2",... — numeric-aware sort keeps
  // {{1}} before {{10}}.
  const keys = Object.keys(variables).sort((a, b) => {
    const an = Number(a);
    const bn = Number(b);
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
    return a.localeCompare(b);
  });

  return keys.map((key) => {
    const v = variables[key];
    if (v.type === 'static') return v.value;

    if (v.type === 'field') {
      const fieldMap: Record<string, string | undefined> = {
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        company: contact.company,
      };
      return fieldMap[v.value] ?? '';
    }

    // custom_field
    return customValues?.get(v.value) ?? '';
  });
}

/**
 * Bulk-fetch contact_custom_values for a set of contacts. Returns an
 * index keyed by contact_id → field_id → value.
 */
async function fetchCustomValueIndex(
  supabase: ReturnType<typeof createClient>,
  contactIds: string[],
): Promise<CustomValueIndex> {
  const index: CustomValueIndex = new Map();
  if (contactIds.length === 0) return index;

  // Supabase PostgREST caps the .in(...) IN-clause roughly at 1000
  // values. Page through to stay safe.
  const PAGE = 500;
  for (let i = 0; i < contactIds.length; i += PAGE) {
    const slice = contactIds.slice(i, i + PAGE);
    const { data } = await supabase
      .from('contact_custom_values')
      .select('contact_id, custom_field_id, value')
      .in('contact_id', slice);

    for (const row of data ?? []) {
      const bucket = index.get(row.contact_id) ?? new Map<string, string>();
      bucket.set(row.custom_field_id, row.value ?? '');
      index.set(row.contact_id, bucket);
    }
  }
  return index;
}

export function useBroadcastSending(): UseBroadcastSendingReturn {
  const { accountId } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  async function resolveAudience(
    audience: AudienceConfig,
    templateName?: string,
  ): Promise<Contact[]> {
    const supabase = createClient();

    let contacts: Contact[] = [];

    if (audience.type === 'all') {
      const allContacts: Contact[] = [];
      let from = 0;
      const CHUNK = 1000;
      while (true) {
        let q = supabase
          .from('contacts')
          .select('*')
          .range(from, from + CHUNK - 1);
        if (accountId) {
          q = q.eq('account_id', accountId);
        }
        const { data, error } = await q;
        if (error) throw new Error(`Failed to fetch contacts: ${error.message}`);
        if (!data || data.length === 0) break;
        allContacts.push(...data);
        if (data.length < CHUNK) break;
        from += CHUNK;
      }
      contacts = allContacts;
    } else if (
      audience.type === 'tags' &&
      audience.tagIds &&
      audience.tagIds.length > 0
    ) {
      const allContactTags: { contact_id: string }[] = [];
      let from = 0;
      const CHUNK = 1000;
      while (true) {
        const { data: contactTags, error: tagError } = await supabase
          .from('contact_tags')
          .select('contact_id')
          .in('tag_id', audience.tagIds)
          .range(from, from + CHUNK - 1);

        if (tagError)
          throw new Error(`Failed to fetch contact tags: ${tagError.message}`);
        if (!contactTags || contactTags.length === 0) break;
        allContactTags.push(...contactTags);
        if (contactTags.length < CHUNK) break;
        from += CHUNK;
      }

      if (allContactTags.length > 0) {
        const uniqueContactIds = [
          ...new Set(allContactTags.map((ct) => ct.contact_id)),
        ];
        const contactsList: Contact[] = [];
        const IN_PAGE = 100;
        for (let i = 0; i < uniqueContactIds.length; i += IN_PAGE) {
          const slice = uniqueContactIds.slice(i, i + IN_PAGE);
          const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .in('id', slice);
          if (error) throw new Error(`Failed to fetch contacts: ${error.message}`);
          if (data) contactsList.push(...data);
        }
        contacts = contactsList;
      }
    } else if (audience.type === 'custom_field' && audience.customField) {
      contacts = await resolveCustomFieldAudience(supabase, audience.customField);
    } else if (audience.type === 'csv' && audience.csvContacts) {
      contacts = await upsertCsvContacts(supabase, audience.csvContacts);
    }

    // Strict Blacklist Rule: Never send broadcasts to blacklisted contacts
    if (accountId) {
      const blacklistedContactIds = await getBlacklistedContactIds(supabase, accountId);
      if (blacklistedContactIds.size > 0) {
        contacts = contacts.filter((c) => !blacklistedContactIds.has(c.id));
      }
    }

    // Apply exclude tags (works across all contact-derived audience
    // types). CSV contacts are synthetic so exclusion doesn't apply.
    if (audience.excludeTagIds && audience.excludeTagIds.length > 0) {
      const excludedIds = new Set<string>();
      let from = 0;
      const CHUNK = 1000;
      while (true) {
        const { data: excludeRows } = await supabase
          .from('contact_tags')
          .select('contact_id')
          .in('tag_id', audience.excludeTagIds)
          .range(from, from + CHUNK - 1);
        if (!excludeRows || excludeRows.length === 0) break;
        for (const r of excludeRows) {
          excludedIds.add(r.contact_id);
        }
        if (excludeRows.length < CHUNK) break;
        from += CHUNK;
      }
      contacts = contacts.filter((c) => !excludedIds.has(c.id));
    }

    // Apply smart template de-duplication if enabled:
    // Exclude contacts who have already received this template in this account.
    if (audience.excludeAlreadySentThisTemplate && templateName && accountId) {
      const { data: pastBroadcasts } = await supabase
        .from('broadcasts')
        .select('id')
        .eq('account_id', accountId)
        .eq('template_name', templateName);

      if (pastBroadcasts && pastBroadcasts.length > 0) {
        const pastIds = pastBroadcasts.map((b) => b.id);
        const allPastRecipients: { contact_id: string; status: string; error_message?: string | null }[] = [];
        const CHUNK = 50;
        for (let i = 0; i < pastIds.length; i += CHUNK) {
          const idChunk = pastIds.slice(i, i + CHUNK);
          let from = 0;
          const PAGE = 1000;
          while (true) {
            const q = supabase
              .from('broadcast_recipients')
              .select('contact_id, status, error_message')
              .in('broadcast_id', idChunk)
              .range(from, from + PAGE - 1);

            const { data, error } = await q;
            if (error || !data || data.length === 0) break;
            allPastRecipients.push(...(data as { contact_id: string; status: string; error_message?: string | null }[]));
            if (data.length < PAGE) break;
            from += PAGE;
          }
        }

        if (allPastRecipients.length > 0) {
          contacts = filterAlreadySentContacts(contacts, allPastRecipients, {
            excludeFailed: audience.excludeFailedSends,
          });
        }
      }
    }

    return contacts;
  }

  /**
   * CSV uploads arrive as raw phone/name pairs, not DB rows. Before we
   * can insert broadcast_recipients (whose contact_id FKs contacts.id),
   * we need real contacts.id UUIDs. So: look up each CSV phone in the
   * caller's contacts table; insert any that don't exist; return the
   * resolved set.
   *
   * Pre-existing implementation synthesized `csv-N` strings as
   * contact_id, which failed the UUID cast on insert — every CSV
   * broadcast silently created zero recipients.
   *
   * Matching is on the normalized number throughout, so it agrees with
   * the account-wide unique index rather than colliding with it.
   */
  async function upsertCsvContacts(
    supabase: ReturnType<typeof createClient>,
    csvRows: { phone: string; name?: string }[],
  ): Promise<Contact[]> {
    if (csvRows.length === 0) return [];

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      throw new Error('You are not signed in.');
    }
    if (!accountId) {
      throw new Error('Your profile is not linked to an account.');
    }

    // De-duplicate within the CSV on the NORMALIZED number — the same
    // key the DB's UNIQUE (account_id, phone_normalized) index uses
    // (migration 022). Keyed on the raw string instead, "+1 555-0100"
    // and "15550100" survived as two rows and the insert below died on
    // a 23505, failing the whole broadcast.
    const uniqueByKey = new Map<string, { phone: string; name?: string }>();
    for (const row of csvRows) {
      const key = normalizeKey(row.phone);
      if (key && !uniqueByKey.has(key)) uniqueByKey.set(key, row);
    }
    const keys = [...uniqueByKey.keys()];

    // Single round-trip lookup of the contacts already in this ACCOUNT.
    // Scoping to `user_id` missed rows a teammate created on a shared
    // account, so those numbers looked new and their inserts collided
    // with the account-wide unique index.
    const { data: existing, error: lookupErr } = await supabase
      .from('contacts')
      .select('*')
      .eq('account_id', accountId)
      .in('phone_normalized', keys);
    if (lookupErr) {
      throw new Error(`Failed to look up CSV contacts: ${lookupErr.message}`);
    }

    const byKey = new Map<string, Contact>();
    for (const c of (existing ?? []) as Contact[]) {
      const key = normalizeKey(c.phone ?? '');
      if (key) byKey.set(key, c);
    }

    // Insert only missing contacts, in one batch per 200 rows (PostgREST
    // has a default payload cap — 200 keeps individual requests small).
    const missing = keys
      .filter((k) => !byKey.has(k))
      .map((k) => uniqueByKey.get(k)!)
      .map((row) => ({
        user_id: user.id,
        account_id: accountId,
        phone: row.phone,
        name: row.name ?? null,
      }));

    const INSERT_CHUNK = 200;
    for (let i = 0; i < missing.length; i += INSERT_CHUNK) {
      const chunk = missing.slice(i, i + INSERT_CHUNK);
      const { data: inserted, error: insertErr } = await supabase
        .from('contacts')
        .insert(chunk)
        .select();
      if (insertErr) {
        throw new Error(`Failed to create CSV contacts: ${insertErr.message}`);
      }
      for (const c of (inserted ?? []) as Contact[]) {
        const key = normalizeKey(c.phone ?? '');
        if (key) byKey.set(key, c);
      }
    }

    // Preserve input order so analytics roughly matches the CSV order.
    return keys
      .map((k) => byKey.get(k))
      .filter((c): c is Contact => Boolean(c));
  }

  async function resolveCustomFieldAudience(
    supabase: ReturnType<typeof createClient>,
    filter: CustomFieldFilter,
  ): Promise<Contact[]> {
    const { fieldId, operator, value } = filter;

    // Build the WHERE clause for the operator. PostgREST supports
    // eq/neq/ilike via the query builder — use ilike with wildcards
    // for "contains" so the match is case-insensitive.
    let query = supabase
      .from('contact_custom_values')
      .select('contact_id')
      .eq('custom_field_id', fieldId);

    if (operator === 'is') query = query.eq('value', value);
    else if (operator === 'is_not') query = query.neq('value', value);
    else if (operator === 'contains') query = query.ilike('value', `%${value}%`);

    const { data: matches, error: matchErr } = await query;
    if (matchErr)
      throw new Error(`Custom-field filter failed: ${matchErr.message}`);

    const contactIds = [...new Set((matches ?? []).map((m) => m.contact_id))];
    if (contactIds.length === 0) return [];

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .in('id', contactIds);
    if (error) throw new Error(`Failed to fetch contacts: ${error.message}`);
    return data ?? [];
  }

  async function createAndSendBroadcast(payload: BroadcastPayload): Promise<string> {
    setIsProcessing(true);
    setProgress(0);

    const supabase = createClient();

    try {
      // ── Step 0: Resolve current user ──────────────────────────────
      // broadcasts.user_id is NOT NULL + guarded by RLS
      // (auth.uid() = user_id). Without this, the INSERT below was
      // silently failing with 23502 / 42501 — the wizard would
      // no-op with no feedback.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        throw new Error('You are not signed in.');
      }
      if (!accountId) {
        throw new Error('Your profile is not linked to an account.');
      }

      // ── Step 1: Resolve audience contacts ─────────────────────────
      setProgress(5);
      const contacts = await resolveAudience(
        payload.audience,
        payload.template.name,
      );

      if (contacts.length === 0) {
        throw new Error('No contacts found for this audience.');
      }

      // ── Step 2: Create broadcast row ──────────────────────────────
      setProgress(10);
      const { data: broadcast, error: broadcastError } = await supabase
        .from('broadcasts')
        .insert({
          user_id: user.id,
          account_id: accountId,
          name: payload.name,
          template_name: payload.template.name,
          template_language: payload.template.language ?? 'en_US',
          template_variables: payload.variables,
          audience_filter: {
            type: payload.audience.type,
            tagIds: payload.audience.tagIds,
            customField: payload.audience.customField,
            excludeTagIds: payload.audience.excludeTagIds,
            excludeAlreadySentThisTemplate: payload.audience.excludeAlreadySentThisTemplate,
            excludeFailedSends: payload.audience.excludeFailedSends,
          },
          status: 'sending',
          total_recipients: contacts.length,
          sent_count: 0,
          delivered_count: 0,
          read_count: 0,
          replied_count: 0,
          failed_count: 0,
        })
        .select()
        .single();

      if (broadcastError || !broadcast) {
        throw new Error(
          `Failed to create broadcast: ${broadcastError?.message ?? 'unknown error'}`,
        );
      }

      // ── Step 3: Insert recipient rows ─────────────────────────────
      // Custom values are fetched BEFORE the insert so each row can
      // carry its resolved template params. Those params are what makes
      // the campaign resumable server-side (issue #472): the send loop
      // below runs in this browser tab, and if the tab goes away the
      // only record of what {{1}} should be for each contact is this
      // column. Resolving once here also means the resume sends exactly
      // what this pass would have.
      setProgress(20);
      const customValueIndex = await fetchCustomValueIndex(
        supabase,
        contacts.map((c) => c.id),
      );
      const paramsByContact = new Map(
        contacts.map((contact) => [
          contact.id,
          resolveVariables(
            payload.variables,
            contact,
            customValueIndex.get(contact.id),
          ),
        ]),
      );
      const recipientRows = contacts.map((contact) => ({
        broadcast_id: broadcast.id,
        contact_id: contact.id,
        status: 'pending' as const,
        template_params: paramsByContact.get(contact.id) ?? [],
      }));

      for (let i = 0; i < recipientRows.length; i += INSERT_BATCH_SIZE) {
        const batch = recipientRows.slice(i, i + INSERT_BATCH_SIZE);
        const { error: recipientError } = await supabase
          .from('broadcast_recipients')
          .insert(batch);
        if (recipientError) {
          await supabase
            .from('broadcasts')
            .update({
              status: 'failed',
              failed_count: contacts.length,
            })
            .eq('id', broadcast.id);
          throw new Error(
            `Failed to insert recipient batch ${i / INSERT_BATCH_SIZE + 1}: ${recipientError.message}`,
          );
        }
        const insertProgress = 20 + Math.round(((i + batch.length) / recipientRows.length) * 65);
        setProgress(insertProgress);
      }

      // ── Step 4: Dispatch to VPS Server Background Worker ──────────
      setProgress(90);
      const res = await fetch(`/api/whatsapp/broadcast/${broadcast.id}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'pending' }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start background broadcast delivery');
      }

      setProgress(100);
      return broadcast.id;
    } finally {
      setIsProcessing(false);
    }
  }

  return { createAndSendBroadcast, isProcessing, progress };
}
