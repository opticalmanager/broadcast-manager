// ============================================================
// POST /api/whatsapp/broadcast/[id]/pause
//
// Pauses an active in-flight broadcast. Marks the broadcast status
// as 'paused', flips any remaining 'pending' recipients to 'paused',
// and releases the delivery lock so it can be safely resumed later.
// ============================================================

import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { releaseBroadcastDelivery } from '@/lib/whatsapp/broadcast-resume';
import { supabaseAdmin } from '@/lib/flows/admin-client';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const { id } = await params;

    const { data: broadcast, error: fetchErr } = await supabase
      .from('broadcasts')
      .select('id, status')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle();

    if (fetchErr || !broadcast) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      );
    }

    if (broadcast.status !== 'sending') {
      return NextResponse.json(
        { error: `Only sending broadcasts can be paused. Current status: ${broadcast.status}` },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    // 1. Flip broadcast status to 'paused'
    const { error: updateBcErr } = await admin
      .from('broadcasts')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateBcErr) {
      return NextResponse.json(
        { error: `Failed to pause broadcast: ${updateBcErr.message}` },
        { status: 500 }
      );
    }

    // 2. Mark remaining pending recipients as 'paused' (with fallback if constraint not updated)
    const { error: recUpdateErr } = await admin
      .from('broadcast_recipients')
      .update({
        status: 'paused',
        error_message: 'Campaign paused by user',
      })
      .eq('broadcast_id', id)
      .eq('status', 'pending');

    if (recUpdateErr) {
      await admin
        .from('broadcast_recipients')
        .update({
          status: 'failed',
          error_message: '[Paused] Campaign paused by user',
        })
        .eq('broadcast_id', id)
        .eq('status', 'pending');
    }

    // 3. Release delivery lock
    await releaseBroadcastDelivery(admin, id);

    return NextResponse.json({
      success: true,
      broadcast_id: id,
      status: 'paused',
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
