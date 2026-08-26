import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { generateIllustration } from '@/lib/illustrate';
import { recordUnitCost } from '@/lib/usage';
import { authorizeOps } from '@/lib/ops-auth';

export const maxDuration = 300;

// Illustrates meals that appear in saved menus but have no library recipe.
//
// The illustration is attached to the MENU MEAL, not written into
// global_recipes. Some of these are dishes deliberately removed from the shared
// library — the imported Serious Eats and Giallo Zafferano recipes — and putting
// them back would undo that decision. An illustration we generated is ours to
// keep; the recipe is not ours to redistribute.
//
// Dry by default.
export async function POST(req: NextRequest) {
  if (!authorizeOps(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get('write') !== '1';
  const limit = Number(req.nextUrl.searchParams.get('limit') || 5);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });

  const { data: menus } = await adminClient.from('menus').select('id, data');

  // One entry per distinct dish, carrying the richest version of it found —
  // the same dish can appear in several weeks with a recipe loaded in only one.
  const orphans = new Map<string, any>();
  for (const m of menus || []) {
    for (const meal of ((m.data as any).meals || [])) {
      if (meal.isLeftover || !meal.name) continue;
      if ((meal.photo_url || '').includes('/illustrations/')) continue;
      const key = meal.name.toLowerCase();
      const prev = orphans.get(key);
      if (!prev || (meal.ingredients?.length || 0) > (prev.ingredients?.length || 0)) {
        orphans.set(key, meal);
      }
    }
  }

  const todo = [...orphans.values()];
  if (dry) {
    return NextResponse.json({ dryRun: true, orphans: todo.length, names: todo.map(m => m.name).slice(0, 30) });
  }

  const results: { name: string; url?: string; error?: string }[] = [];
  for (const meal of todo.slice(0, limit)) {
    try {
      const out = await generateIllustration(apiKey, meal);
      await recordUnitCost({
        model: 'gpt-image-1', feature: 'illustration:orphan',
        unit: 'image', units: 1, costUsd: 0.04, payer: 'company',
      });
      // Write it into every menu that contains this dish.
      for (const m of menus || []) {
        const data = m.data as any;
        let changed = false;
        for (const x of (data.meals || [])) {
          if ((x.name || '').toLowerCase() === meal.name.toLowerCase()) { x.photo_url = out.url; changed = true; }
        }
        if (changed) await adminClient.from('menus').update({ data }).eq('id', m.id);
      }
      results.push({ name: meal.name, url: out.url });
    } catch (e: any) {
      results.push({ name: meal.name, error: e.message?.slice(0, 150) });
    }
  }

  return NextResponse.json({ processed: results.length, remaining: todo.length - results.length, results });
}
