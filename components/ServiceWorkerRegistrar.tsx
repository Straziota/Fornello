'use client';

import { useEffect } from 'react';

/**
 * Registers the offline service worker.
 *
 * Production only, on purpose: in dev the worker would cache Next's chunk URLs
 * and fight hot reload, producing "why is my change not showing" confusion that
 * looks like a bug in the app. To exercise offline behaviour locally, run
 * `npm run build && npm start` — a truer test of the shipped behaviour anyway.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => console.error('[sw] registration failed:', err));
    };

    // Registering during load competes with the page's own requests for
    // bandwidth on a phone; wait until the page is interactive.
    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}

/**
 * Purge cached menus and recipes. Call on sign-out so the next person to open
 * the app on this device can't read the previous account's data offline.
 */
export async function clearOfflineCaches(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  registration?.active?.postMessage({ type: 'CLEAR_CACHES' });
}
