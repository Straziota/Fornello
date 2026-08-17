import { createServer } from './supabase-server';
import { createClient, type User } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { beginUsageContext, assertWithinQuota, QuotaExceededError } from './usage';

// Stateless client used only to validate `Authorization: Bearer <jwt>`.
// Built lazily so importing this module never requires env vars to be present.
let _tokenClient: ReturnType<typeof createClient> | null = null;
function tokenClient() {
  _tokenClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return _tokenClient;
}

/**
 * Resolve the caller from either auth scheme.
 *
 * The website authenticates with Supabase cookies. The iOS app can't: it runs
 * on capacitor://localhost and calls fornello.app, so the cookie is cross-site
 * and never sent. It carries the same Supabase session as a bearer token
 * instead. Bearer wins when both are present, so an app request is never
 * silently attributed to a stale cookie session on the same device.
 *
 * Both paths end at Supabase verifying the JWT signature — a bearer token is
 * exactly as trustworthy as the cookie, not a weaker side door.
 */
async function resolveUser(): Promise<User | null> {
  const authorization = (await headers()).get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    if (!token) return null;
    const { data, error } = await tokenClient().auth.getUser(token);
    if (error) return null;
    return data.user ?? null;
  }

  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

/**
 * Authenticate the caller.
 *
 * Pass `feature` from any route that goes on to call Claude. Doing so both
 * labels this request's spend in ai_usage and enforces the caller's monthly
 * allowance up front — so an out-of-allowance user is turned away before the
 * expensive call, not after. Routes that never touch Claude call it bare.
 */
export async function requireUser(feature?: string) {
  const user = await resolveUser();
  if (!user) return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  if (feature) {
    beginUsageContext(user.id, feature);
    try {
      await assertWithinQuota(user.id);
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        return {
          user: null,
          error: NextResponse.json(
            { error: e.message, quotaExceeded: true, plan: e.plan },
            { status: 429 }
          ),
        };
      }
      throw e;
    }
  }

  return { user, error: null };
}

export async function requireAdmin() {
  const { user, error } = await requireUser();
  if (error) return { ok: false, error };
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user!.email !== adminEmail) {
    return { ok: false, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, error: null };
}

export async function checkIsAdmin(): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;
  // resolveUser() so admin checks work from the app's bearer token too,
  // not just a browser cookie.
  const user = await resolveUser();
  return user?.email === adminEmail;
}

export function getAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Anthropic API key not configured on the server.');
  return key;
}

export function getPexelsKey(): string | undefined {
  return process.env.PEXELS_API_KEY || undefined;
}
