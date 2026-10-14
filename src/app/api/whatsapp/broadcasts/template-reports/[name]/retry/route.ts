// ============================================================
// POST /api/whatsapp/broadcasts/template-reports/[name]/retry
//
// Creates a consolidated retry broadcast for ALL contacts that
// permanently failed across every campaign run of this template.
//
// Steps:
//  1. Finds all contact_ids targeted by any campaign with this template.
//  2. Excludes any contacts who were ever delivered or read in ANY run.
//  3. Excludes contacts with the 'blacklisted' tag.
//  4. Inserts a new Broadcast: `[Consolidated Retry] {Template Name}`.
//  5. Inserts candidate recipients as 'pending'.
//  6. Triggers server-side background delivery pass via after().
//  7. Returns new broadcast ID so the caller can view live progress.
// ============================================================

import { NextResponse, after } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { getBlacklistedContactIds } from '@/lib/contacts/blacklist';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import {
  claimBroadcastDelivery,
  planBroadcastResume,
  releaseBroadcastDelivery,
} from '@/lib/whatsapp/broadcast-resume';
import { deliverBroadcast, finalizeBroadcastStatus } from '@/lib/whatsapp/broadcast-core';
import { invalidateTemplateAudienceCache } from '@/lib/broadcasts/template-audience-cache';

