import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { addToNextWeek, removeFromNextWeek, getNextWeekPicks } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  return NextResponse.json({ picks: await getNextWeekPicks(user!.id) });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { mealName } = await req.json();
  if (!mealName) return NextResponse.json({ error: 'Missing mealName' }, { status: 400 });
  await addToNextWeek(user!.id, mealName);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { mealName } = await req.json();
  if (!mealName) return NextResponse.json({ error: 'Missing mealName' }, { status: 400 });
  await removeFromNextWeek(user!.id, mealName);
  return NextResponse.json({ ok: true });
}
