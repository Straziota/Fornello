'use client';

import { useEffect } from 'react';
import { isNativeApp } from '@/lib/native';

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
    // NEVER in the native app.
    //
    // The worker exists so a phone with no signal can still read this week's
    // menu. Inside Capacitor that problem does not exist: every asset is on
    // disk in the bundle, readable with the radio off. What the worker adds is
    // a cache in front of files that are already local — and because it treats
    // /icons/ and /backgrounds/ as immutable and serves the shell from cache, a
    // freshly installed build gets answered with the previous one. That is why
    // new builds appeared not to arrive: they did, and were then overruled.
    //
    // Tear down anything an earlier build registered too, or a device already
    // holding a stale cache would go on serving it forever.
    if (isNativeApp()) {
      void (async () => {
        try {
          const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
          await Promise.all(regs.map(r => r.unregister()));
          const keys = (await caches?.keys?.()) ?? [];
          await Promise.all(keys.map(k => caches.delete(k)));
          if (regs.length || keys.length) {
            console.log(`[sw] native: removed ${regs.length} worker(s), ${keys.length} cache(s)`);
          }
        } catch { /* nothing to clean up */ }
      })();
      return;
    }

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
