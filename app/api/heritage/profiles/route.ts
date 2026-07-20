import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createHeritageProfile, getHeritageProfilesByOwner } from '@/lib/db';

// GET /api/heritage/profiles → the current user's own profiles
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const profiles = await getHeritageProfilesByOwner(user!.id);
    return NextResponse.json({ profiles });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not load profiles' }, { status: 500 });
  }
}

// POST /api/heritage/profiles → create a dedicated profile for a person
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const body = await req.json();
  if (!body.person_name?.toString().trim()) {
    return NextResponse.json({ error: 'A name is required.' }, { status: 400 });
  }
  try {
    const profile = await createHeritageProfile(user!.id, {
      person_name: body.person_name,
      relationship: body.relationship,
      origin_country: body.origin_country,
      portrait_url: body.portrait_url,
      bio: body.bio,
    });
    return NextResponse.json({ profile });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not create profile' }, { status: 500 });
  }
}
