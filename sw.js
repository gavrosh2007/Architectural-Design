const base = (() => {
  const path = self.location.pathname.split('/');
  path.pop();
  return path.join('/') + '/';
})();

const CACHE_NAME = 'art-sale-v2';
const urlsToCache = [
  base,
  base + 'index.html',
  base + 'offline.html',
  base + 'manifest.json',
  base + 'icon-192x192.png',
  base + 'icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match(base + 'offline.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});