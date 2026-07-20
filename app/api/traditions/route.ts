import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

function langInstruction(language?: string): string {
  if (!language || language === 'English') return '';
  return `\nIMPORTANT: Write ALL content in ${language}. This includes dish names, descriptions, cultural context, and all other text.`;
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { culture, occasion } = await req.json();
  if (!culture?.trim()) return NextResponse.json({ error: 'Culture required' }, { status: 400 });

  const apiKey = getAnthropicKey();
  const settings = await getSettings(user!.id);
  const language = (settings as any).language;

  const occasionContext = occasion?.trim()
    ? `Focus on recipes traditionally made for: ${occasion}.`
    : 'Cover a range of everyday and celebratory dishes.';

  const dietaryText = settings.restrictions?.length
    ? `Dietary restrictions (strictly observe): ${settings.restrictions.join(', ')}.` : '';

  const prompt = `You are a culinary historian and world cuisine expert. Generate 6 authentic traditional recipes from ${culture} cuisine.
${langInstruction(language)}
${occasionContext}
${dietaryText}

Include a variety of dishes — starters, mains, sides, or sweets as appropriate to the cuisine.

Return ONLY valid JSON — no markdown:
[
  {
    "name": "Dish Name",
    "cuisine": "${culture}",
    "description": "Two appetising sentences describing the dish.",
    "culturalContext": "1–2 sentences on the cultural significance or history of this dish — when it is made, who makes it, what it means.",
    "occasion": "Everyday / Ramadan / Christmas / Harvest festival / etc.",
    "total_time": "45 min",
    "prep_time": "15 min",
    "cook_time": "30 min",
    "difficulty": "Easy",
    "serves": 4
  }
]

Rules:
- All 6 dishes must be genuinely from ${culture} culinary tradition
- culturalContext must be specific and authentic — no generic phrases
- difficulty must be exactly "Easy", "Medium", or "Hard"
- total_time = prep_time + cook_time
- Vary the selection — different cooking methods, ingredients, and occasions`;

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  return NextResponse.json(JSON.parse(jsonMatch[0]));
}
