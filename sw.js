// Service Worker — 黑森船长 · S₂ 宏观雷达
// Network First, Cache Fallback

var CACHE_VERSION = 'v1';
var CACHE_NAME = 's2-radar-' + CACHE_VERSION;
var CACHE_URLS = [
  '/s2-certainty.html',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/og-image.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Network first, cache fallback
  event.respondWith(
    fetch(event.request).then(function(response) {
      // Cache a copy
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        if (cached) {
          // Notify clients about offline mode
          self.clients.matchAll().then(function(clients) {
            clients.forEach(function(client) {
              client.postMessage({ type: 'OFFLINE', url: event.request.url });
            });
          });
          return cached;
        }
        // If no cache, return a basic offline response
        if (event.request.headers.get('accept').indexOf('text/html') !== -1) {
          return new Response(
            '<html><body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;text-align:center;padding:60px 20px">'
            + '<h2>离线模式</h2><p>网络不可用，缓存中也没有此页面</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
      });
    })
  );
});
