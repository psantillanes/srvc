// Offline cache. Bump VERSION whenever any file changes so phones pick up the update.
var VERSION = 'srvc-v1.0.0';
var FILES = ['./', 'index.html', 'styles.css', 'seed.js', 'app.js', 'manifest.webmanifest',
  'fonts/archivo.woff2', 'fonts/plexmono-400.woff2', 'fonts/plexmono-500.woff2', 'fonts/plexmono-600.woff2',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) { return hit || fetch(e.request); }));
});
