// The bug this replaces: a flag meaning "a check ran" was already true from the
// login page, so /this-week painted before its own check answered. Testing paths
// in isolation would not have caught it — only a sequence does.
//
// Each step is [path, settings, resolved]. A step with resolved=false is the
// frame after mount but before the fetch answers; resolved=true is the re-render
// its answer triggers. So state is applied first, then the paint is recorded.
const PUBLIC = ['/login','/signup','/privacy','/reset-password','/welcome','/offline'];
const isPublic = p => PUBLIC.some(x => (p || '').startsWith(x));

function run(steps) {
  let verified = false;               // survives navigation, as component state does
  const painted = [];
  for (const [path, settings, resolved] of steps) {
    if (!isPublic(path) && resolved) {
      if (!settings) verified = true;             // 401 — middleware handles it
      else if (settings.onboardedAt) verified = true;
      // not onboarded: redirect, verified deliberately left false
    }
    painted.push([path, (!isPublic(path) && !verified) ? 'splash' : 'app']);
  }
  return painted;
}

let bad = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (!ok) { bad++; console.log(`      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`); }
};

const NEW = { onboardedAt: null }, DONE = { onboardedAt: '2026-08-01' };

check('sign in → not onboarded: the app never paints',
  run([['/login', null, true], ['/this-week', NEW, false], ['/this-week', NEW, true], ['/welcome', NEW, true]]),
  [['/login','app'], ['/this-week','splash'], ['/this-week','splash'], ['/welcome','app']]);

check('sign in → already onboarded: one held frame, then through',
  run([['/login', null, true], ['/this-week', DONE, false], ['/this-week', DONE, true], ['/groceries', DONE, true]]),
  [['/login','app'], ['/this-week','splash'], ['/this-week','app'], ['/groceries','app']]);

check('signed out on a private path never hangs',
  run([['/this-week', null, false], ['/this-week', null, true], ['/login', null, true]]),
  [['/this-week','splash'], ['/this-week','app'], ['/login','app']]);

check('finishing onboarding lets the app through',
  run([['/welcome', NEW, true], ['/this-week', DONE, false], ['/this-week', DONE, true]]),
  [['/welcome','app'], ['/this-week','splash'], ['/this-week','app']]);

check('the old bug: login first does NOT pre-open the gate',
  run([['/login', null, true], ['/this-week', NEW, false]])[1],
  ['/this-week','splash']);

process.exit(bad ? 1 : 0);
