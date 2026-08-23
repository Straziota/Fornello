import { config } from 'dotenv';
config({ path: '.env.local' });
const { normalizeRestrictions } = await import('../lib/normalize-restrictions.ts');
const { createClient } = await import('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: rows } = await db.from('settings').select('user_id,restrictions');
const { data: au } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
const email = Object.fromEntries(au.users.map(u => [u.id, u.email]));
for (const r of rows) {
  const cur = r.restrictions || [];
  if (!cur.length) continue;
  const out = await normalizeRestrictions(process.env.ANTHROPIC_API_KEY, cur);
  console.log(`${email[r.user_id]}`);
  console.log(`   from: ${JSON.stringify(cur)}`);
  console.log(`   to  : ${JSON.stringify(out.normalized)}   ${out.changed ? 'CHANGE' : 'no change'}`);
}
