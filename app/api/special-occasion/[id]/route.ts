import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { deleteSpecialOccasion, updateSpecialOccasion } from '@/lib/db';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  await deleteSpecialOccasion(user!.id, Number(id));
  return NextResponse.json({ ok: true });
}

// Persist a modified result (selection toggles, swapped dishes).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const body = await req.json();
  if (!body?.result) return NextResponse.json({ error: 'result required' }, { status: 400 });
  try {
    await updateSpecialOccasion(user!.id, Number(id), body.result);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not save' }, { status: 500 });
  }
}
