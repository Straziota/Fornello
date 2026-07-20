import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'Recipe text required' }, { status: 400 });

  const prompt = `You are parsing a free-form recipe into structured JSON. The user pasted the recipe below — it may be formatted any way (numbered list, bullet points, plain paragraphs, copied from a blog with extra cruft, etc.). Extract the recipe and return ONLY valid JSON.

Recipe text:
"""
${text.trim()}
"""

Return ONLY valid JSON in this exact shape — no markdown, no explanations:
{
  "name": "Recipe Name",
  "cuisine": "Italian",
  "mealType": "pasta",
  "serves": 4,
  "total_time": "45 min",
  "prep_time": "15 min",
  "cook_time": "30 min",
  "difficulty": "Easy",
  "description": "One short appetizing sentence summarizing the dish.",
  "tags": ["tag1", "tag2"],
  "ingredients": [
    {"amount": "200 g", "item": "spaghetti"},
    {"amount": "2", "item": "garlic cloves, minced"}
  ],
  "instructions": [
    "First step description here.",
    "Second step description here."
  ],
  "prep_ahead": [
    "Anything that can be prepared ahead of time."
  ]
}

Rules:
- mealType MUST be one of: Any, meat, chicken, seafood, pasta, vegetarian, soup or stew, Mexican, Asian, legumes
- difficulty MUST be exactly Easy, Medium, or Hard
- Split each ingredient into amount + item (e.g. "200 g spaghetti" → {"amount": "200 g", "item": "spaghetti"})
- Strip out any step number prefixes like "Step 1:" or "1." — just the instruction text
- If a field isn't present in the source, use a reasonable default (empty string, empty array, or 4 for serves)
- prep_ahead: items the user can prep in advance to make the day-of easier. If the original text doesn't have these, leave the array empty.
- Strip out cruft like blog headers, ads, "Print this recipe", author bylines — just the actual recipe.`;

  try {
    const client = new Anthropic({ apiKey: getAnthropicKey() });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not extract recipe from text');
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Parsing failed' }, { status: 500 });
  }
}
