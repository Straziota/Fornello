import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
// Note: middleware cannot use next/headers, so we use createServerClient directly here

const PUBLIC_PATHS = ['/login', '/signup', '/api/auth', '/api/client-error', '/privacy', '/reset-password'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get('origin') || '';
  const isExtension = origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
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
  if (!user && !isPublic) {
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
