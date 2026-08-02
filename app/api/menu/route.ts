import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getCurrentMenu, deleteMenu } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  // Current = this week or the upcoming week (pre-generated); see getCurrentMenu.
  return NextResponse.json(await getCurrentMenu(user!.id));
}

export async function DELETE(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await req.json();
  await deleteMenu(user!.id, id);
  return NextResponse.json({ ok: true });
}
