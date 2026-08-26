import { createClient } from '@supabase/supabase-js';
import { vesselFor } from '../lib/vessel.ts';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from('global_recipes').select('name, category, photo_url').order('name');

const missing = rows.filter(r => !r.photo_url);
const notSide = missing.filter(r => r.category !== 'side');
console.log(`  ${missing.length} library recipes without art — ${missing.length - notSide.length} are sides, ${notSide.length} are not`);
if (notSide.length) for (const r of notSide) console.log(`    NOT A SIDE: ${r.name}`);

// Which already-illustrated dishes WOULD now be drawn on a plate? Those were
// generated under the old rule, so they are the ones showing a composed meal
// lying in a cooking vessel.
const stale = rows.filter(r => r.photo_url && r.category !== 'side'
  && vesselFor({ name: r.name }).vessel === 'wide rimmed dinner plate');
console.log(`\n  illustrated under the old rule, now classed as composed plates: ${stale.length}`);
for (const r of stale) console.log(`    ${r.name}`);
