import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { sendWeeklyMenuEmail } from '@/lib/email';
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
const IGNORED_LIMIT = 3;   // consecutive unmet weeks before we pause and ask

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
    .select('user_id, email_token, week_start_day, auto_plan_ignored, auto_plan_paused')
    .eq('auto_plan', true)
    .eq('auto_plan_paused', false);

  const results: { email: string; status: string; detail?: string }[] = [];

  for (const s of subs || []) {
    const weekStart = typeof s.week_start_day === 'number' ? s.week_start_day : 1;
    if (!allDays && (weekStart + 6) % 7 !== today) continue;

    const { data: authUser } = await adminClient.auth.admin.getUserById(s.user_id);
    const email = authUser?.user?.email;
    if (!email) { results.push({ email: '(none)', status: 'skipped', detail: 'no address' }); continue; }

    // Stop condition. Mailing forever into an empty room costs money and
    // goodwill; ask once, then go quiet until they say otherwise.
    if ((s.auto_plan_ignored ?? 0) >= IGNORED_LIMIT) {
      if (!dryRun) {
        await adminClient.from('settings')
          .update({ auto_plan_paused: true }).eq('user_id', s.user_id);
      }
      results.push({ email, status: 'paused', detail: `${s.auto_plan_ignored} weeks unopened` });
      continue;
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
        },
      );
      results.push({ email, status: 'planned + sent', detail: `${meals.length} meals` });
    } catch (e: any) {
      results.push({ email, status: 'failed', detail: e.message });
    }
  }

  return NextResponse.json({ dryRun, day: today, count: results.length, results });
}
