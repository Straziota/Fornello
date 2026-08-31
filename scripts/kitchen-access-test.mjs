// Who can open a Kitchen. These are the assertions that matter most in the whole
// codebase: a wrong answer here shows a family's private recipes to a stranger.
const access = (profile, user, member) => {
  if (user && profile.owner_id === user.id) return 'owner';
  if (profile.visibility === 'public') return 'view';
  if (!user?.email) return null;
  if (!member || member.revoked_at) return null;
  return member.role;
};
const canRead = a => a !== null;
const canAdd = a => a === 'owner' || a === 'add';
const canEdit = (a, recipe, userId) =>
  a === 'owner' ? true : !canAdd(a) ? false : Boolean(recipe.contributed_by && recipe.contributed_by === userId);

let bad = 0;
const t = (n, got, want) => { const ok = got === want; console.log(`  ${ok ? '✓' : '✗'} ${n.padEnd(58)} ${String(got)}`); if (!ok) bad++; };

const PRIVATE = { id: 'k1', owner_id: 'owner', visibility: 'private' };
const PUBLIC  = { id: 'k2', owner_id: 'owner', visibility: 'public' };
const OWNER = { id: 'owner', email: 'owner@x.com' };
const GUEST = { id: 'guest', email: 'aunt@x.com' };
const VIEWER = { role: 'view', revoked_at: null };
const ADDER  = { role: 'add',  revoked_at: null };

t('owner opens their own private Kitchen', canRead(access(PRIVATE, OWNER, null)), true);
t('a stranger cannot open a private Kitchen', canRead(access(PRIVATE, GUEST, null)), false);
t('a signed-out visitor cannot open a private Kitchen', canRead(access(PRIVATE, null, null)), false);
t('an invited viewer can open it', canRead(access(PRIVATE, GUEST, VIEWER)), true);
t('a REVOKED member cannot, even mid-session',
  canRead(access(PRIVATE, GUEST, { role: 'add', revoked_at: '2026-08-31' })), false);
t('anyone signed in can open a public Kitchen', canRead(access(PUBLIC, GUEST, null)), true);

t('a viewer cannot add recipes', canAdd(access(PRIVATE, GUEST, VIEWER)), false);
t('a contributor can add recipes', canAdd(access(PRIVATE, GUEST, ADDER)), true);
t('a public Kitchen does not make strangers contributors', canAdd(access(PUBLIC, GUEST, null)), false);

const mine = { contributed_by: 'guest' }, theirs = { contributed_by: 'someone-else' };
t('a contributor may edit their own recipe', canEdit(access(PRIVATE, GUEST, ADDER), mine, 'guest'), true);
t('a contributor may NOT edit another persons recipe', canEdit(access(PRIVATE, GUEST, ADDER), theirs, 'guest'), false);
t('the owner may edit anything', canEdit(access(PRIVATE, OWNER, null), theirs, 'owner'), true);
t('a viewer may not edit even their own', canEdit(access(PRIVATE, GUEST, VIEWER), mine, 'guest'), false);
t('a member downgraded to view may no longer edit what they added',
  canEdit(access(PRIVATE, GUEST, VIEWER), mine, 'guest'), false);
t('a removed member may not edit what they contributed',
  canEdit(access(PRIVATE, GUEST, { role: 'add', revoked_at: 'x' }), mine, 'guest'), false);

console.log(`\n  ${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad ? 1 : 0);
