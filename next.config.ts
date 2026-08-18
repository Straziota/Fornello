import type { NextConfig } from "next";

// Two builds come out of this one codebase.
//
//   npm run build          → the website, deployed to Vercel. Unchanged.
//   npm run build:app      → a static bundle for the Capacitor iOS shell.
//
// The app build is a pure static export, so everything needing a server is
// excluded: the 83 route handlers under app/api, and the proxy/middleware.
// Those stay on Vercel and the app calls them over the network — which is why
// requireUser() learned to accept a bearer token.
//
// pageExtensions is what does the excluding: API handlers are `route.ts`, and
// every page is `.tsx`, so dropping `ts` removes all of them at once without
// moving a single file. app/manifest.ts goes too, which is correct — a native
// app has no use for a web manifest.
const isAppBuild = process.env.CAPACITOR_BUILD === '1';

const nextConfig: NextConfig = isAppBuild
  ? {
      output: 'export',
      // Separate build dir so an app build never clobbers the website's .next.
      // Note: with output:'export' Next 16 writes the exported site into
      // distDir itself — there is no separate out/ directory.
      distDir: 'app-build',
      pageExtensions: ['tsx'],
      // Emits /me/index.html rather than /me.html — WKWebView serves the
      // bundle straight off the filesystem, where directory URLs are safer.
      trailingSlash: true,
      // The optimizing loader needs a server; there isn't one inside the app.
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
