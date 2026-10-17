import type { Ingredient } from './types';

/**
 * Printing a recipe, in one place.
 *
 * Lived inside MealModal, so every other screen showing a recipe either had no
 * print button or would have needed its own copy of this stylesheet. Two copies
 * drift: the first time someone adjusts the ingredient spacing, half the app's
 * printouts change and the other half do not.
 *
 * printWindow is exported separately because MealModal composes richer HTML —
 * side dishes, and translated ingredients when a household reads in another
 * language. It shares the window and the stylesheet without being forced
 * through a simpler printRecipe() that would quietly drop both.
 */
export function printWindow(title: string, html: string) {
  const win = window.open('', '_blank');
  // Blocked by a pop-up blocker, or opened from a context that forbids it.
  // Nothing to recover — but failing silently is better than throwing into a
  // click handler.
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title><style>
    body{font-family:Georgia,serif;max-width:680px;margin:48px auto;color:#2F3A32;line-height:1.6}
    h1{font-size:26px;margin-bottom:6px}
    .meta{font-size:13px;color:#7A847B;margin-bottom:28px}
    h2{font-size:11px;text-transform:uppercase;letter-spacing:.2em;color:#556257;margin:28px 0 12px;border-bottom:1px solid #E7E0D6;padding-bottom:6px}
    .ing{display:flex;gap:14px;padding:5px 0;border-bottom:1px dotted #D4B896;font-size:14px}
    .amt{color:#556257;font-weight:700;min-width:80px;flex-shrink:0}
    .step{display:flex;gap:12px;margin-bottom:10px;font-size:14px}
    .num{color:#556257;font-weight:700;min-width:22px;flex-shrink:0}
    .tip{display:flex;gap:10px;padding:10px 14px;background:#EEF2EE;border-radius:8px;margin-bottom:8px;font-size:14px}
    .check{color:#556257;font-weight:700;flex-shrink:0}
    .safety{font-size:11px;font-style:italic;color:#6B7269;margin:-6px 0 14px;line-height:1.4}
    @media print{@page{margin:2cm}}
  </style></head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  // The document needs a moment to lay out, or Safari prints a blank page.
  setTimeout(() => win.print(), 250);
}

const escapeHtml = (s = '') =>
  s.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));

export interface PrintableRecipe {
  name: string;
  description?: string;
  total_time?: string;
  serves?: number;
  cuisine?: string;
  difficulty?: string;
  ingredients?: Ingredient[];
  instructions?: string[];
  prep_ahead?: string[];
}

/**
 * The safety line goes on every printed recipe.
 *
 * A printed sheet is read furthest from the app — taped inside a cupboard, days
 * later, often by whoever is cooking rather than whoever typed the allergies in.
 */
const SAFETY = 'Recipes are AI-generated and avoid the ingredients you&rsquo;ve listed &mdash; but check every ingredient and label before you cook.';

export function printRecipe(recipe: PrintableRecipe) {
  const meta = [recipe.total_time, recipe.serves ? `Serves ${recipe.serves}` : '', recipe.cuisine, recipe.difficulty]
    .filter(Boolean).map(escapeHtml).join(' · ');

  const ingredients = (recipe.ingredients || []).length ? `
    <h2>Ingredients</h2>
    <p class="safety">${SAFETY}</p>
    ${(recipe.ingredients || []).map(i =>
      `<div class="ing"><span class="amt">${escapeHtml(i.amount)}</span><span>${escapeHtml(i.item)}</span></div>`).join('')}` : '';

  const instructions = (recipe.instructions || []).length ? `
    <h2>Instructions</h2>
    ${(recipe.instructions || []).map((s, i) =>
      `<div class="step"><span class="num">${i + 1}.</span><span>${escapeHtml(s.replace(/^Step \d+:\s*/i, ''))}</span></div>`).join('')}` : '';

  const prep = (recipe.prep_ahead || []).filter(t => t.trim()).length ? `
    <h2>Prepare Ahead</h2>
    ${(recipe.prep_ahead || []).filter(t => t.trim()).map(t =>
      `<div class="tip"><span class="check">&check;</span><span>${escapeHtml(t)}</span></div>`).join('')}` : '';

  printWindow(recipe.name, `
    <h1>${escapeHtml(recipe.name)}</h1>
    ${meta ? `<p class="meta">${meta}</p>` : ''}
    ${ingredients}${instructions}${prep}
  `);
}
