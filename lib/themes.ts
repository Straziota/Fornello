// Rotating cuisine/technique themes used to keep weekly menus from converging on
// the same handful of dishes.
//
// Extracted from the menu prompt so onboarding can use the same list: when a
// household says "no shellfish", the questionnaire can tell them truthfully how
// many directions that closes off, because it is filtering the real list the
// generator will use — not a decorative copy of it.

// Patterns end in `s?` deliberately. A trailing \b cannot match a plural —
// /\bpeanut\b/ does not match "Peanuts" — and users write allergies in the
// plural far more often than the singular. Missing the match does not serve the
// allergen (the prompt's hard exclusion still carries the word through), but it
// silently stops the theme filter steering away from the riskiest cuisines.
export const EXPLORATION_THEMES: { label: string; conflictsWith?: RegExp; requiresPreference?: RegExp }[] = [
  { label: 'Mediterranean / North African' },
  { label: 'East Asian', conflictsWith: /\b(soy|sesame|shellfish)s?\b/i },
  { label: 'Southeast Asian', conflictsWith: /\b(peanut|shellfish|fish sauce)s?\b/i },
  { label: 'Latin American' },
  { label: 'Caribbean', conflictsWith: /\b(seafood|shellfish)s?\b/i },
  { label: 'South Asian / Indian subcontinent' },
  { label: 'Middle Eastern' },
  { label: 'Italian regional (pick a region — Sicilian, Tuscan, Pugliese, etc.)' },
  { label: 'French bistro / home cooking' },
  { label: 'Eastern European' },
  { label: 'Spanish / Portuguese' },
  { label: 'Vegetable-forward / lighter cooking' },
  { label: 'Slow-cooked, hearty, comforting' },
  { label: 'Seafood-focused / coastal', conflictsWith: /\b(seafood|fish|shellfish|pescatarian)s?\b/i },
  { label: 'Smoky, grilled, or pan-seared' },
  { label: 'Braises, stews, or one-pot dishes' },
  { label: 'Rustic peasant cooking (any culture)' },
];

/**
 * How many exploration themes a set of restrictions rules out.
 *
 * Mirrors the filter the menu generator applies, so onboarding can give an
 * honest answer ("that takes 3 directions off the table") rather than a
 * flattering guess.
 */
export function themesExcludedBy(restrictionText: string): { excluded: string[]; remaining: number } {
  const blob = (restrictionText || '').toLowerCase();
  if (!blob.trim()) return { excluded: [], remaining: EXPLORATION_THEMES.length };
  const vegetarianOnly = /\b(vegetarian|vegan|plant.?based|meatless)\b/.test(blob);
  const excluded = EXPLORATION_THEMES.filter(t => {
    if (t.conflictsWith && t.conflictsWith.test(blob)) return true;
    if (vegetarianOnly && /seafood|coastal|smoky|grilled|pan-seared|hearty|braises|stews/i.test(t.label)) return true;
    return false;
  }).map(t => t.label);
  return { excluded, remaining: EXPLORATION_THEMES.length - excluded.length };
}
