import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getGlobalRecipes, saveGlobalRecipe } from '@/lib/db';

export async function GET() {
  const { ok, error } = await requireAdmin();
  if (!ok) return error!;
  const recipes = await getGlobalRecipes();
  return NextResponse.json(recipes);
}

export async function POST(req: Request) {
  const { ok, error } = await requireAdmin();
  if (!ok) return error!;
  const body = await req.json();
  const id = await saveGlobalRecipe(body);
  return NextResponse.json({ id });
}
