// The canonical public URL of the app.
//
// Always use this — never `window.location.origin` — when building links that
// leave the app (auth confirmation/reset emails, shared or printed content).
// Deriving those from the current host means a user who lands on a non-canonical
// domain (e.g. a *.vercel.app deployment URL) gets emails that point right back
// to that wrong domain, trapping them there. Anchoring to SITE_URL also gently
// pulls stray users back onto the real domain.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fornello.app';
