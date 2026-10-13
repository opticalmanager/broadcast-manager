// ============================================================
// GET /api/whatsapp/broadcasts/template-reports/[name]
//
// Returns comprehensive performance dossier for a single template:
//  - Template configuration & metadata
//  - Net deduplicated metrics (Unique targeted, net delivered, net read, net failed)
//  - Gross delivery attempts & volume
//  - All campaign runs & retries chain for this template
//  - Meta error code diagnostics (131026, 131049, 130429, 131047, etc.)
//  - Store tags & store-wise performance breakdown
// ============================================================

import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/flows/admin-client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { accountId } = await requireRole('viewer');
    const { name } = await params;
    const templateName = decodeURIComponent(name);

    const admin = supabaseAdmin();

    // 1. Fetch all broadcasts using this template
    const { data: broadcasts, error: bcError } = await admin
      .from('broadcasts')
      .select(`
        id,
        name,
        template_name,
        template_language,
        audience_filter,
        total_recipients,
        sent_count,
        delivered_count,
        read_count,
        replied_count,
        failed_count,
        status,
        created_at
      `)
      .eq('account_id', accountId)
      .eq('template_name', templateName)
      .order('created_at', { ascending: false });

    if (bcError) {
      return NextResponse.json({ error: bcError.message }, { status: 500 });
    }

    if (!broadcasts || broadcasts.length === 0) {
      return NextResponse.json(
        { error: `No broadcasts found for template '${templateName}'` },
        { status: 404 }
      );
    }

    // 2. Fetch template metadata
    const { data: templateRow } = await admin
      .from('message_templates')
      .select('*')
      .eq('account_id', accountId)
      .eq('name', templateName)
      .maybeSingle();

    // 3. Fetch tags for this account
    const { data: dbTags } = await admin
      .from('tags')
      .select('id, name, color')
      .eq('account_id', accountId)
      .order('name', { ascending: true });

    const bcIds = broadcasts.map((b) => b.id);

    // 4. Page through broadcast_recipients to compute net outcomes & failure diagnostics
    const contactHistory = new Map<
      string,
      {
        bestStatus: string;
        attemptsCount: number;
        lastError?: string;
        lastAttemptAt: string;
      }
    >();

    const errorCounts = {
      undeliverable: 0, // 131026
      ecosystem: 0,     // 131049
      rate_limit: 0,    // 130429
      service_window: 0,// 131047
      other: 0,
    };

    let grossRecipients = 0;
    let grossDelivered = 0;
    let grossRead = 0;
    let grossFailed = 0;

    for (const b of broadcasts) {
      grossRecipients += b.total_recipients ?? 0;
      grossDelivered += b.delivered_count ?? 0;
      grossRead += b.read_count ?? 0;
      grossFailed += b.failed_count ?? 0;
    }

    let from = 0;
    const CHUNK = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: recRows, error: recErr } = await admin
        .from('broadcast_recipients')
        .select('contact_id, status, error_message, created_at')
        .in('broadcast_id', bcIds)
        .range(from, from + CHUNK - 1);

      if (recErr || !recRows || recRows.length === 0) {
        break;
      }

      for (const r of recRows) {
        if (!r.contact_id) continue;

        if (r.status === 'failed' && r.error_message) {
          const em = r.error_message;
          if (em.includes('131026') || em.toLowerCase().includes('undeliverable')) {
            errorCounts.undeliverable++;
          } else if (
            em.includes('131049') ||
            em.toLowerCase().includes('ecosystem') ||
            em.toLowerCase().includes('marketing limit')
          ) {
            errorCounts.ecosystem++;
          } else if (em.includes('130429') || em.toLowerCase().includes('rate limit')) {
            errorCounts.rate_limit++;
          } else if (
            em.includes('131047') ||
            em.toLowerCase().includes('re-engagement') ||
            em.toLowerCase().includes('24h')
          ) {
            errorCounts.service_window++;
          } else {
            errorCounts.other++;
          }
        }

        const existing = contactHistory.get(r.contact_id);
        if (!existing) {
          contactHistory.set(r.contact_id, {
            bestStatus: r.status,
            attemptsCount: 1,
            lastError: r.error_message || undefined,
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
            existing.bestStatus = r.status;
          }
        }
      }

      if (recRows.length < CHUNK) {
        hasMore = false;
      } else {
        from += CHUNK;
      }
    }

    const totalUniqueContacts = contactHistory.size;
    let netSent = 0;
    let netDelivered = 0;
    let netRead = 0;
    let netReplied = 0;
    let netFailed = 0;

    for (const h of contactHistory.values()) {
      if (
        h.bestStatus === 'sent' ||
        h.bestStatus === 'delivered' ||
        h.bestStatus === 'read' ||
        h.bestStatus === 'replied'
      ) {
        netSent++;
      }
      if (h.bestStatus === 'delivered' || h.bestStatus === 'read' || h.bestStatus === 'replied') {
        netDelivered++;
      }
      if (h.bestStatus === 'read') {
        netRead++;
      }
      if (h.bestStatus === 'replied') {
        netReplied++;
      }
      if (h.bestStatus === 'failed') {
        netFailed++;
      }
    }

    // Identify retry hierarchy
    const campaignRuns = broadcasts.map((b) => {
      const audFilter = b.audience_filter as { retry_of_broadcast_id?: string } | null;
      return {
        id: b.id,
        name: b.name,
        status: b.status,
        total_recipients: b.total_recipients ?? 0,
        sent_count: b.sent_count ?? 0,
        delivered_count: b.delivered_count ?? 0,
        read_count: b.read_count ?? 0,
        failed_count: b.failed_count ?? 0,
        paused_count: 0,
        created_at: b.created_at,
        is_retry: Boolean(audFilter?.retry_of_broadcast_id),
        retry_of_broadcast_id: audFilter?.retry_of_broadcast_id || null,
      };
    });

    // 5. Store breakdown: parallel count queries directly via Supabase inner joins
    const storeTags = (dbTags ?? []).filter((t) => t.name.toLowerCase().startsWith('store:'));
    const storeBreakdown = (
      await Promise.all(
        storeTags.map(async (st) => {
          const [tgtRes, delRes, failRes] = await Promise.all([
            admin
              .from('broadcast_recipients')
              .select('id, contact:contacts!inner(contact_tags!inner(tag_id))', { count: 'exact', head: true })
              .in('broadcast_id', bcIds)
              .eq('contact.contact_tags.tag_id', st.id),
            admin
              .from('broadcast_recipients')
              .select('id, contact:contacts!inner(contact_tags!inner(tag_id))', { count: 'exact', head: true })
              .in('broadcast_id', bcIds)
              .eq('contact.contact_tags.tag_id', st.id)
              .in('status', ['delivered', 'read', 'replied']),
            admin
              .from('broadcast_recipients')
              .select('id, contact:contacts!inner(contact_tags!inner(tag_id))', { count: 'exact', head: true })
              .in('broadcast_id', bcIds)
              .eq('contact.contact_tags.tag_id', st.id)
              .eq('status', 'failed')
              .not('error_message', 'ilike', '%pause%')
              .not('error_message', 'ilike', '%132015%'),
          ]);

          return {
            tag_id: st.id,
            tag_name: st.name.replace(/^Store:\s*/i, ''),
            color: st.color,
            targeted: tgtRes.count ?? 0,
            delivered: delRes.count ?? 0,
            read: 0,
            failed: failRes.count ?? 0,
          };
        })
      )
    ).filter((sb) => sb.targeted > 0);

    return NextResponse.json({
      template: {
        name: templateName,
        category: templateRow?.category ?? 'Marketing',
        language: templateRow?.language ?? broadcasts[0]?.template_language ?? 'en_US',
        status: templateRow?.status ?? 'APPROVED',
        body_text: templateRow?.body_text ?? '',
        footer_text: templateRow?.footer_text ?? '',
        buttons: templateRow?.buttons ?? [],
        header_type: templateRow?.header_type ?? 'none',
        header_content: templateRow?.header_content ?? '',
      },
      stats: {
        total_unique_contacts: totalUniqueContacts,
        net_sent: netSent,
        net_delivered: netDelivered,
        net_read: netRead,
        net_replied: netReplied,
        net_failed: netFailed,
        gross_recipients: grossRecipients,
        gross_delivered: grossDelivered,
        gross_read: grossRead,
        gross_failed: grossFailed,
        campaigns_count: broadcasts.length,
      },
      error_diagnostics: errorCounts,
      campaign_runs: campaignRuns,
      tags: dbTags ?? [],
      store_breakdown: storeBreakdown,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
