import { NextRequest, NextResponse } from 'next/server';
import { checkIsAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';

// Deletes every global recipe NOT originating from Fornello generation, admin,
// special-occasion, or heritage. Used to clean up the user-imports that were
// accidentally pushed into the global library.
//   ?mode=orphans : also deletes 'dinner' recipes whose names don't appear in
//                   any user's menu meals (catches backfill leftovers with empty
//                   source_site — but may also delete recipes orphaned by menu
//                   deletion).
export async function POST(req: NextRequest) {
  const ok = await checkIsAdmin();
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const mode = new URL(req.url).searchParams.get('mode') || 'standard';

  // Anything with origin = 'imported' OR origin = 'unknown' OR (origin IS NULL AND
  // source_site contains a URL) → import. The IS NULL fallback covers rows inserted
  // before the origin column existed.
  const { data: candidates, error: selErr } = await adminClient.from('global_recipes')
    .select('id, name, source_site, origin');
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  // Anything with a non-empty source_site that isn't literally "Fornello" is an import
  // or manual entry — Fornello-generated recipes leave source_site empty.
  const isNonFornelloSource = (s: string) => {
    const v = (s || '').trim();
    if (!v) return false;
    if (v.toLowerCase() === 'fornello') return false;
    return true;
  };

  // Build a set of every meal name that's ever appeared in any user's menu — these
  // are the names we're CONFIDENT came from Fornello menu generation.
  let menuMealNames = new Set<string>();
  if (mode === 'orphans') {
    const { data: menus } = await adminClient.from('menus').select('data');
    for (const m of (menus || [])) {
      const meals = (m as any).data?.meals || [];
      for (const meal of meals) {
        if (meal?.name) menuMealNames.add(meal.name.toLowerCase().trim());
      }
    }
  }

  const toDelete = (candidates || []).filter((r: any) => {
    if (r.origin === 'imported') return true;
    if (r.origin === 'unknown') return true;
    if (isNonFornelloSource(r.source_site || '')) return true;
    // Orphan mode: drop dinner recipes that aren't referenced by any menu.
    if (mode === 'orphans' && (!r.category || r.category === 'dinner')) {
      const n = (r.name || '').toLowerCase().trim();
      if (n && !menuMealNames.has(n)) return true;
    }
    return false;
  });

  if (toDelete.length === 0) {
    return NextResponse.json({ deleted: 0, message: 'Nothing to clean up.' });
  }

  const ids = toDelete.map((r: any) => r.id);
  const { error: delErr } = await adminClient.from('global_recipes').delete().in('id', ids);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({
    deleted: ids.length,
    sample: toDelete.slice(0, 5).map((r: any) => r.name),
  });
}
