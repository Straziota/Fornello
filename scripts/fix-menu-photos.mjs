import { createClient } from '@supabase/supabase-js';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const DRY = !process.argv.includes('--go');

const { data: lib } = await db.from('global_recipes').select('name, photo_url').not('photo_url','is',null).neq('photo_url','');
const byName = new Map(lib.map(r => [r.name.toLowerCase().trim(), r.photo_url]));

const { data: menus } = await db.from('menus').select('id, user_id, week_start, data');
let fixed = 0, meals = 0;
for (const m of menus || []) {
  const ms = m.data?.meals; if (!Array.isArray(ms)) continue;
  let touched = false;
  for (const meal of ms) {
    if (meal.isLeftover || meal.photo_url) continue;
    const url = byName.get((meal.name || '').toLowerCase().trim());
    if (!url) continue;
    if (!DRY) meal.photo_url = url;
    console.log(`    week ${m.week_start}  ${meal.name}`);
    touched = true; meals++;
  }
  if (touched && !DRY) {
    const { error } = await db.from('menus').update({ data: m.data }).eq('id', m.id);
    if (error) console.log(`      FAILED: ${error.message}`); else fixed++;
  } else if (touched) fixed++;
}
console.log(`\n  ${meals} meal(s) across ${fixed} menu(s)${DRY ? '\n  dry run — pass --go' : ' — updated'}`);
