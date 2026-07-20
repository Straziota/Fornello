// Defensive normalization for AI-generated menu data.
// LLMs occasionally emit malformed ingredients (e.g. the name lands in `amount`
// and `item` is missing). Rendering code should treat this data as untrusted,
// but the real fix is to repair it once, at the point it's written to the DB,
// so bad data never reaches any page. Every function here is total: it never
// throws, and on anything unexpected it returns a safe value.

import type { Ingredient, Meal, Side } from './types';

// Leading-quantity matcher: pulls "1", "2 tbsp", "1/2 cup" etc. off the front of
// a string so a name that got dumped into `amount` can be split back apart.
const LEADING_QTY =
  /^([\d.,/¼½¾⅓⅔⅛⅜⅝⅞\s-]+(?:tbsp|tablespoons?|tsp|teaspoons?|cups?|oz|ounces?|lbs?|pounds?|grams?|g|kg|ml|milliliters?|liters?|l|cloves?|cans?|jars?|packages?|pkgs?|large|medium|small|pinch(?:es)?|dash(?:es)?|slices?|sprigs?|stalks?|bunch(?:es)?|heads?|pieces?)?\s+)(.+)$/i;

function splitQty(s: string): Ingredient {
  const m = s.match(LEADING_QTY);
  if (m && m[2] && m[1].trim()) return { amount: m[1].trim(), item: m[2].trim() };
  return { amount: '', item: s };
}

export function normalizeIngredient(raw: unknown): Ingredient | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const s = raw.trim();
    return s ? splitQty(s) : null;
  }
  if (typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  let item = typeof r.item === 'string' ? r.item.trim() : '';
  let amount =
    typeof r.amount === 'string' ? r.amount.trim() : r.amount != null ? String(r.amount).trim() : '';
  // The classic failure: name ended up in `amount`, `item` is empty.
  if (!item && amount) {
    const split = splitQty(amount);
    item = split.item;
    amount = split.amount;
  }
  if (!item) return null; // truly empty — drop it rather than render a blank row
  return { ...r, item, amount } as Ingredient;
}

function normalizeSide(raw: unknown): Side | null {
  if (raw == null || typeof raw !== 'object') return null;
  const s = { ...(raw as Record<string, unknown>) } as Record<string, unknown>;
  s.name = typeof s.name === 'string' ? s.name : s.name == null ? '' : String(s.name);
  if (s.ingredients != null) {
    s.ingredients = Array.isArray(s.ingredients)
      ? (s.ingredients as unknown[]).map(normalizeIngredient).filter(Boolean)
      : [];
  }
  return s as unknown as Side;
}

export function normalizeMeal(raw: unknown): Meal | null {
  if (raw == null || typeof raw !== 'object') return null;
  const m = { ...(raw as Record<string, unknown>) } as Record<string, unknown>;
  m.name = typeof m.name === 'string' ? m.name : m.name == null ? '' : String(m.name);
  m.day = typeof m.day === 'string' ? m.day : m.day == null ? '' : String(m.day);
  if (m.ingredients != null) {
    m.ingredients = Array.isArray(m.ingredients)
      ? (m.ingredients as unknown[]).map(normalizeIngredient).filter(Boolean)
      : [];
  }
  if (m.sides != null) {
    m.sides = Array.isArray(m.sides)
      ? (m.sides as unknown[]).map(normalizeSide).filter(Boolean)
      : [];
  }
  if (m.tags != null && !Array.isArray(m.tags)) m.tags = [];
  return m as unknown as Meal;
}

/**
 * Normalize a whole menu object before persisting. Returns a cleaned copy;
 * on any unexpected shape it returns the input unchanged (never throws).
 */
export function normalizeMenu<T extends Record<string, unknown>>(menu: T): T {
  try {
    if (menu == null || typeof menu !== 'object') return menu;
    const out = { ...menu } as Record<string, unknown>;
    out.meals = Array.isArray(menu.meals)
      ? (menu.meals as unknown[]).map(normalizeMeal).filter(Boolean)
      : [];
    return out as T;
  } catch {
    return menu;
  }
}
