import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { accessFor, canRead, canAdd, touchLastSeen } from '@/lib/kitchen-members';
import {
  getHeritageProfileBySlug, getHeritageProfileRecipes,
  updateHeritageProfile, deleteHeritageProfile,
} from '@/lib/db';

// GET /api/heritage/profiles/[slug]
// Returns the profile + its recipes. Visible to the owner always, and to
// anyone when the profile is public (private-by-default sharing model).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { slug } = await params;

  const profile = await getHeritageProfileBySlug(slug);
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Owner, invited member, or public. Anything else is 404 rather than 403:
  // a permission error confirms the Kitchen exists, which for a private family
  // collection is itself the thing being protected.
  const access = await accessFor(profile, { id: user!.id, email: user!.email });
  if (!canRead(access)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isOwner = access!.role === 'owner';
  if (!isOwner && user!.email) touchLastSeen(profile.id, user!.email);

  const recipes = await getHeritageProfileRecipes(profile.id);
  return NextResponse.json({
    profile, recipes, is_owner: isOwner,
    // The UI needs to know which buttons to draw, and a guest must never be
    // shown an "Add a recipe" button the server will refuse.
    role: access!.role,
    can_add: canAdd(access),
  });
}

// PATCH /api/heritage/profiles/[slug] → update profile fields (owner only).
// Also the visibility toggle (private ↔ public) for sharing.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { slug } = await params;

  const profile = await getHeritageProfileBySlug(slug);
  if (!profile || profile.owner_id !== user!.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  if (body.visibility && !['private', 'public'].includes(body.visibility)) {
    return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
  }
  try {
    const updated = await updateHeritageProfile(user!.id, profile.id, {
      person_name: body.person_name,
      relationship: body.relationship,
      origin_country: body.origin_country,
      portrait_url: body.portrait_url,
      bio: body.bio,
      visibility: body.visibility,
    });
    return NextResponse.json({ profile: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not update' }, { status: 500 });
  }
}

// DELETE /api/heritage/profiles/[slug] → delete profile + its recipes (owner only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { slug } = await params;

  const profile = await getHeritageProfileBySlug(slug);
  if (!profile || profile.owner_id !== user!.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    await deleteHeritageProfile(user!.id, profile.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not delete' }, { status: 500 });
  }
}
