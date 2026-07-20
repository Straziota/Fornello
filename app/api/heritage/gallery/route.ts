import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getPublicHeritageProfiles } from '@/lib/db';

// GET /api/heritage/gallery → all publicly-shared Family Kitchen profiles.
// Sharing only: read-only, no comments or likes.
export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  try {
    const profiles = await getPublicHeritageProfiles();
    return NextResponse.json({ profiles });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not load gallery' }, { status: 500 });
  }
}
