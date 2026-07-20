import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { updateHeritageProfileRecipe, deleteHeritageProfileRecipe } from '@/lib/db';
import type { HeritageProfileRecipeInput } from '@/lib/types';

// PATCH /api/heritage/recipes/[id] → edit a profile recipe (owner only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const body = await req.json() as Partial<HeritageProfileRecipeInput>;
  try {
    const recipe = await updateHeritageProfileRecipe(user!.id, id, body);
    return NextResponse.json({ recipe });
  } catch (e: any) {
    const status = /not found/i.test(e.message) ? 404 : 500;
    return NextResponse.json({ error: e.message || 'Could not update recipe' }, { status });
  }
}

// DELETE /api/heritage/recipes/[id] → delete a profile recipe (owner only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  try {
    await deleteHeritageProfileRecipe(user!.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not delete recipe' }, { status: 500 });
  }
}