export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { accountId, userId } = await requireRole('agent');
    const { name } = await params;
    const templateName = decodeURIComponent(name);

    const limit = checkRateLimit(
      `broadcast-retry-template:${userId}`,
      RATE_LIMITS.broadcast
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = await request.json().catch(() => ({}));
    const customName: string | undefined =
      typeof body.name === 'string' ? body.name.trim() : undefined;

    const admin = supabaseAdmin();

    // 1. Fetch all broadcasts that used this template
    const { data: broadcasts, error: bcErr } = await admin
      .from('broadcasts')
      .select('*')
      .eq('account_id', accountId)
      .eq('template_name', templateName)
      .order('created_at', { ascending: false });

    if (bcErr || !broadcasts || broadcasts.length === 0) {
      return NextResponse.json(
        { error: `No broadcasts found for template '${templateName}'` },
        { status: 404 }
      );
    }

    const latestBc = broadcasts[0];
    const bcIds = broadcasts.map((b) => b.id);

    // 2. Collect contacts and their outcomes across all sibling broadcasts
    const contactBestStatus = new Map<string, string>();
    const contactLatestParams = new Map<string, unknown>();

    let from = 0;
    const CHUNK = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: recRows, error: recErr } = await admin
        .from('broadcast_recipients')
        .select('contact_id, status, template_params, created_at')
        .in('broadcast_id', bcIds)
        .range(from, from + CHUNK - 1);

      if (recErr || !recRows || recRows.length === 0) break;

      for (const r of recRows) {
        if (!r.contact_id) continue;
        if (r.template_params) {
          contactLatestParams.set(r.contact_id, r.template_params);
        }

        const STATUS_PRIORITY: Record<string, number> = {
          replied: 50,
          read: 40,
          delivered: 30,
          sent: 20,
          failed: 10,
          paused: 5,
          pending: 1,
        };

        const currentBest = contactBestStatus.get(r.contact_id);
        const rPriority = STATUS_PRIORITY[r.status] ?? 0;

        if (!currentBest) {
          contactBestStatus.set(r.contact_id, r.status);
        } else {
          const currentPriority = STATUS_PRIORITY[currentBest] ?? 0;
          if (rPriority > currentPriority) {
            contactBestStatus.set(r.contact_id, r.status);
          }
        }
      }

      if (recRows.length < CHUNK) {
        hasMore = false;
      } else {
        from += CHUNK;
      }
    }

    // 3. Candidates: Contacts whose best status is strictly 'failed' or 'paused'
    // (i.e. they NEVER achieved delivered or read status in any run)
    const candidateContactIds: string[] = [];
    for (const [cid, st] of contactBestStatus.entries()) {
      if (st === 'failed' || st === 'paused' || st === 'pending') {
        candidateContactIds.push(cid);
      }
    }

    if (candidateContactIds.length === 0) {
      return NextResponse.json(
        { error: 'All contacts targeted with this template have already been delivered or read.' },
        { status: 400 }
      );
    }

    // 4. Exclude blacklisted contacts
    const blacklisted = await getBlacklistedContactIds(admin, accountId);
    const sendableIds = candidateContactIds.filter((cid) => !blacklisted.has(cid));

    if (sendableIds.length === 0) {
      return NextResponse.json(
        {
          error: 'All failed contacts are tagged as blacklisted and cannot be retried.',
        },
        { status: 400 }
      );
    }

    // 5. Create new consolidated retry broadcast
    const retryBroadcastName =
      customName ||
      `[Consolidated Retry] ${latestBc.template_name} (${new Date().toLocaleDateString()})`;

    const { data: newBroadcast, error: createBcErr } = await admin
      .from('broadcasts')
      .insert({
        user_id: userId,
        account_id: accountId,
        name: retryBroadcastName,
        template_name: latestBc.template_name,
        template_language: latestBc.template_language || 'en_US',
        template_variables: latestBc.template_variables || {},
        audience_filter: {
          consolidated_retry: true,
          template_name: latestBc.template_name,
          source_broadcast_ids: bcIds,
        },
        status: 'sending',
        total_recipients: sendableIds.length,
        sent_count: 0,
        delivered_count: 0,
        read_count: 0,
        replied_count: 0,
        failed_count: 0,
      })
      .select('id, name')
      .single();

    if (createBcErr || !newBroadcast) {
      return NextResponse.json(
        { error: `Failed to create retry broadcast: ${createBcErr?.message}` },
        { status: 500 }
      );
    }

    // 6. Insert new recipient rows in chunks of 1000
    const newRecipientRows = sendableIds.map((cid) => ({
      broadcast_id: newBroadcast.id,
      contact_id: cid,
      status: 'pending' as const,
      template_params: contactLatestParams.get(cid) ?? latestBc.template_variables ?? [],
    }));

    const INSERT_CHUNK = 1000;
    for (let i = 0; i < newRecipientRows.length; i += INSERT_CHUNK) {
      const chunk = newRecipientRows.slice(i, i + INSERT_CHUNK);
      const { error: insertErr } = await admin
        .from('broadcast_recipients')
        .insert(chunk);

      if (insertErr) {
        console.error('[template-retry] recipient insert error:', insertErr);
        await admin
          .from('broadcasts')
          .update({ status: 'failed' })
          .eq('id', newBroadcast.id);
        return NextResponse.json(
          { error: `Failed to insert recipients: ${insertErr.message}` },
          { status: 500 }
        );
      }
    }

    // 7. Background delivery fanout via after()
    after(async () => {
      try {
        await claimBroadcastDelivery(admin, accountId, newBroadcast.id);
        while (true) {
          const res = await planBroadcastResume(
            admin,
            accountId,
            newBroadcast.id,
            'pending'
          ).catch((err) => {
            console.error('[template-retry] plan error in background delivery pass:', err);
            return null;
          });

          if (!res || res.plan.planned.length === 0) break;
          await deliverBroadcast(admin, res.plan);
          if (res.remaining === 0) break;
        }
      } catch (err) {
        console.error('[template-retry] background delivery pass failed:', err);
      } finally {
        await finalizeBroadcastStatus(admin, newBroadcast.id).catch(() => {});
        await releaseBroadcastDelivery(admin, newBroadcast.id).catch(() => {});
      }
    });

    invalidateTemplateAudienceCache(accountId, templateName);

    return NextResponse.json(
      {
        success: true,
        retry_broadcast_id: newBroadcast.id,
        retry_broadcast_name: newBroadcast.name,
        recipient_count: sendableIds.length,
        excluded_blacklisted: candidateContactIds.length - sendableIds.length,
      },
      { status: 201 }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
