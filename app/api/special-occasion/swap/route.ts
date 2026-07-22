import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings } from '@/lib/db';
import { generateOccasionSwapDish } from '@/lib/claude';

export const maxDuration = 30;

// POST /api/special-occasion/swap → suggest one replacement dish for a course.
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { occasion, eventType, course, avoid, cuisineTheme, dietaryNotes, guests } = await req.json();
  if (!course) return NextResponse.json({ error: 'course required' }, { status: 400 });

  const settings = await getSettings(user!.id);
  try {
    const item = await generateOccasionSwapDish(getAnthropicKey(), {
      occasion: occasion || '', eventType, course,
      avoid: Array.isArray(avoid) ? avoid : [],
      cuisineTheme, dietaryNotes, guests: guests || settings.familySize || 4,
      restrictions: settings.restrictions || [], language: (settings as any).language,
    });
    return NextResponse.json({ ...item, selected: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not swap dish' }, { status: 500 });
  }
}
