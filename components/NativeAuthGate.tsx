'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/supabase';
import { isNativeApp } from '@/lib/native';

// Mirrors PUBLIC_PATHS in middleware.ts — the routes reachable with no session.
// /offline is here for the same reason it is there: it has to render when there
// is no network to check a session against.
const PUBLIC_PATHS = ['/login', '/signup', '/privacy', '/reset-password', '/offline'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Sends signed-out users to /login inside the native app.
 *
 * On the website middleware does this at the edge, before a page is ever sent.
 * A static export can't run middleware, so in the app the same decision has to
 * happen in the browser — otherwise an unauthenticated launch just sits on a
 * blank page while every API call comes back 401.
 *
 * Renders nothing and does nothing on the website: isNativeApp() is false
 * there, so the cookie/middleware path is left exactly as it was.
 */
export default function NativeAuthGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isNativeApp()) return;

    const supabase = createBrowser();
    let cancelled = false;

    const sendToLogin = () => {
      // replace(), not push() — a signed-out user should not be able to swipe
      // back into a page they were never allowed to see.
      if (!cancelled && !isPublic(pathname)) router.replace('/login');
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) sendToLogin();
    });

    // Covers signing out and an expired refresh token, not just launch.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) sendToLogin();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
