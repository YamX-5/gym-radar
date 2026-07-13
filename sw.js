/* Gym Radar — service worker (offline-first, stale-while-revalidate)
   Serves cache instantly (works offline) AND refreshes it in the background,
   so a new deploy is picked up on the next load — no stuck stale bundles. */
const CACHE = 'gym-radar-v7';
const ASSETS = [
  './', './index.html',
  './css/app.css',
  './js/config.js', './js/store.js', './js/supabase-adapter.js', './js/seed.js', './js/domain.js', './js/bot.js', './js/wa.js', './js/importer.js', './js/checkin.js', './js/extras.js', './js/coaches.js', './js/app.js',
  './vendor/xlsx.full.min.js', './vendor/jsQR.js', './vendor/qrcode.min.js',
  './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  // never cache WhatsApp / external navigations
  if (!request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(request).then(hit => {
      const network = fetch(request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => hit || caches.match('./index.html'));
      // stale-while-revalidate: cache first if present, refresh in background
      return hit || network;
    })
  );
});
