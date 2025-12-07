// service-worker.js

const CACHE_NAME = "restaurant-cache-v2"; // versiyonu arttırdım
const OFFLINE_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/offline.html", // offline sayfası oluşturursan buradan sunar
];

// Service worker install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_FILES);
    })
  );
  self.skipWaiting();
});

// Eski cache'leri temizle
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Network-first + cache fallback
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Gelen response'u cache'e koy (stale-while-revalidate tarzı)
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        // Network yoksa cache'e bak
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;

          // Navigasyon isteği ise offline sayfası göster
          if (event.request.mode === "navigate") {
            return caches.match("/offline.html");
          }

          // Başka bir şeyse (örn: API çağrısı) boş bırakabiliriz
          return;
        });
      })
  );
});
