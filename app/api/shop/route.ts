import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { markMenuEngaged } from '@/lib/db';

// The week's shopping list, openable from the email without logging in.
//
// This is the one thing in the email genuinely worth tapping: a list you want on
// your phone in the shop, not on paper. Someone actually cooking from the email
// has a real reason to open it — so engagement data improves as a side effect of
// the email being more useful, rather than by tracking harder. Which matters,
// because Apple Mail Privacy Protection would report a pixel as opened by
// everyone, always.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const { data: s } = await adminClient
    .from('settings').select('user_id').eq('email_token', token).maybeSingle();
  if (!s) return NextResponse.json({ error: 'Unknown link' }, { status: 404 });

  const { data: menu } = await adminClient
    .from('menus').select('id, week_start, data').eq('user_id', s.user_id)
    .order('week_start', { ascending: false }).limit(1).maybeSingle();
  if (!menu) return NextResponse.json({ error: 'No current list' }, { status: 404 });

  // Opening the list in the shop is about as engaged as a household gets.
  await markMenuEngaged(s.user_id, menu.id);

  const list = (menu.data as any)?.grocery_list || {};
  const categories = Object.entries(list)
    .map(([category, items]) => ({
      category,
      items: (items as any[]).map(i => ({ item: i.item, amount: i.amount })).filter(i => i.item),
    }))
    .filter(c => c.items.length);

  return NextResponse.json({ weekStart: menu.week_start, categories });
}
