import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { generateIllustration } from '@/lib/illustrate';
import { recordUnitCost } from '@/lib/usage';

export const maxDuration = 300;

// Illustrates the library, in batches.
//
// All-or-nothing by intent: a menu mixing illustrations with stock photographs
// looks worse than either alone, so this should run to completion before the
// switch is visible. Batched only because a serverless function cannot hold a
// hundred image generations in one request.
//
// Dry by default. ?write=1&limit=N to work through it.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get('write') !== '1';
  const limit = Number(req.nextUrl.searchParams.get('limit') || 5);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });

  // Anything not yet illustrated. Sides are excluded outright: they render as
  // text inside a meal and never as their own card.
  const { data: rows } = await adminClient
    .from('global_recipes')
    .select('id, name, description, appearance, tags, photo_url, category')
    .neq('category', 'side')
    .order('id')
    .limit(500);

  const todo = (rows || []).filter(r => !(r.photo_url || '').includes('/illustrations/'));
  const batch = todo.slice(0, limit);

  if (dry) {
    return NextResponse.json({
      dryRun: true, remaining: todo.length,
      wouldDo: batch.map(r => r.name),
      missingAppearance: todo.filter(r => !r.appearance).map(r => r.name).slice(0, 10),
    });
  }

  const results: { name: string; url?: string; error?: string }[] = [];
  for (const r of batch) {
    try {
      const out = await generateIllustration(apiKey, r as any);
      await adminClient.from('global_recipes').update({ photo_url: out.url }).eq('id', r.id);
      // Company cost — never against a household's ceiling.
      await recordUnitCost({
        model: 'gpt-image-1', feature: 'illustration:backfill',
        unit: 'image', units: 1, costUsd: 0.04, payer: 'company',
      });
      results.push({ name: r.name, url: out.url });
    } catch (e: any) {
      results.push({ name: r.name, error: e.message?.slice(0, 200) });
    }
  }

  return NextResponse.json({ processed: results.length, remaining: todo.length - results.length, results });
}
