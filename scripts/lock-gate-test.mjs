// When may the lock screen appear? The failure that prompted this was a lock
// screen shown to someone with no session — scan a face, get the login page,
// and a failed scan looks like the app refusing to let you log in.
const shouldLock = ({ native, enabled, session, msSinceActive, relockMs }) => {
  if (!native || !enabled) return false;
  if (!session) return false;
  return msSinceActive == null || msSinceActive > relockMs;
};
let bad = 0;
const t = (n, got, want) => { const ok = got === want; console.log(`  ${ok ? '✓' : '✗'} ${n.padEnd(56)} ${got}`); if (!ok) bad++; };
const B = { native: true, enabled: true, session: true, msSinceActive: 999_999, relockMs: 120_000 };

t('signed in, long away → locks',            shouldLock(B), true);
t('signed OUT → never locks',                shouldLock({ ...B, session: false }), false);
t('signed in, just used it → stays open',    shouldLock({ ...B, msSinceActive: 5_000 }), false);
t('lock turned off → never locks',           shouldLock({ ...B, enabled: false }), false);
t('on the web → never locks',                shouldLock({ ...B, native: false }), false);
t('"Immediately" (0ms) locks on any return', shouldLock({ ...B, msSinceActive: 1, relockMs: 0 }), true);
t('never active before → locks',             shouldLock({ ...B, msSinceActive: null }), true);
console.log(`\n  ${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad ? 1 : 0);
