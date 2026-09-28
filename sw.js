// Medsoft service worker: lets the app open without internet and makes it installable.
// Network first, so updates you push to GitHub show up straight away;
// the saved copy is only used when there's no connection.
// Your Supabase data and map tiles are never cached (always live).
// Libraries from CDNs (map, Supabase login, fonts) keep a copy so the app shell works offline.
const CACHE = 'medsoft-v3'; // change this name to force every device to drop old files
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/apple-touch-icon.png",
  "./assets/favicon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-192.png",
  "./assets/icon-maskable-512.png",
  "./css/accounts.css",
  "./css/base.css",
  "./css/components.css",
  "./css/screens.css",
  "./js/api.js",
  "./js/app.js",
  "./js/config.js",
  "./js/data.js",
  "./js/icons.js",
  "./js/location.js",
  "./js/router.js",
  "./js/seed-data.js",
  "./js/store.js",
  "./js/supabase-client.js",
  "./js/utils.js",
  "./js/components/cards.js",
  "./js/components/navbar.js",
  "./js/components/place-picker.js",
  "./js/components/toast.js",
  "./js/screens/admin-edit.js",
  "./js/screens/admin-stock.js",
  "./js/screens/admin.js",
  "./js/screens/detail.js",
  "./js/screens/find.js",
  "./js/screens/home.js",
  "./js/screens/location.js",
  "./js/screens/map.js",
  "./js/screens/profile.js",
  "./js/screens/saved.js",
  "./js/screens/settings.js",
  "./js/screens/sysadmin.js"
];

// Hosts whose files are versioned libraries: serve the saved copy, refresh it in the background.
const CDN_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  // One file at a time: a single missing file must not stop offline support from installing.
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(APP_FILES.map(f => cache.add(f))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('medsoft-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;

  // Libraries: saved copy first (fast, works offline), updated in the background.
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req);
      const fresh = fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fresh;
    }));
    return;
  }

  if (url.origin !== self.location.origin) return; // Supabase API, map tiles: straight to network

  // App files: network first so GitHub updates show straight away; saved copy when offline.

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 503, statusText: 'Offline' });
      }),
  );
});
