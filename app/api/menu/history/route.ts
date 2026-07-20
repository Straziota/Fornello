import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getAllMenus } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  return NextResponse.json(await getAllMenus(user!.id));
}
