// Service worker for the Liora 80 page.
// Caches ONLY the static app shell so the page opens offline.
// Deliberately NOT cached: the song video, the narration audio and the
// family photos (large files / photos of children). Those always come
// from the network, and range requests for media are never intercepted.
const VERSION = 'liora80-shell-v1';
const SHELL = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'data.js',
  'photos.js',
  'pwa.js',
  'garden.jpg',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png'
];
const SHELL_URLS = new Set(SHELL.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('liora80-') && key !== VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const clean = url.origin + url.pathname;

  // Pages: network first so a new version shows up right away; cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok && clean === new URL('./', self.registration.scope).href) {
            const copy = response.clone();
            caches.open(VERSION).then(cache => cache.put('./', copy));
          }
          return response;
        })
        .catch(() => caches.match('./').then(hit => hit || caches.match('index.html')))
    );
    return;
  }

  if (!SHELL_URLS.has(clean)) return; // everything else: plain network, no caching

  // Icons never change within a version: cache first.
  if (url.pathname.includes('/icons/')) {
    event.respondWith(caches.match(clean).then(hit => hit || fetch(request)));
    return;
  }

  // CSS / JS / poster: network first (fresh after an update), cache as offline fallback.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(VERSION).then(cache => cache.put(clean, copy));
        }
        return response;
      })
      .catch(() => caches.match(clean))
  );
});
