import { NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings, saveRecipeOverride } from '@/lib/db';
import { applySubstitute } from '@/lib/claude';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const { meal, originalIngredient, substitute } = await req.json();
    if (!meal || !originalIngredient || !substitute) {
      return NextResponse.json({ error: 'meal, originalIngredient, and substitute are required' }, { status: 400 });
    }
    const settings = await getSettings(user!.id);
    const rewritten = await applySubstitute(
      getAnthropicKey(), meal, originalIngredient, substitute, (settings as any).language
    );
    // Save as user's override so the customized version is used whenever this recipe appears
    await saveRecipeOverride(user!.id, meal.name, {
      ingredients: rewritten.ingredients,
      instructions: rewritten.instructions,
      prep_ahead: meal.prep_ahead || [],
      sides: meal.sides || [],
      notes: `Substituted "${originalIngredient}" with "${substitute}"`,
    });
    return NextResponse.json(rewritten);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to rewrite recipe' }, { status: 500 });
  }
}
