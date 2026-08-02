import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { getSpecialOccasion, getCurrentMenu, updateMenuData } from '@/lib/db';
import { generateOccasionGroceryList } from '@/lib/claude';
import type { SpecialOccasionResult } from '@/lib/claude';
import type { GroceryItem } from '@/lib/types';

export const maxDuration = 120;

// Items this occasion contributed to the weekly list, by title tag.
function isFromOccasion(it: GroceryItem, id: number, title: string) {
  return it?.occasionId != null ? it.occasionId === id : it?.occasion === title;
}

function countForOccasion(groceryList: any, id: number, title: string) {
  let n = 0;
  for (const items of Object.values((groceryList || {}) as Record<string, GroceryItem[]>)) {
    if (!Array.isArray(items)) continue;
    n += items.filter(it => isFromOccasion(it, id, title)).length;
  }
  return n;
}

function occasionTitleOf(row: any) {
  const result = row.result as SpecialOccasionResult;
  return result?.occasionTitle || row.occasion || 'Special occasion';
}

// GET — how many of this occasion's items are currently on the weekly list, so
// the page can offer "Remove" instead of "Add" when they're already there.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const row = await getSpecialOccasion(user!.id, Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const menu = await getCurrentMenu(user!.id);
  return NextResponse.json({ count: countForOccasion(menu?.grocery_list, Number(id), occasionTitleOf(row)) });
}

// DELETE — pull this occasion's items back out of the weekly list.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const row = await getSpecialOccasion(user!.id, Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const menu = await getCurrentMenu(user!.id);
  if (!menu?.id) return NextResponse.json({ ok: true, count: 0 });

  const title = occasionTitleOf(row);
  const trimmed: Record<string, GroceryItem[]> = {};
  for (const [cat, items] of Object.entries((menu.grocery_list || {}) as Record<string, GroceryItem[]>)) {
    if (!Array.isArray(items)) continue;
    trimmed[cat] = items.filter(it => !isFromOccasion(it, Number(id), title));
  }
  await updateMenuData(user!.id, menu.id, { ...menu, grocery_list: trimmed });
  return NextResponse.json({ ok: true, count: 0 });
}

// POST /api/special-occasion/[id]/groceries
// Folds the occasion's selected dishes into the current weekly grocery list.
// Items are tagged with the occasion title so they can be told apart, replaced
// on a re-add, and preserved when the weekly list is refreshed.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const row = await getSpecialOccasion(user!.id, Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const result = row.result as SpecialOccasionResult;
  const dishes = (result.menu || [])
    .filter(m => m.selected !== false && m.fullRecipe?.ingredients?.length)
    .map(m => ({ dish: m.dish, ingredients: m.fullRecipe!.ingredients }));

  if (!dishes.length) {
    return NextResponse.json(
      { error: 'Finalize the menu first — the recipes have to exist before their ingredients can be added.' },
      { status: 400 },
    );
  }

  const menu = await getCurrentMenu(user!.id);
  if (!menu?.id) {
    return NextResponse.json(
      { error: 'There is no weekly menu yet to add these to. Generate this week\'s menu first.' },
      { status: 404 },
    );
  }

  const occasionTitle = occasionTitleOf(row);

  try {
    const additions = await generateOccasionGroceryList(getAnthropicKey(), dishes, occasionTitle, Number(id));

    // Start from the current list minus anything previously added for THIS
    // occasion, so re-adding refreshes rather than duplicates.
    const merged: Record<string, GroceryItem[]> = {};
    for (const [cat, items] of Object.entries((menu.grocery_list || {}) as Record<string, GroceryItem[]>)) {
      if (!Array.isArray(items)) continue;
      merged[cat] = items.filter(it => !isFromOccasion(it, Number(id), occasionTitle));
    }
    let added = 0;
    for (const [cat, items] of Object.entries(additions as Record<string, GroceryItem[]>)) {
      if (!Array.isArray(items) || !items.length) continue;
      (merged[cat] = merged[cat] || []).push(...items);
      added += items.length;
    }

    await updateMenuData(user!.id, menu.id, { ...menu, grocery_list: merged });
    return NextResponse.json({ ok: true, added, occasion: occasionTitle });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'Could not add these to the grocery list.' },
      { status: 500 },
    );
  }
}
