import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getRecipeOverride, saveRecipeOverride, deleteRecipeOverride } from '@/lib/db';

export async function GET(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const name = new URL(req.url).searchParams.get('name') || '';
  const override = await getRecipeOverride(user!.id, name);
  return NextResponse.json({ exists: !!override, override });
}

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { recipeName, ingredients, instructions, prep_ahead, sides, notes } = await req.json();
  await saveRecipeOverride(user!.id, recipeName, { ingredients, instructions, prep_ahead, sides, notes });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { recipeName } = await req.json();
  await deleteRecipeOverride(user!.id, recipeName);
  return NextResponse.json({ ok: true });
}
