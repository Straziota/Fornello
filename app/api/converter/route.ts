import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { question } = await req.json();
  if (!question?.trim()) {
    return NextResponse.json({ error: 'Question required' }, { status: 400 });
  }

  const prompt = `You are a kitchen unit conversion expert. The user is asking a conversion question. Give them a clear, concise answer.

Examples of questions you handle:
- "How many cups is 200g of all-purpose flour?"
- "How much is 3 tablespoons of butter in grams?"
- "What's 350°F in Celsius?"
- "Convert 1 lb of ground beef to cups"
- "16 oz of pasta in grams?"

Question: "${question.trim()}"

Return ONLY valid JSON in this exact shape — no markdown, no explanations outside JSON:
{
  "answer": "A concise one-line answer with the conversion result (e.g. '200 g of all-purpose flour ≈ 1⅔ cups').",
  "explanation": "1-2 sentence note explaining the conversion or any caveats (e.g. 'Volume-to-weight conversions vary by ingredient density — sifted vs spooned flour can differ by 10-15%.').",
  "alternatives": ["Optional: a few related conversions, max 3", "Each as a short string"]
}

Rules:
- If the question is ambiguous (e.g. "8 oz" without specifying weight vs fluid), pick the most likely interpretation and mention the assumption in explanation
- Be precise — use specific weights for common ingredients (flour 125g/cup, sugar 200g/cup, butter 227g/cup, milk 240g/cup, etc.)
- If the question isn't a conversion at all, return {"answer": "Try asking a conversion question like 'How many grams in 1 cup of flour?'", "explanation": "", "alternatives": []}`;

  try {
    const client = new Anthropic({ apiKey: getAnthropicKey() });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not understand the conversion');
    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Conversion failed' }, { status: 500 });
  }
}
