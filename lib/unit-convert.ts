// Deterministic unit conversion for recipe ingredients & instructions.
// Handles: lb ↔ g, oz (weight) ↔ g, fl oz ↔ mL, °F ↔ °C, cups → mL (volume only).
// Does NOT attempt weight ↔ volume conversion (ingredient-dependent, lives on /converter page).

const round = (n: number, decimals = 0) => {
  const m = Math.pow(10, decimals);
  return Math.round(n * m) / m;
};

// Pretty number formatter: drops trailing .0, keeps useful precision
function pretty(n: number): string {
  if (n >= 1000) return String(Math.round(n));
  if (n >= 100) return String(Math.round(n));
  if (n >= 10) return String(round(n, 0));
  return String(round(n, 1));
}

// Parse fractions like "1/2", "1 1/2", "½", "1½"
const FRACTIONS: Record<string, number> = {
  '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1/3, '⅔': 2/3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};
function parseQty(s: string): number {
  s = s.trim();
  // unicode fractions
  for (const [k, v] of Object.entries(FRACTIONS)) {
    if (s.includes(k)) {
      const without = s.replace(k, '').trim();
      const whole = without ? parseFloat(without) : 0;
      return (isNaN(whole) ? 0 : whole) + v;
    }
  }
  // mixed: "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  // simple fraction: "1/2"
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  // plain number
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

// Replace each measurement in `text` according to direction.
// direction: 'metric' = convert imperial → metric, 'imperial' = leave metric alone (read-only display direction)
//   For toggling back to imperial we just show the original text.
function toMetric(text: string): string {
  let out = text;

  // Temperature: 350°F, 350 F, 350 degrees F, 350 degrees Fahrenheit
  out = out.replace(/(\d+)\s*°?\s*(?:F|degrees?\s*F|degrees?\s*Fahrenheit)\b/gi, (_m, n) => {
    const f = parseFloat(n);
    if (isNaN(f)) return _m;
    const c = (f - 32) * 5 / 9;
    return `${Math.round(c)}°C`;
  });

  // Weight: lb / lbs / pound(s)
  out = out.replace(/((?:\d+\s+)?\d+\/?\d*|[½¼¾⅓⅔⅛⅜⅝⅞]|\d+\.?\d*)\s*(lbs?\b|pounds?\b)/gi, (_m, qty) => {
    const v = parseQty(qty);
    if (isNaN(v)) return _m;
    const g = v * 453.592;
    return g >= 1000 ? `${pretty(g / 1000)} kg` : `${pretty(g)} g`;
  });

  // Weight: oz / ounces — only when not preceded by "fl" or "fluid"
  out = out.replace(/(?<!fl\s|fluid\s)((?:\d+\s+)?\d+\/?\d*|[½¼¾⅓⅔⅛⅜⅝⅞]|\d+\.?\d*)\s*(oz\b|ounces?\b)/gi, (_m, qty) => {
    const v = parseQty(qty);
    if (isNaN(v)) return _m;
    return `${pretty(v * 28.3495)} g`;
  });

  // Volume: fl oz, fluid ounces
  out = out.replace(/((?:\d+\s+)?\d+\/?\d*|[½¼¾⅓⅔⅛⅜⅝⅞]|\d+\.?\d*)\s*(?:fl\s*oz|fluid\s*ounces?)/gi, (_m, qty) => {
    const v = parseQty(qty);
    if (isNaN(v)) return _m;
    return `${pretty(v * 29.5735)} mL`;
  });

  // Volume: cups → mL (helpful for non-US cooks; 1 cup = 236.6 mL)
  out = out.replace(/((?:\d+\s+)?\d+\/?\d*|[½¼¾⅓⅔⅛⅜⅝⅞]|\d+\.?\d*)\s*cups?\b/gi, (_m, qty) => {
    const v = parseQty(qty);
    if (isNaN(v)) return _m;
    const ml = v * 236.588;
    return ml >= 1000 ? `${pretty(ml / 1000)} L` : `${pretty(ml)} mL`;
  });

  // Volume: tbsp / tablespoon
  out = out.replace(/((?:\d+\s+)?\d+\/?\d*|[½¼¾⅓⅔⅛⅜⅝⅞]|\d+\.?\d*)\s*(?:tbsp|tablespoons?)/gi, (_m, qty) => {
    const v = parseQty(qty);
    if (isNaN(v)) return _m;
    return `${pretty(v * 14.787)} mL`;
  });

  // Volume: tsp / teaspoon
  out = out.replace(/((?:\d+\s+)?\d+\/?\d*|[½¼¾⅓⅔⅛⅜⅝⅞]|\d+\.?\d*)\s*(?:tsp|teaspoons?)/gi, (_m, qty) => {
    const v = parseQty(qty);
    if (isNaN(v)) return _m;
    return `${pretty(v * 4.929)} mL`;
  });

  return out;
}

export function convertText(text: string, direction: 'metric' | 'original'): string {
  if (!text) return text;
  if (direction === 'original') return text;
  return toMetric(text);
}

export function convertIngredient(
  ing: { amount: string; item: string },
  direction: 'metric' | 'original'
): { amount: string; item: string } {
  if (direction === 'original') return ing;
  return { amount: toMetric(ing.amount), item: toMetric(ing.item) };
}

// ── metric → US customary ──────────────────────────────────────────────────
// Converts any metric measurement in `text` to US units, leaving US units (and
// non-measurement text) untouched. Same-dimension only: g/kg → oz/lb (weight),
// mL/L → tsp/tbsp/cups (volume), °C → °F. No weight↔volume guessing.
const QTY = '((?:\\d+\\s+)?\\d+\\/?\\d*|[½¼¾⅓⅔⅛⅜⅝⅞]|\\d+\\.?\\d*)';

function toUS(text: string): string {
  let out = text;

  // Temperature: 180°C, 180 C, 180 degrees Celsius → °F
  out = out.replace(/(\d+(?:\.\d+)?)\s*°?\s*(?:C\b|degrees?\s*C\b|degrees?\s*Celsius\b)/gi, (_m, n) => {
    const c = parseFloat(n);
    if (isNaN(c)) return _m;
    return `${Math.round(c * 9 / 5 + 32)}°F`;
  });

  // Weight: kg / kilograms → lb  (before the bare-g rule so "kg" isn't split)
  out = out.replace(new RegExp(`${QTY}\\s*(?:kg\\b|kilograms?\\b)`, 'gi'), (_m, qty) => {
    const v = parseQty(qty);
    if (isNaN(v)) return _m;
    return `${pretty(v * 2.20462)} lb`;
  });

  // Weight: g / grams → oz (or lb when ≥ 1 lb)
  out = out.replace(new RegExp(`${QTY}\\s*(?:g\\b|grams?\\b)`, 'gi'), (_m, qty) => {
    const v = parseQty(qty);
    if (isNaN(v)) return _m;
    const oz = v * 0.035274;
    return oz >= 16 ? `${pretty(oz / 16)} lb` : `${pretty(oz)} oz`;
  });

  // Volume: mL / millilitres → tsp / tbsp / cups (before the L rule)
  out = out.replace(new RegExp(`${QTY}\\s*(?:ml\\b|millilit(?:er|re)s?\\b)`, 'gi'), (_m, qty) => {
    const v = parseQty(qty);
    if (isNaN(v)) return _m;
    if (v >= 177) return `${pretty(v / 236.588)} cups`;
    if (v >= 15) return `${pretty(v / 14.787)} tbsp`;
    return `${pretty(v / 4.929)} tsp`;
  });

  // Volume: litre words (case-insensitive) → cups
  out = out.replace(new RegExp(`${QTY}\\s*lit(?:er|re)s?\\b`, 'gi'), (_m, qty) => {
    const v = parseQty(qty);
    if (isNaN(v)) return _m;
    return `${pretty(v * 4.22675)} cups`;
  });
  // Volume: bare capital-L unit (case-sensitive to avoid matching stray "l")
  out = out.replace(new RegExp(`${QTY}\\s*L\\b`, 'g'), (_m, qty) => {
    const v = parseQty(qty);
    if (isNaN(v)) return _m;
    return `${pretty(v * 4.22675)} cups`;
  });

  return out;
}

// Normalize a recipe's free text to the user's unit preference. US is the app
// default; only 'metric' routes through toMetric. Applied at serve time so
// cached recipes, freshly generated ones, and model slip-ups all read the same.
export function normalizeText(text: string, units?: string): string {
  if (!text) return text;
  return units === 'metric' ? toMetric(text) : toUS(text);
}

export function normalizeIngredient(
  ing: { amount: string; item: string },
  units?: string
): { amount: string; item: string } {
  return { amount: normalizeText(ing.amount, units), item: normalizeText(ing.item, units) };
}

// Convenience: normalize the standard recipe-detail fields in place-safe fashion.
export function normalizeRecipeUnits<T extends {
  ingredients?: { amount: string; item: string }[];
  instructions?: string[];
  prep_ahead?: string[];
  sides?: { name: string; ingredients?: { amount: string; item: string }[]; instructions?: string[] }[];
}>(recipe: T, units?: string): T {
  return {
    ...recipe,
    ...(recipe.ingredients ? { ingredients: recipe.ingredients.map(i => normalizeIngredient(i, units)) } : {}),
    ...(recipe.instructions ? { instructions: recipe.instructions.map(s => normalizeText(s, units)) } : {}),
    ...(recipe.prep_ahead ? { prep_ahead: recipe.prep_ahead.map(s => normalizeText(s, units)) } : {}),
    ...(recipe.sides ? { sides: recipe.sides.map(side => ({
      ...side,
      ...(side.ingredients ? { ingredients: side.ingredients.map(i => normalizeIngredient(i, units)) } : {}),
      ...(side.instructions ? { instructions: side.instructions.map(s => normalizeText(s, units)) } : {}),
    })) } : {}),
  };
}
