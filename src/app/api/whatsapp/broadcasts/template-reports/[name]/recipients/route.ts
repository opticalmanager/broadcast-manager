// ============================================================
// GET /api/whatsapp/broadcasts/template-reports/[name]/recipients
//
// Returns paginated contact-level net outcomes for a template:
//  - De-duplicated by contact_id
//  - Displays net best status achieved
//  - Number of attempts / runs each contact participated in
//  - Most recent failure reason (if failed)
//  - Searchable by contact name or phone
//  - Filterable by status (all, delivered, read, failed, sent)
//  - Filterable by store/tag (tagId)
//  - Hydrates contact tags for badge display
// ============================================================

import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/flows/admin-client';

export const dynamic = 'force-dynamic';

interface ContactNetRow {
  contact_id: string;
  name: string;
  phone: string;
  avatar_url?: string | null;
  net_status: 'read' | 'delivered' | 'sent' | 'replied' | 'failed' | 'paused';
  attempts_count: number;
  last_error_message?: string | null;
  last_attempt_at: string;
  tags?: Array<{ id: string; name: string; color: string }>;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { accountId } = await requireRole('viewer');
    const { name } = await params;
    const templateName = decodeURIComponent(name);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get('pageSize') || '50', 10)));
    const statusFilter = searchParams.get('status') || 'all';
    const tagFilter = searchParams.get('tagId') || 'all';
    const searchQuery = (searchParams.get('search') || '').trim().toLowerCase();

    const admin = supabaseAdmin();

    // 1. Fetch all broadcasts matching this template
    const { data: broadcasts, error: bcError } = await admin
      .from('broadcasts')
      .select('id')
      .eq('account_id', accountId)
      .eq('template_name', templateName);

    if (bcError || !broadcasts || broadcasts.length === 0) {
      return NextResponse.json({
        recipients: [],
        total: 0,
        page,
        totalPages: 0,
      });
    }

    const bcIds = broadcasts.map((b) => b.id);

    // 2. Fetch all recipient records for these broadcasts
    const contactMap = new Map<
      string,
      {
        bestStatus: ContactNetRow['net_status'];
        attemptsCount: number;
        lastError?: string | null;
        lastAttemptAt: string;
      }
    >();

    let from = 0;
    const CHUNK = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: recRows, error: recErr } = await admin
        .from('broadcast_recipients')
        .select('contact_id, status, error_message, created_at')
        .in('broadcast_id', bcIds)
        .range(from, from + CHUNK - 1);

      if (recErr || !recRows || recRows.length === 0) break;

      for (const r of recRows) {
        if (!r.contact_id) continue;
        const existing = contactMap.get(r.contact_id);

        if (!existing) {
          contactMap.set(r.contact_id, {
            bestStatus: r.status as ContactNetRow['net_status'],
            attemptsCount: 1,
            lastError: r.error_message || null,
            lastAttemptAt: r.created_at,
          });
        } else {
          existing.attemptsCount += 1;
          if (r.created_at > existing.lastAttemptAt) {
            existing.lastAttemptAt = r.created_at;
            if (r.error_message) existing.lastError = r.error_message;
          }

          if (r.status === 'read') {
            existing.bestStatus = 'read';
          } else if (r.status === 'delivered' && existing.bestStatus !== 'read') {
            existing.bestStatus = 'delivered';
          } else if (
            r.status === 'sent' &&
            existing.bestStatus !== 'read' &&
            existing.bestStatus !== 'delivered'
          ) {
            existing.bestStatus = 'sent';
          } else if (
            existing.bestStatus === 'failed' &&
            r.status !== 'failed'
          ) {
            existing.bestStatus = r.status as ContactNetRow['net_status'];
          }
        }
      }

      if (recRows.length < CHUNK) {
        hasMore = false;
      } else {
        from += CHUNK;
      }
    }

    // 3. Filter by status if requested
    let contactIds = Array.from(contactMap.keys());

    if (statusFilter !== 'all') {
      contactIds = contactIds.filter((cid) => {
        const item = contactMap.get(cid);
        if (!item) return false;
        if (statusFilter === 'delivered') {
          return item.bestStatus === 'delivered' || item.bestStatus === 'read';
        }
        return item.bestStatus === statusFilter;
      });
    }

    // 4. Filter by tag if requested
    if (tagFilter !== 'all' && contactIds.length > 0) {
      const CHUNK_TAG_FILTER = 1000;
      const matchedTagContactIds = new Set<string>();

      for (let i = 0; i < contactIds.length; i += CHUNK_TAG_FILTER) {
        const chunk = contactIds.slice(i, i + CHUNK_TAG_FILTER);
        const { data: tagMatches } = await admin
          .from('contact_tags')
          .select('contact_id')
          .eq('tag_id', tagFilter)
          .in('contact_id', chunk);

        for (const tm of tagMatches ?? []) {
          matchedTagContactIds.add(tm.contact_id);
        }
      }

      contactIds = contactIds.filter((cid) => matchedTagContactIds.has(cid));
    }

    if (contactIds.length === 0) {
      return NextResponse.json({
        recipients: [],
        total: 0,
        page,
        totalPages: 0,
      });
    }

    // 5. Hydrate contact details (name, phone, avatar) & tags in chunks of 500
    const contactsDataMap = new Map<
      string,
      {
        name: string;
        phone: string;
        avatar_url: string | null;
        tags: Array<{ id: string; name: string; color: string }>;
      }
    >();
    const CHUNK_CONTACTS = 500;

    for (let i = 0; i < contactIds.length; i += CHUNK_CONTACTS) {
      const chunk = contactIds.slice(i, i + CHUNK_CONTACTS);
      const [
        { data: contacts },
        { data: contactTagRows }
      ] = await Promise.all([
        admin.from('contacts').select('id, name, phone, avatar_url').in('id', chunk),
        admin.from('contact_tags').select('contact_id, tag:tags(id, name, color)').in('contact_id', chunk),
      ]);

      const tagsByContact = new Map<string, Array<{ id: string; name: string; color: string }>>();
      for (const ct of contactTagRows ?? []) {
        if (!ct.contact_id || !ct.tag) continue;
        const list = tagsByContact.get(ct.contact_id) ?? [];
        const tagObj = (Array.isArray(ct.tag) ? ct.tag[0] : ct.tag) as unknown as { id: string; name: string; color: string };
        if (tagObj) list.push(tagObj);
        tagsByContact.set(ct.contact_id, list);
      }

      for (const c of contacts ?? []) {
        contactsDataMap.set(c.id, {
          name: c.name || c.phone || 'Unknown Contact',
          phone: c.phone || '',
          avatar_url: c.avatar_url || null,
          tags: tagsByContact.get(c.id) ?? [],
        });
      }
    }

    // 6. Build full row list and filter by search query
    let rows: ContactNetRow[] = [];
    for (const cid of contactIds) {
      const meta = contactMap.get(cid);
      const contact = contactsDataMap.get(cid);
      if (!meta) continue;

      const name = contact?.name || 'Unknown Contact';
      const phone = contact?.phone || '';

      if (searchQuery) {
        const matchesName = name.toLowerCase().includes(searchQuery);
        const matchesPhone = phone.includes(searchQuery);
        if (!matchesName && !matchesPhone) continue;
      }

      rows.push({
        contact_id: cid,
        name,
        phone,
        avatar_url: contact?.avatar_url || null,
        net_status: meta.bestStatus,
        attempts_count: meta.attemptsCount,
        last_error_message: meta.lastError || null,
        last_attempt_at: meta.lastAttemptAt,
        tags: contact?.tags ?? [],
      });
    }

    // Sort by last attempt date descending
    rows.sort(
      (a, b) =>
        new Date(b.last_attempt_at).getTime() -
        new Date(a.last_attempt_at).getTime()
    );

    const total = rows.length;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    const paginated = rows.slice(offset, offset + pageSize);

    return NextResponse.json({
      recipients: paginated,
      total,
      page,
      totalPages,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
