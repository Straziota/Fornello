import { NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const supabase = await createServer();
  await supabase.auth.signOut();
  const origin = new URL(req.url).origin;
  return NextResponse.redirect(`${origin}/login`);
}
