/* MAESTRO service worker — offline-first app shell.
 * Bump VERSION on every release: old caches are purged on activate. */
const VERSION = 'maestro-v3';
const FONT_CACHE = 'maestro-fonts';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './engine.js',
  './songs.js',
  './audio.js',
  './ui.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k.startsWith('maestro-v') && k !== VERSION)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Google Fonts: stale-while-revalidate so typography survives offline
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then(async c => {
        const hit = await c.match(e.request);
        const refresh = fetch(e.request).then(res => { c.put(e.request, res.clone()); return res; }).catch(() => hit);
        return hit || refresh;
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // app shell: cache-first, network fallback; navigations fall back to index
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit || fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined))
    )
  );
});
