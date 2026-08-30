/**
 * The shopping list as text someone can take anywhere.
 *
 * Instacart applications are closed, so the list currently has no way out of
 * Fornello except retyping it. Plain text goes into Walmart's search, Amazon's,
 * Notes, or a message to whoever is actually going to the shop — every retailer
 * on earth, and no approval from any of them.
 */
export interface ShareRow {
  label: string;
  amount: string;
  cat: string;
}

/** Grouped by aisle, because that is the order someone walks the shop in. */
export function formatList(rows: ShareRow[], title = 'Shopping list'): string {
  if (!rows.length) return '';
  const byCat = new Map<string, ShareRow[]>();
  for (const r of rows) {
    if (!byCat.has(r.cat)) byCat.set(r.cat, []);
    byCat.get(r.cat)!.push(r);
  }
  const blocks = [...byCat.entries()].map(([cat, items]) => {
    const lines = items.map(i => `• ${i.amount ? `${i.amount} ` : ''}${i.label}`);
    return `${cat}\n${lines.join('\n')}`;
  });
  return `${title}\n\n${blocks.join('\n\n')}`;
}

/**
 * One grocery amount split into the number and unit an ordering API wants.
 *
 * Written now rather than later: it is the only genuinely fiddly part of the
 * Instacart integration, it is testable without a key, and the text list needs
 * nothing from it — so when applications reopen this is already done.
 *
 * Returns quantity 1 and no unit when the amount is unparseable, which is the
 * documented fallback: a line item only requires a name.
 */
export interface LineItem {
  name: string;
  quantity: number;
  unit?: string;
}

const UNIT_WORDS: Record<string, string> = {
  cup: 'cup', cups: 'cup',
  tbsp: 'tablespoon', tablespoon: 'tablespoon', tablespoons: 'tablespoon',
  tsp: 'teaspoon', teaspoon: 'teaspoon', teaspoons: 'teaspoon',
  oz: 'ounce', ounce: 'ounce', ounces: 'ounce',
  lb: 'pound', lbs: 'pound', pound: 'pound', pounds: 'pound',
  g: 'gram', gram: 'gram', grams: 'gram',
  kg: 'kilogram', kilogram: 'kilogram', kilograms: 'kilogram',
  ml: 'milliliter', milliliter: 'milliliter', milliliters: 'milliliter',
  l: 'liter', liter: 'liter', liters: 'liter',
  clove: 'each', cloves: 'each', bunch: 'bunch', bunches: 'bunch',
  can: 'can', cans: 'can', jar: 'jar', jars: 'jar',
  package: 'package', packages: 'package', pkg: 'package',
  head: 'each', heads: 'each', slice: 'each', slices: 'each',
};

// "1 1/2", "1½", "1.5" and "2-3" all appear in real amounts.
const VULGAR: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125,
};

export function toLineItem(name: string, amount = ''): LineItem {
  const raw = amount.trim().toLowerCase();
  if (!raw) return { name, quantity: 1 };

  let text = raw;
  for (const [glyph, value] of Object.entries(VULGAR)) {
    text = text.replace(glyph, ` ${value} `);
  }
  // Substituting a glyph leaves stray spaces, and every pattern below is
  // anchored at the start — "½ cup" became " 0.5 cup" and matched nothing.
  text = text.replace(/\s+/g, ' ').trim();

  // A range means "about this much"; take the lower bound rather than inventing
  // a middle, since buying too little is recoverable and too much is waste.
  const range = /^(\d+(?:\.\d+)?)\s*[-–]\s*\d+(?:\.\d+)?/.exec(text);
  let quantity: number | null = null;
  let rest = text;

  if (range) {
    quantity = Number(range[1]);
    rest = text.slice(range[0].length);
  } else {
    // "1½" arrives here as "1 0.5" and means one and a half, not one then a
    // half. Checked before the plain-number rule, which would stop at the 1.
    const mixedDecimal = /^(\d+)\s+(0?\.\d+)\b/.exec(text);
    const mixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)/.exec(text);          // 1 1/2
    const fraction = /^(\d+)\s*\/\s*(\d+)/.exec(text);                // 1/2
    const decimal = /^(\d+(?:\.\d+)?)/.exec(text);                    // 2 or 1.5
    if (mixedDecimal) { quantity = Number(mixedDecimal[1]) + Number(mixedDecimal[2]); rest = text.slice(mixedDecimal[0].length); }
    else if (mixed) { quantity = Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]); rest = text.slice(mixed[0].length); }
    else if (fraction) { quantity = Number(fraction[1]) / Number(fraction[2]); rest = text.slice(fraction[0].length); }
    else if (decimal) { quantity = Number(decimal[1]); rest = text.slice(decimal[0].length); }
  }

  const unitWord = /^[\s.]*([a-z]+)/.exec(rest)?.[1];
  const unit = unitWord ? UNIT_WORDS[unitWord] : undefined;

  return {
    name,
    quantity: quantity && Number.isFinite(quantity) && quantity > 0 ? Number(quantity.toFixed(2)) : 1,
    ...(unit ? { unit } : {}),
  };
}
