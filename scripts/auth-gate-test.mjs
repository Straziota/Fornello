// When may the native app send someone to /login?
//
// The bug: the listener was rebuilt on every navigation, and onAuthStateChange
// fires INITIAL_SESSION the moment it is subscribed — with a null session,
// because storage has not been read yet. So every tap on a tile navigated
// correctly and was then thrown straight back to /login, which looks exactly
// like a link that does nothing.
const onEvent = (event, session, path, isPublic) => {
  if (event === 'INITIAL_SESSION') return 'ignore';
  if (session) return 'stay';
  return isPublic(path) ? 'stay' : 'redirect';
};
const isPublic = p => ['/login','/signup','/privacy','/reset-password','/offline']
  .some(x => p === x || p.startsWith(x + '/'));

let bad = 0;
const t = (n, got, want) => { const ok = got === want; console.log(`  ${ok?'✓':'✗'} ${n.padEnd(62)} ${got}`); if(!ok) bad++; };

t('INITIAL_SESSION with no session yet → ignored, never a redirect',
  onEvent('INITIAL_SESSION', null, '/this-week', isPublic), 'ignore');
t('navigating while signed in → stays put',
  onEvent('TOKEN_REFRESHED', { user: 1 }, '/groceries', isPublic), 'stay');
t('a real sign-out → redirected',
  onEvent('SIGNED_OUT', null, '/this-week', isPublic), 'redirect');
t('signed out already on /login → no redirect loop',
  onEvent('SIGNED_OUT', null, '/login', isPublic), 'stay');
t('expired token on a private page → redirected',
  onEvent('TOKEN_REFRESHED', null, '/recipes', isPublic), 'redirect');

// The property the whole bug came down to.
const navigations = ['/this-week', '/groceries', '/pantry', '/recipes'];
t('tapping four tiles in a row never redirects a signed-in household',
  navigations.every(p => onEvent('INITIAL_SESSION', null, p, isPublic) === 'ignore'), true);

console.log(`\n  ${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad ? 1 : 0);
