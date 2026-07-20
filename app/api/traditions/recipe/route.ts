import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings, saveGlobalRecipeIfNew, getGlobalRecipe } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

function langInstruction(language?: string): string {
  if (!language || language === 'English') return '';
  return `\nIMPORTANT: Write ALL content in ${language}. This includes ingredient names, instructions, and all other text.`;
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { name, cuisine, culturalContext, occasion, difficulty, serves, total_time } = await req.json();
  if (!name) return NextResponse.json({ error: 'Dish name required' }, { status: 400 });

  const apiKey = getAnthropicKey();
  const settings = await getSettings(user!.id);
  const language = (settings as any).language;
  const portionSize = serves || settings.familySize || 4;

  // Look up the global library first — return cached version if found
  const cached = await getGlobalRecipe(name);
  if (cached && cached.ingredients?.length && cached.instructions?.length) {
    return NextResponse.json({
      ingredients: cached.ingredients,
      instructions: cached.instructions,
      prep_ahead: cached.prep_ahead,
    });
  }

  const prompt = `You are a culinary expert specialising in world cuisines. Write the complete authentic recipe for this traditional dish.
${langInstruction(language)}

Dish: ${name}
Cuisine: ${cuisine}
${culturalContext ? `Cultural context: ${culturalContext}` : ''}
${occasion ? `Occasion: ${occasion}` : ''}
${difficulty ? `Difficulty: ${difficulty}` : ''}
${total_time ? `Total time: ${total_time}` : ''}
Serves: ${portionSize}
${settings.restrictions?.length ? `Dietary restrictions: ${settings.restrictions.join(', ')}` : ''}

Return ONLY valid JSON — no markdown:
{
  "ingredients": [
    { "amount": "500 g", "item": "ingredient name" }
  ],
  "instructions": [
    "Step 1: ..."
  ],
  "prep_ahead": [
    "Prep task specific to this recipe."
  ]
}

Rules:
- 8–14 ingredients with precise amounts — use traditional measurements where appropriate
- 6–8 clear, detailed instruction steps respecting authentic technique
- 2–4 prep_ahead tasks (plain action steps, no timing labels as prefixes)
- Every prep_ahead task must state the quantity of each ingredient being prepped, matching the ingredient list (e.g. "Dice 2 onions") — never quantity-less tasks like "Chop the onions"
- Scale quantities for ${portionSize} servings
- Stay faithful to the authentic method while being accessible to home cooks`;

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: 'Recipe generation failed' }, { status: 500 });
  const recipe = JSON.parse(jsonMatch[0]);
  saveGlobalRecipeIfNew({
    name, cuisine: cuisine || '', mealType: 'tradition', serves: portionSize,
    total_time: total_time || '', prep_time: '', cook_time: '',
    difficulty: difficulty || 'Medium',
    description: culturalContext || '',
    tags: ['tradition', cuisine, occasion].filter(Boolean) as string[],
    ingredients: recipe.ingredients || [], instructions: recipe.instructions || [],
    prep_ahead: recipe.prep_ahead || [], sides: [], photo_url: '',
    source_site: 'Traditions', category: 'tradition',
  }).catch(() => {});
  return NextResponse.json(recipe);
}
