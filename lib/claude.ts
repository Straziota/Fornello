import Anthropic from '@anthropic-ai/sdk';
import { Settings, WeeklyMenu, WeekSchedule, Meal, Ingredient, SubstituteResult } from './types';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function langInstruction(language?: string): string {
  if (!language || language === 'English') return '';
  return `\nIMPORTANT: Write ALL content in ${language}. This includes dish names, descriptions, ingredients, instructions, and all other text.`;
}

// Without this, models (especially the faster Haiku) emit bare numbers like
// {"amount":"2","item":"soy sauce"} — which read as "2 soy sauce" with no unit.
const UNIT_RULE = `- Every ingredient "amount" MUST include a unit of measure when the item is measured by volume or weight (tsp, tbsp, cup, oz, lb, g, kg, ml, l, clove, can, pinch, etc.). NEVER write a bare number for liquids, oils, sauces, or spices — e.g. "2 tbsp" for soy sauce, not "2". Bare counts are acceptable only for naturally countable whole items (e.g. "2" eggs, "3" garlic cloves, "1" onion). For seasonings added to taste, set amount to "to taste".
- List each shoppable ingredient as its OWN entry with its OWN amount. NEVER bundle several distinct items into one line such as "mixed seafood (clams, mussels, shrimp, halibut)" or "mixed vegetables (carrots, peas, corn)" — write each item (clams, mussels, shrimp, halibut) as a separate ingredient with its own quantity, so each can be added to a shopping list.`;

// Techniques where the appliance does long, passive work — the day's time budget
// is the cook's ACTIVE (hands-on) time, not the total cook time, so a multi-hour
// braise is fine. Without this, a "max 30 min" day silently rules out the very
// technique the user asked for on that day.
const PASSIVE_COOK_TECHNIQUES = ['slow cooker', 'crock pot', 'crockpot', 'instant pot', 'pressure cooker', 'sous vide', 'dutch oven', 'braise', 'smoker'];
const isPassiveTechnique = (t: string) => PASSIVE_COOK_TECHNIQUES.some(p => t.toLowerCase().includes(p));

