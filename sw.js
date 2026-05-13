const CACHE_NAME = 'hmad-v20';

self.addEventListener('install', event => {
  self.skipWaiting();
  console.log('SW installed');
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline', { status: 503 });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
  console.log('SW activated');
});