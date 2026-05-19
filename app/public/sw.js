// 다랜드 PWA Service Worker
// 정책:
//  - 정적 자산(JS/CSS/이미지/폰트): cache-first (오프라인 동작)
//  - HTML 페이지: network-first (최신 콘텐츠 우선, 오프라인 시 캐시 폴백)
//  - API 호출(/api/*): 항상 네트워크 (캐시 X — 금융 데이터)

const CACHE_NAME = "daland-v0.2.0";
const STATIC_FALLBACKS = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_FALLBACKS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 외부 도메인은 그냥 통과
  if (url.origin !== self.location.origin) return;

  // API 호출은 항상 네트워크
  if (url.pathname.startsWith("/api/")) return;

  // HTML 네비게이션: network-first
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("/"))),
    );
    return;
  }

  // 정적 자산: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|ttf)$/)
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
