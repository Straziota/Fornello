import { anthropicClient } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings, saveGlobalRecipeIfNew, getGlobalRecipe } from '@/lib/db';
import { unitsInstruction } from '@/lib/claude';
import { normalizeRecipeUnits } from '@/lib/unit-convert';

export const maxDuration = 30;

function langInstruction(language?: string): string {
  if (!language || language === 'English') return '';
  return `\nIMPORTANT: Write ALL content in ${language}. This includes ingredient names, instructions, and all other text.`;
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser('something-sweet:recipe');
  if (error) return error;

  const { name, category, difficulty, serves, total_time, bakersTip } = await req.json();
  if (!name) return NextResponse.json({ error: 'Recipe name required' }, { status: 400 });

  const apiKey = getAnthropicKey();
  const settings = await getSettings(user!.id);
  const language = (settings as any).language;
  const units = (settings as any).units;
  const portionSize = serves || settings.familySize || 4;

  // Look up the global library first — return cached version if found.
  // Normalize to the user's units so cached recipes stay consistent too.
  const cached = await getGlobalRecipe(name);
  if (cached && cached.ingredients?.length && cached.instructions?.length) {
    return NextResponse.json(normalizeRecipeUnits({
      ingredients: cached.ingredients,
      instructions: cached.instructions,
      prep_ahead: cached.prep_ahead,
    }, units));
  }

  const prompt = `You are a celebrated pastry chef. Write the complete recipe for this dessert or baking dish.
${langInstruction(language)}${unitsInstruction(units)}

Recipe: ${name}
Category: ${category || 'Dessert'}
Difficulty: ${difficulty || 'Medium'}
Serves: ${portionSize}
${total_time ? `Total time: ${total_time}` : ''}
${bakersTip ? `Baker's tip to incorporate: ${bakersTip}` : ''}
${settings.restrictions?.length ? `Dietary restrictions: ${settings.restrictions.join(', ')}` : ''}

Return ONLY valid JSON — no markdown:
{
  "ingredients": [
    { "amount": "1¾ cups", "item": "plain flour, sifted" }
  ],
  "instructions": [
    "Step 1: Preheat the oven to 350°F. Line a 9-inch round cake tin..."
  ],
  "prep_ahead": [
    "Bring butter and eggs to room temperature 30 minutes before baking."
  ]
}

Rules:
- 8–12 ingredients with precise amounts in the units specified above
- 6–8 clear, detailed instruction steps — include temperatures, timings, and visual cues
- 2–4 prep_ahead tips specific to this recipe
- Scale all quantities for ${portionSize} servings
- prep_ahead: plain action steps, no timing labels as prefixes
- Every prep_ahead step must state the quantity of each ingredient being prepped, matching the ingredient list (e.g. "Sift 200 g flour", "Soften 100 g butter") — never quantity-less steps like "Soften the butter"`;

  const client = anthropicClient({ apiKey });
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
    name, cuisine: '', mealType: 'dessert', serves: portionSize,
    total_time: total_time || '', prep_time: '', cook_time: '',
    difficulty: difficulty || 'Medium', description: '',
    tags: ['dessert', category || 'sweet'], ingredients: recipe.ingredients || [],
    instructions: recipe.instructions || [], prep_ahead: recipe.prep_ahead || [],
    sides: [], photo_url: '', source_site: 'Something Sweet',
    category: 'dessert',
  }).catch(() => {});
  return NextResponse.json(normalizeRecipeUnits(recipe, units));
}
