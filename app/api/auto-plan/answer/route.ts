import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';

// Their answer to "still want these?". Token-authenticated, no login — the
// whole value of asking is that answering costs one tap.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('t');
  const answer = url.searchParams.get('a');
  if (!token || !['yes', 'no'].includes(answer || '')) {
    return NextResponse.redirect(new URL('/rated?ok=0', url.origin));
  }

  const { data: s } = await adminClient
    .from('settings').select('user_id').eq('email_token', token).maybeSingle();
  if (!s) return NextResponse.redirect(new URL('/rated?ok=0', url.origin));

  const yes = answer === 'yes';
  await adminClient.from('settings').update({
    auto_plan: yes,
    auto_plan_paused: !yes,
    // Either answer clears the streak and the asked-at stamp: yes is a fresh
    // start, and no means we won't be counting anything for a while.
    auto_plan_ignored: 0,
    auto_plan_asked_at: null,
  }).eq('user_id', s.user_id);

  return NextResponse.redirect(new URL(`/answered?a=${answer}`, url.origin));
}
