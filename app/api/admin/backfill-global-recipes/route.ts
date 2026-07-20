import { NextResponse } from 'next/server';
import { checkIsAdmin } from '@/lib/auth';
import { getAllUserRecipesForBackfill, getGlobalRecipe, saveGlobalRecipeIfNew } from '@/lib/db';

// One-shot backfill: copies every existing user_recipes row into global_recipes.
// Idempotent — saveGlobalRecipeIfNew dedupes by name, so re-running is safe.
export const maxDuration = 300;

export async function POST() {
  const ok = await checkIsAdmin();
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const all = await getAllUserRecipesForBackfill();
  let copied = 0;
  let alreadyPresent = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const r of all) {
    try {
      if (!r.name?.trim()) { failed++; continue; }
      const existing = await getGlobalRecipe(r.name);
      if (existing) { alreadyPresent++; continue; }
      await saveGlobalRecipeIfNew({ ...r, category: 'dinner' });
      copied++;
    } catch (e: any) {
      failed++;
      if (failures.length < 10) failures.push(`${r.name}: ${e.message}`);
    }
  }

  return NextResponse.json({
    total: all.length,
    copied,
    alreadyPresent,
    failed,
    failures,
  });
}
