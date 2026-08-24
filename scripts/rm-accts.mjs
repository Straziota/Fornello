import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TARGETS = ['straziotamd@gmail.com', 'randstraz@gmail.com', 'test@fornello.com'];

// Every table that carries a per-user column, with the column it uses. A first
// pass guessed the names and silently reported "no rows" for tables that don't
// exist and null for ones keyed differently — which would have looked exactly
// like an empty account. Verified against the owner's account first.
const OWNED = [
  ['settings','user_id'], ['menus','user_id'], ['pantry','user_id'], ['ai_usage','user_id'],
  ['user_recipes','user_id'], ['meal_feedback','user_id'], ['user_feedback','user_id'],
  ['special_occasions','user_id'], ['chef_questions','user_id'], ['recipe_overrides','user_id'],
  ['heritage_profiles','owner_id'], ['heritage_profile_recipes','owner_id'],
  ['heritage_submissions','user_id'], ['heritage_kitchens','owner_id'],
];

const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });
const hits = users.filter(u => TARGETS.includes((u.email || '').toLowerCase()));

async function tally(id) {
  const counts = {}, skipped = [];
  for (const [t, col] of OWNED) {
    const { count, error } = await db.from(t).select('*', { count: 'exact', head: true }).eq(col, id);
    if (error) { skipped.push(`${t}(${error.message || 'no such table/column'})`); continue; }
    if (count) counts[t] = count;
  }
  return { counts, skipped };
}

const control = await tally(users.find(u => u.email === 'straziota1980@yahoo.com').id);
console.log(`  control (owner): ${Object.entries(control.counts).map(([k,v])=>`${k}=${v}`).join(' ') || 'NOTHING — audit is broken'}`);
if (control.skipped.length) console.log(`  not checkable: ${control.skipped.join(', ')}`);
console.log();

const audit = [];
for (const u of hits) {
  const { counts } = await tally(u.id);
  audit.push({ email: u.email, id: u.id, created: u.created_at, lastSignIn: u.last_sign_in_at, rows: counts });
  console.log(`  ${u.email.padEnd(26)} last sign-in ${(u.last_sign_in_at||'never').slice(0,10)}   ${Object.entries(counts).map(([k,v])=>`${k}=${v}`).join(' ') || 'settings only'}`);
}
writeFileSync('/tmp/fornello-deleted-accounts.json', JSON.stringify(audit, null, 2));

if (!process.argv.includes('--go')) { console.log('\n  dry run — pass --go to delete'); process.exit(0); }
for (const u of hits) {
  const { error } = await db.auth.admin.deleteUser(u.id);
  console.log(error ? `  FAILED ${u.email}: ${error.message}` : `  deleted ${u.email}`);
}
