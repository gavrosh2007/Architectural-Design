const CACHE_NAME = 'hmad-v9';

self.addEventListener('install', event => {
  // НЕМЕДЛЕННО переходим в активацию, не дожидаясь кэширования
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Кэшируем что можем, но не проваливаем установку
      const urls = [
        '/',
        '/index.html',
        '/offline.html',
        '/manifest.json',
        '/icon-192x192.png',
        '/icon-512x512.png'
      ];
      return Promise.allSettled(urls.map(url => 
        cache.add(url).catch(() => {})
      ));
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim()) // ПРИНУДИТЕЛЬНЫЙ ЗАХВАТ
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html').catch(() => new Response('Offline', { status: 503 }));
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});