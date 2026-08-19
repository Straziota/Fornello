import { createBrowserClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isNativeApp } from './native';

// One instance for the app, so every caller shares a session rather than
// spawning competing auth clients.
let nativeClient: SupabaseClient | null = null;

/**
 * Browser client — safe to use in client components.
 *
 * The website uses @supabase/ssr, which keeps the session in cookies so the
 * server can read it too. That is the right choice there and the wrong one in
 * the app: Capacitor serves the UI from capacitor://localhost, which is not an
 * http(s) origin, so document.cookie is inert. The session would be written to
 * a cookie that never persists, and every check after sign-in would look
 * signed out — sending the user straight back to the login screen.
 *
 * So the app stores its session in localStorage instead, which works under a
 * custom scheme. The token still travels to the API as a bearer header (see
 * lib/native.ts); nothing here depends on cookies crossing to fornello.app.
 */
export function createBrowser() {
  if (isNativeApp()) {
    nativeClient ??= createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storage: window.localStorage,
          // Password-reset links open in Safari, not the app, so there is
          // never a session to recover from the app's own URL.
          detectSessionInUrl: false,
        },
      }
    );
    return nativeClient;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
