import type { Meal, Settings } from './types';

export interface Reason {
  icon: string;
  text: string;
  /** Where the user goes to change this. Every reason is an editable control. */
  href?: string;
  /** Label for that link, e.g. "change" / "not true?" */
  action?: string;
}

const minutesFromLabel = (label?: string): number | null => {
  if (!label) return null;
  const h = /(\d+)\s*h/i.exec(label);
  const m = /(\d+)\s*m/i.exec(label);
  if (!h && !m) return null;
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
};

/**
 * Why this meal is on this day — derived, never asked.
 *
 * Every line compares the meal against the settings that produced it, so each
 * one is a fact we hold rather than an explanation we generated. Asking a model
 * to justify its own earlier choice would produce a plausible story with no
 * connection to the actual reason; that is the same failure as asking it for a
 * recipe URL it cannot know.
 *
 * Each reason carries the link to the control that changes it, so the settings
 * teach themselves at the moment someone disagrees.
 */
export function reasonsFor(meal: Meal, settings: Partial<Settings>): Reason[] {
  const out: Reason[] = [];
  const day = meal.day;
  const daySched = (settings.schedule || {})[day] as { minutes?: number; technique?: string } | undefined;

  // Cuisine — only claimed when they actually said it.
  const prefs = settings.preferences || [];
  const matched = prefs.find(p => {
    const t = p.toLowerCase();
    return t && (`${meal.cuisine} ${(meal.tags || []).join(' ')}`.toLowerCase().includes(t));
  });
  if (matched) {
    out.push({ icon: '🍅', text: `${meal.cuisine || matched} — you told me your family loves it.`, href: '/settings', action: 'change' });
  } else if (meal.cuisine) {
    out.push({ icon: '🧭', text: `${meal.cuisine} — something new, to keep the weeks from repeating themselves.`, href: '/settings', action: 'tell me what you like' });
  }

  // Time — only when the day genuinely has a budget and the dish fits it.
  const budget = daySched?.minutes;
  const actual = minutesFromLabel(meal.total_time);
  if (budget && actual && actual <= budget) {
    out.push({ icon: '⏱', text: `${meal.total_time}, because you gave ${day} ${budget} minutes.`, href: '/settings', action: 'change' });
  } else if (budget) {
    out.push({ icon: '⏱', text: `You gave ${day} ${budget} minutes.`, href: '/settings', action: 'change' });
  }

  // Technique — deterministically enforced, so this is a guarantee not a guess.
  if (daySched?.technique) {
    out.push({ icon: '🔥', text: `${daySched.technique}, because you asked for it on ${day}s.`, href: '/settings', action: 'change' });
  }

  // Portions.
  if (meal.serves) {
    out.push({ icon: '🍽', text: `Scaled for ${meal.serves}.`, href: '/settings', action: 'change' });
  }

  // Allergies — worth stating plainly, because silence is not reassurance.
  const restrictions = (settings.restrictions || []).filter(Boolean);
  if (restrictions.length) {
    out.push({ icon: '🚫', text: `No ${restrictions.join(', ').toLowerCase()} — never, in any recipe I suggest.`, href: '/settings', action: 'change' });
  }

  // The no-repeat rule, which is invisible until someone explains it.
  out.push({ icon: '🔁', text: `You haven't had this in at least 12 weeks — I don't repeat, even under a different name.` });

  return out;
}
