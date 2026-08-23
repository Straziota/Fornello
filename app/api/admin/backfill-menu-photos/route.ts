import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { sameDishForPhoto } from '@/lib/photo-match';

export const maxDuration = 300;

// Points already-saved menus at the library's illustrations.
//
// A menu stores a COPY of each meal's photo_url, taken when it was generated.
// So illustrating the library does not reach backwards: every existing menu
// still shows the Pexels photograph it was saved with, and a household would
// keep seeing stock images until they generated a fresh week.
//
// Matching uses the same stricter rule as the resolver — three shared tokens and
// equal protein sets — so a meal cannot inherit the wrong dish's picture.
//
// Dry by default.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get('write') !== '1';

  const { data: library } = await adminClient
    .from('global_recipes').select('name, photo_url')
    .neq('category', 'side')
    .not('photo_url', 'is', null).neq('photo_url', '');
  const illustrated = (library || []).filter(r => (r.photo_url || '').includes('/illustrations/'));

  const { data: menus } = await adminClient.from('menus').select('id, week_start, data');

  let updatedMenus = 0, updatedMeals = 0, unmatched: string[] = [];

  for (const m of menus || []) {
    const data = m.data as any;
    let changed = false;
    for (const meal of (data.meals || [])) {
      if (meal.isLeftover) continue;
      if ((meal.photo_url || '').includes('/illustrations/')) continue;
      const hit = illustrated.find(r => sameDishForPhoto(meal.name || '', r.name));
      if (hit) {
        meal.photo_url = hit.photo_url;
        changed = true; updatedMeals++;
      } else if (meal.name) {
        unmatched.push(meal.name);
      }
    }
    if (changed) {
      updatedMenus++;
      if (!dry) await adminClient.from('menus').update({ data }).eq('id', m.id);
    }
  }

  return NextResponse.json({
    dryRun: dry, menus: menus?.length ?? 0, updatedMenus, updatedMeals,
    // Named rather than counted: a meal with no library match keeps its old
    // photo, and that is worth seeing rather than silently leaving behind.
    unmatched: [...new Set(unmatched)].slice(0, 25),
  });
}
