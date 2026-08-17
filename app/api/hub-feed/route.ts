import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { adminClient } from '@/lib/supabase-admin';

// Read-only feed for Randlehub (randlehub.com), which shows the week's dinners on its home page.
//
// This database holds OTHER PEOPLE'S accounts, so two rules apply and must not be relaxed:
//   1. The user is fixed by HUB_FEED_USER_ID on the server. The request cannot name a user.
//   2. Without HUB_FEED_TOKEN configured the route stays off entirely — it does not fall back to
//      "no auth required".
export const dynamic = 'force-dynamic';

type Meal = { day?: string; name?: string; cuisine?: string };

function authorized(req: Request): boolean {
  const expected = process.env.HUB_FEED_TOKEN;
  if (!expected) return false;
  const given = req.headers.get('x-hub-token') ?? '';
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userId = process.env.HUB_FEED_USER_ID;
  if (!userId) {
    return NextResponse.json({ error: 'HUB_FEED_USER_ID is not set' }, { status: 503 });
  }

  const { data, error } = await adminClient
    .from('menus')
    .select('week_start, data')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'query failed' }, { status: 502 });
  if (!data) return NextResponse.json({ weekStart: null, meals: [] });

  const meals: Meal[] = (data.data as { meals?: Meal[] })?.meals ?? [];
  return NextResponse.json({
    weekStart: data.week_start,
    meals: meals.map((m) => ({ day: m.day ?? '', name: m.name ?? '', cuisine: m.cuisine ?? '' })),
  });
}
