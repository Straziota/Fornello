import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSettings } from '@/lib/db';
import { generateOnTheFlyOptions } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const { ingredients } = await req.json();
    if (!Array.isArray(ingredients) || !ingredients.length) {
      return NextResponse.json({ error: 'No ingredients provided.' }, { status: 400 });
    }
    const settings = await getSettings(user!.id);
    const options = await generateOnTheFlyOptions(getAnthropicKey(), ingredients, settings.restrictions, (settings as any).language);
    return NextResponse.json({ options });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
}
