import { NextResponse } from 'next/server';
import { checkIsAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';

// Recovery endpoint: scans every menu in the database and rebuilds global_recipes
// from the full meal recipes embedded in menus.data.meals. Use after an accidental
// wipe of global_recipes. Dedupes by name (case-insensitive).
export const maxDuration = 300;

export async function POST() {
  const ok = await checkIsAdmin();
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Pull every menu row — small projection only of what we need.
  const { data: menus, error: menusErr } = await adminClient.from('menus').select('data');
  if (menusErr) return NextResponse.json({ error: menusErr.message }, { status: 500 });

  // Existing global recipes (so we don't insert duplicates by name).
  const { data: existingRows } = await adminClient.from('global_recipes').select('name');
  const existing = new Set((existingRows || []).map((r: any) => (r.name || '').toLowerCase().trim()));

  // Dedupe across menus too — same recipe name may show up in many users' menus.
  const seen = new Set<string>();
  const recipesToInsert: any[] = [];

  for (const m of (menus || [])) {
    const meals = (m as any).data?.meals || [];
    for (const meal of meals) {
      if (!meal?.name) continue;
      if (meal.isLeftover) continue;
      // Only restore meals that have a real recipe filled in — skip half-loaded ones.
      const hasIngredients = Array.isArray(meal.ingredients) && meal.ingredients.length > 0;
      const hasInstructions = Array.isArray(meal.instructions) && meal.instructions.length > 0;
      if (!hasIngredients || !hasInstructions) continue;

      const key = meal.name.toLowerCase().trim();
      if (seen.has(key) || existing.has(key)) continue;
      seen.add(key);

      recipesToInsert.push({
        name: meal.name,
        cuisine: meal.cuisine || '',
        meal_type: meal.mealType || meal.tags?.[0] || 'dinner',
        serves: meal.serves || 4,
        total_time: meal.total_time || '',
        prep_time: meal.prep_time || '',
        cook_time: meal.cook_time || '',
        difficulty: meal.difficulty || 'Medium',
        description: meal.description || '',
        tags: meal.tags || [],
        ingredients: meal.ingredients,
        instructions: meal.instructions,
        prep_ahead: meal.prep_ahead || [],
        sides: meal.sides || [],
        photo_url: meal.photo_url || '',
        source_site: meal.source_site || '',
        category: 'dinner',
        origin: 'generated',
      });
    }
  }

  if (recipesToInsert.length === 0) {
    return NextResponse.json({ inserted: 0, scanned: (menus || []).length, message: 'Nothing new to restore.' });
  }

  // Batch insert — Supabase handles arrays.
  const { error: insErr } = await adminClient.from('global_recipes').insert(recipesToInsert);
  if (insErr) return NextResponse.json({ error: insErr.message, attempted: recipesToInsert.length }, { status: 500 });

  return NextResponse.json({
    inserted: recipesToInsert.length,
    scanned: (menus || []).length,
    sample: recipesToInsert.slice(0, 5).map(r => r.name),
  });
}