function scheduleText(schedule: WeekSchedule): string {
  if (!schedule || !Object.keys(schedule).length) return '';
  let hasTechnique = false;
  const lines = DAYS.map(day => {
    const s = schedule[day];
    if (!s || !s.enabled) {
      const leftover = s?.leftoverIdeas ? ' — generate a leftover recipe for this day (isLeftover: true)' : ' — skip this day (omit from meals array)';
      return `- ${day}: no cooking${leftover}`;
    }
    const h = Math.floor(s.minutes / 60);
    const m = s.minutes % 60;
    const timeLabel = h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`;
    const typeLabel = s.mealType && s.mealType !== 'any' ? `, meal type: ${s.mealType}` : '';

    if (s.technique) {
      hasTechnique = true;
      // Technique is a HARD, day-bound requirement — the meal placed on THIS day
      // must genuinely use it. Reconcile the time budget with the technique so the
      // two instructions don't contradict each other.
      const timeClause = isPassiveTechnique(s.technique)
        ? `active hands-on time under ${timeLabel} (the ${s.technique} does the rest — long passive/unattended cooking time is expected and fine)`
        : `max ${timeLabel} total cooking time`;
      return `- ${day}: MUST be a ${s.technique} recipe that genuinely requires/uses a ${s.technique}. ${timeClause}${typeLabel}.`;
    }
    return `- ${day}: max ${timeLabel} total cooking time${typeLabel}`;
  }).join('\n');
  const techNote = hasTechnique
    ? '\nThe "MUST be a <technique> recipe" assignments are REQUIRED and day-specific: the meal you place on that exact day has to genuinely use that technique. Do not satisfy it by putting such a dish on a different day.\n'
    : '';
  return `\nCooking schedule — follow this strictly:\n${lines}\n${techNote}`;
}

function leftoverDays(schedule: WeekSchedule): string[] {
  return DAYS.filter(day => {
    const s = schedule[day];
    return s && !s.enabled && s.leftoverIdeas;
  });
}

export async function generateMenu(
  settings: Settings & { apiKey?: string },
  recentMeals: string[],
  dislikedMeals: string[] = [],
  pantry: string[] = [],
  userRecipes: { name: string; cuisine: string; mealType: string; total_time: string; difficulty: string }[] = [],
  apiKey?: string,
  mealFeedback: { name: string; notes: string }[] = [],
  lovedMeals: string[] = [],
  nextWeekPicks: string[] = [],
  globalRecipes: { name: string; cuisine: string; mealType: string; total_time: string; difficulty: string }[] = []
): Promise<WeeklyMenu> {
  const client = new Anthropic({ apiKey: apiKey || settings.apiKey || process.env.ANTHROPIC_API_KEY! });

  const avoidRecent = recentMeals.length
    ? `\n🚫 DO NOT REPEAT THESE MEALS — they were served in the past 12 weeks. This includes minor renames or variations: "Italian Chicken Marsala" counts as a repeat of "Chicken Marsala"; "Penne Bolognese" counts as a repeat of "Spaghetti Bolognese"; "Slow-cooker Beef Stew" counts as a repeat of "Beef Stew". When in doubt, pick something genuinely different. The ONLY exception is if a meal appears in the "specifically requested" list below.\n${recentMeals.map(m => `- ${m}`).join('\n')}` : '';

  const avoidDisliked = dislikedMeals.length
    ? `\n🚫 ABSOLUTE BANS — the family marked these meals "Never again". Under no circumstances may these appear in the plan, even as a variation or with a slightly different name:\n${dislikedMeals.map(m => `- ${m}`).join('\n')}` : '';

  const avoidList = avoidRecent + avoidDisliked;

  const sitesText = settings.websites.length
    ? `🍳 RECIPE SOURCES (when the library doesn't already have a fitting recipe) — invent fresh inspiration from these sites the family loves: ${settings.websites.join(', ')}. Explore the full breadth — different cuisines, methods, authors, sections — and avoid gravitating to the same handful of dishes.`
    : 'When the library doesn\'t have a fitting recipe, draw from a broad range of classic, crowd-pleasing family recipes — explore many cuisines and styles.';

  const prefsText = settings.preferences.length
    ? `Food preferences: ${settings.preferences.join(', ')}.` : '';

  const restrictText = settings.restrictions.length
    ? `STRICT dietary restrictions / allergies (never include): ${settings.restrictions.join(', ')}.` : '';

  const skipIngText = (settings as any).skipIngredients?.length
    ? `Ingredients to skip — NEVER suggest recipes where these are structural or essential components (e.g. don't suggest arrabbiata if chili is in this list). Recipes where they appear only as optional garnish are acceptable: ${(settings as any).skipIngredients.join(', ')}.` : '';

  const pantryText = pantry.length
    ? `\nPantry items already at home — prioritize recipes that use these ingredients to reduce waste and grocery spending: ${pantry.join(', ')}.` : '';

  // Pass a generous sample of the global library so Claude can REUSE existing recipes
  // before inventing new ones — the family-wide library grows with every saved recipe.
  const librarySample = (() => {
    if (!globalRecipes.length) return [];
    const max = 80;
    if (globalRecipes.length <= max) return globalRecipes;
    const shuffled = [...globalRecipes].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, max);
  })();
  const globalRecipesText = librarySample.length
    ? `\n📚 EXISTING RECIPE LIBRARY — these recipes already exist in the system (from this family and others). For EACH day of the week, FIRST look at this list and pick a recipe that fits the day's meal type, time limit, and family restrictions. Only invent a brand-new recipe when nothing in this list fits the slot. When you pick one, use its EXACT name as given below — do NOT rename or paraphrase:\n${librarySample.map(r => `- "${r.name}" (${r.cuisine}, ${r.mealType}, ${r.total_time}, ${r.difficulty})`).join('\n')}\nRule of thumb: reuse > invent. A library recipe that fits is always better than a new one.`
    : '';

  const userRecipesText = userRecipes.length
    ? settings.prioritizeMyRecipes
      ? `\nFamily's own saved recipes — PRIORITIZE these over generating new ones when they match the day's meal type and time limit:\n${userRecipes.map(r => `- "${r.name}" (${r.cuisine}, ${r.mealType}, ${r.total_time}, ${r.difficulty})`).join('\n')}\nIf you include a saved recipe, use its exact name as given above.`
      : `\nFamily's own saved recipes (include occasionally when a good fit, but not required):\n${userRecipes.map(r => `- "${r.name}" (${r.cuisine}, ${r.mealType}, ${r.total_time}, ${r.difficulty})`).join('\n')}\nIf you include one, use its exact name.`
    : '';

  const feedbackText = mealFeedback.length
    ? `\nCooking notes from the family — when suggesting these recipes again, incorporate these modifications:\n${mealFeedback.map(f => `- "${f.name}": ${f.notes}`).join('\n')}`
    : '';

  const lovedText = lovedMeals.length
    ? `\nMeals the family loves — bring these back regularly in the rotation, but still respect the 12-week exclusion rule above (unless explicitly requested for this week):\n${lovedMeals.map(m => `- ${m}`).join('\n')}`
    : '';

  const nextWeekText = nextWeekPicks.length
    ? `\nMeals specifically requested for this week — INCLUDE at least one of these regardless of recent history:\n${nextWeekPicks.map(m => `- ${m}`).join('\n')}`
    : '';

  const today = new Date();
  const weekStart = new Date(today);
  const startDay = (settings as any).weekStartDay ?? 1;
  const daysSinceStart = ((today.getDay() - startDay) % 7 + 7) % 7;
  // If today is the day right before the reset day, generate for the upcoming week
  weekStart.setDate(today.getDate() + (daysSinceStart === 6 ? 1 : -daysSinceStart));
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const schedText = scheduleText(settings.schedule || {});
  const leftoverDaysList = leftoverDays(settings.schedule || {});

  // Exploration themes with metadata so we can filter against the user's restrictions/preferences.
  // tags: keywords that, if present in restrictions or skipIngredients, disqualify the theme.
  const EXPLORATION_THEMES: { label: string; conflictsWith?: RegExp; requiresPreference?: RegExp }[] = [
    { label: 'Mediterranean / North African' },
    { label: 'East Asian', conflictsWith: /\b(soy|sesame|shellfish)\b/i },
    { label: 'Southeast Asian', conflictsWith: /\b(peanut|shellfish|fish sauce)\b/i },
    { label: 'Latin American' },
    { label: 'Caribbean', conflictsWith: /\b(seafood|shellfish)\b/i },
    { label: 'South Asian / Indian subcontinent' },
    { label: 'Middle Eastern' },
    { label: 'Italian regional (pick a region — Sicilian, Tuscan, Pugliese, etc.)' },
    { label: 'French bistro / home cooking' },
    { label: 'Eastern European' },
    { label: 'Spanish / Portuguese' },
    { label: 'Vegetable-forward / lighter cooking' },
    { label: 'Slow-cooked, hearty, comforting' },
    { label: 'Seafood-focused / coastal', conflictsWith: /\b(seafood|fish|shellfish|pescatarian)\b/i },
    { label: 'Smoky, grilled, or pan-seared' },
    { label: 'Braises, stews, or one-pot dishes' },
    { label: 'Rustic peasant cooking (any culture)' },
  ];

  // Filter out themes that conflict with the user's settings
  const restrictBlob = [
    ...(settings.restrictions || []),
    ...((settings as any).skipIngredients || []),
    ...((settings as any).avoidedSides || []),
  ].join(' ').toLowerCase();
  const isVegetarianOnly = /\b(vegetarian|vegan|plant.?based|meatless)\b/.test(restrictBlob);
  const filteredThemes = EXPLORATION_THEMES.filter(t => {
    if (t.conflictsWith && t.conflictsWith.test(restrictBlob)) return false;
    if (isVegetarianOnly && /seafood|coastal|smoky|grilled|pan-seared|hearty|braises|stews/i.test(t.label)) return false;
    return true;
  });

  // Bias toward themes that match the user's stated preferences (if any)
  const prefBlob = (settings.preferences || []).join(' ').toLowerCase();
  const PREF_KEYWORDS: Record<string, RegExp> = {
    'italian': /italian/i,
    'asian': /asian/i,
    'mediterranean': /mediterranean/i,
    'mexican': /latin american|caribbean/i,
    'french': /french/i,
    'indian': /south asian/i,
    'middle eastern': /middle eastern/i,
    'spanish': /spanish/i,
    'vegetarian': /vegetable-forward/i,
    'comfort': /slow-cooked|hearty|braises|stews|rustic/i,
    'quick': /vegetable-forward|smoky/i,
    'seafood': /seafood/i,
  };
  const preferredThemes: typeof EXPLORATION_THEMES = [];
  for (const [keyword, pattern] of Object.entries(PREF_KEYWORDS)) {
    if (prefBlob.includes(keyword)) {
      filteredThemes.forEach(t => { if (pattern.test(t.label)) preferredThemes.push(t); });
    }
  }
  // Pool to pick from: preferred themes appear twice (extra weight), then all filtered themes
  const pool = [...preferredThemes, ...preferredThemes, ...filteredThemes];

  // Pick 3 distinct themes, randomly
  const explorationPicks: string[] = [];
  const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
  for (const t of shuffledPool) {
    if (explorationPicks.length >= 3) break;
    if (!explorationPicks.includes(t.label)) explorationPicks.push(t.label);
  }
  // If filtering left fewer than 3 themes (very restrictive settings), fall back to whatever we have
  if (explorationPicks.length < 3 && filteredThemes.length > 0) {
    for (const t of filteredThemes) {
      if (explorationPicks.length >= 3) break;
      if (!explorationPicks.includes(t.label)) explorationPicks.push(t.label);
    }
  }

  // Phase 1: fast overview — meal names, descriptions, grocery list only
  const prompt = `You are a professional family meal planner. Create a 7-dinner weekly plan overview.

🎲 THIS WEEK'S EXPLORATION NUDGES — include AT LEAST one meal drawing from EACH of these corners (no two from the same one). The other 4 meals should be fresh inspiration from the family's preferred sites in any other direction:
${explorationPicks.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}
${langInstruction((settings as any).language)}
Family size: ${settings.familySize} people.
${prefsText}
${restrictText}
${avoidList}
${skipIngText}
${pantryText}
${globalRecipesText}
${userRecipesText}
${lovedText}
${nextWeekText}
${feedbackText}
${sitesText}${schedText}

Return ONLY valid JSON — no markdown, no extra text:

{
  "week_start": "${weekStartStr}",
  "meals": [
    {
      "day": "Monday",
      "name": "Full Meal Name",
      "cuisine": "Italian",
      "source_site": "seriouseats.com",
      "source_url": "https://www.seriouseats.com/full-recipe-url-here",
      "serves": ${settings.familySize},
      "total_time": "45 min",
      "prep_time": "15 min",
      "cook_time": "30 min",
      "difficulty": "Easy",
      "description": "Two-sentence appetizing description.",
      "imageKeyword": "pasta tomato basil",
      "tags": ["vegetarian", "quick"],
      "isLeftover": false,
      "leftoverFrom": [],
      "sides": [
        {
          "name": "Simple side name",
          "ingredients": [
            {"amount": "1 bag", "item": "mixed greens"},
            {"amount": "2 tbsp", "item": "olive oil"}
          ]
        }
      ]
    }
  ],
}

Rules:
- 🔁 EVERY meal name in this 7-day plan must be UNIQUE. Never repeat the same recipe on multiple days. Each "name" field must be different from every other "name" in the week.
- 🌱 FRESHNESS — at least 5 of the 7 meals must be fresh inspirations from the sites above, NOT from the familiar favorites pool. Surprise the family — they'd rather try something new than see the same dishes recycled.
- source_url must be the full URL to the actual recipe page on source_site (e.g. "https://www.seriouseats.com/chicken-piccata-recipe"). Provide your best known URL — it will be used to fetch the recipe photo.
- Only include days that have cooking enabled OR leftover ideas enabled
- Respect the meal type and max cooking time per day — choose recipes that GENUINELY fit; pick simpler preparations rather than misrepresenting time
- Vary cuisines across the week — span at least 4 different cuisine origins or culinary styles in any 7-day plan
- Each meal must include 1-2 simple sides. Sides should be simple and quick — no complex recipes
- Side ingredients should only list non-pantry-staple items (skip salt, pepper, olive oil unless a significant amount is needed)
${settings.preferredSides?.length ? `- PREFERRED sides — lean toward these when suitable: ${settings.preferredSides.join(', ')}` : ''}
${settings.avoidedSides?.length ? `- NEVER suggest these as sides: ${settings.avoidedSides.join(', ')}` : ''}
- CRITICAL: total_time, prep_time, and cook_time must be ACCURATE and REALISTIC for the actual dish — do NOT just copy the day's time limit into total_time
- total_time must equal prep_time + cook_time (e.g. prep 15 min + cook 30 min = total 45 min)
- If a classic version of a dish takes longer than the day allows, suggest a quicker variation or a different dish entirely
${UNIT_RULE}
${leftoverDaysList.length ? `
Leftover days (${leftoverDaysList.join(', ')}): set "isLeftover": true, set "leftoverFrom" to the source days, total_time should be "15 min or less".
` : ''}`;

  // The model very occasionally returns a stray trailing comma or a truncated/
  // malformed body. Tolerate trailing commas (as the other parsers here do) and
  // retry once, so a one-off glitch retries instead of 500-ing the whole menu.
  let menu: WeeklyMenu | null = null;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2 && !menu; attempt++) {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { lastErr = new Error('No valid JSON returned from Claude'); continue; }
    try {
      menu = JSON.parse(jsonMatch[0].replace(/,\s*([}\]])/g, '$1')) as WeeklyMenu;
    } catch (e) { lastErr = e; }
  }
  if (!menu) throw lastErr instanceof Error ? lastErr : new Error('No valid menu returned from Claude');

  menu.meals = menu.meals.map(m => ({ ...m, recipeLoaded: !!m.isLeftover }));
  menu.grocery_list = menu.grocery_list || {} as any;
  return menu;
}

