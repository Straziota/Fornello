import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { resolveIllustration } from '@/lib/illustrate';
import { authorizeOps } from '@/lib/ops-auth';

export const maxDuration = 300;

// Illustrates library recipes that have no picture, and writes the result back.
//
// resolveIllustration reuses an existing illustration when the dish already has
// one under another name, so this is cheaper than its count suggests — and it
// never spends twice on the same food.
//
// Sides are excluded on purpose: they render as text nested inside a meal and
// never as their own card, so a picture for one is money spent on something
// nobody will ever see.
//
// Dry by default. ?write=1 spends money; ?limit caps a run so a mistake costs
// four cents rather than four dollars.
export async function POST(req: NextRequest) {
  if (!authorizeOps(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const write = req.nextUrl.searchParams.get('write') === '1';
  const limit = Number(req.nextUrl.searchParams.get('limit') || 5);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });

  const { data: rows } = await adminClient
    .from('global_recipes')
    // appearance must be selected, or the prompt silently falls back to
    // description — which is copy about how the dish tastes, not how it looks.
    .select('id, name, description, appearance, tags, category, photo_url')
    .or('photo_url.is.null,photo_url.eq.')
    .neq('category', 'side')
    .order('name');

  const todo = (rows || []).slice(0, limit);
  const results: string[] = [];

  for (const r of todo) {
    if (!write) { results.push(`would illustrate: ${r.name}`); continue; }
    try {
      const out = await resolveIllustration(apiKey, r as any);
      results.push(out.url ? `${out.source}: ${r.name}` : `skipped: ${r.name}`);
    } catch (e) {
      results.push(`FAILED ${r.name}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({
    dry: !write,
    remaining: Math.max(0, (rows || []).length - todo.length),
    total: (rows || []).length,
    results,
  });
}
