import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  void user;

  const { ingredient, dish, cuisine, allIngredients } = await req.json();
  if (!ingredient || !dish) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const client = new Anthropic({ apiKey: getAnthropicKey() });

  const prompt = `You are an expert chef. A home cook is making "${dish}" (${cuisine || 'unspecified cuisine'}) and just realised they don't have: "${ingredient}".

Full ingredient list: ${allIngredients.join(', ')}

Is "${ingredient}" a sine qua non — truly essential and irreplaceable for this dish — or can it be skipped or substituted without ruining it?

Return ONLY valid JSON:
{
  "essential": true | false,
  "verdict": "One concise sentence explaining why it's essential OR what to do without it",
  "substitute": "Best substitute ingredient or technique, or null if essential"
}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: 'Could not evaluate ingredient' }, { status: 500 });
  return NextResponse.json(JSON.parse(jsonMatch[0]));
}
