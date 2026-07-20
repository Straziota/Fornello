import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getContributorByEmail } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  const c = await getContributorByEmail(user!.email || '');
  return NextResponse.json({ allowed: !!c, displayName: c?.display_name || null });
}
