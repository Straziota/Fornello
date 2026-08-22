import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
// Note: middleware cannot use next/headers, so we use createServerClient directly here

// '/manifest.webmanifest' and '/sw.js' must be reachable while logged out:
// iOS fetches the manifest before there is any session, and a service worker
// redirected to /login registers the login page as the app shell.
const PUBLIC_PATHS = [
  '/login', '/signup', '/api/auth', '/api/client-error', '/privacy', '/reset-password',
  // Randlehub's read-only menu feed. It carries no Supabase session — it authenticates with a
  // shared token the route handler checks itself, and refuses to serve at all without one.
  '/api/hub-feed',
  '/manifest.webmanifest', '/sw.js',
  // Precached at install time, before any session exists — and it must render
  // rather than redirect when the network is gone.
  '/offline',
  // Reached from the weekly email by someone who is not logged in — that is the
  // entire point. Each authenticates itself with the household's email token,
  // which the route handler verifies; none will serve without one. A rating link
  // that demands a login is a rating that never happens, and an unsubscribe that
  // demands a login is not an unsubscribe.
  '/api/rate', '/rated', '/api/unsubscribe', '/unsubscribe',
  '/api/auto-plan/answer', '/answered', '/api/shop', '/shop', '/api/meal', '/meal',
];

// Origins belonging to our own first-party clients. The browser extension has
// used this path for a while; the iOS shell joins it — a Capacitor WKWebView
// serves the bundled UI from capacitor://localhost (ionic:// on older shells,
// http://localhost when run in the simulator against a dev server).
function isFirstPartyAppOrigin(origin: string): boolean {
  return (
    origin.startsWith('chrome-extension://') ||
    origin.startsWith('moz-extension://') ||
    origin === 'capacitor://localhost' ||
    origin === 'ionic://localhost' ||
    origin === 'http://localhost' ||
    /^http:\/\/localhost:\d+$/.test(origin)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get('origin') || '';
  const isExtension = isFirstPartyAppOrigin(origin);

  // The iOS app authenticates with `Authorization: Bearer <supabase jwt>`,
  // not cookies — cross-site cookies are never sent from capacitor://localhost.
  // Middleware can't cheaply verify a JWT signature at the edge, so it defers:
  // bearer-bearing API requests skip the cookie gate and the route handler's
  // requireUser() does the real verification. Nothing is trusted here, only
  // postponed to where it can be checked properly.
  const hasBearerToken = (req.headers.get('authorization') || '').startsWith('Bearer ');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      // Authorization is what the iOS app sends its Supabase session in.
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (isExtension) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
    } else {
      headers['Access-Control-Allow-Origin'] = '*';
    }
    return new NextResponse(null, { status: 204, headers });
  }

  let res = NextResponse.next({ request: req });
  if (isExtension) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login (except public paths)
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  const deferredToRouteHandler = hasBearerToken && pathname.startsWith('/api/');
  if (!user && !isPublic && !deferredToRouteHandler) {
    // For API requests, return 401 instead of redirecting (extensions can't follow redirects to HTML)
    if (pathname.startsWith('/api/')) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (isExtension) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Credentials'] = 'true';
      }
      return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from login/signup
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|otf|ico)$).*)'],
};
