import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { weekOneRecipients } from '@/lib/week-one-recipients';
import { sendWeekOneCheckIn, sendSilenceCheckIn } from '@/lib/email';

export const maxDuration = 300;

// The standalone check-in, for households without a weekly email of their own.
//
// Who is due is decided by weekOneRecipients(), shared with the preview script,
// because two implementations of "who gets mail" drift and the one that drifts
// silently is the report. Dry by default; ?send=1 arms it.
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

  const { due, skipped } = await weekOneRecipients();
  const results: string[] = [];

  for (const r of due) {
    if (!send) { results.push(`would send [${r.variant}] -> ${r.email}`); continue; }
    const unsubscribeUrl = `${site}/unsubscribe?token=${r.token}`;
    try {
      if (r.variant === 'questions') {
        await sendWeekOneCheckIn(creds, r.email, {
          silent: false,
          questions: r.week.questions,
          suggestion: r.week.suggestion
            ? { ...r.week.suggestion, path: `${site}${r.week.suggestion.path}` }
            : null,
          answerUrl: `${site}/week-one?token=${r.token}`,
          unsubscribeUrl,
        });
      } else {
        await sendSilenceCheckIn(creds, r.email, { variant: r.variant, unsubscribeUrl });
      }
      await adminClient.from('settings')
        .update({ week_one_checkin_sent_at: new Date().toISOString() })
        .eq('user_id', r.userId);
      results.push(`sent [${r.variant}] -> ${r.email}`);
    } catch (e) {
      results.push(`FAILED -> ${r.email}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({
    dry: !send,
    results,
    skipped: skipped.map(s => `${s.email} (${s.days.toFixed(0)}d): ${s.reason}`),
  });
}
