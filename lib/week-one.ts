import { adminClient } from './supabase-admin';
import { minutesFromLabel, type OfferKind } from './day-offers';

/**
 * What a household's first week actually looked like, and what to ask about it.
 *
 * This is not a second questionnaire. Fornello watched the week; the email has
 * to prove it. Every question below is derived from something that happened —
 * or conspicuously did not — so the message reads as "here is what I noticed"
 * rather than "here is more setup".
 *
 * The most valuable output is the silent one. A household that generated a menu
 * and then did nothing gets no tuning questions at all: they get one honest
 * question and a reply address. That is customer development arriving at the
 * right moment from someone with a legitimate reason to ask.
 */
export interface CheckInQuestion {
  id: string;
  /** What we noticed, in their terms. */
  observation: string;
  question: string;
  /** One tap. Writes a real setting. */
  answers: { label: string; kind: OfferKind | 'none'; day?: string; value?: number | string }[];
}

export interface Suggestion {
  title: string;
  body: string;
  cta: string;
  path: string;
}

export interface WeekOne {
  silent: boolean;
  firstMenuAt: string;
  questions: CheckInQuestion[];
  suggestion: Suggestion | null;
}

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/**
 * One capability they have not used, chosen from behaviour — never a list.
 *
 * A list of adjustable settings turns a specific message into a feature menu
 * and is functionally the settings page relocated into an inbox. One thing,
 * chosen because of what they did, with a button that opens the screen.
 */
function pickSuggestion(f: {
  swaps: number; openedGroceries: boolean | null;
  askedChef: boolean; emptyGroceries: boolean;
  hasHeritageRecipes: boolean; hasScannedCard: boolean; autoPlan: boolean;
  generatedLate: boolean;
}): Suggestion | null {
  // Behaviour first, absence second.
  //
  // An absence cannot tell someone who tried a thing and disliked it from
  // someone who never found it — so anything derived from what a household
  // actually DID outranks everything derived from what is missing. The two
  // behavioural branches below were only possible once swaps and grocery-list
  // opens started being recorded; everything under them is still absence.
  //
  // openedGroceries is null for menus generated before that signal existed.
  // Null is "we don't know", not "no", and must never be read as evidence.
  if (f.swaps >= 2 && !f.askedChef) return {
    title: 'Ask about any recipe',
    body: `You swapped ${f.swaps} meals that week. If something is nearly right, you can ask instead of replacing it — a substitution, a timing, how to scale it up.`,
    cta: 'Try it on this week’s menu', path: '/this-week',
  };
  if (f.openedGroceries === false && !f.emptyGroceries) return {
    title: 'The shopping list is already written',
    body: 'That week had a full list waiting — every ingredient, sorted by aisle, ticked off as you go. It is the part people say they would miss most.',
    cta: 'See this week’s list', path: '/groceries',
  };
  if (f.hasHeritageRecipes && !f.hasScannedCard) return {
    title: 'Photograph a recipe card',
    body: 'A handwritten card becomes a proper recipe — and if it is in another language, an English version alongside the original.',
    cta: 'Scan a card', path: '/heritage-kitchen',
  };
  if (f.generatedLate && !f.autoPlan) return {
    title: 'Let me send the week to you',
    body: 'You planned that week late at night. I can have the next one — menu and shopping list — in your inbox the day before it starts.',
    cta: 'Send me my week', path: '/this-week',
  };
  if (f.emptyGroceries) return {
    title: 'The shopping list writes itself',
    body: 'Every week’s ingredients, sorted by aisle, ticked off as you go. That week never got one — this week will.',
    cta: 'See this week’s list', path: '/groceries',
  };
  if (!f.askedChef) return {
    title: 'Ask about any recipe',
    body: 'If a recipe is nearly right, you can ask instead of replacing it — a substitution, a timing, how to scale it up for guests.',
    cta: 'Try it on this week’s menu', path: '/this-week',
  };
  if (!f.autoPlan) return {
    title: 'Stop having to remember',
    body: 'I can plan next week and email it to you the day before it starts, with the shopping list.',
    cta: 'Send me my week', path: '/this-week',
  };
  return null;
}

