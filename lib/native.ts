// Running inside the Capacitor shell, the UI is served from capacitor://localhost
// while the API lives on fornello.app. Two things follow, and both are handled
// here rather than at 170 call sites:
//
//   1. A relative `fetch('/api/…')` would resolve against capacitor://localhost,
//      where nothing is listening. It has to be pointed at the real origin.
//   2. The Supabase cookie is cross-site from that origin and is never sent, so
//      the session travels as `Authorization: Bearer <jwt>` instead — the scheme
//      middleware.ts and requireUser() already accept.
//
// Patching fetch once keeps every existing call site working untouched, on the
// web and in the app alike.

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN?.replace(/\/$/, '') || 'https://www.fornello.app';

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return !!cap?.isNativePlatform?.();
}

let installed = false;

/**
 * Point relative /api calls at the live origin and attach the bearer token.
 *
 * No-op on the website, so the browser keeps using same-origin cookies exactly
 * as before. `getToken` is injected rather than imported so this module stays
 * free of a Supabase dependency.
 */
export function installNativeApiBridge(getToken: () => Promise<string | null>): void {
  if (installed || !isNativeApp()) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Only our own API is rewritten. Supabase, Pexels and friends already carry
    // absolute URLs and must be left alone.
    if (!url.startsWith('/api/')) return originalFetch(input as any, init);

    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    const token = await getToken();
    if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);

    return originalFetch(`${API_ORIGIN}${url}`, {
      ...init,
      headers,
      // The token is the credential here; sending cookies cross-site would only
      // trip CORS without adding anything.
      credentials: 'omit',
    });
  };
}
