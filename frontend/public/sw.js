// TaskFlow service worker: caches the app shell only. API calls are never cached.
const CACHE = "taskflow-shell-v1";

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(["/", "/favicon.svg", "/manifest.webmanifest"])));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Page loads: network first so users always get the newest build, cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  // Hashed build files and icons: cache first.
  event.respondWith(
    caches.match(request).then(
      cached =>
        cached ||
        fetch(request).then(response => {
          if (response.ok && (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/"))) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
