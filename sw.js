const CACHE_NAME = 'hmad-v8';
const STATIC_ASSETS = [
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
      // Попытка добавить статику, но если что-то не загрузится — не проваливаем установку
      return Promise.allSettled(
        STATIC_ASSETS.map(url => 
          cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('Deleting old cache:', key);
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Отвечаем только на GET-запросы в рамках нашего origin
  if (event.request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached;
      }
      
      return fetch(event.request).then(networkResponse => {
        // Кэшируем только успешные ответы
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone).catch(console.warn);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Если запрос на навигацию и нет кэша — показываем offline.html
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html').then(offline => {
            return offline || new Response('Offline', { status: 503 });
          });
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});