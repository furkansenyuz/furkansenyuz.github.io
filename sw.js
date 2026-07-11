const CACHE = 'fs-v107';
const ASSETS = [
  '/',
  'CV_FS_2026.pdf',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', e => {
  // Cache assets individually so one failed CDN fetch doesn't abort the install.
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(u => c.add(u).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.map(k => k === CACHE ? null : caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  // Network-first for the page shell so content stays fresh; cache-first for the rest.
  const fresh = u.origin === location.origin && (req.mode === 'navigate' || u.pathname === '/' || u.pathname.endsWith('.html'));
  if (fresh) {
    e.respondWith(
      fetch(req).then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
        return r;
      }).catch(() => caches.match(req).then(r => r || new Response('Offline')))
    );
  } else {
    // A network error (not a fake 200) so failed scripts fire onerror instead of
    // executing the fallback text and the offline plan can kick in.
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).catch(() => Response.error()))
    );
  }
});
