import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings, getSpecialOccasion, updateSpecialOccasion } from '@/lib/db';
import { generateOccasionDishRecipe, generateOccasionTimeline } from '@/lib/claude';
import type { SpecialOccasionResult } from '@/lib/claude';

export const maxDuration = 300;

// POST /api/special-occasion/[id]/finalize
// Generates the full recipe for every selected dish and rebuilds the prep
// timeline for the final menu, then saves and returns the finalized result.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const row = await getSpecialOccasion(user!.id, Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const apiKey = getAnthropicKey();
  const settings = await getSettings(user!.id);
  const result = row.result as SpecialOccasionResult;
  const guests = row.guests || settings.familySize || 4;
  const cuisineTheme = result.planning?.cuisineTheme || '';

  const selected = (result.menu || []).map((m, i) => ({ m, i })).filter(x => x.m.selected !== false);
  if (selected.length === 0) {
    return NextResponse.json({ error: 'Select at least one dish before finalizing.' }, { status: 400 });
  }

  try {
    // Full recipes for the selected dishes, in parallel.
    await Promise.all(selected.map(async ({ m, i }) => {
      if (m.fullRecipe?.ingredients?.length) return; // already generated
      try {
        result.menu[i].fullRecipe = await generateOccasionDishRecipe(apiKey, {
          dish: m.dish, course: m.course, occasion: row.occasion, guests,
          cuisineTheme, restrictions: settings.restrictions || [], language: (settings as any).language,
        });
      } catch { /* leave without a full recipe; the card falls back to the summary */ }
    }));

    // Rebuild the timeline for just the final selection.
    const timeline = await generateOccasionTimeline(apiKey, {
      occasionTitle: result.occasionTitle,
      eventType: result.eventType,
      dishes: selected.map(({ i }) => {
        const m = result.menu[i];
        return { course: m.course, dish: m.dish, prepTime: m.prepTime, cookTime: m.cookTime, makeAheadNote: m.fullRecipe?.makeAheadNote || m.makeAheadNote };
      }),
      daySchedules: result.planning?.daySchedules || [],
      eventDate: result.planning?.eventDate,
      servingTime: result.planning?.servingTime || row.serving_time || '',
      language: (settings as any).language,
    });
    if (timeline.length) result.timeline = timeline;
    result.finalized = true;

    await updateSpecialOccasion(user!.id, Number(id), result);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not finalize the menu.' }, { status: 500 });
  }
}
