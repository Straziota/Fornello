import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

function langInstruction(language?: string): string {
  if (!language || language === 'English') return '';
  return `\nIMPORTANT: Respond in ${language}.`;
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { meal, question } = await req.json();
  if (!question?.trim()) return NextResponse.json({ error: 'Question required' }, { status: 400 });
  if (!meal?.name) return NextResponse.json({ error: 'Meal required' }, { status: 400 });

  const settings = await getSettings(user!.id);
  const language = (settings as any).language;

  const ingredientList = (meal.ingredients || []).map((i: any) => `- ${i.amount} ${i.item}`).join('\n');
  const instructionList = (meal.instructions || []).map((s: string, i: number) => `${i + 1}. ${s}`).join('\n');
  const sidesList = (meal.sides || []).map((s: any) => `- ${s.name}`).join('\n');

  const prompt = `You are Chef Claude — a warm, knowledgeable home cook helping a family with a question about a recipe they're about to make. Answer concisely and practically. If they ask about substitutions, technique, timing, equipment, scaling, pairing, etc., give them a confident, friendly answer grounded in this specific recipe.

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
    const client = new Anthropic({ apiKey: getAnthropicKey() });
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
