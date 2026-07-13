const CACHE = 'omnidrive-v16';
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
  const req = e.request;
  const url = new URL(req.url);

  if (url.origin !== location.origin) return;

  // Tudo network-first: sempre busca a versão mais nova, cache só como reserva offline.
  e.respondWith(
    fetch(req).then(r => {
      const clone = r.clone();
      caches.open(CACHE).then(c => c.put(req, clone));
      return r;
    }).catch(() => caches.match(req).then(c => c || caches.match('index.html')))
  );
});
