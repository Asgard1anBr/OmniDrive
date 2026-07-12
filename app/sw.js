const CACHE = 'omnidrive-v2';
const SHELL = [
  './',
  'index.html',
  'css/styles.css',
  'js/config.js',
  'js/cloud.js',
  'js/qr.js',
  'js/app.js',
  'icons/omnidrive-icon.png',
  'icons/omnidrive-icon-maskable.png',
  'backgrounds/bg-pc.png',
  'backgrounds/bg-mobile.png',
  'manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
