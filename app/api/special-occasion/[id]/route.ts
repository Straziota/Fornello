import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { deleteSpecialOccasion, updateSpecialOccasion, getSpecialOccasion, replaceSpecialOccasion } from '@/lib/db';
import { occasionFallbackTitle } from '../route';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  await deleteSpecialOccasion(user!.id, Number(id));
  return NextResponse.json({ ok: true });
}

// Persist a modified result (selection toggles, swapped dishes), or — with a
// `details` payload — update the event's details WITHOUT regenerating the menu.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const body = await req.json();

  if (body?.details) {
    const d = body.details;
    const row = await getSpecialOccasion(user!.id, Number(id));
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Keep the existing menu, recipes and timeline untouched — only the planning
    // inputs and the event's own columns change.
    const result = { ...(row.result || {}) } as any;
    result.planning = {
      ...(result.planning || {}),
      prepStartDate:  d.prepStartDate  ?? result.planning?.prepStartDate  ?? '',
      daySchedules:   d.daySchedules   ?? result.planning?.daySchedules   ?? [],
      cuisineTheme:   d.cuisineTheme   ?? result.planning?.cuisineTheme   ?? '',
      dietaryNotes:   d.dietaryNotes   ?? result.planning?.dietaryNotes   ?? '',
      mustHaveDishes: d.mustHaveDishes ?? result.planning?.mustHaveDishes ?? '',
      eventDate:      d.eventDate      ?? result.planning?.eventDate      ?? '',
      servingTime:    d.servingTime    ?? result.planning?.servingTime    ?? '',
    };
    if (d.eventType) result.eventType = d.eventType;
    // Renaming from the edit form; blank falls back to the user's own wording.
    if (d.title !== undefined) {
      result.occasionTitle = d.title?.trim() || occasionFallbackTitle(d.occasion || row.occasion);
    }
    try {
      const ok = await replaceSpecialOccasion(
        user!.id, Number(id),
        d.occasion?.trim() || row.occasion,
        Number(d.guests) || 0,
        d.servingTime || '',
        d.eventDate || '',
        result,
      );
      if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Could not save' }, { status: 500 });
    }
  }

  if (!body?.result) return NextResponse.json({ error: 'result required' }, { status: 400 });
  try {
    await updateSpecialOccasion(user!.id, Number(id), body.result);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not save' }, { status: 500 });
  }
}
