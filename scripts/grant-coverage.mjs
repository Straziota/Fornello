#!/usr/bin/env node
/**
 * Every migration that creates a table must also grant access to it.
 *
 * From 30 October 2026 Supabase stops granting Data API access automatically on
 * new tables. Fornello reaches every table through PostgREST with the service
 * key, so a CREATE TABLE with no GRANT produces a table the app cannot read.
 *
 * The failure is invisible until someone rebuilds the schema — a new project, a
 * preview branch, a local reset — because the live database still carries the
 * grants it was given automatically. By then the migration was written months
 * ago. This is cheap to check now and expensive to discover later.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'sql';
const problems = [];

for (const file of readdirSync(DIR).filter(f => f.endsWith('.sql'))) {
  const sql = readFileSync(join(DIR, file), 'utf8');
  // Strip comments, so a table name mentioned in prose is not mistaken for one
  // being created — and a grant written only in a comment does not count.
  const code = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  const created = [...code.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi)].map(m => m[1]);
  for (const table of created) {
    const granted = new RegExp(`grant[\\s\\S]*?on\\s+(?:public\\.)?${table}\\b[\\s\\S]*?to\\s+service_role`, 'i').test(code);
    if (!granted) problems.push(`${file}: creates "${table}" but never grants it to service_role`);
  }
}

if (problems.length) {
  console.error('\n  ✗ grant coverage\n' + problems.map(p => `    ${p}`).join('\n')
    + '\n\n    Add to that migration:\n'
    + '      grant select, insert, update, delete on public.<table> to service_role;\n');
  process.exit(1);
}
const n = readdirSync(DIR).filter(f => f.endsWith('.sql')).length;
console.log(`  ✓ grant coverage — every table created across ${n} migrations is granted`);
