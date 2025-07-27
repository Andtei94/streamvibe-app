// This is a basic service worker for caching and offline functionality.
const CACHE_NAME = 'streamvibe-cache-v1';
const APP_SHELL_URLS = [
  '/',
  '/manifest.json',
  // Add other critical shell assets here if needed
];

// 1. Installation: Cache the application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching app shell');
      return cache.addAll(APP_SHELL_URLS);
    })
  );
});

// 2. Activation: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. Fetch: Serve from cache first, then network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        // Optionally, cache dynamically fetched assets if needed
        return fetchResponse;
      });
    })
  );
});

// 4. Message: Handle messages from the client (e.g., for offline downloads)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_URLS') {
    const { urlsToCache } = event.data.payload;
    if (!urlsToCache || urlsToCache.length === 0) {
      event.ports[0].postMessage({ error: 'No URLs provided to cache.' });
      return;
    }

    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Service Worker: Caching URLs for offline playback:', urlsToCache);
        const promises = urlsToCache.map(url => {
          const request = new Request(url, { mode: 'no-cors' });
          return fetch(request).then(response => {
            if (response.status === 200 || response.type === 'opaque') {
              return cache.put(url, response);
            }
            return Promise.resolve();
          }).catch(err => {
            console.error(`Failed to cache ${url}:`, err);
          });
        });
        
        Promise.all(promises)
          .then(() => event.ports[0].postMessage({ success: true }))
          .catch(err => event.ports[0].postMessage({ error: err.message }));
      })
    );
  }
});
