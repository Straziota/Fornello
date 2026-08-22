import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { saveFeedback, markMenuEngaged } from '@/lib/db';

// One-click rating from the weekly email.
//
// Unauthenticated by design: the household's email token is the credential.
// Without this, a household that never opens the app never rates anything, and
// the six inputs that make Fornello personal — loved, never-again, notes — stay
// empty forever. The compounding loop has to survive someone who only ever
// reads the email.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('t');
  const meal = url.searchParams.get('m');
  const rating = url.searchParams.get('r');

  if (!token || !meal || !['liked', 'disliked'].includes(rating || '')) {
    return NextResponse.redirect(new URL('/rated?ok=0', url.origin));
  }

  const { data: s } = await adminClient
    .from('settings').select('user_id').eq('email_token', token).maybeSingle();
  if (!s) return NextResponse.redirect(new URL('/rated?ok=0', url.origin));

  await saveFeedback(s.user_id, { mealName: meal, rating: rating!, adjustments: '' });

  // Rating is engagement — it also clears the ignored streak.
  const { data: menu } = await adminClient
    .from('menus').select('id').eq('user_id', s.user_id)
    .order('week_start', { ascending: false }).limit(1).maybeSingle();
  if (menu?.id) await markMenuEngaged(s.user_id, menu.id);

  return NextResponse.redirect(
    new URL(`/rated?ok=1&r=${rating}&m=${encodeURIComponent(meal)}`, url.origin),
  );
}
