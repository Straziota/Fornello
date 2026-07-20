import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getHeritageProfileBySlug, addHeritageProfileRecipe } from '@/lib/db';
import type { HeritageProfileRecipeInput } from '@/lib/types';

// POST /api/heritage/profiles/[slug]/recipes → add a recipe to a profile (owner only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { slug } = await params;

  const profile = await getHeritageProfileBySlug(slug);
  if (!profile || profile.owner_id !== user!.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json() as HeritageProfileRecipeInput;
  if (!body.name?.toString().trim()) {
    return NextResponse.json({ error: 'A recipe name is required.' }, { status: 400 });
  }
  try {
    const recipe = await addHeritageProfileRecipe(user!.id, profile.id, body);
    return NextResponse.json({ recipe });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not save recipe' }, { status: 500 });
  }
}
