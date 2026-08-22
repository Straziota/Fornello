import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';

// Deliberately unauthenticated: the token IS the credential, and requiring a
// login to stop receiving email is a dark pattern. Also handles the POST that
// Gmail/Apple Mail send for one-click List-Unsubscribe.
export async function POST(req: NextRequest) {
  let token: string | undefined;
  try {
    token = (await req.json())?.token;
  } catch {
    // One-click unsubscribe posts a form body, not JSON.
    token = new URL(req.url).searchParams.get('t') || undefined;
  }
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  // Unsubscribe must stop EVERYTHING, not one mailer. It previously cleared
  // only weekly_email — the route that no longer exists — so clicking it would
  // have left the auto-planned weekly email still arriving, which is the only
  // one that actually sends. An unsubscribe that doesn't unsubscribe is worse
  // than no link at all.
  const { error, count } = await adminClient
    .from('settings')
    .update({
      auto_plan: false,
      auto_plan_paused: true,
      auto_plan_offer_answered_at: new Date().toISOString(),
    }, { count: 'exact' })
    .eq('email_token', token);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!count) return NextResponse.json({ error: 'Unknown token' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export const GET = POST;
