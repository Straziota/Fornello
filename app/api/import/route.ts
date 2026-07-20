import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { saveUserRecipe } from '@/lib/db';

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const body = await req.json();
    const recipe = body.fornello ? body.data : body;
    if (!recipe?.name) return NextResponse.json({ error: 'Invalid recipe data' }, { status: 400 });
    const id = await saveUserRecipe(user!.id, {
      name: recipe.name, cuisine: recipe.cuisine || '',
      mealType: recipe.mealType || 'Any', serves: recipe.serves || 4,
      total_time: recipe.total_time || '', prep_time: recipe.prep_time || '',
      cook_time: recipe.cook_time || '', difficulty: recipe.difficulty || 'Easy',
      description: recipe.description || '', tags: recipe.tags || [],
      ingredients: recipe.ingredients || [], instructions: recipe.instructions || [],
      prep_ahead: recipe.prep_ahead || [], source: recipe.source || 'Shared via Fornello',
    });
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
