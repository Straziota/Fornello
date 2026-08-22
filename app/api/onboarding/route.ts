import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/db';
import { adminClient } from '@/lib/supabase-admin';

// Matches the ordering used by the menu generator.
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

// POST /api/onboarding — first-run answers.
//
// Only the fields that change what the first menu looks like. Everything else
// (units, first day of week, sides, pantry, vacations, prep schedule) keeps its
// default and is offered later in Settings, because none of it alters the first
// menu and asking for it up front turns introductions into configuration.
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const body = await req.json();
  const cookNights: string[] = Array.isArray(body.cookNights) ? body.cookNights : [];
  const minutes = Number(body.weeknightMinutes) || 45;

  // Build the week from two answers instead of thirty-five: a day is either
  // cooked-for at the household's usual weeknight length, or skipped. Per-day
  // meal types and techniques stay available in Settings for later.
  const schedule: Record<string, { enabled: boolean; minutes: number }> = {};
  for (const day of DAYS) {
    schedule[day] = { enabled: cookNights.includes(day), minutes };
  }

  const existing = await getSettings(user!.id);
  await saveSettings(user!.id, {
    ...existing,
    familySize: Number(body.familySize) || 4,
    restrictions: Array.isArray(body.restrictions) ? body.restrictions : [],
    preferences: Array.isArray(body.preferences) ? body.preferences : [],
    skipIngredients: Array.isArray(body.skipIngredients) ? body.skipIngredients : [],
    websites: Array.isArray(body.websites) ? body.websites : [],
    schedule,
    // The tour is marked seen here on purpose. A walkthrough on top of a
    // questionnaire is two gates in front of a product they haven't seen yet;
    // it stays available from Settings for anyone who wants it.
    hasSeenTour: true,
  } as any);

  // Only ever written when explicitly ticked — an unticked box must leave the
  // household exactly where it was, which is off.
  if (body.autoPlan === true) {
    await adminClient.from('settings').update({
      auto_plan: true,
      auto_plan_paused: false,
      auto_plan_ignored: 0,
      auto_plan_offer_answered_at: new Date().toISOString(),
    }).eq('user_id', user!.id);
  }

  const { error: stampError } = await adminClient
    .from('settings')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('user_id', user!.id);
  if (stampError) {
    // Don't fail the request — the answers are saved, and a missing stamp only
    // means they'd be asked again. Better than losing the answers.
    console.error('onboarding stamp failed:', stampError.message);
  }

  return NextResponse.json({ ok: true });
}
