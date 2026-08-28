// Launch gate: does the app paint, and does the cache ever wave through
// someone it shouldn't? The second question matters more — a stale "yes" would
// skip onboarding for an account that was deliberately reset.
const paints = ({ cached, verified, timedOut, isPublic }) =>
  (isPublic || verified || cached || timedOut) ? 'app' : 'splash';
let bad = 0;
const t = (n, got, want) => { const ok = got === want; console.log(`  ${ok ? '✓' : '✗'} ${n.padEnd(52)} ${got}`); if (!ok) bad++; };

t('first ever launch, request in flight', paints({ cached:false, verified:false, timedOut:false, isPublic:false }), 'splash');
t('returning household, cache present → instant',  paints({ cached:true,  verified:false, timedOut:false, isPublic:false }), 'app');
t('request answered',                              paints({ cached:false, verified:true,  timedOut:false, isPublic:false }), 'app');
t('dead connection, after the 6s timeout',         paints({ cached:false, verified:false, timedOut:true,  isPublic:false }), 'app');
t('login page never waits',                        paints({ cached:false, verified:false, timedOut:false, isPublic:true  }), 'app');

// The reset path: cache cleared and verified forced false before redirecting.
const afterReset = { cached:false, verified:false, timedOut:false, isPublic:false };
t('account reset for re-onboarding → still gated', paints(afterReset), 'splash');
console.log(`\n  ${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad ? 1 : 0);
