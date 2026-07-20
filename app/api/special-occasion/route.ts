import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings, getSpecialOccasions, saveSpecialOccasion } from '@/lib/db';
import { buildSpecialOccasionPrompt, DaySchedule } from '@/lib/claude';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  const events = await getSpecialOccasions(user!.id);
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { occasion, guests, servingTime, cuisineTheme, dietaryNotes, mustHaveDishes,
          eventDate, prepStartDate, daySchedules } = await req.json();

  if (!occasion?.trim()) {
    return new Response(JSON.stringify({ error: 'Occasion is required' }), { status: 400 });
  }

  const apiKey = getAnthropicKey();
  const settings = await getSettings(user!.id);

  const prompt = buildSpecialOccasionPrompt(
    occasion, guests || 0, servingTime || '',
    cuisineTheme || '', dietaryNotes || '', mustHaveDishes || '',
    (daySchedules as DaySchedule[]) || [],
    { restrictions: settings.restrictions || [], preferences: settings.preferences || [], language: (settings as any).language }
  );

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  (async () => {
    let fullText = '';
    try {
      const anthropicStream = await client.messages.stream({
        model: 'claude-haiku-4-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      for await (const chunk of anthropicStream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          fullText += chunk.delta.text;
          await writer.write(encoder.encode(chunk.delta.text));
        }
      }
      // Save to DB after streaming completes
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        await saveSpecialOccasion(user!.id, occasion, guests || 0, servingTime || '', eventDate || '', result);
      }
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
