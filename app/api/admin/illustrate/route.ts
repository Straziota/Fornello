import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { generateIllustration, illustrationPrompt } from '@/lib/illustrate';

export const maxDuration = 120;

// Generate ONE illustration, for looking at.
//
// Not part of any pipeline: it takes an explicit recipe name, generates a single
// image and returns the URL. The real path — library lookup first, async, cost
// metered — is built only once the style is confirmed to survive the API, since
// a prompt that works in a chat interface may not through the same model
// programmatically.
//
// ?dry=1 returns the prompt without generating, which costs nothing.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const name = req.nextUrl.searchParams.get('name');
  if (!name) return NextResponse.json({ error: 'Pass ?name=<recipe name>' }, { status: 400 });

  // Use the real library row where one exists, so vessel and finish are derived
  // from the same description a household would see.
  const { data: recipe } = await adminClient
    .from('global_recipes').select('name, description, tags')
    .ilike('name', name).maybeSingle();
  const meal = recipe || { name, description: '', tags: [] };

  if (req.nextUrl.searchParams.get('dry') === '1') {
    return NextResponse.json({ dryRun: true, ...illustrationPrompt(meal) });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });

  try {
    const out = await generateIllustration(apiKey, meal);
    return NextResponse.json({ recipe: meal.name, ...out });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
