import type { Meal, WeekSchedule } from './types';

/**
 * "Just this week" and "every week" are the same thought, separated by
 * navigation.
 *
 * Someone who shortens Thursday is telling us something about Thursdays. The
 * menu view can only change this week; the standing preference lives in
 * Settings → Cooking Schedule, which they will never go and find. So the offer
 * comes to them, at the moment the thought occurs, and one tap writes the
 * setting. They never have to learn that the setting exists.
 *
 * The mirror of why.ts: that explains why a meal was chosen and links to the
 * setting behind it; this offers to make a change permanent after the fact.
 * Same principle, opposite direction.
 */
export type OfferKind = 'minutes' | 'technique' | 'skip';

export interface DayOffer {
  day: string;
  kind: OfferKind;
  /** Minutes, technique name, or unused for skip. */
  value?: number | string;
  question: string;
  accept: string;
}

/** One entry per day-and-kind: the question is always "have we asked THIS". */
export type OfferLog = Record<string, 'accepted' | 'declined'>;
export const offerKey = (day: string, kind: OfferKind) => `${day}:${kind}`;

export const minutesFromLabel = (label?: string): number | null => {
  if (!label) return null;
  const h = /(\d+)\s*h/i.exec(label);
  const m = /(\d+)\s*m/i.exec(label);
  if (!h && !m) return null;
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
};

// Rounded down to something a person would actually choose, and matching the
// options onboarding offers — a standing setting of "37 minutes" is noise.
const BANDS = [20, 30, 45, 60, 90];
const bandFor = (mins: number) => BANDS.find(b => mins <= b) ?? 90;

const TECHNIQUE_HINTS: [RegExp, string][] = [
  [/\bslow[- ]?cook/i, 'Slow Cooker'],
  [/\bair[- ]?fry/i, 'Air Fryer'],
  [/\bgrill|barbecue|bbq\b/i, 'Grill'],
  [/\bsheet[- ]?pan|one[- ]?pan\b/i, 'Sheet Pan'],
  [/\bpressure cook|instant pot\b/i, 'Pressure Cooker'],
  [/\bno[- ]?cook\b/i, 'No Cook'],
];

function techniqueOf(meal: Meal): string | null {
  const hay = [meal.technique, meal.name, ...(meal.tags || [])].filter(Boolean).join(' ');
  return TECHNIQUE_HINTS.find(([re]) => re.test(hay))?.[1] ?? null;
}

/**
 * What a swap on one day suggests about every such day.
 *
 * Returns null far more often than not, on purpose. An offer that fires on an
 * ordinary swap is an interruption; one that fires when someone has clearly
 * reached for something specific is a shortcut.
 */
export function offerFromReplacement(
  day: string,
  before: Meal,
  after: Meal,
  schedule: WeekSchedule,
  log: OfferLog = {},
): DayOffer | null {
  const asked = (kind: OfferKind) => Boolean(log[offerKey(day, kind)]);
  const budget = schedule?.[day]?.minutes;

  // Reached for a method — the clearest signal there is, so it wins.
  const tech = techniqueOf(after);
  if (tech && !techniqueOf(before) && schedule?.[day]?.technique !== tech && !asked('technique')) {
    return {
      day, kind: 'technique', value: tech,
      question: `Want ${day}s to be ${tech.toLowerCase()} nights?`,
      accept: `Yes — ${tech} on ${day}s`,
    };
  }

  // Swapped for something meaningfully quicker THAN WHAT WAS THERE. Measuring
  // against the day's budget instead fires on any swap whenever the budget is
  // generous — 45 minutes traded for 42 on a 60-minute day is which recipe they
  // preferred, not a statement about the day. Fifteen minutes is the smallest
  // gap that reads as deliberate.
  const now = minutesFromLabel(after.total_time);
  const was = minutesFromLabel(before.total_time);
  if (budget && now && was && now + 15 <= was && !asked('minutes')) {
    const band = bandFor(now);
    if (band < budget) {
      return {
        day, kind: 'minutes', value: band,
        question: `${day}s always tight?`,
        accept: `Keep ${day}s under ${band} minutes`,
      };
    }
  }
  return null;
}

/** Marking a day off this week may mean it is off most weeks. */
export function offerFromSkip(day: string, schedule: WeekSchedule, log: OfferLog = {}): DayOffer | null {
  if (log[offerKey(day, 'skip')]) return null;
  if (schedule?.[day]?.enabled === false) return null;   // already not planned
  return {
    day, kind: 'skip',
    question: `Out most ${day}s?`,
    accept: `Stop planning ${day}s`,
  };
}

/** The setting an accepted offer writes. Kept here so the API and UI agree. */
export function applyOffer(schedule: WeekSchedule, offer: DayOffer): WeekSchedule {
  const day = { ...(schedule?.[offer.day] || { enabled: true, minutes: 45 }) };
  if (offer.kind === 'minutes') day.minutes = Number(offer.value);
  if (offer.kind === 'technique') day.technique = String(offer.value);
  if (offer.kind === 'skip') day.enabled = false;
  return { ...schedule, [offer.day]: day };
}
