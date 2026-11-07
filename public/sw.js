// Network-first for pages, cache-first for static assets. Data lives in cookies, not here.
const CACHE = "dakhl-v4";
const SHELL = [
  "/app",
  "/app/month",
  "/app/reports",
  "/app/settings",
  "/app/settings/categories",
  "/app/settings/sms-ios",
  "/",
  "/icon.svg",
  "/icons/192",
  "/icons/512",
];

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/icon.svg"
  );
}

function cacheKey(request, url) {
  // Navigations are cached by path only, so shared SMS text in the query is never stored.
  return request.mode === "navigate" ? url.pathname : request;
}

function putCache(key, response) {
  if (!response.ok) return;
  const copy = response.clone();
  caches.open(CACHE).then((cache) => cache.put(key, copy));
}

async function networkFirst(request, key, url) {
  try {
    const response = await fetch(request);
    putCache(key, response);
    return response;
  } catch {
    const cached = await caches.match(key);
    if (cached) return cached;
    if (request.mode === "navigate") {
      if (url.pathname.startsWith("/app/reports/")) {
        const reports = await caches.match("/app/reports");
        if (reports) return reports;
      }
      const app = await caches.match("/app");
      if (app) return app;
    }
    return Response.error();
  }
}

async function cacheFirst(request, key) {
  const cached = await caches.match(key);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    putCache(key, response);
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

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

  const key = cacheKey(request, url);
  event.respondWith(isStaticAsset(url) ? cacheFirst(request, key) : networkFirst(request, key, url));
});
