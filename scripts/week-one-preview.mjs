// Who the check-in would actually reach, and in which shape. Read-only.
import { createClient } from '@supabase/supabase-js';
import { analyseWeekOne } from '../lib/week-one.ts';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });
const { data: rows } = await db.from('settings').select('user_id, week_one_checkin_sent_at');
const sent = new Set((rows || []).filter(r => r.week_one_checkin_sent_at).map(r => r.user_id));

const weekOne = [], longSilent = [], questions = [], skipped = [], tooEarly = [];
for (const u of users) {
  if (sent.has(u.id)) continue;
  const w = await analyseWeekOne(u.id);
  if (!w) continue;
  const days = (Date.now() - new Date(w.firstMenuAt)) / 86400000;
  const row = `${(u.email||'?').padEnd(28)} ${days.toFixed(0).padStart(3)}d`;
  if (days < 7) tooEarly.push(row);
  else if (w.silent && days <= 21) weekOne.push(row);
  else if (w.silent) longSilent.push(row);
  else if (days > 21) skipped.push(row + '  (used it and moved on)');
  else if (!w.questions.length) skipped.push(row + '  (nothing observed)');
  else questions.push(row);
}
const show = (label, rows) => { console.log(`\n  ${label} (${rows.length}):`); rows.forEach(r => console.log('    ' + r)); };
show('"How was your first week?"', weekOne);
show('"Fornello"  — long-silent', longSilent);
show('questions + suggestion', questions);
show('not yet, will qualify later', tooEarly);
show('never sent', skipped);