export async function analyseWeekOne(userId: string): Promise<WeekOne | null> {
  const db = adminClient;

  const { data: menus } = await db
    // select('*'), not a column list. Naming swaps/groceries_opened_at before
    // their migration has run makes Postgres reject the whole query, and a
    // rejected query here returns no menus — which reads as "this household
    // never generated one" and silently disables the entire check-in. That is
    // the same shape of failure as every other one this week: not broken code,
    // disconnected code, raising nothing.
    .from('menus').select('*')
    .eq('user_id', userId).order('created_at', { ascending: true });
  if (!menus?.length) return null;

  const first = menus[0];
  const meals: any[] = first.data?.meals || [];

  const [{ data: feedback }, { data: chef }, { data: settingsRow }, { data: heritage }] = await Promise.all([
    db.from('meal_feedback').select('meal_name, rating').eq('user_id', userId),
    db.from('chef_questions').select('id').eq('user_id', userId).limit(1),
    db.from('settings').select('schedule, auto_plan, day_offers').eq('user_id', userId).maybeSingle(),
    db.from('heritage_profile_recipes').select('original_scan_url').eq('owner_id', userId),
  ]);

  const schedule = settingsRow?.schedule || {};
  const offerLog = settingsRow?.day_offers || {};
  const rated = (feedback || []).length;
  const askedChef = Boolean(chef?.length);
  const groceries = Object.values(first.data?.grocery_list || {}).flat().length > 0;

  // Silence is the signal, and it is the one worth acting on.
  //
  // Opening the menu does NOT count as use. An earlier version required
  // !engaged, and against real data that produced zero silent households —
  // because everyone who ever generated a menu also glanced at it once, months
  // ago, and never came back. Those are precisely the households this variant
  // exists for. Generating one menu, looking at it, and never rating, asking or
  // generating again is doing nothing.
  const silent = rated === 0 && !askedChef && menus.length <= 1;

  const questions: CheckInQuestion[] = [];
  if (!silent) {
    // A day whose meal is far under its budget, week after week, is a day with
    // the wrong budget.
    for (const meal of meals) {
      if (questions.length >= 3) break;
      const budget = schedule?.[meal.day]?.minutes;
      const actual = minutesFromLabel(meal.total_time);
      if (!budget || !actual || actual + 20 > budget) continue;
      if (offerLog[`${meal.day}:minutes`]) continue;
      questions.push({
        id: `minutes:${meal.day}`,
        observation: `You gave ${meal.day}s ${budget} minutes, and cooked something that took ${meal.total_time}.`,
        question: `Want ${meal.day}s shorter from now on?`,
        answers: [
          { label: `Yes — under 30 minutes`, kind: 'minutes', day: meal.day, value: 30 },
          { label: 'No, leave it', kind: 'none' },
        ],
      });
    }

    // Days planned but never engaged with are worth asking about directly.
    const off = DAYS.filter(d => schedule?.[d]?.enabled && !meals.some(m => m.day === d));
    for (const day of off.slice(0, 3 - questions.length)) {
      if (offerLog[`${day}:skip`]) continue;
      questions.push({
        id: `skip:${day}`,
        observation: `${day} was on your list but never got a dinner.`,
        question: `Out most ${day}s?`,
        answers: [
          { label: `Yes — stop planning ${day}s`, kind: 'skip', day },
          { label: 'No, keep it', kind: 'none' },
        ],
      });
    }

    if (questions.length < 3 && rated === 0) {
      questions.push({
        id: 'cooked',
        observation: 'I have not heard how any of them went.',
        question: 'Did you cook any of these?',
        answers: [
          { label: 'Yes, some of them', kind: 'none' },
          { label: 'Not this time', kind: 'none' },
        ],
      });
    }
  }

  const createdHour = new Date(first.created_at).getUTCHours();
  return {
    silent,
    firstMenuAt: first.created_at,
    questions: questions.slice(0, 3),
    suggestion: pickSuggestion({
      swaps: (first.swaps as number) ?? 0,
      // undefined = column not deployed yet; null = never opened. Only the
      // second is evidence.
      openedGroceries: first.groceries_opened_at === undefined
        ? null
        : Boolean(first.groceries_opened_at),
      askedChef,
      emptyGroceries: !groceries,
      hasHeritageRecipes: Boolean(heritage?.length),
      hasScannedCard: (heritage || []).some(r => r.original_scan_url),
      autoPlan: Boolean(settingsRow?.auto_plan),
      generatedLate: createdHour >= 22 || createdHour <= 2,
    }),
  };
}