export async function generateSidesOnly(
  apiKey: string,
  mealName: string,
  cuisine: string,
  familySize: number,
  settings: Settings & { apiKey?: string },
  technique?: string
): Promise<import('./types').Side[]> {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY! });

  const preferredText = settings.preferredSides?.length ? `Preferred sides: ${settings.preferredSides.join(', ')}.` : '';
  const avoidedText = settings.avoidedSides?.length ? `Never suggest: ${settings.avoidedSides.join(', ')}.` : '';
  const techniqueText = technique ? `The sides should complement a ${technique} main dish.` : '';

  const prompt = `Suggest 1-2 simple sides to accompany: ${mealName} (${cuisine}) for ${familySize} people.
${langInstruction((settings as any).language)}
${preferredText}
${avoidedText}
${techniqueText}

Return ONLY valid JSON — no markdown:
[
  {
    "name": "Side name",
    "ingredients": [
      {"amount": "1 bag", "item": "mixed greens"}
    ]
  }
]

Sides must be simple and quick. Only list non-staple ingredients (skip salt, pepper, olive oil).`;

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const fix = attempt > 0
      ? '\n\nIMPORTANT: Your previous reply was not valid JSON. Return ONLY a complete, valid JSON array — every string quoted, every element comma-separated, no trailing commas, no commentary.'
      : '';
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt + fix }],
    });
    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0].replace(/,\s*([}\]])/g, '$1')); }
      catch (e) { lastErr = e; }
    } else {
      lastErr = new Error('No sides JSON found in response');
    }
  }
  throw new Error(`Claude returned invalid JSON for the new sides: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
}

export async function generateSingleMeal(
  apiKey: string,
  settings: Settings & { apiKey?: string },
  day: string,
  mealType: string,
  excludeNames: string[] = [],
  technique?: string
): Promise<Meal> {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY! });

  const prefsText = settings.preferences?.length ? `Food preferences: ${settings.preferences.join(', ')}.` : '';
  const restrictText = settings.restrictions?.length ? `STRICT dietary restrictions (never include): ${settings.restrictions.join(', ')}.` : '';
  const excludeText = excludeNames.length
    ? `🚫 ABSOLUTELY FORBIDDEN — under no circumstances suggest ANY of the following dishes or variations of them. This list includes meals already in this week's menu, meals served recently, and meals the family disliked. Pick a completely different recipe:\n${excludeNames.map(n => `- ${n}`).join('\n')}` : '';
  const techniqueText = technique ? `Cooking technique: the recipe MUST be made using a ${technique}. Choose a recipe that genuinely requires or benefits from this technique.` : '';

  const prompt = `You are a family meal planner. Suggest ONE dinner recipe for ${day}.
${langInstruction((settings as any).language)}
Family size: ${settings.familySize} people.
Meal type: ${mealType}.
${techniqueText}
${prefsText}
${restrictText}
${excludeText}

Return ONLY valid JSON — no markdown:
{
  "day": "${day}",
  "name": "Full Meal Name",
  "cuisine": "Italian",
  "source_site": "seriouseats.com",
  "source_url": "https://www.seriouseats.com/recipe-url",
  "serves": ${settings.familySize},
  "total_time": "45 min",
  "prep_time": "15 min",
  "cook_time": "30 min",
  "difficulty": "Easy",
  "description": "Two-sentence appetizing description.",
  "imageKeyword": "pasta tomato basil",
  "tags": ["${mealType}"],
  "isLeftover": false,
  "leftoverFrom": []
}

Rules:
- total_time must be realistic for this dish (prep + cook)
- difficulty must be exactly "Easy", "Medium", or "Hard"
- Return ONLY the JSON object above — no "ingredients" or "instructions" arrays.`;

  const excludeLower = new Set(excludeNames.map(n => n.toLowerCase()));

  const callOnce = async (extra: string = ''): Promise<Meal> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const fix = attempt > 0
        ? '\n\nIMPORTANT: Your previous reply was not valid JSON. Return ONLY one complete, valid JSON object — every string quoted, every array element comma-separated, no trailing commas, no commentary.'
        : '';
      const message = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt + extra + fix }],
      });
      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const m = JSON.parse(jsonMatch[0].replace(/,\s*([}\]])/g, '$1')) as Meal;
          m.recipeLoaded = false;
          return m;
        } catch (e) { lastErr = e; }
      } else {
        lastErr = new Error('No JSON found in response');
      }
    }
    throw new Error(`Claude returned invalid JSON for the new meal: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
  };

  let meal = await callOnce();
  // Defensive retry: if Claude returned a forbidden meal, try once more with stronger nudge
  if (excludeLower.has(meal.name.toLowerCase())) {
    meal = await callOnce(`\n\nIMPORTANT: Your previous suggestion "${meal.name}" was on the forbidden list. Pick something COMPLETELY DIFFERENT — different cuisine, different protein, different cooking method.`);
  }
  return meal;
}

export async function generateGroceryList(
  apiKey: string,
  meals: Meal[],
  familySize: number
): Promise<WeeklyMenu['grocery_list']> {
  const client = new Anthropic({ apiKey });

  // Compile ALL ingredients from actual loaded recipes — no estimation
  const allIngredients: { amount: string; item: string; meal: string }[] = [];
  for (const m of meals.filter(m => !m.isLeftover)) {
    for (const ing of (m.ingredients || [])) {
      allIngredients.push({ amount: ing.amount, item: ing.item, meal: m.day });
    }
    for (const side of (m.sides || [])) {
      for (const ing of (side.ingredients || [])) {
        allIngredients.push({ amount: ing.amount, item: ing.item, meal: m.day });
      }
    }
  }

  if (!allIngredients.length) {
    // Fallback: no recipes loaded yet, estimate from meal names
    const mealNames = meals.filter(m => !m.isLeftover).map(m => `- ${m.name} (serves ${familySize})`).join('\n');
    const fallbackPrompt = `Generate a grocery list for: ${mealNames}\nReturn ONLY valid JSON with categories: Produce, Meat & Seafood, Dairy & Eggs, Canned & Dry Goods, Spices & Condiments, Bread & Bakery, Frozen, Other. Each item: {"item":"...","amount":"...","meals":["day"]}`;
    const msg = await client.messages.create({ model: 'claude-haiku-4-5', max_tokens: 4096, messages: [{ role: 'user', content: fallbackPrompt }] });
    const t = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No grocery list JSON returned');
    return JSON.parse(m[0]);
  }

  const ingredientList = allIngredients
    .map(i => `${i.amount} ${i.item} (${i.meal})`)
    .join('\n');

  const prompt = `You are organizing a grocery list. Categorize and combine these EXACT ingredients — do NOT change any quantities, amounts, or units. Copy them exactly as given.

Ingredients:
${ingredientList}

Tasks:
1. Categorize each into ONE of these ten categories. Follow these rules STRICTLY — categorize by the FOOD, not how it's described:

   • Produce — fresh fruits, vegetables, fresh herbs, fresh garlic/ginger/onion, mushrooms, salads, fresh lemons/limes. NEVER any animal product.
   • Meat & Seafood — ALL meat, poultry, fish, and shellfish, fresh or thawed. This includes: salmon, tuna, cod, shrimp, prawns, scallops, mussels, clams, octopus, squid, lobster, crab, chicken, turkey, beef, pork, lamb, veal, bacon, sausage, prosciutto, pancetta, ham, ground meat of any kind. If an item is the flesh of an animal, it goes here — never in Produce, never in Other.
   • Dairy & Eggs — milk, cream, butter, yogurt, all cheeses (parmesan, mozzarella, ricotta, feta, etc.), eggs, sour cream, crème fraîche.
   • Canned & Dry Goods — pasta, rice, grains, flour, sugar, beans (dried or canned), canned tomatoes, canned fish (tuna in oil, anchovies in oil), oils, vinegars, broths/stocks, dried legumes, nuts, baking ingredients.
   • Spices & Condiments — salt, pepper, dried herbs, ground spices, mustard, soy sauce, hot sauce, ketchup, mayonnaise, jam, honey.
   • Bread & Bakery — bread, rolls, tortillas, pita, pizza dough, breadcrumbs, croutons.
   • Frozen — anything explicitly frozen (frozen peas, frozen berries, ice cream).
   • Beverages — drinks: juice, lemonade, soda, sparkling water, iced tea, kombucha, smoothies.
   • Snacks — packaged treats eaten as snacks: cookies, chocolate, candy, chips, pretzels, popcorn, granola/snack bars, dried-fruit snacks (e.g. dried mango), madeleines, biscotti.
   • Other — only if it truly fits nowhere above.

2. CRITICAL — Combine the same ingredient across recipes into ONE entry. Sum the amounts when units match. Examples:
   • "3 cloves garlic" + "4 cloves garlic" → ONE entry: "7 cloves garlic"
   • "1 onion" + "2 onions" → ONE entry: "3 onions"
   • "200 g flour" + "100 g flour" → ONE entry: "300 g flour"
   • "1 tbsp olive oil" + "1/4 cup olive oil" → ONE entry: "1/4 cup + 1 tbsp olive oil" (when units don't match cleanly, write them additively)
   When the same item name appears with different forms (e.g. "garlic", "minced garlic", "garlic cloves"), treat them as the SAME ingredient and combine.
3. SKIP water entirely — never include "water" as a grocery item.
4. NEVER change units or invent new quantities beyond honest summation.
5. Do NOT drop, omit, or over-simplify any ingredient — every distinct ingredient must appear on the list. If one ingredient bundles several shoppable items in parentheses — e.g. "mixed seafood (littleneck clams, mussels, large shrimp, halibut chunks)" — output a SEPARATE entry for EACH item (littleneck clams, mussels, large shrimp, halibut), dividing the total amount sensibly between them. The same applies to "mixed vegetables (...)", "assorted (...)", etc.

Return ONLY valid JSON:
{
  "Produce": [{"item": "garlic", "amount": "5 cloves", "meals": ["Monday", "Wednesday"]}],
  "Meat & Seafood": [],
  "Dairy & Eggs": [],
  "Canned & Dry Goods": [],
  "Spices & Condiments": [],
  "Bread & Bakery": [],
  "Frozen": [],
  "Beverages": [],
  "Snacks": [],
  "Other": []
}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No grocery list JSON returned');
  const list = JSON.parse(jsonMatch[0]);
  return fixGroceryCategories(list) as WeeklyMenu['grocery_list'];
}

// Deterministic safety net — moves items to the correct category based on keyword matches.
// Catches cases where Claude misclassifies (e.g. salmon in Produce).
function fixGroceryCategories(list: Record<string, { item: string; amount: string; meals?: string[] }[]>) {
  const RULES: { keywords: RegExp; target: string }[] = [
    // Broth/stock first — otherwise "chicken broth" / "beef broth" hit the meat rule.
    { target: 'Canned & Dry Goods', keywords: /\b(broth|stock|bouillon|consommé|consomme)\b/i },
    { target: 'Frozen', keywords: /\b(frozen|ice cream|gelato|sorbet|popsicle)\b/i },
    { target: 'Beverages', keywords: /\b(juices?|lemonades?|sodas?|colas?|seltzers?|tonic water|sparkling water|kombucha|iced tea|sports drinks?|energy drinks?|smoothies?)\b/i },
    { target: 'Snacks', keywords: /\b(madeleines?|chocolates?|cand(y|ies)|chips|crisps|pretzels?|popcorn|granola bars?|snack bars?|trail mix|dried (mango|fruit|apricots?|cranberr(y|ies)|pineapple)|dry mango|fruit snacks?|gumm(y|ies)|biscotti|wafers?|cookies?)\b/i },
    { target: 'Meat & Seafood', keywords: /\b(salmon|tuna(?! in (oil|water|brine))|cod|halibut|tilapia|trout|bass|swordfish|mahi|snapper|sardine(?!s? in oil)|mackerel|haddock|anchov(?!ies? in oil)|herring|sea bass|prawn|shrimp|scallop|mussel|clam|oyster|octopus|squid|calamari|lobster|crab|chicken|turkey|duck|beef|pork|lamb|veal|bacon|sausage|chorizo|salami|prosciutto|pancetta|ham(?!\w)|ground (meat|beef|pork|turkey|chicken|lamb|veal)|meatball|steak|brisket|ribs?|tenderloin|loin|breast|thigh|wing|drumstick|filet|fillet)\b/i },
    { target: 'Dairy & Eggs', keywords: /\b(milk|cream(?! of (tartar|wheat))|butter|yogurt|yoghurt|ricotta|mozzarella|parmesan|parmigiano|pecorino|cheddar|feta|goat cheese|cream cheese|cottage cheese|gouda|brie|gruyere|mascarpone|sour cream|crème fraîche|creme fraiche|eggs?|egg whites?|egg yolks?)\b/i },
    { target: 'Bread & Bakery', keywords: /\b(bread|baguette|ciabatta|focaccia|tortilla|pita|naan|roll|bun|breadcrumb|panko|croutons?|brioche|sourdough|pizza dough|puff pastry|phyllo|crackers?)\b/i },
    { target: 'Produce', keywords: /\b(garlic|onion|shallot|leek|scallion|spring onion|tomato(?!es? canned|, canned)|lettuce|spinach|kale|arugula|romaine|cabbage|broccoli|cauliflower|carrot|celery|cucumber|zucchini|squash|pumpkin|eggplant|aubergine|bell pepper|chili pepper|jalapeño|jalapeno|mushroom|potato|sweet potato|asparagus|green bean|pea pod|fresh herb|basil|parsley|cilantro|coriander leaf|mint|rosemary|thyme|sage|oregano(?! dried)|dill|chive|tarragon|lemon|lime|orange|apple|pear|banana|berry|berries|grape|melon|peach|plum|nectarine|cherry|fig|pomegranate|avocado|ginger(?! powder| ground)|fresh fruit|fresh vegetable)\b/i },
  ];

  // Build a flat list with their current category
  const all: Array<{ item: string; amount: string; meals?: string[]; current: string }> = [];
  for (const [cat, items] of Object.entries(list)) {
    if (!Array.isArray(items)) continue;
    for (const it of items) all.push({ ...it, current: cat });
  }

  // Filter out items we never want on the list (water, ice, "to taste" markers)
  const SKIP_ITEMS = /^(water|cold water|hot water|warm water|boiling water|ice|ice cubes?|tap water)$/i;
  const filtered = all.filter(e => !SKIP_ITEMS.test((e.item || '').trim()));

  // Reclassify according to rules
  const result: Record<string, { item: string; amount: string; meals?: string[] }[]> = {
    Produce: [], 'Meat & Seafood': [], 'Dairy & Eggs': [], 'Canned & Dry Goods': [],
    'Spices & Condiments': [], 'Bread & Bakery': [], Frozen: [], Beverages: [], Snacks: [], Other: [],
  };
  for (const entry of filtered) {
    let target = entry.current in result ? entry.current : 'Other';
    for (const rule of RULES) {
      if (rule.keywords.test(entry.item)) { target = rule.target; break; }
    }
    result[target].push({ item: entry.item, amount: entry.amount, meals: entry.meals });
  }

  // Combine duplicates within each category — group by normalized item name, sum amounts
  for (const cat of Object.keys(result)) {
    result[cat] = combineDuplicates(result[cat]);
  }
  return result;
}

// Normalize an ingredient name so different forms of the same item collapse together
// e.g. "garlic cloves" / "minced garlic" / "garlic, crushed" → "garlic"
function normalizeItemName(name: string): string {
  let n = name.toLowerCase().trim();
  // Strip parenthetical and post-comma descriptors ("garlic, minced" → "garlic")
  n = n.replace(/\(.*?\)/g, '').split(',')[0].trim();
  // Strip leading prep verbs ("minced garlic" → "garlic")
  n = n.replace(/^(minced|chopped|diced|sliced|grated|crushed|peeled|whole|fresh|dried|ground)\s+/g, '');
  // Strip plural "s" at end
  n = n.replace(/s$/, '');
  // Strip trailing descriptors like "cloves" so "garlic cloves" and "garlic" merge
  n = n.replace(/\s+(clove|head|bulb|sprig|leaf|leave|stalk|stem|piece|bunch)s?$/g, '');
  return n.trim();
}

// Parse an amount like "3 cloves", "1.5 cups", "200 g", "1/2 tbsp" into { value, unit }
function parseAmount(amount: string): { value: number; unit: string } | null {
  if (!amount) return null;
  const a = amount.trim();
  // Mixed fraction "1 1/2"
  const mixed = a.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\s*(.*)$/);
  if (mixed) return { value: parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]), unit: mixed[4].trim().toLowerCase() };
  // Simple fraction "1/2"
  const frac = a.match(/^(\d+)\s*\/\s*(\d+)\s*(.*)$/);
  if (frac) return { value: parseInt(frac[1]) / parseInt(frac[2]), unit: frac[3].trim().toLowerCase() };
  // Decimal "1.5"
  const num = a.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (num) return { value: parseFloat(num[1]), unit: num[2].trim().toLowerCase() };
  return null;
}

