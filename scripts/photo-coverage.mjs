#!/usr/bin/env node
/**
 * How many meals, across every household's menus, are actually showing an
 * illustration — and what's missing and why.
 *
 * Written because "it should work" is not a thing anyone should have to accept
 * about a pipeline that has now failed three different ways.
 */
import { createClient } from '@supabase/supabase-js';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: lib } = await db.from('global_recipes').select('name, photo_url');
const haveArt = new Map((lib || []).filter(r => r.photo_url).map(r => [r.name.toLowerCase().trim(), r.photo_url]));
console.log(`  library: ${haveArt.size} of ${(lib || []).length} recipes illustrated\n`);

const { data: menus } = await db.from('menus').select('id, week_start, data').order('week_start', { ascending: false });
const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
void users;

let total = 0, withArt = 0;
const healable = [], orphans = [];
for (const m of menus || []) {
  for (const meal of m.data?.meals || []) {
    if (!meal || meal.isLeftover) continue;
    total++;
    if (meal.photo_url) { withArt++; continue; }
    (haveArt.has((meal.name || '').toLowerCase().trim()) ? healable : orphans).push(`${m.week_start}  ${meal.name}`);
  }
}
const pct = total ? Math.round((withArt / total) * 100) : 0;
console.log(`  menus: ${withArt}/${total} meals illustrated (${pct}%)`);
console.log(`    ${healable.length} will self-heal on next open (library has the art)`);
console.log(`    ${orphans.length} have no art anywhere — these need generating`);
if (healable.length) console.log('\n  self-healing:\n' + healable.map(x => `    ${x}`).join('\n'));
if (orphans.length) console.log('\n  no art in the library:\n' + orphans.map(x => `    ${x}`).join('\n'));
