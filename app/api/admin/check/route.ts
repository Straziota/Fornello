import { NextResponse } from 'next/server';
import { checkIsAdmin } from '@/lib/auth';

export async function GET() {
  const isAdmin = await checkIsAdmin();
  return NextResponse.json({ isAdmin });
}
