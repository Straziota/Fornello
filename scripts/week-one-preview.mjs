// Who the check-in will reach, from the SAME selection the cron uses. Read-only
// apart from creating a settings row where one is missing, which the send would
// do anyway and which nothing else depends on.
import { weekOneRecipients } from '../lib/week-one-recipients.ts';
const { due, skipped } = await weekOneRecipients();

const SUBJECTS = {
  'week-one': '"How was your first week?"',
  'long-silent': '"Fornello" — long-silent',
  'questions': 'questions + suggestion',
};
for (const variant of Object.keys(SUBJECTS)) {
  const rows = due.filter(r => r.variant === variant);
  console.log(`\n  ${SUBJECTS[variant]} (${rows.length}):`);
  for (const r of rows) console.log(`    ${r.email.padEnd(28)} ${r.days.toFixed(0).padStart(3)}d`);
}
console.log(`\n  not sent (${skipped.length}):`);
for (const s of skipped) console.log(`    ${s.email.padEnd(28)} ${s.days.toFixed(0).padStart(3)}d  ${s.reason}`);
