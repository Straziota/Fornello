import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getGlobalRecipeById, updateGlobalRecipe, deleteGlobalRecipe } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ok, error } = await requireAdmin();
  if (!ok) return error!;
  const { id } = await params;
  const recipe = await getGlobalRecipeById(Number(id));
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ok, error } = await requireAdmin();
  if (!ok) return error!;
  const { id } = await params;
  const body = await req.json();
  await updateGlobalRecipe(Number(id), body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ok, error } = await requireAdmin();
  if (!ok) return error!;
  const { id } = await params;
  await deleteGlobalRecipe(Number(id));
  return NextResponse.json({ ok: true });
}
