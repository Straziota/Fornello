import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getCurrentMenu, deleteMenu , markMenuEngaged} from '@/lib/db';

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  // Current = this week or the upcoming week (pre-generated); see getCurrentMenu.
  const menu = await getCurrentMenu(user!.id);
  // Opening the week is the clearest evidence a human met it, which is what the
  // 12-week no-repeat rule now requires before it will suppress these dishes.
  if (menu?.id) void markMenuEngaged(user!.id, menu.id);
  return NextResponse.json(menu);
}

export async function DELETE(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await req.json();
  await deleteMenu(user!.id, id);
  return NextResponse.json({ ok: true });
}
