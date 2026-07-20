import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

function langInstruction(language?: string): string {
  if (!language || language === 'English') return '';
  return `\nIMPORTANT: Write ALL content in ${language}. This includes recipe names, descriptions, and all other text.`;
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { category, difficulty, dietary } = await req.json();
  const apiKey = getAnthropicKey();
  const settings = await getSettings(user!.id);
  const language = (settings as any).language;

  const categoryFilter = category && category !== 'All'
    ? `Focus exclusively on the category: ${category}.`
    : 'Cover a variety of dessert and baking categories.';
  const difficultyFilter = difficulty && difficulty !== 'Any'
    ? `All recipes must be ${difficulty} difficulty.` : '';
  const dietaryRestrictions = [
    ...(settings.restrictions || []),
    ...(dietary || []),
  ].filter(Boolean);
  const dietaryText = dietaryRestrictions.length
    ? `Dietary requirements (strictly observe): ${dietaryRestrictions.join(', ')}.` : '';

  const prompt = `You are a celebrated pastry chef and baking expert. Generate 6 delightful dessert and baking recipes.
${langInstruction(language)}
${categoryFilter}
${difficultyFilter}
${dietaryText}

Make the selection varied — different flavours, techniques, and levels of indulgence.

Return ONLY valid JSON — no markdown:
[
  {
    "name": "Recipe Name",
    "category": "Cakes",
    "description": "Two evocative sentences describing this treat.",
    "total_time": "1 hr 20 min",
    "prep_time": "25 min",
    "cook_time": "55 min",
    "difficulty": "Easy",
    "serves": 8,
    "bakersTip": "One sentence baker's tip or key technique for success."
  }
]

Rules:
- category must be one of: Cakes, Cookies, Tarts, Pastry & Bread, Puddings & Creams, Ice Cream & Gelato, Chocolate
- difficulty must be exactly "Easy", "Medium", or "Hard"
- total_time = prep_time + cook_time (be accurate)
- Vary styles — don't repeat the same flavour or technique twice`;

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  return NextResponse.json(JSON.parse(jsonMatch[0]));
}
