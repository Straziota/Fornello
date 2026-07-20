// One-time backfill: rewrite each recipe's prep_ahead steps so they state the
// quantity of each ingredient, taken from the ingredient list. Uses Claude Haiku
// to map short prep references ("the onion") to the full listed amount.
//
// Usage (run from project root):
//   node scripts/backfill-prep-quantities.mjs latest          # dry-run, newest menu
//   node scripts/backfill-prep-quantities.mjs latest --write   # write newest menu
//   node scripts/backfill-prep-quantities.mjs menus  --write   # all menus
//   node scripts/backfill-prep-quantities.mjs global --write   # global_recipes
//   node scripts/backfill-prep-quantities.mjs user   --write   # user_recipes
//
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')];
  }),
);

const { createClient } = await import('@supabase/supabase-js');
const Anthropic = (await import('@anthropic-ai/sdk')).default;
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ai = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const scope = process.argv[2] || 'latest';
const WRITE = process.argv.includes('--write');

function fmtIng(ingredients) {
  return (ingredients || [])
    .filter(i => i && i.item)
    .map(i => `- ${(i.amount || '').trim()} ${String(i.item).trim()}`.trim())
    .join('\n');
}

async function rewritePrep(ingredients, prep) {
  const steps = (prep || []).filter(s => typeof s === 'string' && s.trim());
  if (!steps.length || !(ingredients || []).length) return prep || [];

  const prompt = `You are editing a recipe's make-ahead prep steps so each step states the QUANTITY of every ingredient it prepares, using the exact amounts from the ingredient list.

Rules:
- Return EXACTLY ${steps.length} steps, in the same order. Do NOT add, remove, merge, or split steps.
- Keep each step's action, meaning, and language. Only insert the ingredient quantities.
- Use the amount from the ingredient list for each ingredient mentioned (e.g. ingredient "1 medium yellow onion" -> "1 medium yellow onion"; "3 garlic cloves" -> "3 garlic cloves").
- If a step prepares something not tied to a listed ingredient (e.g. "warm the broth" when broth isn't listed), leave that part unchanged.
- No timing labels or day-name prefixes.

Ingredient list (amount — item):
${fmtIng(ingredients)}

Prep steps:
${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Return ONLY a JSON array of ${steps.length} strings (the rewritten steps), nothing else.`;

  const msg = await ai.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return prep;
  let arr;
  try { arr = JSON.parse(m[0]); } catch { return prep; }
  if (!Array.isArray(arr) || arr.length !== steps.length || !arr.every(s => typeof s === 'string')) {
    console.log('   ⚠ length/shape mismatch — keeping original');
    return prep;
  }
  return arr;
}

function show(name, before, after) {
  console.log(`\n• ${name}`);
  before.forEach((b, i) => {
    const a = after[i];
    if (a === b) console.log(`    = ${b}`);
    else console.log(`    - ${b}\n    + ${a}`);
  });
}

async function processMeals(meals) {
  let changed = false;
  for (const meal of meals) {
    if (!Array.isArray(meal.prep_ahead) || !meal.prep_ahead.length) continue;
    if (!Array.isArray(meal.ingredients) || !meal.ingredients.length) continue;
    const before = meal.prep_ahead;
    const after = await rewritePrep(meal.ingredients, before);
    show(meal.name, before, after);
    if (JSON.stringify(before) !== JSON.stringify(after)) { meal.prep_ahead = after; changed = true; }
  }
  return changed;
}

async function backfillMenus(onlyLatest) {
  let q = sb.from('menus').select('id,created_at,data').order('created_at', { ascending: false });
  if (onlyLatest) q = q.limit(1);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  for (const row of data) {
    console.log(`\n================ MENU ${row.id} (${row.created_at}) ================`);
    const menu = row.data;
    const changed = await processMeals(menu.meals || []);
    if (changed && WRITE) {
      const { error: e2 } = await sb.from('menus').update({ data: menu }).eq('id', row.id);
      console.log(e2 ? `   ✗ write failed: ${e2.message}` : '   ✓ written');
    }
  }
}

async function backfillTable(table) {
  const { data, error } = await sb.from(table).select('*');
  if (error) throw new Error(error.message);
  for (const row of data) {
    if (!Array.isArray(row.prep_ahead) || !row.prep_ahead.length) continue;
    if (!Array.isArray(row.ingredients) || !row.ingredients.length) continue;
    const after = await rewritePrep(row.ingredients, row.prep_ahead);
    show(`[${table}] ${row.name}`, row.prep_ahead, after);
    if (JSON.stringify(row.prep_ahead) !== JSON.stringify(after) && WRITE) {
      const { error: e2 } = await sb.from(table).update({ prep_ahead: after }).eq('id', row.id);
      console.log(e2 ? `   ✗ write failed: ${e2.message}` : '   ✓ written');
    }
  }
}

console.log(`scope=${scope} mode=${WRITE ? 'WRITE' : 'DRY-RUN'}`);
if (scope === 'latest') await backfillMenus(true);
else if (scope === 'menus') await backfillMenus(false);
else if (scope === 'global') await backfillTable('global_recipes');
else if (scope === 'user') await backfillTable('user_recipes');
else { console.log('unknown scope'); process.exit(1); }
console.log('\nDone.');
