/*
 * Fornello service worker — offline support.
 *
 * The real use case is a kitchen with bad wifi and a shop basement with none:
 * you must still be able to read this week's menu, a recipe, and the grocery
 * list. It is also what keeps the iOS build from being "a website in a shell"
 * under App Store review Guideline 4.2.
 *
 * Scope is deliberately read-only. Offline *writes* (ticking groceries off with
 * no signal) need an outbox that replays on reconnect — worth doing, but it is
 * a separate piece of work and half of it done badly loses people's data.
 */

// Bump to invalidate every cache after changing caching behaviour.
const VERSION = 'v1';
const SHELL_CACHE = `fornello-shell-${VERSION}`;
const DATA_CACHE = `fornello-data-${VERSION}`;

const OFFLINE_URL = '/offline';

// Read-only endpoints worth having available with no signal. Everything else
// (generation, mutations, admin) is deliberately absent: serving a stale answer
// for those is worse than an honest failure.
const OFFLINE_READ_APIS = ['/api/menu', '/api/recipes', '/api/settings', '/api/pantry'];

// Hashed and content-addressed, so safe to serve from cache indefinitely.
const IMMUTABLE_PREFIXES = ['/_next/static/', '/icons/', '/backgrounds/'];

const isImmutable = (pathname) =>
  IMMUTABLE_PREFIXES.some((p) => pathname.startsWith(p)) ||
  /\.(?:png|jpg|jpeg|gif|webp|svg|otf|ttf|woff2?)$/i.test(pathname);

const isOfflineReadApi = (pathname) =>
  OFFLINE_READ_APIS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll([OFFLINE_URL])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('fornello-') && k !== SHELL_CACHE && k !== DATA_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Signing out must not leave the previous account's menu and recipes readable
// offline on the device.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('fornello-')).map((k) => caches.delete(k)))
      )
    );
  }
});

/** Cache-first: hashed assets never change under a given URL. */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * Network-first, falling back to the last good copy.
 *
 * Fresh data whenever there is a connection; the previous answer when there
 * isn't. The fallback carries `X-Fornello-Offline` so the UI can say "showing
 * your last saved copy" rather than silently presenting stale data as current.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    // Only 200s. Caching a 401 would strand the user logged-out while offline.
    if (response.status === 200) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set('X-Fornello-Offline', 'true');
      return new Response(cached.body, { status: 200, statusText: 'OK (offline)', headers });
    }
    throw new Error('offline and nothing cached');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Mutations must never be served from or written to cache.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Auth endpoints are always live — a cached session check is a security bug.
  if (url.pathname.startsWith('/api/auth')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, SHELL_CACHE).catch(
        async () => (await caches.match(OFFLINE_URL)) ?? Response.error()
      )
    );
    return;
  }

  if (isImmutable(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isOfflineReadApi(url.pathname)) {
    event.respondWith(
      networkFirst(request, DATA_CACHE).catch(
        () =>
          new Response(JSON.stringify({ error: 'You are offline and this has not been saved yet.', offline: true }), {
            status: 503,
            headers: { 'Content-Type': 'application/json', 'X-Fornello-Offline': 'true' },
          })
      )
    );
  }
});
