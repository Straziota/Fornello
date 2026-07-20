import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getHeritageKitchens } from '@/lib/db';

// Public-ish (any logged-in user) read of the kitchens registry.
// Used by the heritage grid, per-kitchen pages, and the admin recipe form.
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    return NextResponse.json({ kitchens: await getHeritageKitchens() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
