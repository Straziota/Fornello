import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings, saveGlobalRecipeIfNew, getGlobalRecipe } from '@/lib/db';
import { generateOnTheFlyFullRecipe } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const { option, ingredients } = await req.json();
    if (!option || !Array.isArray(ingredients) || !ingredients.length) {
      return NextResponse.json({ error: 'Missing option or ingredients.' }, { status: 400 });
    }
    const settings = await getSettings(user!.id);

    // Look up the global library first — return cached version if found
    const cached = await getGlobalRecipe(option.name);
    if (cached && cached.ingredients?.length && cached.instructions?.length) {
      return NextResponse.json({
        name: cached.name, cuisine: cached.cuisine, description: cached.description,
        total_time: cached.total_time, prep_time: cached.prep_time, cook_time: cached.cook_time,
        difficulty: cached.difficulty, serves: cached.serves,
        usedIngredients: option.usedIngredients || [],
        missingIngredients: option.missingIngredients || [],
        ingredients: cached.ingredients, instructions: cached.instructions,
        prep_ahead: cached.prep_ahead,
      });
    }

    const recipe = await generateOnTheFlyFullRecipe(
      getAnthropicKey(), option, ingredients, settings.familySize, settings.restrictions, (settings as any).language
    );
    // Tag as dinner and save to global library (fire and forget)
    saveGlobalRecipeIfNew({
      name: recipe.name, cuisine: recipe.cuisine || '', mealType: 'dinner',
      serves: recipe.serves || settings.familySize, total_time: recipe.total_time || '',
      prep_time: recipe.prep_time || '', cook_time: recipe.cook_time || '',
      difficulty: recipe.difficulty || 'Easy', description: recipe.description || '',
      tags: ['on-the-fly'], ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [], prep_ahead: recipe.prep_ahead || [],
      sides: [], photo_url: '', source_site: 'On the Fly',
      category: 'dinner',
    }).catch(() => {});
    return NextResponse.json(recipe);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
}