function formatAmount(value: number, unit: string): string {
  // Round to 2 decimals, then drop trailing .0
  const rounded = Math.round(value * 100) / 100;
  const numStr = rounded % 1 === 0 ? String(rounded) : String(rounded);
  return unit ? `${numStr} ${unit}` : numStr;
}

function combineDuplicates(items: { item: string; amount: string; meals?: string[] }[]) {
  const groups = new Map<string, { items: typeof items; key: string }>();
  for (const it of items) {
    const key = normalizeItemName(it.item);
    const existing = groups.get(key);
    if (existing) existing.items.push(it);
    else groups.set(key, { items: [it], key });
  }

  const combined: typeof items = [];
  for (const { items: group } of groups.values()) {
    if (group.length === 1) {
      combined.push(group[0]);
      continue;
    }
    // Try to sum amounts if all have the same unit; otherwise concatenate
    const parsed = group.map(g => parseAmount(g.amount));
    const allParsed = parsed.every(p => p !== null);
    const units = allParsed ? new Set(parsed.map(p => p!.unit)) : null;
    let amount: string;
    if (allParsed && units && units.size === 1) {
      const total = parsed.reduce((sum, p) => sum + p!.value, 0);
      amount = formatAmount(total, parsed[0]!.unit);
    } else {
      // Mixed units — concatenate distinct amounts with " + "
      amount = group.map(g => g.amount).filter(Boolean).join(' + ');
    }
    // Use the most descriptive item name (longest), merge meals
    const item = group.reduce((best, g) => g.item.length > best.length ? g.item : best, group[0].item);
    const meals = [...new Set(group.flatMap(g => g.meals || []))];
    combined.push({ item, amount, meals });
  }
  return combined;
}

