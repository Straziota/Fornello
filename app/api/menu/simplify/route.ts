import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings } from '@/lib/db';
import { simplifyRecipe } from '@/lib/claude';
import { Meal } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const { meal }: { meal: Meal } = await req.json();
    const settings = await getSettings(user!.id);
    const skipIngredients = (settings as any).skipIngredients || [];
    if (!skipIngredients.length) return NextResponse.json({ canSimplify: false, essentialSkipped: [], simplifiedIngredients: [], simplifiedInstructions: [], note: '' });
    const result = await simplifyRecipe(getAnthropicKey(), meal, skipIngredients);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
