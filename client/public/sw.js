/* Clinema service worker: makes the app installable and quick to start.
 *
 * - Page loads: network first, falling back to the cached app shell offline.
 * - Hashed build assets (/assets/*): cache first (they never change).
 * - Everything else goes straight to the network: the API (always fresh),
 *   and cross-origin fonts and images, which the site's CSP (connect-src
 *   'self') wouldn't let this worker fetch anyway; the HTTP cache has them.
 */
const VERSION = 'v1';
const SHELL = `clinema-shell-${VERSION}`;
const ASSETS = `clinema-assets-${VERSION}`;
const KEEP = [SHELL, ASSETS];
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/theme-init.js'];
const MAX_ASSETS = 80;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('clinema-') && !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type !== 'opaque') {
    const copy = response.clone();
    caches.open(cacheName).then((cache) => cache.put(request, copy).then(() => cacheName === ASSETS && trim(ASSETS, MAX_ASSETS)));
  }
  return response;
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const copy = response.clone();
      caches.open(SHELL).then((cache) => cache.put('/index.html', copy));
    }
    return response;
  } catch {
    return (await caches.match('/index.html')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return undefined;
  if (url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return undefined;
  if (request.mode === 'navigate') return event.respondWith(networkFirstPage(request));
  if (url.pathname.startsWith('/assets/')) return event.respondWith(cacheFirst(request, ASSETS));
  return undefined;
});