export async function generateMealRecipe(
  apiKey: string,
  meal: Meal,
  familySize: number,
  prepSchedule?: import('./types').PrepSchedule,
  language?: string
): Promise<{ ingredients: Ingredient[]; instructions: string[]; prep_ahead: string[]; sides?: import('./types').Side[] }> {
  const client = new Anthropic({ apiKey });

  function prepContext(ps?: import('./types').PrepSchedule): string {
    if (!ps || ps.type === 'daily') {
      return `Prep style: day-of prep. Write prep_ahead as tasks to do before cooking that evening, always stating the quantity of each ingredient being prepped (e.g. "Chop 2 onions and mince 4 garlic cloves", "Make the tomato sauce (about 2 cups) and set aside").`;
    }
    if (ps.type === 'batch') {
      const day = ps.batchDay || 'Sunday';
      return `Prep style: weekly batch prep on ${day}. Write prep_ahead as tasks to do on ${day}, always stating the quantity of each ingredient being prepped (e.g. "Chop and store 1 lb carrots and 2 bell peppers in airtight containers", "Marinate 2 lbs chicken and refrigerate").`;
    }
    if (ps.type === 'custom' && ps.customDays?.length) {
      return `Prep style: custom prep days (${ps.customDays.join(' and ')}). Write prep_ahead as tasks without timing labels, always stating the quantity of each ingredient being prepped (e.g. "Make the sauce (2 cups) and store", "Slice and season 1.5 lbs beef").`;
    }
    return '';
  }

  const hasSides = meal.sides?.length;
  const sidesSection = hasSides ? `
The following sides are planned for tonight. For each, write 2–3 cooking steps that run IN PARALLEL with the main dish — using the same oven, passive simmering time, or hands-off moments. Do NOT add to the total cook time.
${meal.sides!.map(s => `- ${s.name}${s.ingredients?.length ? ` (ingredients: ${s.ingredients.map(i => `${i.amount} ${i.item}`).join(', ')})` : ''}`).join('\n')}` : '';

  const prompt = `You are a professional chef. Write the full recipe for:
${langInstruction(language)}
Dish: ${meal.name} (${meal.cuisine})
Serves: ${familySize}
Total time: ${meal.total_time}
Difficulty: ${meal.difficulty}
${meal.source_site ? `Style: inspired by ${meal.source_site}` : ''}

${prepContext(prepSchedule)}
${sidesSection}

Return ONLY valid JSON:
{
  "ingredients": [
    {"amount": "2 lbs", "item": "chicken thighs, boneless skinless"}
  ],
  "instructions": [
    "Step 1: ...",
    "Step 2: ..."
  ],
  "prep_ahead": [
    "Prep task description without timing..."
  ]${hasSides ? `,
  "sides": [
    {
      "name": "Side name",
      "ingredients": [{"amount": "1 bag", "item": "mixed greens"}],
      "instructions": ["Step that runs while the main cooks.", "Another parallel step."]
    }
  ]` : ''}
}

Requirements:
- 8+ ingredients with precise amounts
- 6+ clear, detailed instruction steps
- 3+ prep-ahead tasks written as plain action steps — NO timing labels (no "30 min before:", no day names as prefixes)
- Every prep-ahead task MUST state the quantity of each ingredient being prepped, matching the amounts in the ingredient list (e.g. "Dice 2 onions", "Mince 4 garlic cloves", "Grate 8 oz parmesan") — never write quantity-less tasks like "Chop the onions"
- Exception: only include a time reference if it is genuinely critical and cannot be skipped (e.g. "Must marinate for at least 24 hours" or "Dough must rest for a minimum of 2 hours")
- The ingredient list and steps must be consistent with the stated total_time — do not include steps that would realistically take much longer
- If the full classic recipe exceeds the total_time, adapt it (e.g. use thinner cuts, higher heat, fewer components) so it genuinely fits${hasSides ? `
- Side instructions must be genuinely parallel — no extra time added` : ''}
${UNIT_RULE}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No recipe JSON returned');
  return JSON.parse(jsonMatch[0]);
}

// Generic UI string translator — keeps keys, translates values, preserves emojis/markdown
export async function translateUIStrings(
  apiKey: string,
  strings: Record<string, string>,
  targetLanguage: string,
): Promise<Record<string, string>> {
  if (!targetLanguage || targetLanguage === 'English') return strings;
  const client = new Anthropic({ apiKey });
  const prompt = `Translate the values in the following JSON object to ${targetLanguage}. Keep the keys EXACTLY the same. Translate all text naturally for a native speaker of ${targetLanguage}. Preserve emojis, line breaks, and markdown formatting. Return ONLY valid JSON with the exact same key structure.

${JSON.stringify(strings, null, 2)}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Translation failed');
  return JSON.parse(match[0]);
}

export async function translateContent(
  apiKey: string,
  content: {
    name?: string;
    description?: string;
    ingredients?: Ingredient[];
    instructions?: string[];
    prep_ahead?: string[];
    sides?: { name: string; ingredients?: Ingredient[]; instructions?: string[] }[];
  },
  targetLanguage: string = 'Spanish'
): Promise<typeof content> {
  const client = new Anthropic({ apiKey });

  const prompt = `Translate the following recipe content to ${targetLanguage}. Return ONLY valid JSON with the exact same structure. Translate ingredient names, instructions, descriptions, and all text fields.

CRITICAL — do NOT convert or change any measurements. Keep every ingredient amount EXACTLY as written: the same numbers, fractions, and units of measure (cups, tbsp, tsp, oz, lb, °F, g, ml, kg, etc.). Do not convert imperial to metric or Fahrenheit to Celsius — a "cup" stays "cup", "1 lb" stays "1 lb", "350°F" stays "350°F". Only translate the ingredient NAME, never its amount. Unit words may keep their standard abbreviations; the user relies on units staying consistent regardless of language.

${JSON.stringify(content)}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Translation failed');
  return JSON.parse(jsonMatch[0]);
}

export async function simplifyRecipe(
  apiKey: string,
  meal: Meal,
  skipIngredients: string[]
): Promise<{
  canSimplify: boolean;
  essentialSkipped: string[];
  simplifiedIngredients: Ingredient[];
  simplifiedInstructions: string[];
  note: string;
}> {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY! });

  const ingredientList = (meal.ingredients || []).map(i => `${i.amount} ${i.item}`).join('\n');
  const skipList = skipIngredients.join(', ');

  const prompt = `You are a professional chef. Analyze this recipe and determine which of the "skip" ingredients can be safely removed without fundamentally changing the dish.

Dish: ${meal.name} (${meal.cuisine})
Ingredients:
${ingredientList}

Instructions:
${(meal.instructions || []).join('\n')}

Ingredients the family prefers to skip: ${skipList}

For each skip ingredient present in this recipe, classify it as:
- "optional": can be safely removed — dish remains essentially the same
- "essential": removing it would fundamentally change the dish identity or make it fail

If ANY skip ingredients are "optional", provide the simplified recipe without them (adjust instructions accordingly).

Return ONLY valid JSON:
{
  "canSimplify": true,
  "essentialSkipped": ["ingredient name if essential"],
  "simplifiedIngredients": [{"amount": "2", "item": "garlic cloves"}],
  "simplifiedInstructions": ["Step 1: ..."],
  "note": "Removed thyme and red pepper flakes — dish works perfectly without them."
}

If none of the skip ingredients appear in this recipe, return:
{ "canSimplify": false, "essentialSkipped": [], "simplifiedIngredients": [], "simplifiedInstructions": [], "note": "" }`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON returned');
  return JSON.parse(jsonMatch[0]);
}

export async function translateToEnglish(
  apiKey: string,
  content: {
    name?: string;
    description?: string;
    ingredients?: Ingredient[];
    instructions?: string[];
    prep_ahead?: string[];
  }
): Promise<typeof content> {
  const client = new Anthropic({ apiKey });

  const prompt = `Translate the following recipe content to English. Return ONLY valid JSON with the exact same structure. Keep ingredient amounts (numbers, fractions, and units like g, ml, tbsp, tsp, kg, oz, cups) unchanged — only translate ingredient names and all text fields.

${JSON.stringify(content)}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Translation failed');
  return JSON.parse(jsonMatch[0]);
}

export async function parseRecipeFromText(
  apiKey: string,
  input: { url: string; platform: string; pageText: string; ogTitle?: string; ogDescription?: string; transcript?: string },
): Promise<any | null> {
  const client = new Anthropic({ apiKey });

  // Cap page text — social platforms include massive amounts of unrelated chrome.
  const trimmed = (input.pageText || '').slice(0, 15000);
  const transcript = (input.transcript || '').slice(0, 12000);

  const prompt = `You are extracting a recipe from a ${input.platform} post. The user wants this saved to their meal planner.

URL: ${input.url}
Title (from og:title): ${input.ogTitle || '(none)'}
Description (from og:description): ${input.ogDescription || '(none)'}

${transcript ? `Video transcript:\n${transcript}\n\n` : ''}Page text:
${trimmed}

Extract the recipe and return ONLY valid JSON with this exact shape — no markdown, no preamble:

{
  "name": "Recipe Name",
  "description": "One short appetizing sentence describing the dish.",
  "cuisine": "Italian | Mexican | Asian | American | etc, or empty string",
  "mealType": "pasta | chicken | meat | seafood | vegetarian | soup or stew | Mexican | Asian | Any",
  "serves": 4,
  "total_time": "30 min",
  "prep_time": "",
  "cook_time": "",
  "difficulty": "Easy | Medium | Hard",
  "tags": ["short", "lowercase", "tags", "max 6"],
  "ingredients": [
    { "amount": "2 cups", "item": "all-purpose flour" },
    { "amount": "1 tsp", "item": "salt" }
  ],
  "instructions": [
    "Step 1: Brief instruction.",
    "Step 2: Brief instruction."
  ],
  "prep_ahead": [],
  "source": "${input.url}"
}

Important:
- If the post is NOT a recipe (e.g. just a photo with no recipe content, or a non-cooking video), return exactly: {"notARecipe": true}
- Translate everything to English if the original is in another language.
- For ingredients, separate amount (with unit) from item name. Be specific: "2 cups", "1 tbsp", "500g", "3 cloves", etc. Empty string for amount when there isn't one ("salt to taste").
- For instructions, prefix each with "Step N:" and keep each step concise but complete.
- Infer prep_time/cook_time when possible from the transcript or text; leave as "" if unsure.
- serves defaults to 4 if not stated.
- difficulty: Easy = under 30 min and basic technique. Medium = 30-60 min or some technique. Hard = over an hour or advanced.`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  const parsed = JSON.parse(jsonMatch[0]);
  if (parsed.notARecipe) return null;
  return parsed;
}

