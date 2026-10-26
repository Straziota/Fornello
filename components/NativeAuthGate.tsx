'use client';
import { useEffect, useRef } from 'react';
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
 * A static export cannot run middleware, so in the app the same decision has to
 * happen in the browser — otherwise an unauthenticated launch sits on a blank
 * page while every API call comes back 401.
 *
 * Renders nothing and does nothing on the website.
 *
 * ── Why this subscribes exactly once ──────────────────────────────────────
 *
 * It used to depend on [pathname], so every navigation tore the listener down
 * and built a new one. onAuthStateChange fires INITIAL_SESSION the instant it
 * is subscribed, and that session is null for a moment while auth-js reads it
 * back from storage — so each navigation reported "signed out" and bounced the
 * household to /login. Tapping any tile on the home screen appeared to do
 * nothing, because the tap worked and the destination immediately threw them
 * out of it.
 *
 * So: subscribe once, read the current path from a ref, and never treat
 * INITIAL_SESSION as evidence of being signed out. Only an explicit SIGNED_OUT,
 * or a getSession() that has actually resolved, counts.
 */
export default function NativeAuthGate() {
  const router = useRouter();
  const pathname = usePathname();

  // Kept in a ref so the handler always sees the current path without the
  // subscription having to be rebuilt to learn it.
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    if (!isNativeApp()) return;

    const supabase = createBrowser();
    let cancelled = false;

    const sendToLogin = () => {
      // replace(), not push() — a signed-out user should not be able to swipe
      // back into a page they were never allowed to see.
      if (!cancelled && !isPublic(pathRef.current)) router.replace('/login');
    };

    // The authoritative check: this resolves only after storage has been read.
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) sendToLogin();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION is the subscription reporting what it found on the way
      // in, and it arrives with null before storage has been read. Acting on it
      // is what made navigation look broken. getSession() above covers the
      // genuine signed-out case.
      if (event === 'INITIAL_SESSION') return;
      if (!session) sendToLogin();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // Deliberately empty: one client, one subscription, for the lifetime of the
    // app. router is stable and pathname is read through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
