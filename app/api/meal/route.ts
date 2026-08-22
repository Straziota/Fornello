import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { markMenuEngaged } from '@/lib/db';

// One meal from the household's current week, openable from the email without
// logging in — the same token contract as the shopping list.
//
// A recipe link that demands a password is a recipe nobody reads: the moment
// someone taps a dinner from the Sunday email is the moment they want to cook
// it, not the moment they want to authenticate.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t');
  const day = req.nextUrl.searchParams.get('d');
  if (!token || !day) return NextResponse.json({ error: 'Missing token or day' }, { status: 400 });

  const { data: s } = await adminClient
    .from('settings').select('user_id').eq('email_token', token).maybeSingle();
  if (!s) return NextResponse.json({ error: 'Unknown link' }, { status: 404 });

  const { data: menu } = await adminClient
    .from('menus').select('id, week_start, data').eq('user_id', s.user_id)
    .order('week_start', { ascending: false }).limit(1).maybeSingle();
  if (!menu) return NextResponse.json({ error: 'No current week' }, { status: 404 });

  const meal = ((menu.data as any)?.meals || [])
    .find((m: any) => (m.day || '').toLowerCase() === day.toLowerCase());
  if (!meal) return NextResponse.json({ error: 'No meal that day' }, { status: 404 });

  // Opening a recipe is engagement — it keeps the household out of the quiet
  // streak and lets the no-repeat rule count this week as served.
  await markMenuEngaged(s.user_id, menu.id);

  return NextResponse.json({ meal, weekStart: menu.week_start });
}
