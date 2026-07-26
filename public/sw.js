const CACHE_NAME = 'thies-sante-v2-dynamic';
const STATIC_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests, API calls, and non-GET requests
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http') || url.hostname.includes('firestore') || url.hostname.includes('google')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Network fetch to update cache in background (Stale-While-Revalidate)
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Ignorer l'erreur réseau si on est offline
      });

      // Retourner le cache immédiatement s'il existe, sinon attendre le réseau
      return cachedResponse || fetchPromise;
    })
  );
});
