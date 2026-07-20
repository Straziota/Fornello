import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { saveFeedback, getFeedbackForMeal } from '@/lib/db';

export async function GET(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const mealName = new URL(req.url).searchParams.get('meal');
  if (mealName) return NextResponse.json(await getFeedbackForMeal(user!.id, mealName) ?? null);
  return NextResponse.json([]);
}

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const body = await req.json();
  await saveFeedback(user!.id, { mealName: body.mealName, rating: body.rating, adjustments: body.adjustments || '' });
  return NextResponse.json({ ok: true });
}
