import { NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getLatestMenu, getSettings, updateMealRecipe, updateMenuData } from '@/lib/db';
import { generateGroceryList, generateMealRecipe } from '@/lib/claude';

export const maxDuration = 300;

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  // `force` rebuilds the list from the menu's current meals even if one already
  // exists — used by the "Refresh groceries" button to resync after meal swaps,
  // replacements, or skipped days that don't touch the grocery list themselves.
  let force = false;
  try {
    const body = await req.json().catch(() => null);
    force = !!body?.force;
  } catch {}

  const menu = await getLatestMenu(user!.id);
  if (!menu?.meals?.length) {
    return NextResponse.json({ error: 'No menu found' }, { status: 404 });
  }

  // Already has real items — return immediately (unless a forced refresh)
  const hasItems = (gl: any) =>
    gl && Object.values(gl as Record<string, unknown[]>).some(items => (items as any[])?.length > 0);
  if (!force && hasItems(menu.grocery_list)) {
    return NextResponse.json(menu.grocery_list);
  }

  const apiKey = getAnthropicKey();
  const settings = await getSettings(user!.id);
  // Use the language the menu was generated in for consistency
  const language = (menu as any).language ?? (settings as any).language ?? 'English';

  // Load recipes for any meals that don't have them yet — in parallel
  const unloaded = menu.meals.filter((m: any) => !m.isLeftover && !m.recipeLoaded);

  if (unloaded.length > 0) {
    const loaded = await Promise.all(
      unloaded.map(async (meal: any) => {
        try {
          const recipe = await generateMealRecipe(
            apiKey, meal, settings.familySize, settings.prepSchedule, language
          );
          await updateMealRecipe(user!.id, menu.id, meal.day, recipe);
          return { ...meal, ...recipe, recipeLoaded: true };
        } catch {
          return meal;
        }
      })
    );

    // Merge loaded recipes back into meals array
    for (const l of loaded) {
      const idx = menu.meals.findIndex((m: any) => m.day === l.day);
      if (idx >= 0) menu.meals[idx] = l;
    }
  }

  const grocery_list = await generateGroceryList(apiKey, menu.meals, settings.familySize);
  await updateMenuData(user!.id, menu.id, { ...menu, grocery_list });

  return NextResponse.json(grocery_list);
}
