// Put the preheat first in library recipes that already exist.
//
// The prompt rule and the repair only affect recipes generated from now on.
// These are already in households' menus.
import { createClient } from '@supabase/supabase-js';
import { needsPreheatFirst, ovenTemperature, withPreheatFirst } from '../lib/oven.ts';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const GO = process.argv.includes('--go');

const { data } = await db.from('global_recipes').select('id, name, instructions').not('instructions','is',null);
let fixed = 0, skipped = 0;
for (const r of data || []) {
  const steps = r.instructions || [];
  if (!needsPreheatFirst(steps)) continue;
  const temp = ovenTemperature(steps);
  if (!temp) { skipped++; console.log(`  SKIP (no temperature stated): ${r.name}`); continue; }
  const next = withPreheatFirst(steps);
  console.log(`  ${GO ? 'fixed' : 'would fix'}: ${r.name}  →  "${next[0]}"`);
  if (GO) {
    const { error } = await db.from('global_recipes').update({ instructions: next }).eq('id', r.id);
    if (error) console.log(`     FAILED: ${error.message}`);
  }
  fixed++;
}
console.log(`\n  ${fixed} fixable, ${skipped} left alone (no temperature to state)`);
console.log(GO ? '  written' : '  dry run — pass --go');
