import { anthropicClient } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings } from '@/lib/db';

export const maxDuration = 30;

function langInstruction(language?: string): string {
  if (!language || language === 'English') return '';
  return `\nIMPORTANT: Respond in ${language}.`;
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser('menu:ask-claude');
  if (error) return error;

  const { meal, question } = await req.json();
  if (!question?.trim()) return NextResponse.json({ error: 'Question required' }, { status: 400 });
  if (!meal?.name) return NextResponse.json({ error: 'Meal required' }, { status: 400 });

  const settings = await getSettings(user!.id);
  const language = (settings as any).language;
  // Allergies were being fetched and then discarded. Chef Claude is the one
  // surface where a user asks "what can I use instead?" — the exact moment the
  // household's allergies matter most — and it was the only Claude call in the
  // app that never saw them.
  const restrictions = (settings.restrictions || []).filter(Boolean);
  const skipIngredients = ((settings as any).skipIngredients || []).filter(Boolean);

  const ingredientList = (meal.ingredients || []).map((i: any) => `- ${i.amount} ${i.item}`).join('\n');
  const instructionList = (meal.instructions || []).map((s: string, i: number) => `${i + 1}. ${s}`).join('\n');
  const sidesList = (meal.sides || []).map((s: any) => `- ${s.name}`).join('\n');

  const allergenBlock = restrictions.length
    ? `\n🚨 THIS HOUSEHOLD'S ALLERGIES / STRICT RESTRICTIONS: ${restrictions.join(', ')}.
NEVER suggest these, or anything containing them, as an ingredient or a substitute — not "a little", not as a garnish, not "if you tolerate it". If the recipe as written appears to contain one, say so plainly and stop. If they ask you to include one anyway, decline and explain why; a confident request does not make it safe.`
    : '';

  const dislikeBlock = skipIngredients.length
    ? `\nIngredients this family avoids by preference (not allergy): ${skipIngredients.join(', ')}. Don't suggest them as substitutes.`
    : '';

  const prompt = `You are Chef Claude — a warm, knowledgeable home cook helping a family with a question about a recipe they're about to make. Answer concisely and practically. If they ask about substitutions, technique, timing, equipment, scaling, pairing, etc., give them a friendly answer grounded in this specific recipe.
${allergenBlock}${dislikeBlock}

FOOD SAFETY — these are not matters of taste, and you must not be argued out of them:
- Safe internal temperatures (poultry 165°F/74°C, ground meat 160°F/71°C, pork 145°F/63°C). Never endorse lower "if they like it that way".
- Raw or undercooked eggs, meat and fish carry real risk for pregnancy, young children, the elderly and the immunocompromised. Say so rather than assuming who is eating.
- Home canning, fermenting, curing and preserving: never improvise times, ratios or acidity. Point them to a tested method (USDA / NCHFP).
- Marinades, thawing, cooling and reheating: give the safe answer, not the convenient one.
If the user pushes back on any of the above, hold the line politely. Being disagreed with confidently is not evidence that you were wrong.

Recipe details:
- Name: ${meal.name}
- Cuisine: ${meal.cuisine || 'unspecified'}
- Serves: ${meal.serves || 4}
- Total time: ${meal.total_time || 'unspecified'}
- Difficulty: ${meal.difficulty || 'unspecified'}
${meal.description ? `- Description: ${meal.description}` : ''}

Ingredients:
${ingredientList || '(not yet loaded)'}

Instructions:
${instructionList || '(not yet loaded)'}

${sidesList ? `Sides:\n${sidesList}\n` : ''}
The family's question:
"${question.trim()}"
${langInstruction(language)}

Respond in 2–5 sentences. Be specific to this recipe. Skip preamble (no "Great question!", no "Of course!") — go straight to the answer. If the question doesn't make sense for this recipe, say so kindly and offer what you CAN help with.`;

  try {
    const client = anthropicClient({ apiKey: getAnthropicKey() });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });
    const answer = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    return NextResponse.json({ answer });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to get answer' }, { status: 500 });
  }
}
