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

// ── Shrink the images before they are bundled ──────────────────────────────
//
// The website serves these through Next's image optimiser, so nobody ever
// downloads the originals. A static export has no optimiser: it copies public/
// verbatim, and public/ holds 4096x4096 PNGs — 10MB each — drawn at 112px in
// the navbar. The app shipped 268MB, of which 5.8MB was the application. iOS
// unpacks all of it before the WebView paints, which is why launch took half a
// minute of black screen.
//
// Only the copy inside app-build is touched; public/ keeps its originals
// because the website's optimiser works from them.
import sharp from 'sharp';
import { readdirSync, statSync } from 'node:fs';

const OUT = 'app-build';

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

if (existsSync(OUT)) {
  const mb = n => (n / 1024 / 1024).toFixed(1);
  let before = 0, after = 0;
  const renamed = [];

  for (const file of walk(OUT)) {
    if (!/\.(png|jpe?g)$/i.test(file) || file.includes('/_next/')) continue;
    const size = statSync(file).size;
    if (size < 150 * 1024) continue;
    before += size;

    const isBackground = file.includes('/backgrounds/');
    // Icons are watercolour cut-outs and need their alpha; backgrounds are
    // opaque photographs, where PNG is simply the wrong format — JPEG is four
    // times smaller at a quality nobody can distinguish behind text.
    const width = isBackground ? 1600 : 512;

    try {
      const img = sharp(file);
      const meta = await img.metadata();
      const resized = (meta.width || 0) > width
        ? img.resize({ width, withoutEnlargement: true })
        : img;

      if (isBackground && !meta.hasAlpha) {
        const buf = await resized.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
        const target = file.replace(/\.png$/i, '.jpg');
        writeFileSync(target, buf);
        if (target !== file) { rmSync(file, { force: true }); renamed.push([file, target]); }
        after += buf.length;
      } else {
        const buf = await resized.png({ compressionLevel: 9, palette: true }).toBuffer();
        writeFileSync(file, buf);
        after += buf.length;
      }
    } catch {
      after += size;   // a picture that will not convert still ships
    }
  }

  // Rewriting references rather than trusting content sniffing. A .png holding
  // JPEG bytes usually renders and occasionally does not, and a background that
  // silently fails is invisible until someone opens the page.
  if (renamed.length) {
    const swaps = renamed.map(([from, to]) => {
      const rel = f => f.slice(OUT.length);
      return [rel(from), rel(to)];
    });
    for (const file of walk(OUT)) {
      if (!/\.(html|js|json|css|txt)$/i.test(file)) continue;
      let text = readFileSync(file, 'utf8');
      let changed = false;
      for (const [from, to] of swaps) {
        // Filenames contain spaces, so both the raw and percent-encoded forms
        // appear in the built output.
        for (const [a, b] of [[from, to], [encodeURI(from), encodeURI(to)]]) {
          if (text.includes(a)) { text = text.split(a).join(b); changed = true; }
        }
      }
      if (changed) writeFileSync(file, text);
    }

    // Prove it: nothing may still point at a file that no longer exists.
    let dangling = 0;
    for (const file of walk(OUT)) {
      if (!/\.(html|js|css)$/i.test(file)) continue;
      const text = readFileSync(file, 'utf8');
      for (const [from] of swaps) {
        if (text.includes(from) || text.includes(encodeURI(from))) dangling++;
      }
    }
    if (dangling) throw new Error(`${dangling} reference(s) still point at converted images`);
  }

  console.log(`\n  images: ${mb(before)}MB -> ${mb(after)}MB (${renamed.length} converted to JPEG)`);
}
