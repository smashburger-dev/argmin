// Offline service worker for the static build. tools/build_public.mjs injects
// __BUILD_ID__, __PYODIDE_VERSION__ and __PRECACHE__ per release and writes
// this file into the build tree root — do not hand-edit the generated copy.
const CACHE = 'argmin-__BUILD_ID__';
// Pyodide files live in a cache keyed by the vendored runtime version, so
// deploys of the app do not wipe the warmed runtime — but a pyodide vendor
// bump does retire the stale runtime instead of serving it forever.
const RUNTIME_CACHE = 'argmin-runtime-__PYODIDE_VERSION__';
// Precache covers the app shell plus every lazy chunk and content file, so
// routes never visited online still work offline. vendor/pyodide (~16 MB) is
// deliberately excluded: it is runtime-cached on first Python use, and the
// settings prefetch button warms it explicitly via offline-manifest.json.
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  // no-cache forces revalidation: Pages sends max-age=600, and without this a
  // deploy inside that window could persist stale unhashed files for good.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(
    PRECACHE.map((path) => new Request(path, { cache: 'no-cache' })),
  )));
  // No skipWaiting(): open old-version tabs may still lazy-import chunks that
  // only exist in the old cache. The new worker activates once the last
  // controlled tab is gone, keeping every tab consistent with its cache.
});

self.addEventListener('activate', (event) => {
  // Deletes every argmin-* cache except the current precache and the current
  // runtime cache — this also retires older argmin-runtime-* versions and the
  // legacy unversioned 'argmin-runtime' cache.
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('argmin-') && key !== CACHE && key !== RUNTIME_CACHE)
      .map((key) => caches.delete(key)),
  )));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.headers.has('range')) return;
  const cacheName = url.pathname.includes('/vendor/pyodide/') ? RUNTIME_CACHE : CACHE;
  const writeThrough = (response) => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(cacheName).then((cache) => cache.put(request, copy)));
    }
    return response;
  };
  if (request.mode === 'navigate') {
    // On failure serve the precached shell first: it always matches the
    // precached chunks, while a put-stored entry could hold a newer document
    // against an older chunk set.
    event.respondWith(fetch(request).then(writeThrough)
      .catch(() => caches.match('index.html').then((hit) => hit || caches.match(request))));
    return;
  }
  event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then(writeThrough)));
});
