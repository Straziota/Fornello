import { NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSubstitution } from '@/lib/claude';
import { getSettings } from '@/lib/db';

export async function POST(req: Request) {
  const { user, error } = await requireUser('menu:substitute');
  if (error) return error;
  try {
    const { meal, ingredient } = await req.json();
    // Suggesting a substitute is the single likeliest place to hand a household
    // the thing it is allergic to.
    const settings = await getSettings(user!.id);
    const result = await getSubstitution(getAnthropicKey(), meal, ingredient,
      settings.restrictions || [], (settings as any).skipIngredients || []);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
