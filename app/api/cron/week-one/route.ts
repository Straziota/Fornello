import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { analyseWeekOne } from '@/lib/week-one';
import { sendWeekOneCheckIn } from '@/lib/email';

export const maxDuration = 300;

// Seven days after a household's FIRST menu, once.
//
// Runs daily and selects on the date rather than firing from a timer at signup,
// so a deploy, an outage or a paused cron delays the check-in instead of losing
// it. Dry by default: ?send=1 arms it, the same as the auto-plan cron.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const send = req.nextUrl.searchParams.get('send') === '1';

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVITE_FROM_EMAIL;
  if (!resendApiKey || !fromEmail) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
  }
  const creds = { resendApiKey, fromEmail, fromName: process.env.INVITE_FROM_NAME || 'Fornello' };
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fornello.app';

  // Standalone only for households WITHOUT a weekly email. Anyone on auto-plan
  // gets the check-in folded into week two's menu instead — one message rather
  // than two in the same week. The split matters because the households most in
  // need of a check-in are exactly the ones subscribed to nothing, so this can
  // never simply become a section of the weekly mailer.
  const { data: households } = await adminClient
    .from('settings')
    .select('user_id, email_token, week_one_checkin_sent_at')
    .is('week_one_checkin_sent_at', null)
    .or('auto_plan.is.null,auto_plan.eq.false');

  const { data: list } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const email = Object.fromEntries((list?.users || []).map((u: { id: string; email?: string }) => [u.id, u.email]));

  const results: string[] = [];
  for (const h of households || []) {
    const week = await analyseWeekOne(h.user_id);
    if (!week) continue;                                    // never generated a menu

    // Seven days after the first menu, and not months after.
    //
    // Without an upper bound, the first armed run sends a "week one" check-in
    // to every household that ever generated a menu — including people whose
    // first week was four months ago. That is not a check-in, it is a cold
    // email wearing one, and it burns the one moment this message is credible.
    // Anyone already past the window has missed it; that is the correct
    // outcome, not a backlog to flush.
    const days = (Date.now() - new Date(week.firstMenuAt).getTime()) / 86_400_000;
    if (days < 7 || days > 21) continue;

    // Not silent, but nothing specific to say. Sending anyway would produce
    // "here's what I noticed" followed by nothing — a generic message wearing
    // a specific subject line, which is worse than not writing at all.
    if (!week.silent && !week.questions.length) {
      results.push(`skipped ${h.user_id}: nothing observed worth asking about`);
      continue;
    }

    const to = email[h.user_id];
    if (!to || !h.email_token) { results.push(`${h.user_id}: no address or token`); continue; }

    const shape = week.silent ? 'silent' : `${week.questions.length}q`;
    if (!send) { results.push(`would send [${shape}] -> ${to}`); continue; }

    try {
      await sendWeekOneCheckIn(creds, to, {
        silent: week.silent,
        questions: week.questions,
        suggestion: week.suggestion
          ? { ...week.suggestion, path: `${site}${week.suggestion.path}` }
          : null,
        answerUrl: `${site}/week-one?token=${h.email_token}`,
        unsubscribeUrl: `${site}/unsubscribe?token=${h.email_token}`,
      });
      await adminClient.from('settings')
        .update({ week_one_checkin_sent_at: new Date().toISOString() })
        .eq('user_id', h.user_id);
      results.push(`sent [${shape}] -> ${to}`);
    } catch (e) {
      results.push(`FAILED -> ${to}: ${(e as Error).message}`);
    }
  }
  return NextResponse.json({ dry: !send, results });
}
