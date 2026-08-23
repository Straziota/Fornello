import { config } from 'dotenv';
config({ path: '.env.local' });
const { vesselFor } = await import('../lib/vessel.ts');
const { createClient } = await import('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await db.from('menus').select('week_start,data').order('week_start', { ascending: false });
const wk = data.find(r => (r.data.meals || []).filter(m => !m.isLeftover).length >= 7);
for (const m of wk.data.meals.filter(m => !m.isLeftover)) {
  const v = vesselFor(m);
  console.log(`${m.day}\t${m.name}\t${v.vessel}\t${v.finish}\t${v.reason}`);
}
