import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings, saveGlobalRecipeIfNew, getGlobalRecipe } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { dish, course, occasion, guests, cuisineTheme } = await req.json();
  if (!dish) return NextResponse.json({ error: 'Dish required' }, { status: 400 });

  const apiKey = getAnthropicKey();
  const settings = await getSettings(user!.id);
  const serves = guests || settings.familySize || 4;

  // Look up the global library first — return cached version if found
  const cached = await getGlobalRecipe(dish);
  if (cached && cached.ingredients?.length && cached.instructions?.length) {
    return NextResponse.json({
      name: cached.name, description: cached.description, serves: cached.serves,
      prepTime: cached.prep_time, cookTime: cached.cook_time, totalTime: cached.total_time,
      difficulty: cached.difficulty,
      ingredients: cached.ingredients, instructions: cached.instructions,
      makeAheadNote: cached.prep_ahead?.[0] || '',
    });
  }

  const context = [
    occasion && `Occasion: ${occasion}`,
    cuisineTheme && `Cuisine: ${cuisineTheme}`,
    `Course: ${course}`,
    `Serves: ${serves}`,
    settings.restrictions?.length && `Dietary restrictions: ${settings.restrictions.join(', ')}`,
  ].filter(Boolean).join('\n');

  const prompt = `You are an expert chef. Write the complete recipe for this dish:

Dish: ${dish}
${context}

Return ONLY valid JSON:
{
  "name": "${dish}",
  "description": "one evocative sentence",
  "serves": ${serves},
  "prepTime": "X min",
  "cookTime": "X min",
  "totalTime": "X min",
  "difficulty": "Easy" | "Medium" | "Hard",
  "ingredients": [
    { "amount": "200 g", "item": "ingredient name" }
  ],
  "instructions": [
    "Clear step-by-step instruction"
  ],
  "makeAheadNote": "What can be done ahead of time (1–2 sentences)"
}

Rules:
- Ingredients must have precise amounts
- 5–8 clear instruction steps
- Scale quantities for ${serves} people
- Difficulty must be exactly "Easy", "Medium", or "Hard"`;

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: 'Failed to generate recipe' }, { status: 500 });
  const recipe = JSON.parse(jsonMatch[0]);
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
}
