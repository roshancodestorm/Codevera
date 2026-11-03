// Codestrom IDE Service Worker — minimal offline shell cache
const CACHE = 'codestrom-shell-v1';

// Shell files to cache (critical for offline/PWA launch)
const SHELL = [
  '/',
  '/index.html',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Never intercept API calls or WebSocket upgrades
  if (url.pathname.startsWith('/api/') || e.request.headers.get('upgrade') === 'websocket') return;
  // Only cache GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchFresh = fetch(e.request).then((res) => {
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      // Network-first for navigations, cache-first for assets
      if (e.request.mode === 'navigate') return fetchFresh;
      return cached || fetchFresh;
    })
  );
});