export interface OnTheFlyOption {
  name: string;
  cuisine: string;
  description: string;
  total_time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  usedIngredients: string[];
  missingIngredients: string[];
}

export async function generateOnTheFlyOptions(
  apiKey: string,
  ingredients: string[],
  restrictions: string[] = [],
  language?: string,
): Promise<OnTheFlyOption[]> {
  const client = new Anthropic({ apiKey });

  const restrictText = restrictions.length
    ? `Strict dietary restrictions — never include: ${restrictions.join(', ')}.` : '';

  const prompt = `You are a creative home chef. A family has these ingredients available:
${ingredients.map(i => `- ${i}`).join('\n')}
${langInstruction(language)}
Suggest 6 DIFFERENT dinner ideas using whichever of these ingredients naturally belong together. The 6 ideas must span different cuisines and styles — don't make 6 variations of pasta. Each idea should use 2 or more of the listed ingredients.
${restrictText}

Return ONLY a valid JSON array — no markdown, no extra text:
[
  {
    "name": "Recipe Name",
    "cuisine": "Italian",
    "description": "One short appetizing sentence.",
    "total_time": "30 min",
    "difficulty": "Easy",
    "usedIngredients": ["exact names from the provided list that this dish uses"],
    "missingIngredients": ["1–3 small pantry staples needed beyond what was provided"]
  }
]

Rules:
- Exactly 6 options
- Each must be a clearly different dish — different cuisine, different cooking method, different protein/base
- difficulty must be exactly "Easy", "Medium", or "Hard"
- Keep descriptions to ONE short sentence`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No valid JSON returned from Claude');
  return JSON.parse(jsonMatch[0]);
}

export async function generateOnTheFlyFullRecipe(
  apiKey: string,
  option: OnTheFlyOption,
  ingredients: string[],
  familySize: number,
  restrictions: string[] = [],
  language?: string,
) {
  const client = new Anthropic({ apiKey });

  const restrictText = restrictions.length
    ? `Strict dietary restrictions — never include: ${restrictions.join(', ')}.` : '';

  const prompt = `You are a creative home chef. The family chose this dish:
- Name: ${option.name}
- Cuisine: ${option.cuisine}
- Description: ${option.description}
- Expected total time: ${option.total_time}
- Difficulty: ${option.difficulty}

They have these ingredients available:
${ingredients.map(i => `- ${i}`).join('\n')}
${langInstruction(language)}
Family size: ${familySize} people.
${restrictText}

Return ONLY valid JSON — full detailed recipe:
{
  "name": "${option.name}",
  "cuisine": "${option.cuisine}",
  "description": "${option.description}",
  "total_time": "${option.total_time}",
  "prep_time": "10 min",
  "cook_time": "20 min",
  "difficulty": "${option.difficulty}",
  "serves": ${familySize},
  "usedIngredients": ${JSON.stringify(option.usedIngredients)},
  "missingIngredients": ${JSON.stringify(option.missingIngredients)},
  "ingredients": [
    {"amount": "2 tbsp", "item": "soy sauce"},
    {"amount": "2", "item": "eggs"}
  ],
  "instructions": [
    "Step 1: ..."
  ],
  "prep_ahead": [
    "Prep task stating ingredient quantities, e.g. Dice 2 onions and mince 3 garlic cloves"
  ]
}

Rules:
- total_time = prep_time + cook_time, and must equal "${option.total_time}"
- 6+ clear, detailed instruction steps
- Every prep_ahead task must state the quantity of each ingredient being prepped, matching the ingredient list (e.g. "Dice 2 onions") — never quantity-less tasks like "Chop the onions"
- missingIngredients: only essential extras not in the user's list
- difficulty must remain "${option.difficulty}"
${UNIT_RULE}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON returned from Claude');
  return JSON.parse(jsonMatch[0]);
}

export async function generateOnTheFlyRecipe(
  apiKey: string,
  ingredients: string[],
  familySize: number,
  restrictions: string[] = [],
  exclude: string[] = [],
  language?: string
): Promise<{
  name: string;
  cuisine: string;
  description: string;
  total_time: string;
  prep_time: string;
  cook_time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  serves: number;
  usedIngredients: string[];
  missingIngredients: string[];
  ingredients: Ingredient[];
  instructions: string[];
  prep_ahead: string[];
}> {
  const client = new Anthropic({ apiKey });

  const restrictText = restrictions.length
    ? `Strict dietary restrictions — never include: ${restrictions.join(', ')}.` : '';
  const excludeText = exclude.length
    ? `Do NOT make any of these — already suggested: ${exclude.join(', ')}. Choose a clearly different dish and cuisine.` : '';

  const prompt = `You are a creative home chef. A family has these ingredients available:
${ingredients.map(i => `- ${i}`).join('\n')}
${langInstruction(language)}
Create ONE delicious, cohesive dinner recipe using whichever of these ingredients naturally belong together. You do NOT need to use all of them — only include ones that make sense for the dish. Ignore the rest.
Family size: ${familySize} people.
${restrictText}
${excludeText}

Return ONLY valid JSON:
{
  "name": "Recipe Name",
  "cuisine": "Italian",
  "description": "Two-sentence appetizing description.",
  "total_time": "30 min",
  "prep_time": "10 min",
  "cook_time": "20 min",
  "difficulty": "Easy",
  "serves": ${familySize},
  "usedIngredients": ["exact names from the provided list that are used"],
  "missingIngredients": ["1–3 small pantry staples needed beyond what was provided"],
  "ingredients": [
    {"amount": "2 tbsp", "item": "soy sauce"},
    {"amount": "2", "item": "eggs"}
  ],
  "instructions": [
    "Step 1: ..."
  ],
  "prep_ahead": [
    "Prep task stating ingredient quantities, e.g. Dice 2 onions and mince 3 garlic cloves"
  ]
}

Rules:
- Only use ingredients from the list that genuinely belong in the dish — skip any that would be forced or odd
- missingIngredients: only essential extras not in the list (salt, oil, etc.) — keep it short
- 6+ clear, detailed instruction steps
- Every prep_ahead task must state the quantity of each ingredient being prepped, matching the ingredient list (e.g. "Dice 2 onions") — never quantity-less tasks like "Chop the onions"
- difficulty must be exactly "Easy", "Medium", or "Hard"
${UNIT_RULE}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON returned from Claude');
  return JSON.parse(jsonMatch[0]);
}

