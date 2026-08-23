'use client';
import { useState, useEffect } from 'react';
import type { Ingredient } from '@/lib/types';

/**
 * Warns when a recipe the USER supplied contains one of their own declared
 * allergies.
 *
 * Everything Fornello generates is guarded — every food-producing route carries
 * the household's restrictions into the prompt. But a recipe imported from a
 * URL, pasted as text, or typed in by hand never passes through any of that.
 * It goes straight into the library and can be added to a weekly menu.
 *
 * Deliberately a notice and not a block: it is their kitchen and their recipe,
 * and they may be cooking for someone else. The failure to avoid is a household
 * that declared a peanut allergy quietly saving a satay recipe and meeting it
 * again months later with no idea why it is there.
 */
export default function AllergenNotice({ ingredients, name, description }: {
  ingredients: Ingredient[];
  /** Checked too: "Peanut Butter & Jelly Sandwich" should warn before a single
      ingredient has been typed. */
  name?: string;
  description?: string;
}) {
  const [restrictions, setRestrictions] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json())
      .then(s => setRestrictions((s?.restrictions || []).filter(Boolean)))
      .catch(() => {});
  }, []);

  if (!restrictions.length) return null;

  const text = [
    name || '',
    description || '',
    ...ingredients.map(i => `${i.amount} ${i.item}`),
  ].join(' ').toLowerCase();
  const hits = restrictions.filter(r => {
    const term = String(r).toLowerCase().trim();
    if (!term) return false;
    // Tolerate the plural: "Peanuts" must match "peanut butter". The same
    // trailing-\b problem that made the theme filter miss "Peanuts" entirely.
    const stem = term.replace(/s$/, '');
    return new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`, 'i').test(text);
  });

  if (!hits.length) return null;

  return (
    <div className="rounded-xl px-4 py-3 mb-4 text-sm"
         style={{ background: '#FDEDEB', color: '#8B2E22', border: '1px solid #E8B4AC' }}>
      <strong>Heads up — this contains {hits.join(', ').toLowerCase()}.</strong>{' '}
      You&apos;ve listed {hits.length === 1 ? 'that' : 'those'} as an allergy or
      something to always avoid. Fornello won&apos;t put this in a weekly menu on its own,
      but it will be in your recipes if you save it.
      <span className="block mt-2 text-xs">
        Please read the full ingredient list yourself before cooking — allergens hide in
        stocks, sauces and condiments, and the final check has to be yours.
      </span>
    </div>
  );
}
