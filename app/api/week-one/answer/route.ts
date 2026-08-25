import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { analyseWeekOne } from '@/lib/week-one';
import { applyOffer, offerKey, type OfferKind } from '@/lib/day-offers';

// The check-in is reached from an email, so it authenticates on the same
// per-household token the weekly menu links use. Nobody should have to log in
// to answer a question we asked them.
async function userFor(token: string | null) {
  if (!token) return null;
  const { data } = await adminClient
    .from('settings').select('user_id').eq('email_token', token).maybeSingle();
  return data?.user_id ?? null;
}

// GET — the questions, so the page shows exactly what the email promised.
export async function GET(req: NextRequest) {
  const userId = await userFor(req.nextUrl.searchParams.get('token'));
  if (!userId) return NextResponse.json({ error: 'That link has expired.' }, { status: 401 });
  const week = await analyseWeekOne(userId);
  return NextResponse.json(week ?? { silent: true, questions: [], suggestion: null });
}

// POST — one answer, one setting. Answers are applied as they are tapped rather
// than collected and submitted: a check-in someone abandons halfway should still
// have kept what they told us.
export async function POST(req: NextRequest) {
  const userId = await userFor(req.nextUrl.searchParams.get('token'));
  if (!userId) return NextResponse.json({ error: 'That link has expired.' }, { status: 401 });

  const { kind, day, value } = await req.json() as
    { kind: OfferKind | 'none'; day?: string; value?: number | string };

  if (kind === 'none' || !day) return NextResponse.json({ ok: true, changed: false });

  const { data } = await adminClient
    .from('settings').select('schedule, day_offers').eq('user_id', userId).maybeSingle();

  const schedule = applyOffer(data?.schedule || {}, { day, kind, value, question: '', accept: '' });
  const log = { ...(data?.day_offers || {}), [offerKey(day, kind)]: 'accepted' as const };

  const { error } = await adminClient
    .from('settings').update({ schedule, day_offers: log }).eq('user_id', userId);
  if (error) {
    // The schedule is the point; the log is bookkeeping. Retry without it
    // rather than lose the answer someone just gave us.
    const { error: retry } = await adminClient
      .from('settings').update({ schedule }).eq('user_id', userId);
    if (retry) return NextResponse.json({ error: retry.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, changed: true });
}
