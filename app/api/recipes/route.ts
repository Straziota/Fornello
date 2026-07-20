import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getUserRecipes, saveUserRecipe } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  return NextResponse.json(await getUserRecipes(user!.id));
}

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const body = await req.json();
  const id = await saveUserRecipe(user!.id, body);
  return NextResponse.json({ ok: true, id });
}
