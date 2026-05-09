// Версия кэша — при изменении названия старый кэш удалится автоматически
const CACHE_NAME = 'hmad-pwa-v1';

// 🔥 КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ №1: файлы кэшируются относительно корня сайта
// (Теперь и /offline.html, и /index.html берутся из одной папки)
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// 1. Установка: открываем кэш и сохраняем критичные файлы
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // Сразу активируем новый worker
  );
});

// 2. Активация: чистим старый мусор
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Удалён старый кэш:', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim()) // Забираем управление у старой версии
  );
});

// 3. Перехват запросов (Главное правило 2026 года: сначала сеть, затем кэш, а при офлайне — offline.html)
self.addEventListener('fetch', event => {
  // Пропускаем не-GET запросы (например, analytics)
  if (event.request.method !== 'GET') return;

  // 🔥 КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ №2: Режим навигации (переход по страницам)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Если сеть недоступна, отдаём закэшированную страницу офлайн
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // Для всех остальных ресурсов (css, js, img): сначала кэш, потом сеть
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        // Клонируем запрос, так как ответ можно прочитать только раз
        const fetchRequest = event.request.clone();
        return fetch(fetchRequest).then(response => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
  );
});