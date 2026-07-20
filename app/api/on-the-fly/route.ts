import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings } from '@/lib/db';
import { generateOnTheFlyRecipe } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const { ingredients, exclude } = await req.json();
    if (!Array.isArray(ingredients) || !ingredients.length) {
      return NextResponse.json({ error: 'No ingredients provided.' }, { status: 400 });
    }
    const settings = await getSettings(user!.id);
    const recipe = await generateOnTheFlyRecipe(getAnthropicKey(), ingredients, settings.familySize, settings.restrictions, exclude ?? [], (settings as any).language);
    return NextResponse.json(recipe);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
}
