// Service Worker for "Gestión de Gastos y Presupuesto Diario"
const CACHE_NAME = 'mis-gastos-pwa-v2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/favicon.png'
];

// Install: precache essential shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Smart caching protecting user experience from temporary cold-start screens
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip WebSocket, non-GET, chrome-extension, and server API calls
  if (
    request.method !== 'GET' ||
    url.protocol.startsWith('ws') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/ws')
  ) {
    return;
  }

  // Navigation requests: Try fast network, but NEVER cache Cloud Run "Please wait..." page
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Timeout promise to avoid hanging if container is waking up
          const fetchPromise = fetch(request);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Network timeout')), 2500)
          );

          const networkResponse = await Promise.race([fetchPromise, timeoutPromise]);
          
          if (networkResponse && networkResponse.status === 200) {
            const text = await networkResponse.clone().text();
            // If the response is the Cloud Run intermediate "Please wait while your application starts" page, DO NOT CACHE OR SERVE IT!
            if (text.includes('Please wait while your application starts') || text.includes('issue during the build process')) {
              console.warn('Detected cold start interstitial; falling back to cached PWA shell');
              const cached = await caches.match('/index.html') || await caches.match('/');
              if (cached) return cached;
            } else {
              const cache = await caches.open(CACHE_NAME);
              cache.put(request, networkResponse.clone());
              return networkResponse;
            }
          }
        } catch (err) {
          // Network failed or timed out (offline or container cold start)
        }

        // Return cached shell
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        const indexResponse = await caches.match('/index.html') || await caches.match('/');
        if (indexResponse) return indexResponse;

        // Last resort fallback
        return fetch(request);
      })()
    );
    return;
  }

  // Static assets: Cache first with network update
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && (url.origin === location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});
