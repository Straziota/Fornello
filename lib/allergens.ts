/**
 * The allergen guard that every food-producing prompt must carry.
 *
 * Menu generation excluded restricted ingredients when choosing meal *names*,
 * but the functions that write the actual ingredient list, substitute an
 * ingredient, simplify a recipe or rewrite one around a removal never saw the
 * household's restrictions. A safe name is not a safe recipe: the allergen
 * enters at the ingredient line, which is exactly where nothing was checking.
 *
 * One shared block so a new food surface cannot quietly ship without it.
 */
export function allergenGuard(
  restrictions: string[] = [],
  skipIngredients: string[] = [],
): string {
  const r = (restrictions || []).map(s => String(s).trim()).filter(Boolean);
  const s = (skipIngredients || []).map(x => String(x).trim()).filter(Boolean);
  if (!r.length && !s.length) return '';

  const parts: string[] = [];
  if (r.length) {
    parts.push(
`🚨 ALLERGIES / STRICT RESTRICTIONS — ${r.join(', ')}.
These must NEVER appear: not as an ingredient, not as a substitute, not as a garnish, not "optional", not "to taste", not in a sauce, stock, oil or condiment derived from them. If the dish traditionally contains one, use a genuinely safe alternative and do not mention the original as an option. There is no acceptable quantity.`);
  }
  if (s.length) {
    parts.push(`Avoid where structural (preference, not allergy): ${s.join(', ')}.`);
  }
  return '\n' + parts.join('\n') + '\n';
}
