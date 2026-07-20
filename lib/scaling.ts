const FRACTIONS: [number, string][] = [
  [1/8, '⅛'], [1/4, '¼'], [1/3, '⅓'], [3/8, '⅜'],
  [1/2, '½'], [5/8, '⅝'], [2/3, '⅔'], [3/4, '¾'], [7/8, '⅞'],
];

function parseLeadingNumber(str: string): number | null {
  str = str.trim();
  // "1 1/2"
  const mixed = str.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  // "1/2"
  const frac = str.match(/^(\d+)\/(\d+)/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  // "1.5" or "2"
  const plain = parseFloat(str);
  return isNaN(plain) ? null : plain;
}

function formatNumber(n: number): string {
  if (n <= 0) return '0';
  const whole = Math.floor(n);
  const frac = n - whole;
  if (frac < 0.05) return String(whole);

  let bestStr = '';
  let bestDiff = Infinity;
  for (const [val, str] of FRACTIONS) {
    const diff = Math.abs(frac - val);
    if (diff < bestDiff) { bestDiff = diff; bestStr = str; }
  }

  if (bestDiff > 0.08) return (Math.round(n * 10) / 10).toString();
  return whole === 0 ? bestStr : `${whole} ${bestStr}`;
}

function scaleAmount(amount: string, factor: number): string {
  if (!amount || factor === 1) return amount;
  // Match a leading number: mixed ("1 1/2"), fraction ("1/2"), or decimal/integer
  const match = amount.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)(.*)/);
  if (!match) return amount; // "to taste", "a pinch", etc.
  const num = parseLeadingNumber(match[1]);
  if (num === null || num === 0) return amount;
  return (formatNumber(num * factor) + match[2]).trim();
}

export function scaleIngredients(
  ingredients: { amount: string; item: string }[],
  originalServes: number,
  targetServes: number
): { amount: string; item: string }[] {
  if (!originalServes || originalServes === targetServes) return ingredients;
  const factor = targetServes / originalServes;
  return ingredients.map(ing => ({ ...ing, amount: scaleAmount(ing.amount, factor) }));
}
