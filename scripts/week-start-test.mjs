import { targetWeekStart } from '../lib/week-start.ts';
let bad = 0;
const t = (n, got, want) => { const ok = got === want; console.log(`  ${ok ? '✓' : '✗'} ${n.padEnd(52)} ${got}${ok ? '' : `  (want ${want})`}`); if (!ok) bad++; };
const d = s => new Date(s + 'T12:00:00');
// Week of Mon 24 Aug 2026. Monday-start household.
t('Mon 24 Aug → this week',            targetWeekStart(1, d('2026-08-24')), '2026-08-24');
t('Tue 25 Aug → this week',            targetWeekStart(1, d('2026-08-25')), '2026-08-24');
t('Thu 27 Aug → this week (last day of "now")', targetWeekStart(1, d('2026-08-27')), '2026-08-24');
t('Fri 28 Aug → NEXT week',            targetWeekStart(1, d('2026-08-28')), '2026-08-31');
t('Sat 29 Aug → next week',            targetWeekStart(1, d('2026-08-29')), '2026-08-31');
t('Sun 30 Aug → next week (cron day)', targetWeekStart(1, d('2026-08-30')), '2026-08-31');
t('first menu ever on a Saturday → THIS week', targetWeekStart(1, d('2026-08-29'), { firstEver: true }), '2026-08-24');
t('first menu ever on a Sunday → this week',   targetWeekStart(1, d('2026-08-30'), { firstEver: true }), '2026-08-24');
// Sunday-start household: their Friday is Thursday-equivalent, cutoff shifts with them.
t('Sunday-start, Thu 27 Aug → NEXT week', targetWeekStart(0, d('2026-08-27')), '2026-08-30');
t('Sunday-start, Wed 26 Aug → this week', targetWeekStart(0, d('2026-08-26')), '2026-08-23');
console.log(`\n  ${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad ? 1 : 0);
