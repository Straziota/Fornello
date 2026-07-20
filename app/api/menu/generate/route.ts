import { NextResponse } from 'next/server';

export const maxDuration = 300;
import { requireUser, getAnthropicKey, getPexelsKey } from '@/lib/auth';
import { getSettings, getRecentMealNames, saveMenu, updateMenuData, getLatestMenu, updateMealRecipe, getDislikedMealNames, getPantryNames, getUserRecipeSummaries, getFeedbackAdjustments, getLovedMealNames, getNextWeekPicks, getGlobalRecipeSummaries, getGlobalRecipe, saveGlobalRecipeIfNew } from '@/lib/db';
import { generateMenu, generateGroceryList, generateMealRecipe, generateSingleMeal } from '@/lib/claude';
import { fetchMealPhoto } from '@/lib/photos';
import { fetchPexelsPhoto } from '@/lib/pexels';
import { WeekSchedule } from '@/lib/types';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const ALL_MEAL_TYPES = ['meat','chicken','seafood','pasta','vegetarian','soup or stew','Mexican','Asian','legumes or beans'];

function shuffleMealTypes(schedule: WeekSchedule, pool: string[]): WeekSchedule {
  const types = pool.length ? pool : ALL_MEAL_TYPES;
  const cookingDays = DAYS.filter(d => schedule[d]?.enabled !== false);
  const shuffled = [...types].sort(() => Math.random() - 0.5);
  const next = { ...schedule };
  cookingDays.forEach((day, i) => { next[day] = { ...next[day], mealType: shuffled[i % shuffled.length] }; });
  return next;
}

function currentWeekStart(startDay: number): Date {
  const today = new Date();
  const diff = ((today.getDay() - startDay) % 7 + 7) % 7;
  const d = new Date(today);
  d.setDate(today.getDate() - diff);
  return d;
}

