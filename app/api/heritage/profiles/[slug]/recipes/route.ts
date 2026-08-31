import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { accessFor, canAdd } from '@/lib/kitchen-members';
import { getHeritageProfileBySlug, addHeritageProfileRecipe } from '@/lib/db';
import type { HeritageProfileRecipeInput } from '@/lib/types';

// POST /api/heritage/profiles/[slug]/recipes → add a recipe to a profile (owner only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { slug } = await params;

  const profile = await getHeritageProfileBySlug(slug);
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Contributors may add. That is the whole point of inviting someone to a
  // family Kitchen rather than showing them one — the aunt who remembers the
  // recipe should be able to put it in herself.
  const access = await accessFor(profile, { id: user!.id, email: user!.email });
  if (!canAdd(access)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json() as HeritageProfileRecipeInput;
  if (!body.name?.toString().trim()) {
    return NextResponse.json({ error: 'A recipe name is required.' }, { status: 400 });
  }
  try {
    // Attributed on the way in, so removing a member later leaves their
    // contributions standing and still credited rather than orphaned.
    const recipe = await addHeritageProfileRecipe(profile.owner_id, profile.id, {
      ...body,
      contributed_by: user!.id,
      contributed_by_email: user!.email ?? null,
    } as any);
    return NextResponse.json({ recipe });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not save recipe' }, { status: 500 });
  }
}
