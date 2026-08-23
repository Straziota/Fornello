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

  const quality = req.nextUrl.searchParams.get('quality') || undefined;
  const variant = req.nextUrl.searchParams.get('variant') || '';
  // Fully elaborated prompt, standing in for what a chat product silently
  // expands a short request into before the image model ever sees it.
  const elaborate = req.nextUrl.searchParams.get('elaborate') === '1';

  const base = illustrationPrompt(meal);
  const promptOverride = elaborate
    ? `A hand-painted vintage cookbook watercolour illustration of ${(meal.name || '').replace(/\s*\([^)]*\)\s*/g, ' ').trim()}, served in a ${base.finish} ${base.vessel}. ${meal.description || ''} `
      + 'The painting is in the style of a mid-century European cookbook plate: transparent watercolour washes laid wet-on-wet with visible granulation and pigment settling, '
      + 'delicate dry-brush texture on the rim of the vessel, a fine loose ink contour drawn confidently in one pass and allowed to bleed slightly into the wash. '
      + 'Muted sage green, warm ochre, soft terracotta and umber on a cream laid-paper ground with visible tooth. '
      + 'Restrained palette, generous negative space, nothing photographic. Soft natural light from the upper left, gentle shadow, no harsh highlights. '
      + 'The whole vessel visible and centred, occupying roughly two-thirds of the frame width, with clear even margin on all four sides, never cropped by the frame edge. '
      + 'Viewed from slightly above at a three-quarter angle. Plain cream background, no surface, no table, no cloth, no drop shadow pooling. '
      + 'No text, no lettering, no hands, no people, no cutlery, no props. Composition simple and legible when reduced to a small thumbnail.'
    : undefined;

  try {
    const slug = `${(meal.name || 'dish').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,50)}${variant ? '-' + variant : ''}`;
    const out = await generateIllustration(apiKey, meal, { quality, promptOverride, slug });
    return NextResponse.json({ recipe: meal.name, quality: quality || '(default)', elaborated: elaborate, ...out });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
