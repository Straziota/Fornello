/**
 * Does an existing illustration belong to this dish?
 *
 * `global_recipes` is keyed by name and names drift — "Chicken Marsala" versus
 * "Italian Chicken Marsala" — so an exact-name lookup would generate a fresh
 * image for every near-miss and the library would fill with near-duplicate
 * pictures of the same dish.
 *
 * DELIBERATELY SEPARATE from the repeat-detection matcher in
 * /api/menu/generate, and stricter. A wrongly-blocked repeat is invisible; a
 * wrong picture is not. Sharing one implementation would also mean a stopword
 * edit made to tighten repeat-checking would silently loosen image-matching,
 * with nothing connecting the two decisions and no test that notices.
 */

/**
 * This module's OWN stopword list. Do not import one from elsewhere and do not
 * merge these lists — see above.
 */
const STOPWORDS = new Set([
  'with', 'and', 'the', 'style', 'classic', 'slow', 'cooker', 'easy', 'quick',
  'homemade', 'fresh', 'simple', 'traditional', 'authentic', 'best', 'perfect',
]);

/**
 * A different protein makes a picture wrong however well the rest matches.
 *
 * Compared as SETS for equality, not presence-and-difference: "Roasted Lemon
 * Herb Chicken" vs "Roasted Lemon Herb Vegetables" is {chicken} vs {}, and a
 * presence test lets that through — handing a vegetarian dish a picture of
 * chicken, which is worse than the wrong meat.
 */
const PROTEINS = new Set([
  'chicken', 'beef', 'pork', 'lamb', 'veal', 'duck', 'turkey', 'sausage',
  'salmon', 'cod', 'tuna', 'fish', 'seafood', 'shrimp', 'prawn', 'tofu',
]);

function tokens(name: string): Set<string> {
  return new Set(
    name.toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 4 && !STOPWORDS.has(t)),
  );
}

const setsEqual = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every(x => b.has(x));

/**
 * Whether two dishes may share one illustration.
 *
 * Requires THREE shared meaningful tokens, where repeat-detection requires two.
 * Measured on the real library: every dangerous pair shared exactly two —
 * "Sole Meunière with Haricots Verts" against "Steamed Haricots Verts",
 * "Shakshuka with Feta and Warm Flatbread" against "Warm Flatbread" — while the
 * sound ones shared three.
 */
export function sameDishForPhoto(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return true;

  const ta = tokens(a), tb = tokens(b);
  if (!ta.size || !tb.size) return false;

  const pa = new Set([...ta].filter(t => PROTEINS.has(t)));
  const pb = new Set([...tb].filter(t => PROTEINS.has(t)));
  if (!setsEqual(pa, pb)) return false;

  let overlap = 0;
  ta.forEach(t => { if (tb.has(t)) overlap++; });
  if (overlap < 3) return false;

  return overlap / Math.min(ta.size, tb.size) >= 0.5;
}
