#!/usr/bin/env node
/**
 * Both directions between cron routes and cron schedules.
 *
 * vercel.json was deleted in the commit that made the weekly email a daily
 * per-household send. The route was renamed at the same time, so the old
 * schedule pointed at a path that no longer existed AND the new path had no
 * schedule. Nothing errored: an unscheduled route is silent, and a schedule
 * pointing at nothing is a 404 nobody reads. The pipeline was complete and
 * unreachable for a fortnight.
 *
 * So this asserts both ways:
 *   every app/api/cron/<name>/route.ts has a schedule pointing at it
 *   every scheduled path resolves to a route that exists
 */
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const CRON_DIR = join(root, 'app/api/cron');
const problems = [];

const routes = existsSync(CRON_DIR)
  ? readdirSync(CRON_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && existsSync(join(CRON_DIR, d.name, 'route.ts')))
      .map(d => `/api/cron/${d.name}`)
  : [];

const configPath = ['vercel.json', 'vercel.ts'].map(f => join(root, f)).find(existsSync);
if (!configPath) {
  problems.push(`No vercel.json — ${routes.length} cron route(s) exist and NOTHING is scheduled to call them.`);
}

let crons = [];
if (configPath?.endsWith('.json')) {
  crons = JSON.parse(readFileSync(configPath, 'utf8')).crons || [];
} else if (configPath) {
  // vercel.ts is code, not data. Read the paths without executing it.
  crons = [...readFileSync(configPath, 'utf8').matchAll(/path:\s*['"`]([^'"`]+)['"`]/g)]
    .map(m => ({ path: m[1], schedule: '(vercel.ts)' }));
}

// Query strings are how these routes are armed — ?send=1 is the difference
// between a live mailer and a dry run — so compare paths without them.
const bare = p => p.split('?')[0].replace(/\/$/, '');
const scheduled = new Set(crons.map(c => bare(c.path)));

for (const r of routes) {
  if (!scheduled.has(r)) problems.push(`Route ${r}/route.ts exists but no schedule calls it.`);
}
for (const c of crons) {
  const p = bare(c.path);
  const file = join(root, 'app', p.replace(/^\/api/, 'api'), 'route.ts');
  if (!existsSync(file)) problems.push(`Schedule "${c.schedule}" points at ${c.path} — no route at ${file.replace(root, '')}.`);
}

if (problems.length) {
  console.error('\n  ✗ cron coverage\n' + problems.map(p => `    ${p}`).join('\n') + '\n');
  process.exit(1);
}
console.log(`  ✓ cron coverage — ${routes.length} route(s), ${crons.length} schedule(s), matched both ways`);
for (const c of crons) console.log(`      ${c.schedule.padEnd(14)} ${c.path}`);
