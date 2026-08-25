import { offerFromReplacement, offerFromSkip, applyOffer } from '../lib/day-offers.ts';
let bad = 0;
const t = (name, ok, extra='') => { console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — ${extra}`}`); if (!ok) bad++; };
const meal = (o = {}) => ({ day: 'Thursday', name: 'Something', total_time: '45 min', tags: [], ...o });
const sched = { Thursday: { enabled: true, minutes: 60 }, Monday: { enabled: true, minutes: 45 } };

// Fires when the signal is real
const quick = offerFromReplacement('Thursday', meal({ total_time: '55 min' }), meal({ total_time: '25 min' }), sched, {});
t('offers a shorter standing time after a much quicker swap', quick?.kind === 'minutes' && quick.value === 30, JSON.stringify(quick));

const slow = offerFromReplacement('Monday', { ...meal({ day: 'Monday' }) }, meal({ day: 'Monday', name: 'Slow-Cooker Beef Ragu' }), sched, {});
t('offers a standing technique after a slow-cooker swap', slow?.kind === 'technique' && slow.value === 'Slow Cooker', JSON.stringify(slow));

// Stays quiet when it isn't
t('silent on an ordinary same-length swap',
  offerFromReplacement('Thursday', meal({ total_time: '45 min' }), meal({ total_time: '42 min' }), sched, {}) === null);
t('silent when the swap is SLOWER',
  offerFromReplacement('Thursday', meal({ total_time: '30 min' }), meal({ total_time: '50 min' }), sched, {}) === null);
t('silent when already declined',
  offerFromReplacement('Thursday', meal({ total_time: '55 min' }), meal({ total_time: '25 min' }), sched, { 'Thursday:minutes': 'declined' }) === null);
t('silent when already accepted (no nagging after yes)',
  offerFromReplacement('Thursday', meal({ total_time: '55 min' }), meal({ total_time: '25 min' }), sched, { 'Thursday:minutes': 'accepted' }) === null);
t('silent when the technique is already the standing setting',
  offerFromReplacement('Monday', meal({ day: 'Monday' }), meal({ day: 'Monday', name: 'Slow Cooker Stew' }),
    { Monday: { enabled: true, minutes: 45, technique: 'Slow Cooker' } }, {}) === null);
t('technique wins over time when both apply',
  offerFromReplacement('Monday', meal({ day: 'Monday', total_time: '60 min' }),
    meal({ day: 'Monday', name: 'Air Fryer Chicken', total_time: '20 min' }), sched, {})?.kind === 'technique');

// Skip
t('offers to stop planning a skipped day', offerFromSkip('Wednesday', sched, {})?.kind === 'skip');
t('silent when the day is already off',
  offerFromSkip('Wednesday', { Wednesday: { enabled: false, minutes: 45 } }, {}) === null);

// Writes
t('accepting minutes writes the band', applyOffer(sched, quick).Thursday.minutes === 30);
t('accepting technique writes it', applyOffer(sched, slow).Monday.technique === 'Slow Cooker');
t('accepting skip disables the day', applyOffer(sched, offerFromSkip('Wednesday', sched, {})).Wednesday.enabled === false);
t('accepting never disturbs other days', applyOffer(sched, quick).Monday.minutes === 45);

console.log(`\n  ${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad ? 1 : 0);
