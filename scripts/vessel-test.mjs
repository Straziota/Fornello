import { config } from 'dotenv';
config({ path: '.env.local' });
const { vesselFor } = await import('../lib/vessel.ts');
const { createClient } = await import('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await db.from('menus').select('data');
const meals = data.flatMap(r => (r.data.meals || []).filter(m => !m.isLeftover));
const counts = {}; let dflt = 0;
for (const m of meals) {
  const v = vesselFor(m);
  counts[v.vessel] = (counts[v.vessel] || 0) + 1;
  if (v.reason === 'default') dflt++;
}
console.log(`meals: ${meals.length}   fell through to default: ${dflt} (${Math.round(dflt/meals.length*100)}%)\n`);
for (const [k, n] of Object.entries(counts).sort((a,b)=>b[1]-a[1])) console.log(`  ${String(n).padStart(3)}  ${k}`);
console.log('\nsample:');
for (const m of meals.slice(0, 10)) console.log(`  ${(m.name||'').slice(0,38).padEnd(38)} → ${vesselFor(m).vessel}`);
