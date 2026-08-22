import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { sendWeeklyMenuEmail, sendCheckInEmail } from '@/lib/email';
import {
  getSettings, getRecentMealNames, getDislikedMealNames, getPantryNames,
  getUserRecipeSummaries, getFeedbackAdjustments, getLovedMealNames,
  getNextWeekPicks, getGlobalRecipeSummaries, saveMenu,
} from '@/lib/db';
import { generateMenu } from '@/lib/claude';

export const maxDuration = 300;

// Fornello plans the coming week and emails it, unasked.
//
// This is the point of the thing: the household never has to remember to come
// back, because the week arrives. Which also makes it the most dangerous route
// in the app — it spends money and produces food with nobody present. Hence:
// opt-in only, dry run by default, a stop condition, and the same allergen
// guard every other food surface carries (via generateMenu).
//
// Runs daily; each household is picked up the day before ITS week starts.
// Consecutive weeks with no click before we ASK — once. Nothing pauses on a
// count, and silence never stops anything: the email says "if it's useful, do
// nothing — it'll keep coming", so only an explicit tap on "Stop sending" ends
// it. Treating silence as a no would make that sentence false, and would read
// the one signal we know to be unreadable:
// pausing is a guess about someone's behaviour, and the guess is unreliable in
// the one direction that matters — Apple Mail Privacy Protection pre-fetches
// images, so a tracking pixel would report every household as engaged, always.
// Someone who reads the email each Sunday and cooks from it without ever tapping
// looks identical to someone who stopped caring. So we ask them, once, and let
// the answer decide.
const ASK_AFTER = 5;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const isVercelCron = req.headers.get('x-vercel-cron') !== null;
  if (!isVercelCron && (!secret || auth !== `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('send') !== '1';
  const allDays = req.nextUrl.searchParams.get('allDays') === '1';
  const dayParam = req.nextUrl.searchParams.get('day');
  const today = dayParam !== null ? Number(dayParam) : new Date().getUTCDay();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVITE_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fornello.app';
  if (!apiKey || !resendKey || !fromEmail) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  const { data: subs } = await adminClient
    .from('settings')
    .select('user_id, email_token, week_start_day, auto_plan_ignored, auto_plan_paused, auto_plan_asked_at')
    .eq('auto_plan', true)
    .eq('auto_plan_paused', false);

  const results: { email: string; status: string; detail?: string }[] = [];

  for (const s of subs || []) {
    const weekStart = typeof s.week_start_day === 'number' ? s.week_start_day : 1;
    if (!allDays && (weekStart + 6) % 7 !== today) continue;

    const { data: authUser } = await adminClient.auth.admin.getUserById(s.user_id);
    const email = authUser?.user?.email;
    if (!email) { results.push({ email: '(none)', status: 'skipped', detail: 'no address' }); continue; }

    // Enough quiet weeks — ask, don't decide. Asked only once; we then wait for
    // an answer rather than sending this every week too.
    // Enough quiet weeks — ask once. Sent ALONGSIDE this week's plan, never
    // instead of it: the email says "if it's useful, do nothing — it'll keep
    // coming", so going quiet here would make that sentence false.
    if ((s.auto_plan_ignored ?? 0) >= ASK_AFTER && !s.auto_plan_asked_at) {
      if (dryRun) {
        results.push({ email, status: 'would ask + still plan', detail: `${s.auto_plan_ignored} quiet weeks` });
      } else {
        try {
          await sendCheckInEmail(
            { resendApiKey: resendKey, fromEmail, fromName: process.env.INVITE_FROM_NAME || 'Fornello' },
            email,
            {
              weeksSent: s.auto_plan_ignored ?? 0,
              yesUrl: `${appUrl}/api/auto-plan/answer?t=${s.email_token}&a=yes`,
              noUrl: `${appUrl}/api/auto-plan/answer?t=${s.email_token}&a=no`,
              unsubscribeUrl: `${appUrl}/unsubscribe?t=${s.email_token}`,
            },
          );
          await adminClient.from('settings')
            .update({ auto_plan_asked_at: new Date().toISOString() }).eq('user_id', s.user_id);
          results.push({ email, status: 'asked, and still planning' });
        } catch (e: any) {
          // A failed question must not stop the week it was asking about.
          results.push({ email, status: 'ask failed', detail: e.message });
        }
      }
    }

    if (dryRun) {
      results.push({ email, status: 'would plan + send', detail: `ignored streak ${s.auto_plan_ignored ?? 0}` });
      continue;
    }

    try {
      const settings = await getSettings(s.user_id);
      const [recent, disliked, pantry, userRecipes, feedback, loved, picks, globals] = await Promise.all([
        getRecentMealNames(s.user_id, 12),
        getDislikedMealNames(s.user_id),
        getPantryNames(s.user_id),
        getUserRecipeSummaries(s.user_id),
        getFeedbackAdjustments(s.user_id),
        getLovedMealNames(s.user_id),
        getNextWeekPicks(s.user_id),
        getGlobalRecipeSummaries(),
      ]);

      // generateMenu carries the household's restrictions — the same allergen
      // guard every other food route uses. See scripts/allergen-coverage.py.
      const menu = await generateMenu(
        settings as any, recent, disliked, pantry, userRecipes as any,
        apiKey, feedback, loved, picks, globals as any,
      );

      const menuId = await saveMenu(s.user_id, menu as any);
      // Mark it as Fornello's work, and deliberately NOT engaged: whether a
      // human meets this week is exactly what we must not assume.
      await adminClient.from('menus')
        .update({ auto_planned: true }).eq('id', menuId);
      await adminClient.from('settings')
        .update({ auto_plan_ignored: (s.auto_plan_ignored ?? 0) + 1 })
        .eq('user_id', s.user_id);

      const meals = (menu.meals || []).filter((m: any) => !m.isLeftover);
      const groceries = Object.entries(menu.grocery_list || {})
        .map(([category, items]) => ({ category, items: (items as any[]).map(i => i.item).filter(Boolean) }))
        .filter(g => g.items.length);

      await sendWeeklyMenuEmail(
        { resendApiKey: resendKey, fromEmail, fromName: process.env.INVITE_FROM_NAME || 'Fornello' },
        email,
        {
          meals, groceries,
          weekLabel: `Week of ${menu.week_start}`,
          unsubscribeUrl: `${appUrl}/unsubscribe?t=${s.email_token}`,
          appUrl: `${appUrl}/this-week`,
          rateUrl: `${appUrl}/api/rate?t=${s.email_token}`,
          shopUrl: `${appUrl}/shop?t=${s.email_token}`,
        },
      );
      results.push({ email, status: 'planned + sent', detail: `${meals.length} meals` });
    } catch (e: any) {
      results.push({ email, status: 'failed', detail: e.message });
    }
  }

  return NextResponse.json({ dryRun, day: today, count: results.length, results });
}
