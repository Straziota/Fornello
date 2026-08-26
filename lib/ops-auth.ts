import type { NextRequest } from 'next/server';

/**
 * Authorises a maintenance route.
 *
 * Accepts the cron secret OR the service-role key. Two secrets rather than one
 * because these routes serve two callers with different access: Vercel's
 * scheduler, which is handed CRON_SECRET automatically, and a maintainer at a
 * terminal, who has the service-role key in .env.local but cannot read
 * CRON_SECRET — `vercel env pull` returns an empty string for encrypted values.
 *
 * The service-role key already grants unrestricted database access, so
 * accepting it here widens nothing: anyone holding it can do everything these
 * routes do, and more, directly.
 */
export function authorizeOps(req: NextRequest): boolean {
  const header = req.headers.get('authorization') || '';
  const allowed = [process.env.CRON_SECRET, process.env.SUPABASE_SERVICE_ROLE_KEY]
    .filter((s): s is string => Boolean(s));
  return allowed.some(secret => header === `Bearer ${secret}`);
}
