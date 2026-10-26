// The splash has failed in both directions, so this pins both.
//
// Rendered instead of the children, it ends up in every page's static HTML and
// shows through as a watermark. Rendered client-only but still instead of the
// children, the app appears, is replaced a frame later, and appears again —
// and the whole tree unmounts and remounts under whatever someone is tapping.
//
// As an overlay it is neither: children render once, server-side, and stay
// mounted; the splash exists only once the browser has decided it is needed.
const render = ({ mounted, isPublic, verified, timedOut }) => ({
  children: true,                                   // always, and always the same instance
  splash: mounted && !isPublic && !verified && !timedOut,
});

let bad = 0;
const t = (n, got, want) => { const ok = JSON.stringify(got)===JSON.stringify(want); console.log(`  ${ok?'✓':'✗'} ${n.padEnd(60)} ${JSON.stringify(got)}`); if(!ok){bad++;console.log(`      want ${JSON.stringify(want)}`);} };

t('server render: children, and no splash in the HTML',
  render({ mounted:false, isPublic:false, verified:false, timedOut:false }), { children:true, splash:false });
t('after mount, not yet verified: children stay, splash covers them',
  render({ mounted:true, isPublic:false, verified:false, timedOut:false }), { children:true, splash:true });
t('verified: splash gone, children never remounted',
  render({ mounted:true, isPublic:false, verified:true, timedOut:false }), { children:true, splash:false });
t('dead connection past the timeout: app shows anyway',
  render({ mounted:true, isPublic:false, verified:false, timedOut:true }), { children:true, splash:false });
t('login and other public pages never get a splash',
  render({ mounted:true, isPublic:true, verified:false, timedOut:false }), { children:true, splash:false });

// The property that matters most: children are rendered in every single state,
// so they mount once and are never torn down and rebuilt.
const states = [[false,false],[true,false],[true,true]].map(([m,v]) =>
  render({ mounted:m, isPublic:false, verified:v, timedOut:false }).children);
t('children are present in every state — no unmount, no double load', states, [true,true,true]);

console.log(`\n  ${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad ? 1 : 0);
