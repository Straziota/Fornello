import { NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings, saveRecipeOverride } from '@/lib/db';
import { removeIngredient } from '@/lib/claude';

export const maxDuration = 60;

// POST /api/menu/ingredient/remove
// Drops a disliked ingredient from a recipe outright — no substitute — and saves
// the result as the user's override, mirroring how a substitution is applied.
export async function POST(req: Request) {
  const { user, error } = await requireUser('menu:ingredient:remove');
  if (error) return error;
  try {
    const { meal, ingredient } = await req.json();
    if (!meal || !ingredient) {
      return NextResponse.json({ error: 'meal and ingredient are required' }, { status: 400 });
    }
    const settings = await getSettings(user!.id);
    const rewritten = await removeIngredient(
      getAnthropicKey(), meal, ingredient, (settings as any).language
    );
    await saveRecipeOverride(user!.id, meal.name, {
      ingredients: rewritten.ingredients,
      instructions: rewritten.instructions,
      prep_ahead: meal.prep_ahead || [],
      sides: meal.sides || [],
      notes: `Removed "${ingredient}"`,
    });
    return NextResponse.json(rewritten);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to rewrite recipe' }, { status: 500 });
  }
}
