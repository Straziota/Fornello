// Builds the static bundle that ships inside the Capacitor iOS shell.
//
// Why a script instead of plain `next build`:
//
// A static export refuses any dynamic segment it can't enumerate at build time.
// The fix is `generateStaticParams()` plus a literal `dynamicParams = false` —
// but Next parses that literal statically, so it can't be an expression, and
// every one of these pages is a Client Component, which may not export
// generateStaticParams at all.
//
// Both problems vanish if the app build simply doesn't ship these routes, which
// is the truth anyway: they're addressed by an id that only exists at runtime,
// so there is no list to precompute. The app reaches them over the network.
//
// So each dynamic page is swapped for a server stub for the duration of the
// build and restored immediately after, even on failure. The website's own
// `next build` never sees any of this.

import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, renameSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const DYNAMIC_PAGES = [
  'app/admin/heritage/[id]/page.tsx',
  'app/admin/recipes/[id]/page.tsx',
  'app/family-kitchens/[slug]/page.tsx',
  'app/family-kitchens/[slug]/add/page.tsx',
  'app/heritage-kitchen/[slug]/page.tsx',
  'app/print/occasion/[id]/page.tsx',
  'app/recipes/[id]/page.tsx',
  'app/recipes/[id]/view/page.tsx',
];

// An empty generateStaticParams() is rejected — Next reports the page as
// "missing generateStaticParams()" — so each stub returns one throwaway param.
// That emits a single placeholder page per route, which the app never links to.
// The param name has to match the segment, so it's read off the path.
function stubFor(file) {
  const param = file.match(/\[([^\]]+)\]/)?.[1];
  if (!param) throw new Error(`No dynamic segment found in ${file}`);
  return `// GENERATED for the Capacitor build by scripts/build-app.mjs — never committed.
// This route is not part of the app bundle; the real page is restored the
// moment the build finishes.
export async function generateStaticParams() {
  return [{ ${param}: '_' }];
}

export const dynamicParams = false;

export default function NotInAppBundle() {
  return null;
}
`;
}

const backupOf = (file) => `${file}.orig`;

// A previous run that was killed mid-build would have left stubs in place.
// Restore before doing anything, so a crash is never destructive.
function restoreAll() {
  for (const file of DYNAMIC_PAGES) {
    const backup = backupOf(file);
    if (existsSync(backup)) {
      rmSync(file, { force: true });
      renameSync(backup, file);
    }
  }
}

restoreAll();

try {
  for (const file of DYNAMIC_PAGES) {
    if (!existsSync(file)) throw new Error(`${file} not found — update DYNAMIC_PAGES.`);
    // Move rather than copy, so the original is never merely overwritten.
    renameSync(file, backupOf(file));
    writeFileSync(file, stubFor(file));
  }

  execSync('next build', {
    stdio: 'inherit',
    env: { ...process.env, CAPACITOR_BUILD: '1' },
  });
} finally {
  restoreAll();
}
