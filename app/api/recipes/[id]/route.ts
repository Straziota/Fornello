import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getUserRecipe, updateUserRecipe, deleteUserRecipe } from '@/lib/db';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const recipe = await getUserRecipe(user!.id, parseInt(id));
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const body = await req.json();
  await updateUserRecipe(user!.id, parseInt(id), body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  await deleteUserRecipe(user!.id, parseInt(id));
  return NextResponse.json({ ok: true });
}
