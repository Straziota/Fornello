import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { addMealToCurrentMenu } from '@/lib/db';

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { meal, targetDay } = await req.json();
  const menu = await addMealToCurrentMenu(user!.id, meal, targetDay);
  if (!menu) return NextResponse.json({ error: 'No current menu found. Generate a menu first.' }, { status: 400 });
  return NextResponse.json({ ok: true, menu });
}
