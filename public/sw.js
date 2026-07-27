const CACHE_NAME = 'thies-sante-v3';
const STATIC_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
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

  // Skip non-GET, cross-origin API calls
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http') || url.hostname.includes('firestore') || url.hostname.includes('googleapis') || url.hostname.includes('google')) {
    return;
  }

  event.respondWith(
    fetch(event.request).then(networkResponse => {
      // Cache successful responses
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      // Fallback to cache if offline
      return caches.match(event.request);
    })
  );
});
