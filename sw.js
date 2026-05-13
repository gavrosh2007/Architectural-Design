const CACHE_NAME = 'hmad-v7';
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Кэшируем каждый файл по отдельности, игнорируя отсутствующие
      return Promise.allSettled(
        urlsToCache.map(url => {
          return fetch(url).then(response => {
            if (response.ok) {
              return cache.put(url, response);
            } else {
              console.warn(`SW: ${url} not cached (status ${response.status})`);
              return Promise.resolve();
            }
          }).catch(err => {
            console.warn(`SW: failed to fetch ${url}`, err);
            return Promise.resolve();
          });
        })
      ).then(() => {
        console.log('SW: installation completed (some files may be missing)');
        return self.skipWaiting();
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('SW: deleting old cache', key);
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html').catch(() => {
            return new Response('Offline', { status: 503 });
          });
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});