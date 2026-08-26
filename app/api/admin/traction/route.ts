import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { computeTraction } from '@/lib/traction';

export const maxDuration = 60;

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  return NextResponse.json(await computeTraction());
}
