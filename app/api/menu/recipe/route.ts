import { NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings, getLatestMenu, updateMealRecipe, getUserRecipes, getGlobalRecipe, getRecipeOverride, saveGlobalRecipeIfNew } from '@/lib/db';
import { generateMealRecipe } from '@/lib/claude';
import { normalizeRecipeUnits } from '@/lib/unit-convert';
import { Meal } from '@/lib/types';

export async function POST(req: Request) {
  const { user, error } = await requireUser('menu:recipe');
  if (error) return error;
  try {
    const { menuId, meal }: { menuId: number; meal: Meal } = await req.json();
    const [settings, menu] = await Promise.all([getSettings(user!.id), getLatestMenu(user!.id)]);
    const language = (menu as any)?.language ?? (settings as any).language ?? 'English';
    const units = (settings as any).units;

    // 1. User's My Recipes (explicit saves — highest trust)
    const userRecipes = await getUserRecipes(user!.id);
    const savedUserRecipe = userRecipes.find(r => r.name.toLowerCase() === meal.name.toLowerCase());
    if (savedUserRecipe) {
      const recipe = normalizeRecipeUnits({ ingredients: savedUserRecipe.ingredients, instructions: savedUserRecipe.instructions, prep_ahead: savedUserRecipe.prep_ahead }, units);
      await updateMealRecipe(user!.id, menuId, meal.day, recipe);
      return NextResponse.json({ ...recipe, recipeLoaded: true });
    }

    // 2. User's personal override ("Make it mine")
    const override = await getRecipeOverride(user!.id, meal.name);
    if (override) {
      const recipe = normalizeRecipeUnits({ ingredients: override.ingredients, instructions: override.instructions, prep_ahead: override.prep_ahead, sides: override.sides }, units);
      await updateMealRecipe(user!.id, menuId, meal.day, recipe);
      return NextResponse.json({ ...recipe, recipeLoaded: true, isOverride: true });
    }

    // 3. Global recipe library (admin-curated or previously generated)
    const globalRecipe = await getGlobalRecipe(meal.name);
    if (globalRecipe) {
      const recipe = normalizeRecipeUnits({ ingredients: globalRecipe.ingredients, instructions: globalRecipe.instructions, prep_ahead: globalRecipe.prep_ahead, sides: globalRecipe.sides }, units);
      await updateMealRecipe(user!.id, menuId, meal.day, recipe);
      return NextResponse.json({ ...recipe, recipeLoaded: true });
    }

    // 4. Generate new recipe → save to global library for everyone
    const recipe = await generateMealRecipe(getAnthropicKey(), meal, settings.familySize, settings.prepSchedule, language, units,
      settings.restrictions || [], (settings as any).skipIngredients || []);
    await Promise.all([
      updateMealRecipe(user!.id, menuId, meal.day, recipe),
      saveGlobalRecipeIfNew({ ...meal, ...recipe, mealType: meal.tags?.[0] || '',
        // Stylistic nod, not provenance — see app/api/menu/generate/route.ts.
        source_site: '', inspired_by: meal.source_site || '' }),
    ]);
    return NextResponse.json({ ...recipe, recipeLoaded: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
