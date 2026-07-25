const CACHE_NAME = 'healthsaas-v1';

// Fichiers statiques  mettre en cache lors de l'installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/additional-styles.css',
  '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Mise en cache des assets statiques');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interception des requǦtes
self.addEventListener('fetch', (event) => {
  // Ignorer les requǦtes Firebase (laissǸes  la gestion interne de Firebase SDK)
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('identitytoolkit.googleapis.com')) {
    return;
  }

  // StratǸgie : Stale-While-Revalidate (Sert le cache si dispo, puis met  jour le cache en arrire-plan)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Mettre  jour le cache dynamiquement avec les nouveaux fichiers de Vite
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Si on est hors ligne et que la ressource n'est pas dans le cache
        // On retourne la rǸponse du cache (dǸj fait via caches.match, mais fallback gǸnǸral ici)
      });

      // Retourner immǸdiatement la rǸponse en cache, ou attendre le tǸlǸchargement
      return cachedResponse || fetchPromise;
    })
  );
});
