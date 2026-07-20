import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { saveGlobalRecipeIfNew } from '@/lib/db';

// Admin-only: promote a recipe (from On-the-fly or My Recipes) into the shared
// global library. Returns { added } so the UI can distinguish "added" from
// "already in the library".
export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const r = await req.json().catch(() => null);
  if (!r?.name) return NextResponse.json({ error: 'Missing recipe name.' }, { status: 400 });

  try {
    const added = await saveGlobalRecipeIfNew({
      name: r.name,
      cuisine: r.cuisine || '',
      mealType: r.mealType || r.meal_type || '',
      serves: r.serves || 4,
      total_time: r.total_time || '',
      prep_time: r.prep_time || '',
      cook_time: r.cook_time || '',
      difficulty: r.difficulty || 'Medium',
      description: r.description || '',
      tags: Array.isArray(r.tags) ? r.tags : [],
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      instructions: Array.isArray(r.instructions) ? r.instructions : [],
      prep_ahead: Array.isArray(r.prep_ahead) ? r.prep_ahead : [],
      sides: Array.isArray(r.sides) ? r.sides : [],
      photo_url: r.photo_url || '',
      source_site: r.source_site || r.source || '',
      origin: 'admin',
    });
    return NextResponse.json({ ok: true, added: !!added });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not add to global recipes.' },
      { status: 500 },
    );
  }
}
