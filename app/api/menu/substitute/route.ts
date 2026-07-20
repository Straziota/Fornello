import { NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSubstitution } from '@/lib/claude';

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const { meal, ingredient } = await req.json();
    const result = await getSubstitution(getAnthropicKey(), meal, ingredient);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
