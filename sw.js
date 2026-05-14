// sw.js — HM&AD v3.0
const CACHE_NAME = 'hmad-v3';
const CRITICAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
];

// Установка: кэшируем только самое необходимое
self.addEventListener('install', event => {
  console.log('[SW] Installing new version');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CRITICAL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Активация: удаляем старые кэши и забираем контроль
self.addEventListener('activate', event => {
  console.log('[SW] Activating, cleaning old caches');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Стратегия: Stale-While-Revalidate для быстрой загрузки
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Не кэшируем API-запросы и аналитику
  if (url.pathname.includes('/api/') || url.pathname.includes('analytics')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        // Кэшируем только успешные ответы
        if (response && response.status === 200 && event.request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // Офлайн-режим: возвращаем кэш, если есть
        return cached;
      });
      
      // Возвращаем кэш мгновенно, но обновляем в фоне
      return cached || fetchPromise;
    })
  );
});

// САМООЧИЩЕНИЕ: при получении сигнала удаляем все данные
self.addEventListener('message', event => {
  if (event.data === 'CLEANUP') {
    console.log('[SW] Self-destruct: cleaning all caches');
    caches.keys().then(keys => {
      keys.forEach(key => caches.delete(key));
    }).then(() => {
      self.registration.unregister().then(() => {
        console.log('[SW] Unregistered, ready for fresh install');
      });
    });
  }
});