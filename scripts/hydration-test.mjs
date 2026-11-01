// Anything that renders differently on the server and on the first client pass
// breaks hydration at the root — and when it does, React re-renders the tree and
// leaves the server markup behind: two complete copies of the app, one of them
// dead HTML with no handlers.
//
// isNativeApp() and localStorage are both false/empty at build time and real on
// the device, so neither may decide what renders until after mount.
const render = (c) => ({
  // children must be produced in EVERY state — hidden, never unmounted
  children: true,
  hidden: c.mounted && (c.locked || (c.checking && c.isNative && c.lockEnabled)),
});

let bad = 0;
const t = (n, got, want) => { const ok = JSON.stringify(got)===JSON.stringify(want); console.log(`  ${ok?'✓':'✗'} ${n.padEnd(58)} ${JSON.stringify(got)}`); if(!ok){bad++;console.log(`      want ${JSON.stringify(want)}`);} };

const server = render({ mounted:false, isNative:false, lockEnabled:false, checking:true, locked:false });
const clientFirst = render({ mounted:false, isNative:true, lockEnabled:true, checking:true, locked:false });
t('server and first client render are identical — hydration holds',
  JSON.stringify(server) === JSON.stringify(clientFirst), true);

t('after mount with the lock on, children are hidden not removed',
  render({ mounted:true, isNative:true, lockEnabled:true, checking:true, locked:false }), { children:true, hidden:true });
t('locked: still rendered, just hidden',
  render({ mounted:true, isNative:true, lockEnabled:true, checking:false, locked:true }), { children:true, hidden:true });
t('unlocked: visible',
  render({ mounted:true, isNative:true, lockEnabled:true, checking:false, locked:false }), { children:true, hidden:false });
t('on the web nothing is ever hidden',
  render({ mounted:true, isNative:false, lockEnabled:false, checking:false, locked:false }), { children:true, hidden:false });

const every = [
  render({ mounted:false, isNative:true, lockEnabled:true, checking:true, locked:false }).children,
  render({ mounted:true, isNative:true, lockEnabled:true, checking:true, locked:true }).children,
  render({ mounted:true, isNative:false, lockEnabled:false, checking:false, locked:false }).children,
];
t('children exist in every state — the tree is never torn down', every, [true,true,true]);

console.log(`\n  ${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad ? 1 : 0);
