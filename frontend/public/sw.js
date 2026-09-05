// HisabKhata Progressive Web App Service Worker
const CACHE_NAME = 'hisabkhata-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png'
];

// Domains and endpoints that must always bypass cache
const BYPASS_URL_PATTERNS = [
  'firebaseio.com',
  'googleapis.com',
  'identitytoolkit.googleapis.com',
  'r2.cloudflarestorage.com',
  'api.emailjs.com',
  'api.qrserver.com',
  '/verify-payment'
];

// 1. Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event - Clean up stale caches
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

// 3. Fetch Strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Bypass cache for APIs, Firebase, R2, external live endpoints
  if (BYPASS_URL_PATTERNS.some((pattern) => url.href.includes(pattern))) {
    return;
  }

  // Navigation requests (HTML pages) -> Network-First, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and update cache with latest navigation response
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const fallback = await caches.match('/index.html');
          return fallback || new Response('Offline - HisabKhata', {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // Static Assets (CSS, JS, Fonts, Images) -> Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
