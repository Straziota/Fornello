import { anthropicClient } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser('traditions:suggestions');
  if (error) return error;

  const { culture } = await req.json();
  if (!culture?.trim()) return NextResponse.json({ suggestions: [] });

  const apiKey = getAnthropicKey();
  const client = anthropicClient({ apiKey });

  const prompt = `List 8 specific culinary traditions, festivals, or occasions from ${culture} culture where food plays a central role. Be specific and authentic — include both everyday traditions and special occasions.

Return ONLY a JSON array of short strings (2–5 words each), no markdown:
["Tradition 1", "Tradition 2", ...]

Examples of good entries: "Sunday Family Lunch", "Christmas Eve Feast", "Ramadan Iftar", "Harvest Festival", "New Year's Celebration", "Wedding Banquet"

(variety token: ${Math.floor(Math.random() * 1e9)} — vary your picks across less obvious traditions too)`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    temperature: 1,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return NextResponse.json({ suggestions: [] });

  const suggestions = JSON.parse(jsonMatch[0]) as string[];
  return NextResponse.json({ suggestions: suggestions.slice(0, 8) });
}