function isInVacation(date: Date, vacations: { start: string; end: string }[]): boolean {
  const iso = date.toISOString().split('T')[0];
  return vacations.some(v => iso >= v.start && iso <= v.end);
}

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const apiKey = getAnthropicKey();
    const settings = await getSettings(user!.id);

    // Parse optional body: per-week skipDays override (Option A)
    let skipDays: string[] = [];
    try {
      const body = await req.json().catch(() => null);
      if (body && Array.isArray(body.skipDays)) skipDays = body.skipDays;
    } catch {}

    if (settings.randomizeMealTypes) {
      settings.schedule = shuffleMealTypes(settings.schedule || {}, settings.randomizePool || []);
    }

    // Apply vacations (persistent) + skipDays (one-shot) to the schedule
    const startDay = (settings as any).weekStartDay ?? 1;
    const vacations = ((settings as any).vacations as { start: string; end: string }[]) || [];
    const weekStart = currentWeekStart(startDay);
    const ORDER = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const schedule = { ...(settings.schedule || {}) };
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dayName = ORDER[d.getDay()];
      const inVacation = isInVacation(d, vacations);
      const userSkipped = skipDays.includes(dayName);
      if (inVacation || userSkipped) {
        schedule[dayName] = { ...(schedule[dayName] || { enabled: false, minutes: 0 }), enabled: false, leftoverIdeas: false };
      }
    }
    // Mute any days with all-disabled override
    void DAYS; // referenced for clarity
    settings.schedule = schedule;

    const [recentMeals, dislikedMeals, pantry, userRecipes, mealFeedback, lovedMeals, nextWeekPicks, globalRecipes] = await Promise.all([
      getRecentMealNames(user!.id, 12),
      getDislikedMealNames(user!.id),
      getPantryNames(user!.id),
      getUserRecipeSummaries(user!.id),
      getFeedbackAdjustments(user!.id),
      getLovedMealNames(user!.id),
      getNextWeekPicks(user!.id),
      getGlobalRecipeSummaries(),
    ]);

    const menu = await generateMenu(settings, recentMeals, dislikedMeals, pantry, userRecipes, apiKey, mealFeedback, lovedMeals, nextWeekPicks, globalRecipes);

    // Defensive: catch duplicates, disliked meals, AND variations of recent meals
    // (e.g. "Italian Chicken Marsala" vs "Chicken Marsala"). Token-overlap match,
    // ignoring stopwords like "with" or "and" plus single-word cuisine/style prefixes.
    // Stopwords include cuisine/style/prep descriptors AND pasta shapes, so that
    // "same sauce, different pasta" (e.g. Pappardelle vs Tagliatelle al Ragù di
    // Verdure) collapses to its shared core and reads as the same dish.
    const STOPWORDS = new Set(['with', 'and', 'in', 'a', 'the', 'of', 'on', 'over', 'style', 'slow', 'cooker', 'fryer', 'pan', 'oven', 'baked', 'grilled', 'roasted', 'easy', 'quick', 'classic', 'simple', 'creamy', 'wide', 'ribbon', 'fresh',
      'pasta', 'spaghetti', 'tagliatelle', 'pappardelle', 'fettuccine', 'linguine', 'penne', 'rigatoni', 'orecchiette', 'farfalle', 'fusilli', 'bucatini', 'tagliolini', 'noodles', 'rice', 'bowl', 'bowls']);
    const tokenize = (s: string) =>
      new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length >= 4 && !STOPWORDS.has(t)));
    const isVariationOf = (a: string, b: string) => {
      if (a.toLowerCase().trim() === b.toLowerCase().trim()) return true; // exact repeat
      const ta = tokenize(a), tb = tokenize(b);
      if (ta.size === 0 || tb.size === 0) return false;
      let overlap = 0;
      ta.forEach(t => { if (tb.has(t)) overlap++; });
      // Require at least TWO shared meaningful words: a single shared word (e.g.
      // "vegetable") is not enough and produces false positives against dishes
      // whose names collapse to very few tokens.
      if (overlap < 2) return false;
      const smaller = Math.min(ta.size, tb.size);
      return overlap / smaller >= 0.5;  // 50%+ shared meaningful tokens → likely the same dish
    };

    const dislikedLower = new Set(dislikedMeals.map(d => d.toLowerCase()));
    const seen = new Set<string>();
    for (let i = 0; i < menu.meals.length; i++) {
      const m = menu.meals[i];
      if (m.isLeftover) continue;
      const lower = m.name.toLowerCase();
      const isDuplicate = seen.has(lower);
      const isDisliked = dislikedLower.has(lower);
      // Skip variation check for explicitly-requested nextWeekPicks
      const isRequested = nextWeekPicks.some(p => p.toLowerCase() === lower);
      const isRecentVariation = !isRequested && recentMeals.some(r => isVariationOf(r, m.name));
      if (isDuplicate || isDisliked || isRecentVariation) {
        // Retry loop: regenerate AND re-check the replacement, so a regenerated
        // dish can't itself be another recent variation / duplicate. Each rejected
        // name is added to the exclusion list to steer the next attempt away.
        const dayTech = (settings.schedule?.[m.day] as any)?.technique || undefined;
        const existingNames = menu.meals.filter((_, j) => j !== i).map(x => x.name);
        let exclude = [...new Set([...existingNames, ...dislikedMeals, ...recentMeals])];
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const replacement = await generateSingleMeal(apiKey, settings, m.day, m.tags?.[0] || 'any', exclude, dayTech);
            const rl = replacement.name.toLowerCase();
            const stillBad = seen.has(rl)
              || dislikedLower.has(rl)
              || recentMeals.some(r => isVariationOf(r, replacement.name))
              || menu.meals.some((x, j) => j !== i && isVariationOf(x.name, replacement.name));
            if (stillBad) { exclude = [...new Set([...exclude, replacement.name])]; continue; }
            menu.meals[i] = { ...replacement, day: m.day };
            break;
          } catch { break; /* leave original if regen fails */ }
        }
      }
      seen.add(menu.meals[i].name.toLowerCase());
    }

    // Deterministic technique enforcement: a model won't reliably place a
    // technique on the exact assigned day, so we verify it ourselves. For each
    // day that specifies a technique, if the meal on that day doesn't clearly use
    // it, regenerate that day's meal with the technique forced (generateSingleMeal
    // hard-requires it). This guarantees e.g. "slow cooker on Thursday".
    for (const day of DAYS) {
      const tech = (settings.schedule?.[day] as any)?.technique as string | undefined;
      if (!tech) continue;
      const idx = menu.meals.findIndex(mm => mm.day === day && !mm.isLeftover);
      if (idx < 0) continue;
      const meal = menu.meals[idx];
      const haystack = `${meal.name} ${meal.description || ''} ${(meal.tags || []).join(' ')}`.toLowerCase();
      if (haystack.includes(tech.toLowerCase())) {
        menu.meals[idx] = { ...meal, technique: tech };
        continue;
      }
      try {
        const existingNames = menu.meals.filter((_, j) => j !== idx).map(x => x.name);
        const exclude = [...new Set([...existingNames, ...dislikedMeals, ...recentMeals])];
        const replacement = await generateSingleMeal(apiKey, settings, day, meal.tags?.[0] || 'any', exclude, tech);
        menu.meals[idx] = { ...replacement, day, technique: tech };
      } catch { /* leave original if regen fails */ }
    }

    const pexelsKey = getPexelsKey();
    menu.meals = await Promise.all(
      menu.meals.map(async (meal) => {
        if (meal.isLeftover) return meal;
        const keyword = meal.imageKeyword || meal.name;
        const photo_url = pexelsKey
          ? (await fetchPexelsPhoto(keyword, pexelsKey)) ?? (await fetchMealPhoto(meal.name, meal.imageKeyword))
          : await fetchMealPhoto(meal.name, meal.imageKeyword);
        return photo_url ? { ...meal, photo_url } : meal;
      })
    );

    const language = (settings as any).language ?? 'English';
    (menu as any).language = language;
    const id = await saveMenu(user!.id, menu);

    // Background: load ALL recipes first, then build grocery list from exact ingredients
    Promise.all(
      menu.meals
        .filter((m: any) => !m.isLeftover)
        .map(async (meal: any) => {
          try {
            const global = await getGlobalRecipe(meal.name);
            if (global) {
              await updateMealRecipe(user!.id, id, meal.day, global);
              return { ...meal, ...global, recipeLoaded: true };
            }
            const recipe = await generateMealRecipe(apiKey, meal, settings.familySize, settings.prepSchedule, (settings as any).language);
            await Promise.all([
              updateMealRecipe(user!.id, id, meal.day, recipe),
              saveGlobalRecipeIfNew({ ...meal, ...recipe, mealType: meal.tags?.[0] || '', source_site: meal.source_site || '' }),
            ]);
            return { ...meal, ...recipe, recipeLoaded: true };
          } catch { return meal; }
        })
    ).then(async loadedMeals => {
      const allMeals = menu.meals.map((m: any) =>
        loadedMeals.find((l: any) => l.day === m.day) || m
      );
      const grocery_list = await generateGroceryList(apiKey, allMeals, settings.familySize);
      const current = await getLatestMenu(user!.id);
      if (current?.id === id) await updateMenuData(user!.id, id, { ...current, meals: allMeals, grocery_list });
    }).catch(() => {});

    return NextResponse.json({ ...menu, id });
  } catch (e: any) {
    console.error('[menu/generate] FAILED:', e?.stack || e?.message || e);
    const msg = e.message || 'Unknown error';
    // Anthropic returns a 400 when the account is out of credits — surface a
    // clear, actionable message instead of a confusing generic 500.
    if (/credit balance is too low|Plans & Billing/i.test(msg)) {
      return NextResponse.json(
        { error: 'The kitchen is temporarily out of AI credits. Please try again shortly.' },
        { status: 503 },
      );
    }
    const status = msg.includes('401') ? 401 : msg.includes('429') ? 429 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
