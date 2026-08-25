// The check-in's value is entirely in whether it says something specific. These
// assert the branch that matters most: a household that did nothing gets the
// silent variant, and never gets tuning questions.
import { createClient } from '@supabase/supabase-js';
import { analyseWeekOne } from '../lib/week-one.ts';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });

let bad = 0;
const t = (n, ok, x='') => { console.log(`  ${ok ? '✓' : '✗'} ${n}${ok ? '' : ` — ${x}`}`); if (!ok) bad++; };

console.log('  Across every real household:\n');
let silent = 0, tuned = 0, none = 0;
for (const u of users) {
  const w = await analyseWeekOne(u.id);
  if (!w) { none++; continue; }
  if (w.silent) silent++; else tuned++;
  const age = ((Date.now() - new Date(w.firstMenuAt)) / 86400000).toFixed(0);
  console.log(`    ${(u.email||'?').padEnd(28)} ${w.silent ? 'SILENT ' : `${w.questions.length} question(s)`}  ` +
              `first menu ${age}d ago  ${w.suggestion ? `→ ${w.suggestion.title}` : '→ no suggestion'}`);
  for (const q of w.questions) console.log(`        · ${q.observation}  ${q.question}`);
  t(`  ${u.email}: never both silent and questioning`, !(w.silent && w.questions.length), 'silent variant must carry no tuning');
  t(`  ${u.email}: at most three questions`, w.questions.length <= 3, `${w.questions.length}`);
}
console.log(`\n  ${silent} silent · ${tuned} with questions · ${none} never generated a menu`);
console.log(`  ${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad ? 1 : 0);
