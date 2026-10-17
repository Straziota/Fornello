// What the Sunday cron does when a week already has a menu.
//
// This protects work someone did by hand. saveMenu keys on week_start and
// UPDATES a matching row, so without the guard the cron regenerates over a menu
// a household built themselves — swaps, replacements and all — and emails the
// replacement as if it were theirs.
import { targetWeekStart } from '../lib/week-start.ts';

const decide = (existing) =>
  !existing ? 'generate'
  : existing.auto_planned ? 'skip'
  : 'email theirs';

let bad = 0;
const t = (n, got, want) => { const ok = got === want; console.log(`  ${ok ? '✓' : '✗'} ${n.padEnd(58)} ${got}`); if (!ok) bad++; };

t('no menu for that week → generate one', decide(null), 'generate');
t('household made it themselves → email theirs, do not regenerate',
  decide({ auto_planned: false }), 'email theirs');
t('Fornello already sent that week → skip, never send twice',
  decide({ auto_planned: true }), 'skip');

// The other half: planning early has to land on the SAME week the cron targets,
// or the guard never fires and both menus exist side by side.
const d = s => new Date(s + 'T12:00:00');
t('Fri before a Monday week → same week the Sunday cron targets',
  targetWeekStart(1, d('2026-10-16')), targetWeekStart(1, d('2026-10-18')));
t('Sat before → same week', targetWeekStart(1, d('2026-10-17')), targetWeekStart(1, d('2026-10-18')));
t('Thu before → still THIS week, so Sunday plans the next one separately',
  targetWeekStart(1, d('2026-10-15')) === targetWeekStart(1, d('2026-10-18')), false);

console.log(`\n  ${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad ? 1 : 0);
