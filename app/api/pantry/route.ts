import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getPantry, addPantryItem, removePantryItem } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  return NextResponse.json(await getPantry(user!.id));
}

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { name, quantity } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const id = await addPantryItem(user!.id, name.trim(), quantity?.trim() || '');
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await req.json();
  await removePantryItem(user!.id, id);
  return NextResponse.json({ ok: true });
}
