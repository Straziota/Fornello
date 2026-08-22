import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { sendWeeklyMenuEmail } from '@/lib/email';

export const maxDuration = 60;

// Sends each household its own week. Not "your menu is ready" — the menu.
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
    .select('user_id, weekly_email, email_token')
    .eq('weekly_email', true);

  const results: { email: string; status: string; detail?: string }[] = [];

  for (const s of subs || []) {
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
