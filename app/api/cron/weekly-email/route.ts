import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { sendWeeklyMenuEmail } from '@/lib/email';

export const maxDuration = 60;

// Sends each household its own week, the day before that household's week
// starts — not everyone on Sunday. Most weeks start Monday, but not all, and an
// email that arrives mid-week reads as noise rather than a plan.
//
// So this runs DAILY and each household is filtered on the day: a Monday
// household is emailed on Sunday, a Saturday household on Friday.
//
// Defaults to a DRY RUN. ?send=1 is required to actually deliver, so a stray
// call, a misconfigured cron or a curious browser cannot mail real people.
export async function GET(req: NextRequest) {
  // Vercel Cron signs its calls; anything else must present the secret.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const isVercelCron = req.headers.get('x-vercel-cron') !== null;
  if (!isVercelCron && (!secret || auth !== `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('send') !== '1';
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVITE_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fornello.app';
  if (!apiKey || !fromEmail) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
  }

  const { data: subs } = await adminClient
    .from('settings')
    .select('user_id, weekly_email, email_token, week_start_day')
    .eq('weekly_email', true);

  // 0 = Sunday. `day` overrides today for testing a specific household's slot.
  const dayParam = req.nextUrl.searchParams.get('day');
  const today = dayParam !== null ? Number(dayParam) : new Date().getUTCDay();
  // Ignore the day filter entirely when previewing everyone.
  const allDays = req.nextUrl.searchParams.get('allDays') === '1';

  // A menu older than this is a past plan resurfacing, not "this week".
  const STALE_AFTER_DAYS = 14;

  const results: { email: string; status: string; detail?: string }[] = [];

  for (const s of subs || []) {
    const weekStart = typeof s.week_start_day === 'number' ? s.week_start_day : 1;
    const emailDay = (weekStart + 6) % 7;   // the day before their week begins
    if (!allDays && emailDay !== today) continue;

    // Only send a week that exists. A household with no current menu gets
    // nothing — an empty email is worse than silence.
    const { data: menu } = await adminClient
      .from('menus').select('week_start, data')
      .eq('user_id', s.user_id)
      .order('week_start', { ascending: false })
      .limit(1).maybeSingle();

    const meals = ((menu?.data as any)?.meals || []).filter((m: any) => !m.isLeftover);
    const { data: authUser } = await adminClient.auth.admin.getUserById(s.user_id);
    const email = authUser?.user?.email;

    if (!email) { results.push({ email: '(none)', status: 'skipped', detail: 'no address' }); continue; }
    if (!meals.length) { results.push({ email, status: 'skipped', detail: 'no current menu' }); continue; }

    // Don't mail someone April's dinners in August. A stale menu means they
    // stopped planning; resurfacing it looks neglected, not helpful.
    const ageDays = menu?.week_start
      ? Math.floor((Date.now() - new Date(menu.week_start).getTime()) / 86_400_000)
      : Infinity;
    if (ageDays > STALE_AFTER_DAYS) {
      results.push({ email, status: 'skipped', detail: `menu is ${ageDays} days old` });
      continue;
    }

    const groceryList = (menu?.data as any)?.grocery_list || {};
    const groceries = Object.entries(groceryList)
      .map(([category, items]) => ({
        category,
        items: (items as any[]).map(i => i.item).filter(Boolean),
      }))
      .filter(g => g.items.length);

    if (dryRun) {
      results.push({ email, status: 'would send', detail: `${meals.length} meals, ${groceries.length} aisles` });
      continue;
    }

    try {
      await sendWeeklyMenuEmail(
        { resendApiKey: apiKey, fromEmail, fromName: process.env.INVITE_FROM_NAME || 'Fornello' },
        email,
        {
          meals,
          groceries,
          weekLabel: `Week of ${menu?.week_start}`,
          unsubscribeUrl: `${appUrl}/unsubscribe?t=${s.email_token}`,
          appUrl: `${appUrl}/this-week`,
        },
      );
      results.push({ email, status: 'sent' });
    } catch (e: any) {
      results.push({ email, status: 'failed', detail: e.message });
    }
  }

  return NextResponse.json({ dryRun, count: results.length, results });
}
