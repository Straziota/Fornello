import { cache } from 'react';

/**
 * Per-request scratch space for usage attribution.
 *
 * React's cache() is memoised per request in the App Router, so calling this
 * anywhere inside one route handler returns the same mutable object. That lets
 * requireUser() record who is calling once, and lib/anthropic.ts read it back
 * on every Claude call, without threading a userId through the ~24 generate*
 * functions in lib/claude.ts that have no other use for it.
 *
 * Deliberately not AsyncLocalStorage.enterWith(): whether a store set inside an
 * awaited helper survives back into the caller's continuation is not guaranteed,
 * and silently losing the context here means silently losing spend tracking.
 */
export const requestUsageContext = cache(() => ({
  userId: null as string | null,
  feature: 'unknown',
}));
