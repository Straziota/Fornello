import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { deleteSpecialOccasion } from '@/lib/db';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  await deleteSpecialOccasion(user!.id, Number(id));
  return NextResponse.json({ ok: true });
}