export async function getSubstitution(
  apiKey: string,
  meal: Meal,
  ingredient: string
): Promise<SubstituteResult> {
  const client = new Anthropic({ apiKey });

  const ingredientList = (meal.ingredients || []).map(i => `${i.amount} ${i.item}`).join(', ');

  const prompt = `You are a professional chef. A family dislikes "${ingredient}" and it appears in this recipe:

Dish: ${meal.name} (${meal.cuisine})
Ingredients: ${ingredientList}

First, assess: is "${ingredient}" ESSENTIAL to this dish — meaning removing or replacing it would fundamentally change the dish's identity, flavor profile, or structure? (Examples: anchovies in Caesar, fish sauce in pad thai, eggs in a frittata)

Return ONLY a JSON object:
{
  "isEssential": true or false,
  "essentialReason": "Explain why it's essential (only if isEssential is true)",
  "substitutes": ["substitute 1", "substitute 2"],
  "adjustedInstructions": "Brief note on how to use the substitute in this recipe (only if isEssential is false)"
}

If isEssential is true, substitutes can be empty [].
If isEssential is false, provide 2–3 practical substitutes.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid response from Claude');
  return JSON.parse(jsonMatch[0]) as SubstituteResult;
}

// Rewrite an existing recipe by swapping one ingredient with the user's chosen substitute.
// Returns the full new ingredient list and updated instructions (amounts/timings may change).
export async function applySubstitute(
  apiKey: string,
  meal: Meal,
  originalIngredient: string,
  substitute: string,
  language?: string,
): Promise<{ ingredients: Ingredient[]; instructions: string[] }> {
  const client = new Anthropic({ apiKey });

  const ingredientList = (meal.ingredients || []).map(i => `${i.amount} ${i.item}`).join('\n');
  const instructionList = (meal.instructions || []).map((s, i) => `${i + 1}. ${s}`).join('\n');

  const prompt = `You are a professional chef. Rewrite this recipe to swap ONE ingredient for the user's chosen replacement. Adjust amounts, timings, and cooking technique as needed for the substitution to work properly.

Dish: ${meal.name} (${meal.cuisine || 'unspecified cuisine'})
Serves: ${meal.serves || 4}

Original ingredients:
${ingredientList}

Original instructions:
${instructionList}

Replace "${originalIngredient}" with "${substitute}".
${langInstruction(language)}

Return ONLY valid JSON in this exact shape — no markdown, no explanations:
{
  "ingredients": [
    {"amount": "200 g", "item": "ingredient name"}
  ],
  "instructions": [
    "Step 1 text…",
    "Step 2 text…"
  ]
}

Rules:
- Output the COMPLETE ingredient list (all of them), with "${originalIngredient}" replaced by "${substitute}" using a correct equivalent amount
- Output the COMPLETE instructions list with any adjustments needed for the substitution (e.g. different cooking time, technique changes, additional steps)
- Keep all other ingredients exactly the same (same item names, same amounts)
- Strip "Step N:" prefixes from instructions — just the action text
- If the substitute requires different prep (e.g. melting butter vs. heating oil), update the instructions accordingly`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not rewrite recipe');
  return JSON.parse(jsonMatch[0]);
}

export interface OccasionDishRecipe {
  name: string;
  description: string;
  serves: number;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  difficulty: string;
  ingredients: { amount: string; item: string }[];
  instructions: string[];
  makeAheadNote?: string;
}

export interface SpecialOccasionMenuItem {
  course: string;
  dish: string;
  description: string;
  prepTime: string;
  cookTime: string;
  makeAheadNote?: string;
  selected?: boolean;              // included in the final menu (defaults true)
  fullRecipe?: OccasionDishRecipe; // populated on finalize
}

export interface SpecialOccasionResult {
  occasionTitle: string;
  eventType?: 'served-dinner' | 'hors-doeuvres';
  menu: SpecialOccasionMenuItem[];
  timeline: {
    when: string;
    tasks: string[];
  }[];
  hostingTips: string[];
  servingNotes: string;
  finalized?: boolean;
  // Planning inputs persisted at generation so finalize can rebuild the timeline
  planning?: {
    prepStartDate?: string;
    daySchedules?: DaySchedule[];
    cuisineTheme?: string;
    dietaryNotes?: string;
    mustHaveDishes?: string;
    eventDate?: string;
    servingTime?: string;
  };
}

export interface DaySchedule {
  date: string;
  label: string;
  daysUntilEvent: number;
  minutes: number;
}

function fmtMinutes(m: number) {
  if (m < 60) return `${m} minutes`;
  if (m === 60) return '1 hour';
  if (m % 60 === 0) return `${m / 60} hours`;
  return `${Math.floor(m / 60)}h ${m % 60}min`;
}

export function buildSpecialOccasionPrompt(
  occasion: string,
  guests: number,
  servingTime: string,
  cuisineTheme: string,
  dietaryNotes: string,
  mustHaveDishes: string,
  daySchedules: DaySchedule[],
  settings: { restrictions: string[]; preferences: string[]; language?: string; eventType?: string }
): string {
  let dateContext = '';
  if (daySchedules.length > 0) {
    const lines = daySchedules.map(d => {
      const rel = d.daysUntilEvent === 0 ? 'event day' : d.daysUntilEvent === 1 ? '1 day before' : `${d.daysUntilEvent} days before`;
      return `- ${d.label} (${rel}): ${d.minutes === 0 ? 'NO TIME AVAILABLE — skip this day' : fmtMinutes(d.minutes) + ' available'}`;
    });
    dateContext = `\nPreparation schedule — available time per day:\n${lines.join('\n')}`;
  }

  const contextLines = [
    cuisineTheme && `Cuisine/theme: ${cuisineTheme}`,
    guests && `Guests: ${guests}`,
    servingTime && `Serving time: ${servingTime}`,
    dietaryNotes && `Dietary notes: ${dietaryNotes}`,
    mustHaveDishes && `Must-include dishes: ${mustHaveDishes}`,
    settings.restrictions.length && `Dietary restrictions: ${settings.restrictions.join(', ')}`,
    settings.preferences.length && `Family preferences: ${settings.preferences.join(', ')}`,
  ].filter(Boolean).join('\n');

  const timelineInstructions = daySchedules.length > 0
    ? `Build a day-by-day timeline using the EXACT dates listed above. Label each bucket with the full date (e.g. "Wednesday, May 7"). Assign tasks so the total active time fits within each day's available time. On the event day, split into time-of-day buckets (Morning, 2 hours before, 30 minutes before, At the table).`
    : `Group tasks into logical time buckets (e.g. "3 days before", "1 day before", "Morning of", "2 hours before", "At the table").`;

  return `You are an expert chef and event planner. Design a special occasion menu with a detailed preparation timeline.
${langInstruction(settings.language)}

Occasion: ${occasion}
${contextLines}${dateContext}

${settings.eventType === 'hors-doeuvres'
  ? `Create a spread of 6–10 hors d'oeuvres — passed small bites, canapés, and finger foods appropriate to the occasion (NOT formal plated courses). For each item, use the "course" field as a small-bite category such as "Cold bite", "Warm bite", "Passed", "Station", or "Sweet bite".`
  : `Create a menu with 4–6 plated courses appropriate to the occasion.`} Then build a preparation timeline that is realistic and respects the daily time available.

${timelineInstructions}

Return ONLY valid JSON:
{
  "occasionTitle": "elegant short title for this menu",
  "menu": [
    {
      "course": "Antipasto",
      "dish": "Dish name",
      "description": "1–2 sentence description of the dish",
      "prepTime": "20 min",
      "cookTime": "10 min",
      "makeAheadNote": "optional: what can be done ahead and when"
    }
  ],
  "timeline": [
    { "when": "Wednesday, May 7", "tasks": ["specific task fitting within the daily time budget"] },
    { "when": "Event day — morning", "tasks": ["..."] },
    { "when": "2 hours before", "tasks": ["..."] },
    { "when": "At the table", "tasks": ["..."] }
  ],
  "hostingTips": ["tip 1", "tip 2", "tip 3"],
  "servingNotes": "One warm paragraph on the flow of the meal."
}

Rules:
- Only include timeline buckets that have real tasks — never add empty buckets
- Tasks must be specific and actionable, not generic
- Distribute tasks across days to respect the daily time budget
- Maximize make-ahead steps to reduce day-of stress
- Include wine/drinks chilling, table setting, and hosting logistics
- servingNotes should feel warm and personal`;
}

export async function generateSpecialOccasionMenu(
  occasion: string,
  guests: number,
  servingTime: string,
  cuisineTheme: string,
  dietaryNotes: string,
  mustHaveDishes: string,
  eventDate: string,
  prepStartDate: string,
  daySchedules: DaySchedule[],
  settings: { restrictions: string[]; preferences: string[] },
  apiKey?: string
): Promise<SpecialOccasionResult> {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY! });

  let dateContext = '';
  if (daySchedules.length > 0) {
    const lines = daySchedules.map(d => {
      const rel = d.daysUntilEvent === 0 ? 'event day' : d.daysUntilEvent === 1 ? '1 day before' : `${d.daysUntilEvent} days before`;
      return `- ${d.label} (${rel}): ${d.minutes === 0 ? 'NO TIME AVAILABLE — skip this day' : fmtMinutes(d.minutes) + ' available'}`;
    });
    dateContext = `\nPreparation schedule — available time per day:\n${lines.join('\n')}`;
  }

  const contextLines = [
    cuisineTheme && `Cuisine/theme: ${cuisineTheme}`,
    guests && `Guests: ${guests}`,
    servingTime && `Serving time: ${servingTime}`,
    dietaryNotes && `Dietary notes: ${dietaryNotes}`,
    mustHaveDishes && `Must-include dishes: ${mustHaveDishes}`,
    settings.restrictions.length && `Dietary restrictions: ${settings.restrictions.join(', ')}`,
    settings.preferences.length && `Family preferences: ${settings.preferences.join(', ')}`,
  ].filter(Boolean).join('\n');

  const timelineInstructions = daySchedules.length > 0
    ? `Build a day-by-day timeline using the EXACT dates listed above. Label each bucket with the full date (e.g. "Wednesday, May 7"). Assign tasks so the total active time fits within each day's available time. On the event day, split into time-of-day buckets (Morning, 2 hours before, 30 minutes before, At the table).`
    : `Group tasks into logical time buckets (e.g. "3 days before", "1 day before", "Morning of", "2 hours before", "At the table").`;

  const prompt = `You are an expert chef and event planner. Design a special occasion menu with a detailed preparation timeline.

Occasion: ${occasion}
${contextLines}${dateContext}

Create a menu with 4–6 courses appropriate to the occasion. Then build a preparation timeline that is realistic and respects the daily time available.

${timelineInstructions}

Return ONLY valid JSON:
{
  "occasionTitle": "elegant short title for this menu",
  "menu": [
    {
      "course": "Antipasto",
      "dish": "Dish name",
      "description": "1–2 sentence description of the dish",
      "prepTime": "20 min",
      "cookTime": "10 min",
      "makeAheadNote": "optional: what can be done ahead and when"
    }
  ],
  "timeline": [
    { "when": "Wednesday, May 7", "tasks": ["specific task fitting within the daily time budget"] },
    { "when": "Thursday, May 8 — event day: morning", "tasks": ["..."] },
    { "when": "2 hours before", "tasks": ["..."] },
    { "when": "At the table", "tasks": ["..."] }
  ],
  "hostingTips": ["tip 1", "tip 2", "tip 3"],
  "servingNotes": "One warm paragraph on the flow of the meal."
}

Rules:
- Only include timeline buckets that have real tasks — never add empty buckets
- Tasks must be specific and actionable, not generic
- Distribute tasks across days to respect the daily time budget
- Maximize make-ahead steps to reduce day-of stress
- Include wine/drinks chilling, table setting, and hosting logistics
- servingNotes should feel warm and personal`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON returned from Claude');
  return JSON.parse(jsonMatch[0]) as SpecialOccasionResult;
}

// ── Heritage: transcribe a scanned handwritten recipe card ─────────────────
// Reads a photo of an original (often handwritten) recipe card and returns a
// structured draft the contributor can review and edit. Uses Opus 4.8 for its
// high-resolution vision and best-in-class handwriting reading — accuracy is the
// whole point here, and a misread heirloom recipe is worse than a slow one.
// (To trade some accuracy for lower per-scan cost, swap the model for
// 'claude-sonnet-5', which also has high-res vision.)

