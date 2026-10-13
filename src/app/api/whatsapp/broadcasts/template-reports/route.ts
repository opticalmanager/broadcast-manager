// ============================================================
// GET /api/whatsapp/broadcasts/template-reports
//
// Returns aggregated template-wise performance metrics for all
// templates used across broadcasts in the current account.
//
// Calculates:
//  - Total campaigns run with this template (initial + retries)
//  - De-duplicated Unique Contacts Targeted
//  - Net Unique Delivered, Read, and Permanently Failed
//  - Gross API delivery attempts
//  - Meta Template metadata (Category, Status, Language)
// ============================================================

import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/flows/admin-client';

export const dynamic = 'force-dynamic';

export interface TemplateSummaryItem {
  template_name: string;
  category: string;
  language: string;
  status: string;
  body_text?: string;
  campaigns_count: number;
  latest_campaign_at: string;
  first_campaign_at: string;
  total_unique_contacts: number;
  net_delivered: number;
  net_read: number;
  net_failed: number;
  net_delivery_rate: number;
  net_read_rate: number;
  gross_recipients: number;
  gross_delivered: number;
  gross_read: number;
  gross_failed: number;
}

export async function GET() {
  try {
    const { accountId } = await requireRole('viewer');
    const admin = supabaseAdmin();

    // 1. Fetch all broadcasts for this account
    const { data: broadcasts, error: bcError } = await admin
      .from('broadcasts')
      .select(`
        id,
        name,
        template_name,
        template_language,
        total_recipients,
        sent_count,
        delivered_count,
        read_count,
        replied_count,
        failed_count,
        paused_count,
        status,
        created_at
      `)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (bcError) {
      return NextResponse.json({ error: bcError.message }, { status: 500 });
    }

    if (!broadcasts || broadcasts.length === 0) {
      return NextResponse.json({ templates: [] });
    }

    // 2. Group broadcasts by template_name
    const templateGroups = new Map<string, typeof broadcasts>();
    for (const b of broadcasts) {
      if (!b.template_name) continue;
      const group = templateGroups.get(b.template_name) ?? [];
      group.push(b);
      templateGroups.set(b.template_name, group);
    }

    // 3. Fetch template metadata from message_templates
    const templateNames = Array.from(templateGroups.keys());
    const { data: dbTemplates } = await admin
      .from('message_templates')
      .select('name, category, language, status, body_text')
      .eq('account_id', accountId)
      .in('name', templateNames);

    const metaMap = new Map<string, { category: string; language: string; status: string; body_text?: string }>();
    for (const t of dbTemplates ?? []) {
      metaMap.set(t.name, {
        category: t.category ?? 'Marketing',
        language: t.language ?? 'en_US',
        status: t.status ?? 'APPROVED',
        body_text: t.body_text ?? '',
      });
    }

    // 4. For each template group, aggregate net metrics and gross metrics
    const results: TemplateSummaryItem[] = [];

    for (const [tplName, bcs] of templateGroups.entries()) {
      const bcIds = bcs.map((b) => b.id);
      const meta = metaMap.get(tplName);

      let grossRecipients = 0;
      let grossDelivered = 0;
      let grossRead = 0;
      let grossFailed = 0;

      for (const b of bcs) {
        grossRecipients += b.total_recipients ?? 0;
        grossDelivered += b.delivered_count ?? 0;
        grossRead += b.read_count ?? 0;
        grossFailed += b.failed_count ?? 0;
      }

      // Query recipients to compute net de-duplicated unique contact outcomes
      // Paged in chunks to handle medium/large recipient sets smoothly
      const contactBestStatus = new Map<string, string>();
      let from = 0;
      const CHUNK = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: recRows, error: recErr } = await admin
          .from('broadcast_recipients')
          .select('contact_id, status')
          .in('broadcast_id', bcIds)
          .range(from, from + CHUNK - 1);

        if (recErr || !recRows || recRows.length === 0) {
          break;
        }

        for (const r of recRows) {
          if (!r.contact_id) continue;
          const currentBest = contactBestStatus.get(r.contact_id);

          // Status precedence: read > delivered > sent > replied > paused > pending > failed
          if (!currentBest) {
            contactBestStatus.set(r.contact_id, r.status);
          } else if (r.status === 'read') {
            contactBestStatus.set(r.contact_id, 'read');
          } else if (r.status === 'delivered' && currentBest !== 'read') {
            contactBestStatus.set(r.contact_id, 'delivered');
          } else if (
            r.status === 'sent' &&
            currentBest !== 'read' &&
            currentBest !== 'delivered'
          ) {
            contactBestStatus.set(r.contact_id, 'sent');
          } else if (
            currentBest === 'failed' &&
            r.status !== 'failed'
          ) {
            contactBestStatus.set(r.contact_id, r.status);
          }
        }

        if (recRows.length < CHUNK) {
          hasMore = false;
        } else {
          from += CHUNK;
        }
      }

      const totalUniqueContacts = contactBestStatus.size;
      let netDelivered = 0;
      let netRead = 0;
      let netFailed = 0;

      for (const st of contactBestStatus.values()) {
        if (st === 'read' || st === 'delivered' || st === 'replied') {
          netDelivered++;
        }
        if (st === 'read') {
          netRead++;
        }
        if (st === 'failed') {
          netFailed++;
        }
      }

      const netDeliveryRate = totalUniqueContacts > 0
        ? Math.round((netDelivered / totalUniqueContacts) * 100)
        : 0;

      const netReadRate = totalUniqueContacts > 0
        ? Math.round((netRead / totalUniqueContacts) * 100)
        : 0;

      const latestCampaignAt = bcs[0]?.created_at ?? '';
      const firstCampaignAt = bcs[bcs.length - 1]?.created_at ?? '';

      results.push({
        template_name: tplName,
        category: meta?.category ?? 'Marketing',
        language: meta?.language ?? bcs[0]?.template_language ?? 'en_US',
        status: meta?.status ?? 'APPROVED',
        body_text: meta?.body_text,
        campaigns_count: bcs.length,
        latest_campaign_at: latestCampaignAt,
        first_campaign_at: firstCampaignAt,
        total_unique_contacts: totalUniqueContacts,
        net_delivered: netDelivered,
        net_read: netRead,
        net_failed: netFailed,
        net_delivery_rate: netDeliveryRate,
        net_read_rate: netReadRate,
        gross_recipients: grossRecipients,
        gross_delivered: grossDelivered,
        gross_read: grossRead,
        gross_failed: grossFailed,
      });
    }

    // Sort by latest campaign date descending
    results.sort(
      (a, b) =>
        new Date(b.latest_campaign_at).getTime() -
        new Date(a.latest_campaign_at).getTime()
    );

    return NextResponse.json({ templates: results });
  } catch (err) {
    return toErrorResponse(err);
  }
}
