// Who the check-in would actually reach, and in which shape. Read-only.
import { createClient } from '@supabase/supabase-js';
import { analyseWeekOne } from '../lib/week-one.ts';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });
const { data: rows } = await db.from('settings').select('user_id, week_one_checkin_sent_at');
const sent = new Set((rows || []).filter(r => r.week_one_checkin_sent_at).map(r => r.user_id));

const inWindow = [], missed = [], tooEarly = [];
for (const u of users) {
  if (sent.has(u.id)) continue;
  const w = await analyseWeekOne(u.id);
  if (!w) continue;
  const days = (Date.now() - new Date(w.firstMenuAt)) / 86400000;
  const row = `${(u.email||'?').padEnd(28)} ${days.toFixed(0).padStart(3)}d  ${w.silent ? 'SILENT' : `${w.questions.length}q`}`;
  if (days < 7) tooEarly.push(row);
  else if (days > 21) missed.push(row);
  else if (!w.silent && !w.questions.length) missed.push(row + '  (nothing observed — skipped)');
  else inWindow.push(row);
}
console.log(`\n  WOULD SEND NOW (${inWindow.length}):`);   inWindow.forEach(r => console.log('    ' + r));
console.log(`\n  not yet, will qualify later (${tooEarly.length}):`); tooEarly.forEach(r => console.log('    ' + r));
console.log(`\n  past the window, never sent (${missed.length}):`);   missed.forEach(r => console.log('    ' + r));
