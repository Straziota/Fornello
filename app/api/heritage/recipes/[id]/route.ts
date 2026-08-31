import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';
import { accessFor, canEditRecipe } from '@/lib/kitchen-members';
import type { HeritageProfileRecipeInput } from '@/lib/types';

/**
 * Who may change one recipe.
 *
 * Previously owner-only, enforced by scoping the query to owner_id. That no
 * longer works: a contributor's recipe is stored under the KITCHEN's owner, so
 * scoping by owner would have let the owner edit everything and the person who
 * wrote it edit nothing.
 */
async function permitted(id: string, user: { id: string; email?: string | null }) {
  const { data: recipe } = await adminClient
    .from('heritage_profile_recipes')
    .select('id, profile_id, contributed_by')
    .eq('id', id).maybeSingle();
  if (!recipe) return null;

  const { data: profile } = await adminClient
    .from('heritage_profiles')
    .select('id, owner_id, visibility')
    .eq('id', recipe.profile_id).maybeSingle();
  if (!profile) return null;

  const access = await accessFor(profile, user);
  return canEditRecipe(access, recipe, user.id) ? recipe : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const recipe = await permitted(id, { id: user!.id, email: user!.email });
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as Partial<HeritageProfileRecipeInput>;
  // contributed_by is never accepted from the client: it decides who may edit
  // this row, so letting a request set it would let anyone grant themselves
  // permission to the next request.
  const { contributed_by, contributed_by_email, ...safe } = body as any;
  void contributed_by; void contributed_by_email;

  const { data, error: updateError } = await adminClient
    .from('heritage_profile_recipes')
    .update({ ...safe, updated_at: new Date().toISOString() })
    .eq('id', id).select('*').maybeSingle();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ recipe: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const recipe = await permitted(id, { id: user!.id, email: user!.email });
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error: deleteError } = await adminClient
    .from('heritage_profile_recipes').delete().eq('id', id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
