// ============================================================
// POST /api/whatsapp/broadcast/[id]/retry-campaign
//
// Creates a dedicated Retry Broadcast for paused or failed contacts
// of an existing campaign.
//
// Clones the unsent/paused recipients into a new broadcast record
// with smart de-duplication against the template, launches delivery
// in the background, and gives the caller a real broadcast ID so
// the retry has its own full analytics dashboard, funnel reports,
// rate tracking, and recipient list.
// ============================================================

import { NextResponse } from 'next/server';
import { after } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { deliverBroadcast } from '@/lib/whatsapp/broadcast-core';
import { planBroadcastResume } from '@/lib/whatsapp/broadcast-resume';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { isPausedRecipient } from '@/lib/broadcast-status';
import { getBlacklistedContactIds } from '@/lib/contacts/blacklist';
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';

export const maxDuration = 300;

interface CandidateRow {
  id: string;
  contact_id: string | null;
  status: string | null;
  error_message: string | null;
  template_params: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent');
    const { id } = await params;

    const limit = checkRateLimit(
      `broadcast-retry-campaign:${userId}`,
      RATE_LIMITS.broadcast
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = await request.json().catch(() => ({}));
    const scope: 'paused' | 'failed' = body.scope === 'failed' ? 'failed' : 'paused';
    const customName: string | undefined = typeof body.name === 'string' ? body.name.trim() : undefined;

    // 1. Fetch original broadcast
    const { data: original, error: origError } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle();

    if (origError || !original) {
      return NextResponse.json(
        { error: 'Original broadcast not found' },
        { status: 404 }
      );
    }

    const admin = supabaseAdmin();

    // 2. Fetch all recipients from original broadcast
    // Page through if backlog exceeds 1,000 rows
    const allRecipients: CandidateRow[] = [];
    const PAGE_SIZE = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error: recError } = await admin
        .from('broadcast_recipients')
        .select('id, contact_id, status, error_message, template_params')
        .eq('broadcast_id', id)
        .range(from, from + PAGE_SIZE - 1)
        .order('created_at', { ascending: true });

      if (recError) {
        return NextResponse.json(
          { error: `Failed to load recipients: ${recError.message}` },
          { status: 500 }
        );
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      allRecipients.push(...(data as CandidateRow[]));
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    }

    // 3. Filter candidates based on scope:
    // For 'paused':
    //   - status = 'paused'
    //   - status = 'failed' with pause error
    //   - status = 'pending' if original broadcast is paused
    // For 'failed':
    //   - status = 'failed' and NOT paused
    const candidates = allRecipients.filter((r) => {
      if (scope === 'failed') {
        return r.status === 'failed' && !isPausedRecipient(r);
      }
      if (scope === 'paused') {
        if (original.status === 'paused' && r.status === 'pending') return true;
        return isPausedRecipient(r);
      }
      return false;
    });

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          error:
            scope === 'paused'
              ? 'This broadcast has no paused contacts to retry'
              : 'This broadcast has no failed contacts to retry',
        },
        { status: 400 }
      );
    }

    // 4. Smart De-duplication against other broadcasts with the same template
    const targetContactIds = Array.from(
      new Set(
        candidates
          .map((r) => r.contact_id)
          .filter((cid): cid is string => Boolean(cid))
      )
    );

    const alreadyDeliveredSet = new Set<string>();

    if (targetContactIds.length > 0) {
      const { data: siblingBroadcasts } = await admin
        .from('broadcasts')
        .select('id')
        .eq('account_id', accountId)
        .eq('template_name', original.template_name);

      const siblingIds = (siblingBroadcasts ?? []).map((b) => b.id);
      if (siblingIds.length > 0) {
        const CHUNK = 500;
        for (let i = 0; i < siblingIds.length; i += CHUNK) {
          const bcastChunk = siblingIds.slice(i, i + CHUNK);
          for (let j = 0; j < targetContactIds.length; j += CHUNK) {
            const contactChunk = targetContactIds.slice(j, j + CHUNK);
            const { data: recRows } = await admin
              .from('broadcast_recipients')
              .select('contact_id')
              .in('broadcast_id', bcastChunk)
              .in('contact_id', contactChunk)
              .in('status', ['sent', 'delivered', 'read', 'replied']);

            for (const r of recRows ?? []) {
              if (r.contact_id) alreadyDeliveredSet.add(r.contact_id);
            }
          }
        }
      }
    }

    const blacklistedContactIds = await getBlacklistedContactIds(admin, accountId);

    const sendableCandidates = candidates.filter(
      (c) =>
        (!c.contact_id || !alreadyDeliveredSet.has(c.contact_id)) &&
        (!c.contact_id || !blacklistedContactIds.has(c.contact_id))
    );
    const deduplicatedCount = candidates.length - sendableCandidates.length;

    if (sendableCandidates.length === 0) {
      return NextResponse.json(
        {
          error:
            'All candidate contacts were excluded (already received template or are blacklisted).',
          deduplicated_count: deduplicatedCount,
        },
        { status: 400 }
      );
    }

    // 5. Create new Retry Broadcast row
    const retryBroadcastName =
      customName ||
      `${original.name} (Retry ${scope === 'paused' ? 'Paused' : 'Failed'})`;

    const originalAudienceFilter =
      typeof original.audience_filter === 'object' && original.audience_filter
        ? original.audience_filter
        : {};

    const { data: newBroadcast, error: createBcErr } = await admin
      .from('broadcasts')
      .insert({
        user_id: userId,
        account_id: accountId,
        name: retryBroadcastName,
        template_name: original.template_name,
        template_language: original.template_language,
        template_variables: original.template_variables,
        audience_filter: {
          ...originalAudienceFilter,
          retry_of_broadcast_id: original.id,
          retry_of_broadcast_name: original.name,
          retry_scope: scope,
        },
        status: 'sending',
        total_recipients: sendableCandidates.length,
        sent_count: 0,
        delivered_count: 0,
        read_count: 0,
        replied_count: 0,
        failed_count: 0,
      })
      .select()
      .single();

    if (createBcErr || !newBroadcast) {
      return NextResponse.json(
        { error: `Failed to create retry broadcast: ${createBcErr?.message}` },
        { status: 500 }
      );
    }

    // 6. Insert recipient rows for the new broadcast
    const newRecipientRows = sendableCandidates.map((c) => ({
      broadcast_id: newBroadcast.id,
      contact_id: c.contact_id,
      status: 'pending' as const,
      template_params: c.template_params ?? [],
    }));

    const INSERT_CHUNK = 500;
    for (let i = 0; i < newRecipientRows.length; i += INSERT_CHUNK) {
      const chunk = newRecipientRows.slice(i, i + INSERT_CHUNK);
      const { error: insertErr } = await admin
        .from('broadcast_recipients')
        .insert(chunk);

      if (insertErr) {
        console.error('[retry-campaign] recipient insert error:', insertErr);
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

    // 7. Dispatch background delivery via after()
    after(async () => {
      try {
        const { plan } = await planBroadcastResume(
          admin,
          accountId,
          newBroadcast.id,
          'pending'
        );
        await deliverBroadcast(admin, plan);
      } catch (err) {
        console.error('[retry-campaign] background delivery pass failed:', err);
      }
    });

    return NextResponse.json(
      {
        success: true,
        retry_broadcast_id: newBroadcast.id,
        retry_broadcast_name: newBroadcast.name,
        recipient_count: sendableCandidates.length,
        deduplicated_count: deduplicatedCount,
      },
      { status: 201 }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
