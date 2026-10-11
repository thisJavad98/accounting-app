// Network-first cache so the app shell opens offline. Data lives in cookies, not here.
const CACHE = "dakhl-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // Navigations are cached by path only, so shared SMS text in the query is never stored.
  const key = request.mode === "navigate" ? url.pathname : request;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(key, copy));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(key)
          .then((cached) => cached ?? caches.match("/"))
          .then((cached) => cached ?? Response.error()),
      ),
  );
});
