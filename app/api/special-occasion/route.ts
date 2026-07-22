import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings, getSpecialOccasions, saveSpecialOccasion, replaceSpecialOccasion } from '@/lib/db';
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
          eventDate, prepStartDate, daySchedules, eventType, editId } = await req.json();

  if (!occasion?.trim()) {
    return new Response(JSON.stringify({ error: 'Occasion is required' }), { status: 400 });
  }

  const apiKey = getAnthropicKey();
  const settings = await getSettings(user!.id);

  const prompt = buildSpecialOccasionPrompt(
    occasion, guests || 0, servingTime || '',
    cuisineTheme || '', dietaryNotes || '', mustHaveDishes || '',
    (daySchedules as DaySchedule[]) || [],
    { restrictions: settings.restrictions || [], preferences: settings.preferences || [], language: (settings as any).language, eventType }
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
        const result = JSON.parse(jsonMatch[0].replace(/,\s*([}\]])/g, '$1'));
        // Every proposed dish starts selected; persist the planning inputs so the
        // finalize step can rebuild the timeline for the chosen dishes.
        result.menu = Array.isArray(result.menu) ? result.menu.map((m: any) => ({ ...m, selected: true })) : [];
        result.eventType = eventType || 'served-dinner';
        result.planning = { prepStartDate: prepStartDate || '', daySchedules: daySchedules || [], cuisineTheme: cuisineTheme || '', dietaryNotes: dietaryNotes || '', mustHaveDishes: mustHaveDishes || '', eventDate: eventDate || '', servingTime: servingTime || '' };
        // Overwrite the existing occasion when regenerating after "Adjust details";
        // fall back to a fresh insert if the id isn't found / not owned.
        const replaced = editId
          ? await replaceSpecialOccasion(user!.id, Number(editId), occasion, guests || 0, servingTime || '', eventDate || '', result)
          : false;
        if (!replaced) {
          await saveSpecialOccasion(user!.id, occasion, guests || 0, servingTime || '', eventDate || '', result);
        }
      }
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
