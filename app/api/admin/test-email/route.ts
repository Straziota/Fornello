import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { sendWeeklyMenuEmail } from '@/lib/email';

// Sends ONE weekly-menu email to one address, for deliverability testing
// (mail-tester and similar).
//
// Deliberately not part of any mailer: it takes an explicit recipient, never
// reads the household list, and cannot iterate. Vercel's `env pull` returns ""
// for encrypted values, so the Resend key only works from inside a deployment —
// which is why this exists as a route rather than a local script.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const to = req.nextUrl.searchParams.get('to');
  if (!to) return NextResponse.json({ error: 'Pass ?to=<address>' }, { status: 400 });

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVITE_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fornello.app';
  if (!resendKey || !fromEmail) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
  }

  // Any real menu, so the test scores the HTML households actually receive.
  const { data: menu } = await adminClient
    .from('menus').select('week_start, data')
    .order('week_start', { ascending: false }).limit(1).maybeSingle();
  if (!menu) return NextResponse.json({ error: 'No menu to send' }, { status: 404 });

  const meals = ((menu.data as any)?.meals || []).filter((m: any) => !m.isLeftover);
  const groceries = Object.entries((menu.data as any)?.grocery_list || {})
    .map(([category, items]) => ({ category, items: (items as any[]).map(i => i.item).filter(Boolean) }))
    .filter(g => g.items.length);

  const token = 'deliverability-test';
  await sendWeeklyMenuEmail(
    { resendApiKey: resendKey, fromEmail, fromName: process.env.INVITE_FROM_NAME || 'Fornello' },
    to,
    {
      meals, groceries,
      weekLabel: `Week of ${menu.week_start}`,
      unsubscribeUrl: `${appUrl}/unsubscribe?t=${token}`,
      appUrl: `${appUrl}/this-week`,
      rateUrl: `${appUrl}/api/rate?t=${token}`,
      shopUrl: `${appUrl}/shop?t=${token}`,
      mealUrl: `${appUrl}/this-week?meal=`,
      groceriesUrl: `${appUrl}/groceries`,
    },
  );

  return NextResponse.json({ sent: to, meals: meals.length, aisles: groceries.length });
}
