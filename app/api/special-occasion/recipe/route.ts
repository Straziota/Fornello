import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings, saveGlobalRecipeIfNew } from '@/lib/db';
import { generateOccasionDishRecipe } from '@/lib/claude';


export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { dish, course, occasion, guests, cuisineTheme } = await req.json();
  if (!dish) return NextResponse.json({ error: 'Dish required' }, { status: 400 });

  const settings = await getSettings(user!.id);
  const units = (settings as any).units;
  const serves = guests || settings.familySize || 4;

  // The shared recipe library is deliberately NOT read here. It's keyed on dish
  // name across all users, holds no yield, and never passes back through the
  // quantity audit — so one bad generation for a dish is served to everyone who
  // cooks it afterwards, at whatever serving count it happened to be written for.
  // Occasion menus are cooked for large numbers where wrong amounts actually
  // fail, so these are always generated and checked fresh. We still contribute
  // to the library below for the cheaper paths that read it.

  // One generator for occasion recipes, shared with finalize. Two prompts for the
  // same job drifted apart — and its scaling rules are what keep the quantities
  // honest at large guest counts.
  try {
    const recipe = await generateOccasionDishRecipe(getAnthropicKey(), {
      dish, course, occasion, guests: serves,
      cuisineTheme, restrictions: settings.restrictions || [],
      language: (settings as any).language, units,
    });

    saveGlobalRecipeIfNew({
      name: dish, cuisine: cuisineTheme || '', mealType: course || 'special',
      serves, total_time: recipe.totalTime || '', prep_time: recipe.prepTime || '',
      cook_time: recipe.cookTime || '', difficulty: recipe.difficulty || 'Medium',
      description: recipe.description || '', tags: ['special-occasion', course].filter(Boolean) as string[],
      ingredients: recipe.ingredients || [], instructions: recipe.instructions || [],
      prep_ahead: recipe.makeAheadNote ? [recipe.makeAheadNote] : [],
      sides: [], photo_url: '', source_site: 'Special Occasion',
      category: 'special',
    }).catch(() => {});

    return NextResponse.json(recipe);
  } catch {
    return NextResponse.json({ error: 'Failed to generate recipe' }, { status: 500 });
  }
}
