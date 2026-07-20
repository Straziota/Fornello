import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings, saveGlobalRecipeIfNew, getGlobalRecipe } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

function langInstruction(language?: string): string {
  if (!language || language === 'English') return '';
  return `\nIMPORTANT: Write ALL content in ${language}. This includes dish names, descriptions, ingredients, instructions, and all other text.`;
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { query, serves } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: 'Query required' }, { status: 400 });

  const apiKey = getAnthropicKey();
  const settings = await getSettings(user!.id);
  const language = (settings as any).language;
  const portionSize = serves || settings.familySize || 4;

  // Look up the global library first — return the cached canonical recipe if found
  const cached = await getGlobalRecipe(query.trim());
  if (cached && cached.ingredients?.length && cached.instructions?.length) {
    return NextResponse.json({
      name: cached.name, cuisine: cached.cuisine, description: cached.description,
      total_time: cached.total_time, prep_time: cached.prep_time, cook_time: cached.cook_time,
      difficulty: cached.difficulty, serves: cached.serves, tags: cached.tags,
      ingredients: cached.ingredients, instructions: cached.instructions,
      prep_ahead: cached.prep_ahead,
    });
  }

  const dietaryText = settings.restrictions?.length
    ? `Strict dietary restrictions — never include: ${settings.restrictions.join(', ')}.` : '';
  const prefsText = settings.preferences?.length
    ? `Food preferences: ${settings.preferences.join(', ')}.` : '';

  const prompt = `You are a professional chef. A user is looking for this recipe:

"${query}"

Interpret their request generously — if they give a dish name, write the classic recipe. If they describe a craving or style, create the best matching dish.
${langInstruction(language)}
Serves: ${portionSize}
${dietaryText}
${prefsText}

Return ONLY valid JSON — no markdown:
{
  "name": "Full dish name",
  "cuisine": "Cuisine type",
  "description": "Two evocative sentences that make this dish sound irresistible.",
  "total_time": "45 min",
  "prep_time": "15 min",
  "cook_time": "30 min",
  "difficulty": "Easy",
  "serves": ${portionSize},
  "tags": ["tag1", "tag2"],
  "ingredients": [
    { "amount": "500 g", "item": "ingredient name" }
  ],
  "instructions": [
    "Step 1: ..."
  ],
  "prep_ahead": [
    "Prep task with no timing prefix."
  ]
}

Rules:
- difficulty must be exactly "Easy", "Medium", or "Hard"
- total_time = prep_time + cook_time (be accurate and realistic)
- 8–14 ingredients with precise amounts
- 6–8 clear, detailed instruction steps
- 2–4 prep_ahead tasks as plain action steps
- Every prep_ahead task must state the quantity of each ingredient being prepped, matching the ingredient list (e.g. "Dice 2 onions") — never quantity-less tasks like "Chop the onions"`;

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: 'Recipe generation failed' }, { status: 500 });
  const recipe = JSON.parse(jsonMatch[0]);
  saveGlobalRecipeIfNew({
    name: recipe.name, cuisine: recipe.cuisine || '', mealType: 'dinner',
    serves: recipe.serves || portionSize, total_time: recipe.total_time || '',
    prep_time: recipe.prep_time || '', cook_time: recipe.cook_time || '',
    difficulty: recipe.difficulty || 'Easy', description: recipe.description || '',
    tags: recipe.tags || [], ingredients: recipe.ingredients || [],
    instructions: recipe.instructions || [], prep_ahead: recipe.prep_ahead || [],
    sides: [], photo_url: '', source_site: 'Find a Recipe',
    category: 'dinner',
  }).catch(() => {});
  return NextResponse.json(recipe);
}
