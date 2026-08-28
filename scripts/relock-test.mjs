// The delay parse has one trap worth pinning down: "Immediately" is 0, and 0 is
// falsy — a `|| DEFAULT` fallback would silently turn it into two minutes, so
// someone who picked the strictest setting would get the loosest behaviour.
const DEFAULT = 2 * 60_000;
const parse = raw => {
  if (raw == null || raw.trim() === '') return DEFAULT;
  const n = Number(raw);
  return Number.isFinite(n) ? n : DEFAULT;
};
let bad = 0;
const t = (n, got, want) => { const ok = got === want; console.log(`  ${ok ? '✓' : '✗'} ${n.padEnd(46)} ${got}`); if (!ok) bad++; };
t('never set → default two minutes', parse(null), DEFAULT);
t('"Immediately" (0) stays 0, not the default', parse('0'), 0);
t('one minute', parse('60000'), 60000);
t('an hour', parse('3600000'), 3600000);
t('corrupt value falls back to the default', parse('banana'), DEFAULT);
t('empty string falls back rather than becoming 0', parse(''), DEFAULT);
console.log(`\n  ${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad ? 1 : 0);
