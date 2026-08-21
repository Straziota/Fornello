// Safety audit: does a declared allergy actually keep the allergen out?
//
// Generates real menus through the production code path, then reads every meal
// name, description, tag and — for a sample — the full generated recipe, looking
// for the allergen and for dishes that traditionally contain it even when the
// word never appears (satay, pad thai, kung pao, gado-gado, massaman).
//
// Run: node scripts/allergen-audit.mjs [menus] [allergen]
import { config } from 'dotenv';
config({ path: '.env.local' });

const N = Number(process.argv[2] || 5);
const ALLERGEN = (process.argv[3] || 'peanut').toLowerCase();

// Words that name the allergen outright.
const DIRECT = {
  peanut: [/\bpeanut/i, /\bgroundnut/i, /\barachis/i, /\bpeanut butter\b/i],
  shellfish: [/\bshellfish/i, /\bshrimp/i, /\bprawn/i, /\bcrab\b/i, /\blobster/i, /\bclam/i, /\bmussel/i, /\boyster/i, /\bscallop/i],
  dairy: [/\bmilk\b/i, /\bbutter\b/i, /\bcream\b/i, /\bcheese\b/i, /\byogh?urt\b/i],
  gluten: [/\bwheat\b/i, /\bflour\b/i, /\bbread\b/i, /\bpasta\b/i, /\bbarley\b/i, /\bsoy sauce\b/i],
}[ALLERGEN] || [new RegExp(`\\b${ALLERGEN}`, 'i')];

// Dishes that conventionally contain the allergen even if unnamed — the
// dangerous category, because the word never appears to be caught.
const HIDDEN = {
  peanut: [/\bsatay\b/i, /\bpad thai\b/i, /\bkung pao\b/i, /\bgado[- ]?gado\b/i, /\bmassaman\b/i, /\bbang bang\b/i, /\bdan dan\b/i, /\bmole\b/i],
  shellfish: [/\bpaella\b/i, /\bcioppino\b/i, /\bbouillabaisse\b/i, /\bjambalaya\b/i, /\bnam pla\b/i, /\bfish sauce\b/i, /\bworcestershire\b/i],
  dairy: [/\bgratin\b/i, /\balfredo\b/i, /\bcarbonara\b/i, /\bstroganoff\b/i],
  gluten: [/\bsoy sauce\b/i, /\bhoisin\b/i, /\bpanko\b/i, /\broux\b/i],
}[ALLERGEN] || [];

const settings = {
  familySize: 4,
  websites: [], preferences: [], 
  restrictions: [ALLERGEN === 'peanut' ? 'Peanuts' : ALLERGEN],
  schedule: Object.fromEntries(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    .map(d => [d, { enabled: true, minutes: 45 }])),
  randomizeMealTypes: false, randomizePool: [], prepSchedule: { type: 'daily' },
  prioritizeMyRecipes: false, skipIngredients: [], preferredSides: [], avoidedSides: [],
  cookingTechniques: [], vacations: [], staples: [], units: 'us', weekStartDay: 1,
};

const hits = [];
function scan(where, text, meal) {
  if (!text) return;
  for (const re of DIRECT) if (re.test(text)) hits.push({ severity: 'DIRECT', where, meal, match: text.match(re)[0], text: String(text).slice(0, 120) });
  for (const re of HIDDEN) if (re.test(text)) hits.push({ severity: 'HIDDEN', where, meal, match: text.match(re)[0], text: String(text).slice(0, 120) });
}

const { generateMenu, generateMealRecipe } = await import('../lib/claude.ts');

let mealCount = 0, recipeCount = 0;
for (let i = 0; i < N; i++) {
  process.stdout.write(`menu ${i + 1}/${N} … `);
  let menu;
  try {
    menu = await generateMenu(settings, [], [], [], [], process.env.ANTHROPIC_API_KEY, [], [], [], []);
  } catch (e) {
    console.log(`FAILED: ${e.message}`); continue;
  }
  const meals = (menu.meals || []).filter(m => !m.isLeftover);
  mealCount += meals.length;
  for (const m of meals) {
    scan('name', m.name, m.name);
    scan('description', m.description, m.name);
    scan('tags', (m.tags || []).join(' '), m.name);
    for (const ing of (m.ingredients || [])) scan('menu-ingredient', `${ing.amount} ${ing.item}`, m.name);
  }
  // Full recipes for the two riskiest-looking meals per menu (Asian/Thai leaning),
  // else the first two, since the menu itself carries no ingredient list.
  const risky = meals.filter(m => /thai|asian|chinese|vietnamese|indonesian|noodle|stir.?fry|curry/i.test(`${m.name} ${m.cuisine} ${m.description}`));
  const toDeepen = (risky.length ? risky : meals).slice(0, 2);
  for (const m of toDeepen) {
    try {
      const r = await generateMealRecipe(process.env.ANTHROPIC_API_KEY, m, settings.familySize,
                                         { type: 'daily' }, 'English', 'us');
      recipeCount++;
      for (const ing of (r.ingredients || [])) scan('RECIPE-ingredient', `${ing.amount} ${ing.item}`, m.name);
      for (const step of (r.instructions || [])) scan('recipe-step', step, m.name);
    } catch (e) { console.log(`  (recipe failed for ${m.name}: ${e.message})`); }
  }
  console.log(`${meals.length} meals`);
}

console.log(`\n${'='.repeat(64)}`);
console.log(`allergen tested : ${ALLERGEN}`);
console.log(`menus generated : ${N}`);
console.log(`meals scanned   : ${mealCount}`);
console.log(`full recipes    : ${recipeCount}`);
console.log(`${'='.repeat(64)}`);
if (!hits.length) {
  console.log('\nNO HITS — allergen absent from every name, description, tag, ingredient and step.');
} else {
  console.log(`\n${hits.length} HIT(S):\n`);
  for (const h of hits) console.log(`  [${h.severity}] ${h.where} · ${h.meal}\n      matched "${h.match}" in: ${h.text}`);
}
