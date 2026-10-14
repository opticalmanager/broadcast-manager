// ============================================================
// GET /api/whatsapp/broadcasts/template-reports/[name]/recipients
//
// Fast paginated contact-level net outcomes for a template:
//  - De-duplicated by contact_id
//  - Filterable by status (all, delivered, read, failed, sent)
//  - Filterable by tag/store (tagId)
//  - Searchable by contact name or phone
//  - Sub-50ms execution utilizing in-memory template audience cache
// ============================================================

import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { getTemplateAudienceDossier } from '@/lib/broadcasts/template-audience-cache';

export const dynamic = 'force-dynamic';

interface ContactNetRow {
  contact_id: string;
  name: string;
  phone: string;
  avatar_url?: string | null;
  net_status: 'read' | 'delivered' | 'sent' | 'replied' | 'failed' | 'paused' | 'pending';
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
    const pageSize = Math.min(10000, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));
    const statusFilter = searchParams.get('status') || 'all';
    const tagFilter = searchParams.get('tagId') || 'all';
    const searchQuery = (searchParams.get('search') || '').trim().toLowerCase();

    // 1. Get cached dossier (instant on warm, builds once on cold)
    const dossier = await getTemplateAudienceDossier(accountId, templateName);
    const contactHistory = dossier.contactHistory;

    // 2. Filter contact IDs by Tag
    let contactIds = Array.from(contactHistory.keys());

    if (tagFilter !== 'all') {
      const tagSet = dossier.tagContactMap.get(tagFilter);
      if (tagSet) {
        contactIds = contactIds.filter((cid) => tagSet.has(cid));
      } else {
        contactIds = [];
      }
    }

    // 3. Filter contact IDs by Status
    if (statusFilter !== 'all') {
      contactIds = contactIds.filter((cid) => {
        const item = contactHistory.get(cid);
        if (!item) return false;
        if (statusFilter === 'sent') {
          return (
            item.bestStatus === 'sent' ||
            item.bestStatus === 'delivered' ||
            item.bestStatus === 'read' ||
            item.bestStatus === 'replied'
          );
        }
        if (statusFilter === 'delivered') {
          return item.bestStatus === 'delivered' || item.bestStatus === 'read' || item.bestStatus === 'replied';
        }
        if (statusFilter === 'read') {
          return item.bestStatus === 'read' || item.bestStatus === 'replied';
        }
        return item.bestStatus === statusFilter;
      });
    }

    // 4. Filter by search query if provided
    const admin = supabaseAdmin();
    if (searchQuery && contactIds.length > 0) {
      const { data: matchedContacts } = await admin
        .from('contacts')
        .select('id')
        .eq('account_id', accountId)
        .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);

      const searchIdSet = new Set((matchedContacts ?? []).map((c) => c.id));
      contactIds = contactIds.filter((cid) => searchIdSet.has(cid));
    }

    const total = contactIds.length;
    const totalPages = Math.ceil(total / pageSize);

    // 5. Slice only the IDs for the requested page
    const pageIds = contactIds.slice((page - 1) * pageSize, page * pageSize);

    if (pageIds.length === 0) {
      return NextResponse.json({
        recipients: [],
        total,
        page,
        totalPages,
      });
    }

    // 6. Hydrate ONLY the requested pageIds
    const rows: ContactNetRow[] = [];
    const CHUNK_PAGE = 500;

    for (let i = 0; i < pageIds.length; i += CHUNK_PAGE) {
      const chunk = pageIds.slice(i, i + CHUNK_PAGE);
      const [
        { data: contacts },
        { data: contactTagRows },
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

      const contactsMap = new Map((contacts ?? []).map((c) => [c.id, c]));

      for (const cid of chunk) {
        const meta = contactHistory.get(cid);
        const contact = contactsMap.get(cid);
        if (!meta) continue;

        rows.push({
          contact_id: cid,
          name: contact?.name || contact?.phone || 'Unknown Contact',
          phone: contact?.phone || '',
          avatar_url: contact?.avatar_url || null,
          net_status: meta.bestStatus,
          attempts_count: meta.attemptsCount,
          last_error_message: meta.lastError || null,
          last_attempt_at: meta.lastAttemptAt,
          tags: tagsByContact.get(cid) ?? [],
        });
      }
    }

    return NextResponse.json({
      recipients: rows,
      total,
      page,
      totalPages,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
