import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings, getSpecialOccasion, updateSpecialOccasion } from '@/lib/db';
import { rescheduleOccasionTimeline } from '@/lib/claude';
import type { SpecialOccasionResult, DaySchedule } from '@/lib/claude';

export const maxDuration = 300;

// POST /api/special-occasion/[id]/reschedule
// The cook lost some prep days. Everything from the first missed day onwards is
// still outstanding, so rebuild the plan across the days that are actually left.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const { missedIndexes } = await req.json();
  if (!Array.isArray(missedIndexes) || missedIndexes.length === 0) {
    return NextResponse.json({ error: 'Tell us which days were missed.' }, { status: 400 });
  }

  const row = await getSpecialOccasion(user!.id, Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const result = row.result as SpecialOccasionResult;
  const timeline = result.timeline || [];
  if (!timeline.length) {
    return NextResponse.json({ error: 'There is no plan to rebuild yet.' }, { status: 400 });
  }

  // Buckets before the first missed day are done. That day and everything after
  // it still has to happen, so it all goes back into the pot.
  const firstMissed = Math.min(...missedIndexes.map(Number));
  const outstandingBuckets = timeline.filter((_, i) => i >= firstMissed);
  const outstandingWork = outstandingBuckets.flatMap(b =>
    b.steps?.length ? b.steps.map(s => s.text) : b.tasks || []
  );
  if (!outstandingWork.length) {
    return NextResponse.json({ error: 'Nothing left to reschedule.' }, { status: 400 });
  }

  // Only days that haven't passed can take work. Compare on the local date the
  // user is planning in, not UTC, or "today" can be dropped a few hours early.
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const remainingDays = ((result.planning?.daySchedules || []) as DaySchedule[])
    .filter(d => d.date >= localToday);

  if (!remainingDays.length) {
    return NextResponse.json(
      { error: 'There are no prep days left before the event — the plan can’t be spread any further.' },
      { status: 400 },
    );
  }

  const settings = await getSettings(user!.id);
  const selected = (result.menu || []).filter(m => m.selected !== false);

  try {
    const { timeline: rebuilt, warning } = await rescheduleOccasionTimeline(getAnthropicKey(), {
      occasionTitle: result.occasionTitle,
      eventType: result.eventType,
      dishes: selected.map(m => ({
        course: m.course, dish: m.dish,
        makeAheadNote: m.fullRecipe?.makeAheadNote || m.makeAheadNote,
      })),
      remainingDays,
      outstandingWork,
      missedLabels: missedIndexes.map((i: number) => timeline[i]?.when).filter(Boolean),
      eventDate: result.planning?.eventDate,
      servingTime: result.planning?.servingTime || row.serving_time || '',
      language: (settings as any).language,
    });

    if (!rebuilt.length) throw new Error('Could not rebuild the plan — please try again.');

    const updated: SpecialOccasionResult = { ...result, timeline: rebuilt, timelineWarning: warning };
    await updateSpecialOccasion(user!.id, Number(id), updated);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not rebuild the plan.' }, { status: 500 });
  }
}
