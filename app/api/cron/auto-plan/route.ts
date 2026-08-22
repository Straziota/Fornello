import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { sendWeeklyMenuEmail, sendCheckInEmail } from '@/lib/email';
import {
  getSettings, getRecentMealNames, getDislikedMealNames, getPantryNames,
  getUserRecipeSummaries, getFeedbackAdjustments, getLovedMealNames,
  getNextWeekPicks, getGlobalRecipeSummaries, saveMenu, getGlobalRecipe,
  updateMealRecipe, updateMenuData, saveGlobalRecipeIfNew,
} from '@/lib/db';
import { generateMenu, generateMealRecipe, generateGroceryList } from '@/lib/claude';

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

// How long before the same silent household is asked again.
//
// Gated on engagement, not the calendar: anyone who taps anything has their
// clock reset by markMenuEngaged and never sees this. Six months rather than
// twelve weeks, because asking a happy household four times a year whether they
// still want you reads as insecure.
//
// A hard stop is NOT implemented, deliberately. When it is wanted the reason
// will be deliverability rather than cost — a tail of never-engaging accounts
// drags sender reputation, and the harm lands on the households who do want
// their Sunday menu. The evidence for that decision (asks sent, last engagement
// of any kind) is recorded from now so it can be made on data later.
const REASK_AFTER_DAYS = 180;

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
    .select('user_id, email_token, week_start_day, auto_plan_day, auto_plan_ignored, auto_plan_paused, auto_plan_asked_at, auto_plan_asks_sent, last_engaged_at')
    .eq('auto_plan', true)
    .eq('auto_plan_paused', false);

  const results: { email: string; status: string; detail?: string }[] = [];

  for (const s of subs || []) {
    // An explicit choice wins; otherwise the day before their week starts.
    const weekStart = typeof s.week_start_day === 'number' ? s.week_start_day : 1;
    const sendDay = typeof s.auto_plan_day === 'number' ? s.auto_plan_day : (weekStart + 6) % 7;
    if (!allDays && sendDay !== today) continue;

    const { data: authUser } = await adminClient.auth.admin.getUserById(s.user_id);
    const email = authUser?.user?.email;
    if (!email) { results.push({ email: '(none)', status: 'skipped', detail: 'no address' }); continue; }

    // Enough quiet weeks — ask, don't decide. Asked only once; we then wait for
    // an answer rather than sending this every week too.
    // Enough quiet weeks — ask once. Sent ALONGSIDE this week's plan, never
    // instead of it: the email says "if it's useful, do nothing — it'll keep
    // coming", so going quiet here would make that sentence false.
    const askedDaysAgo = s.auto_plan_asked_at
      ? (Date.now() - new Date(s.auto_plan_asked_at).getTime()) / 86_400_000
      : Infinity;
    const dueToAsk = (s.auto_plan_ignored ?? 0) >= ASK_AFTER
      && (!s.auto_plan_asked_at || askedDaysAgo >= REASK_AFTER_DAYS);

    if (dueToAsk) {
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
            .update({
              auto_plan_asked_at: new Date().toISOString(),
              auto_plan_asks_sent: (s.auto_plan_asks_sent ?? 0) + 1,
            }).eq('user_id', s.user_id);
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

      // generateMenu can return more than one meal for the same day, and the
      // app's own route repairs that afterwards. Auto-plan calls generateMenu
      // directly, so it has to do the same — otherwise a week arrives with
      // Monday listed twice.
      //
      // KNOWN GAP: /api/menu/generate also re-checks each meal against the
      // 12-week no-repeat list and enforces per-day cooking techniques,
      // regenerating where needed. That logic is inline in the route and is NOT
      // applied here, so an auto-planned week is weaker on both counts than one
      // generated in the app. It should be extracted and shared.
      const byDay = new Map<string, any>();
      for (const m of (menu.meals || [])) {
        if (!byDay.has(m.day)) byDay.set(m.day, m);
      }
      const enabled = new Set(
        Object.entries((settings as any).schedule || {})
          .filter(([, v]: any) => v?.enabled)
          .map(([d]) => d),
      );
      // Keep only days the household actually cooks; if the schedule is empty,
      // keep everything rather than silently sending nothing.
      (menu as any).meals = [...byDay.values()]
        .filter((m: any) => !enabled.size || enabled.has(m.day) || m.isLeftover);

      const menuId = await saveMenu(s.user_id, menu as any);

      // generateMenu returns names and descriptions only — the recipes and the
      // grocery list are separate steps that the app runs in the background
      // after a person presses Generate. Nobody is present here, so this must do
      // them itself: without it the email ships a list of dish names with no
      // ingredients, no method, no night-before prep and an empty shopping list,
      // which is the opposite of "everything you need is below".
      const loaded = await Promise.all(
        (menu.meals || []).filter((m: any) => !m.isLeftover).map(async (m: any) => {
          try {
            // Reuse a library recipe when we already have one — faster, cheaper,
            // and identical to what the app would serve.
            const existing = await getGlobalRecipe(m.name);
            if (existing) {
              await updateMealRecipe(s.user_id, menuId, m.day, existing);
              return { ...m, ...existing, recipeLoaded: true };
            }
            const recipe = await generateMealRecipe(
              apiKey, m, settings.familySize, (settings as any).prepSchedule,
              (settings as any).language, (settings as any).units,
              settings.restrictions || [], (settings as any).skipIngredients || [],
            );
            await updateMealRecipe(s.user_id, menuId, m.day, recipe);
            await saveGlobalRecipeIfNew({
              ...m, ...recipe, mealType: m.tags?.[0] || '',
              source_site: '', inspired_by: m.source_site || '',
            });
            return { ...m, ...recipe, recipeLoaded: true };
          } catch {
            return m;   // one failed recipe must not lose the week
          }
        }),
      );

      const fullMeals = (menu.meals || []).map((m: any) =>
        loaded.find((l: any) => l.day === m.day) || m,
      );
      let grocery_list: any = {};
      try {
        grocery_list = await generateGroceryList(apiKey, fullMeals, settings.familySize);
      } catch { /* a missing list is worth less than a missing week */ }
      await updateMenuData(s.user_id, menuId, { ...(menu as any), meals: fullMeals, grocery_list });
      (menu as any).meals = fullMeals;
      (menu as any).grocery_list = grocery_list;
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
          // Into the app, so the recipe opens in the real card — substitutions,
          // Chef Claude, scaling. Middleware carries a logged-out reader through
          // login and back to this exact dinner.
          mealUrl: `${appUrl}/this-week?meal=`,
        },
      );
      results.push({ email, status: 'planned + sent', detail: `${meals.length} meals` });
    } catch (e: any) {
      results.push({ email, status: 'failed', detail: e.message });
    }
  }

  return NextResponse.json({ dryRun, day: today, count: results.length, results });
}
