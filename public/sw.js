// ResuMint service worker.
//
// Deliberately hand-written and minimal rather than using next-pwa --
// that package has known reliability issues under Turbopack/Next 16 at
// the time of writing. This uses a stale-while-revalidate strategy:
// serve instantly from cache if available (which is also what makes the
// app work offline), while refreshing the cache from the network in the
// background. No build-time asset manifest is needed -- the cache is
// built up organically from whatever the person actually visits.

const CACHE_NAME = "resumint-v2";
const APP_SHELL = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only cache safe, same-origin GET requests -- never intercept API-like
  // calls or cross-origin requests (e.g. font/CDN assets), and never
  // touch anything that isn't idempotent.
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Never intercept Next.js's own internal traffic: dev/HMR endpoints,
  // and the App Router's RSC payload fetches (identified by the `_rsc`
  // query param or the `RSC` request header it sends on client
  // navigations/prefetches). Caching these breaks Next's own routing and
  // was the cause of an earlier reload-loop bug -- this is a hard
  // exclusion, not a strategy choice.
  const isNextInternal =
    url.pathname.startsWith("/_next/") ||
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1";
  if (isNextInternal) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached || caches.match("/"));

      return cached || networkFetch;
    })
  );
});
