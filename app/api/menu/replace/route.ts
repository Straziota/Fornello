import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings, getLatestMenu, updateMenuData, getDislikedMealNames, getRecentMealNames } from '@/lib/db';
import { generateSingleMeal, generateSidesOnly } from '@/lib/claude';
import { resolveIllustration } from '@/lib/illustrate';
import { fetchMealPhoto } from '@/lib/photos';
import { Meal } from '@/lib/types';
import { recordSwap } from '@/lib/signals';

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser('menu:replace');
  if (error) return error;

  try {
    const { menuId, day, type, replaceType, mealType, technique, meal: replacementMeal } = await req.json();
    const [settings, menu, dislikedMeals, recentMeals] = await Promise.all([
      getSettings(user!.id),
      getLatestMenu(user!.id),
      getDislikedMealNames(user!.id),
      getRecentMealNames(user!.id, 12),
    ]);
    if (!menu) return NextResponse.json({ error: 'No menu found' }, { status: 404 });

    const existingMeal = (menu.meals || []).find((m: Meal) => m.day === day);
    const thisWeekNames = (menu.meals || []).map((m: Meal) => m.name);
    const existingNames = [...new Set([...thisWeekNames, ...recentMeals, ...dislikedMeals])];

    let updatedMeal: Meal;

    if (replaceType === 'sides') {
      // Only replace sides, keep main dish
      const newSides = await generateSidesOnly(
        getAnthropicKey(), existingMeal.name, existingMeal.cuisine,
        settings.familySize, settings, technique
      );
      updatedMeal = { ...existingMeal, sides: newSides };

    } else if (replaceType === 'main') {
      // Replace main dish only, keep existing sides
      let newMeal: Meal;
      if (type === 'generate') {
        newMeal = await generateSingleMeal(getAnthropicKey(), settings, day, mealType, existingNames, technique);
        // Same illustration path as generation. A replaced meal arriving as a
        // stock photograph among illustrations is precisely the mixed-media
        // menu the all-or-nothing rule exists to prevent — and it would happen
        // intermittently, which is worse than consistently.
        const art = await resolveIllustration(getAnthropicKey(), newMeal as any)
          .catch(() => ({ url: '', source: 'skipped' as const }));
        if (art.url) newMeal.photo_url = art.url;
      } else {
        newMeal = { ...replacementMeal, day, recipeLoaded: !!(replacementMeal.ingredients?.length) };
      }
      updatedMeal = { ...newMeal, sides: existingMeal?.sides };

    } else {
      // Replace whole meal (main + sides)
      if (type === 'generate') {
        updatedMeal = await generateSingleMeal(getAnthropicKey(), settings, day, mealType, existingNames, technique);
        const art = await resolveIllustration(getAnthropicKey(), updatedMeal as any)
          .catch(() => ({ url: '', source: 'skipped' as const }));
        if (art.url) updatedMeal.photo_url = art.url;
      } else {
        updatedMeal = { ...replacementMeal, day, recipeLoaded: !!(replacementMeal.ingredients?.length) };
      }
    }

    // Swap the meal in the menu
    const updatedMeals = (menu.meals || []).map((m: Meal) => m.day === day ? updatedMeal : m);
    await updateMenuData(user!.id, menuId, { ...menu, meals: updatedMeals });

    return NextResponse.json(updatedMeal);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to replace' }, { status: 500 });
  }
}