export interface TranscribedRecipeDraft {
  name: string;
  cuisine: string;
  serves: number | null;
  total_time: string;
  prep_time: string;
  cook_time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  ingredients: { amount: string; item: string }[];
  instructions: string[];
  prep_ahead: string[];
  nonna_wisdom: string[];
  detected_language: string; // e.g. "English", "Italian" — the language the card is written in
  legibility: 'clear' | 'partial' | 'poor'; // how confidently the card could be read
  unclear_notes: string[]; // words/quantities the model wasn't sure about, for the user to check
}

export async function transcribeRecipeImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
  apiKey?: string,
): Promise<TranscribedRecipeDraft> {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY! });

  const prompt = `You are transcribing a photograph of an original family recipe — often a handwritten card, sometimes stained, faded, or in cursive, and possibly not in English. Read it faithfully and turn it into a structured recipe.

Rules:
- Transcribe what is actually written. Do NOT invent ingredients, steps, or quantities that aren't on the card. If the card omits something (e.g. no cook time), leave that field as an empty string (or null for serves).
- Keep the writer's voice and any dialect/measurements as written (e.g. "a knob of butter", "1 tazza"). Preserve the original language — do NOT translate. Set "detected_language" to the language the card is written in.
- ${UNIT_RULE.split('\n')[0]}
- If a word or quantity is illegible or you are guessing, still include your best reading, but add the item (with your uncertainty) to "unclear_notes" so the person can double-check it.
- Set "legibility" to "clear" (confident throughout), "partial" (some guessed words), or "poor" (large parts unreadable).
- "nonna_wisdom" is for any tips, secrets, or margin notes written on the card.
- Estimate "difficulty" ("Easy" | "Medium" | "Hard") from the steps if not stated.

Respond with ONLY a JSON object of this exact shape (no prose, no markdown fence):
{
  "name": "string",
  "cuisine": "string (best guess from the dish, or empty)",
  "serves": number or null,
  "total_time": "string (e.g. '1 hr 30 min', or empty)",
  "prep_time": "string (or empty)",
  "cook_time": "string (or empty)",
  "difficulty": "Easy" | "Medium" | "Hard",
  "description": "one or two sentences describing the dish (or empty)",
  "ingredients": [{ "amount": "string", "item": "string" }],
  "instructions": ["step 1", "step 2"],
  "prep_ahead": ["anything that can be done ahead"],
  "nonna_wisdom": ["tips or margin notes as written"],
  "detected_language": "string",
  "legibility": "clear" | "partial" | "poor",
  "unclear_notes": ["words or quantities you weren't sure about"]
}`;

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: prompt },
      ],
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not read a recipe from that image. Try a clearer, well-lit photo.');
  const draft = JSON.parse(jsonMatch[0]) as TranscribedRecipeDraft;

  // Defensive defaults — the card may legitimately omit fields.
  draft.ingredients = Array.isArray(draft.ingredients) ? draft.ingredients : [];
  draft.instructions = Array.isArray(draft.instructions) ? draft.instructions : [];
  draft.prep_ahead = Array.isArray(draft.prep_ahead) ? draft.prep_ahead : [];
  draft.nonna_wisdom = Array.isArray(draft.nonna_wisdom) ? draft.nonna_wisdom : [];
  draft.unclear_notes = Array.isArray(draft.unclear_notes) ? draft.unclear_notes : [];
  return draft;
}

// ── Special Occasion: finalize helpers ─────────────────────────────────────

// Full recipe for a single occasion dish (used when finalizing the menu).
export async function generateOccasionDishRecipe(
  apiKey: string,
  params: { dish: string; course: string; occasion: string; guests: number; cuisineTheme?: string; restrictions?: string[]; language?: string },
): Promise<OccasionDishRecipe> {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY! });
  const serves = params.guests || 4;
  const context = [
    params.occasion && `Occasion: ${params.occasion}`,
    params.cuisineTheme && `Cuisine: ${params.cuisineTheme}`,
    `Course: ${params.course}`,
    `Serves: ${serves}`,
    params.restrictions?.length && `Dietary restrictions: ${params.restrictions.join(', ')}`,
  ].filter(Boolean).join('\n');

  const prompt = `You are an expert chef. Write the complete recipe for this dish:${langInstruction(params.language)}

Dish: ${params.dish}
${context}

Return ONLY valid JSON:
{
  "name": "${params.dish}",
  "description": "one evocative sentence",
  "serves": ${serves},
  "prepTime": "X min",
  "cookTime": "X min",
  "totalTime": "X min",
  "difficulty": "Easy" | "Medium" | "Hard",
  "ingredients": [ { "amount": "200 g", "item": "ingredient name" } ],
  "instructions": [ "Clear step-by-step instruction" ],
  "makeAheadNote": "What can be done ahead of time (1–2 sentences)"
}

Rules:
- Ingredients must have precise amounts, scaled for ${serves} people
- 5–8 clear instruction steps
- Difficulty must be exactly "Easy", "Medium", or "Hard"`;

  const message = await client.messages.create({ model: 'claude-haiku-4-5', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] });
  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to generate recipe');
  return JSON.parse(jsonMatch[0].replace(/,\s*([}\]])/g, '$1')) as OccasionDishRecipe;
}

// Suggest ONE replacement dish for a course, avoiding the dishes already chosen.
export async function generateOccasionSwapDish(
  apiKey: string,
  params: { occasion: string; eventType?: string; course: string; avoid: string[]; cuisineTheme?: string; dietaryNotes?: string; guests: number; restrictions?: string[]; language?: string },
): Promise<SpecialOccasionMenuItem> {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY! });
  const style = params.eventType === 'hors-doeuvres' ? "hors d'oeuvres / passed small bites" : 'served plated dinner';
  const context = [
    params.cuisineTheme && `Cuisine/theme: ${params.cuisineTheme}`,
    params.guests && `Guests: ${params.guests}`,
    params.dietaryNotes && `Dietary notes: ${params.dietaryNotes}`,
    params.restrictions?.length && `Dietary restrictions: ${params.restrictions.join(', ')}`,
    `Event style: ${style}`,
  ].filter(Boolean).join('\n');

  const prompt = `You are an expert chef planning a ${style}.${langInstruction(params.language)}

Occasion: ${params.occasion}
${context}

Suggest ONE different "${params.course}" that fits the occasion. It MUST be genuinely different from these already on the menu (do not repeat or lightly rename them): ${params.avoid.join('; ') || '(none)'}.

Return ONLY valid JSON:
{ "course": "${params.course}", "dish": "Dish name", "description": "1–2 sentence description", "prepTime": "20 min", "cookTime": "10 min", "makeAheadNote": "optional: what can be done ahead" }`;

  const message = await client.messages.create({ model: 'claude-haiku-4-5', max_tokens: 500, messages: [{ role: 'user', content: prompt }] });
  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to swap dish');
  return JSON.parse(jsonMatch[0].replace(/,\s*([}\]])/g, '$1')) as SpecialOccasionMenuItem;
}

// Rebuild the prep timeline for the FINAL (selected) dishes, respecting the
// per-day time budgets the user set.
export async function generateOccasionTimeline(
  apiKey: string,
  params: { occasionTitle: string; eventType?: string; dishes: { course: string; dish: string; prepTime?: string; cookTime?: string; makeAheadNote?: string }[]; daySchedules: DaySchedule[]; eventDate?: string; servingTime?: string; language?: string },
): Promise<{ when: string; tasks: string[] }[]> {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY! });
  let dateContext = '';
  if (params.daySchedules?.length) {
    const lines = params.daySchedules.map(d => {
      const rel = d.daysUntilEvent === 0 ? 'event day' : d.daysUntilEvent === 1 ? '1 day before' : `${d.daysUntilEvent} days before`;
      return `- ${d.label} (${rel}): ${d.minutes === 0 ? 'NO TIME — skip this day' : fmtMinutes(d.minutes) + ' available'}`;
    });
    dateContext = `\nAvailable time per day:\n${lines.join('\n')}`;
  }
  const dishList = params.dishes.map(d => `- ${d.course}: ${d.dish}${d.makeAheadNote ? ` (can make ahead: ${d.makeAheadNote})` : ''}`).join('\n');
  const timelineInstructions = params.daySchedules?.length
    ? `Build a day-by-day timeline using the EXACT dates above. Label each bucket with the full date. Fit each day's tasks within its available time. On the event day, split into buckets (Morning, 2 hours before, 30 minutes before, At the table).`
    : `Group tasks into logical buckets ("2 days before", "1 day before", "Morning of", "2 hours before", "At the table").`;

  const prompt = `You are an expert event chef. Build ONLY a preparation timeline for this ${params.eventType === 'hors-doeuvres' ? "hors d'oeuvres spread" : 'plated dinner'}: "${params.occasionTitle}".${langInstruction(params.language)}

Dishes to prepare:
${dishList}
${params.servingTime ? `Serving time: ${params.servingTime}` : ''}${dateContext}

${timelineInstructions}
Cover every dish, referencing dishes by name in the tasks. Front-load make-ahead work onto earlier days.

Return ONLY valid JSON: { "timeline": [ { "when": "label", "tasks": ["specific task"] } ] }`;

  const message = await client.messages.create({ model: 'claude-haiku-4-5', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] });
  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to build timeline');
  const parsed = JSON.parse(jsonMatch[0].replace(/,\s*([}\]])/g, '$1'));
  return Array.isArray(parsed.timeline) ? parsed.timeline : [];
}
