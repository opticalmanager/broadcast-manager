import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/flows/admin-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Broadcast ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const targetCode: '131026' | '131049' | 'all' =
      body.targetCode === '131026'
        ? '131026'
        : body.targetCode === '131049'
          ? '131049'
          : 'all';

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = supabaseAdmin();

    // 1. Fetch broadcast to determine account_id
    const { data: broadcast, error: bcError } = await admin
      .from('broadcasts')
      .select('id, name, account_id')
      .eq('id', id)
      .single();

    if (bcError || !broadcast) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
    }

    const accountId = broadcast.account_id;
    if (!accountId) {
      return NextResponse.json({ error: 'Broadcast has no account association' }, { status: 400 });
    }

    // 2. Find or create the 'blacklisted' tag for this account
    const { data: existingTags, error: tagFetchErr } = await admin
      .from('tags')
      .select('id, name')
      .eq('account_id', accountId);

    if (tagFetchErr) {
      return NextResponse.json(
        { error: `Failed to query tags: ${tagFetchErr.message}` },
        { status: 500 }
      );
    }

    let tagId = (existingTags ?? []).find(
      (t: { name?: string | null }) => t.name?.trim().toLowerCase() === 'blacklisted'
    )?.id;

    if (!tagId) {
      const { data: newTag, error: tagCreateErr } = await admin
        .from('tags')
        .insert({
          account_id: accountId,
          user_id: user.id,
          name: 'blacklisted',
          color: '#ef4444',
        })
        .select('id')
        .single();

      if (tagCreateErr || !newTag) {
        return NextResponse.json(
          { error: `Failed to create blacklisted tag: ${tagCreateErr?.message}` },
          { status: 500 }
        );
      }
      tagId = newTag.id;
    }

    // 3. Fetch all contact IDs matching the target failure code
    const targetContactIds = new Set<string>();
    const PAGE_SIZE = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      let q = admin
        .from('broadcast_recipients')
        .select('contact_id, error_message')
        .eq('broadcast_id', id)
        .eq('status', 'failed');

      if (targetCode === '131026') {
        q = q.ilike('error_message', '%131026%');
      } else if (targetCode === '131049') {
        q = q.ilike('error_message', '%131049%');
      } else {
        q = q
          .not('error_message', 'ilike', '%pause%')
          .not('error_message', 'ilike', '%132015%');
      }

      const { data: rows, error: recErr } = await q.range(from, from + PAGE_SIZE - 1);

      if (recErr) {
        return NextResponse.json(
          { error: `Failed to query failed recipients: ${recErr.message}` },
          { status: 500 }
        );
      }

      if (!rows || rows.length === 0) {
        break;
      }

      for (const r of rows) {
        if (r.contact_id) {
          targetContactIds.add(r.contact_id);
        }
      }

      if (rows.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    }

    const label =
      targetCode === '131026'
        ? 'undeliverable (131026)'
        : targetCode === '131049'
          ? 'ecosystem engagement (131049)'
          : 'failed';

    const contactIdList = Array.from(targetContactIds);
    if (contactIdList.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: `No ${label} contacts found to blacklist`,
      });
    }

    // 4. Tag contacts in batches of 500
    const BATCH_SIZE = 500;
    for (let i = 0; i < contactIdList.length; i += BATCH_SIZE) {
      const batch = contactIdList.slice(i, i + BATCH_SIZE);
      const rowsToInsert = batch.map((cid) => ({
        contact_id: cid,
        tag_id: tagId,
      }));

      const { error: insertErr } = await admin
        .from('contact_tags')
        .upsert(rowsToInsert, { onConflict: 'contact_id,tag_id', ignoreDuplicates: true });

      if (insertErr) {
        return NextResponse.json(
          { error: `Failed to tag contacts as blacklisted: ${insertErr.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      count: contactIdList.length,
      tag_id: tagId,
      message: `Successfully blacklisted ${contactIdList.length} ${label} contacts`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
