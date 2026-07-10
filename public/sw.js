// Service worker mínimo — solo habilita la instalación como PWA.
// El panel necesita datos en vivo (conversaciones, mensajes), por eso
// NO cacheamos las respuestas de /api/* — siempre van directo a la red.

const CACHE_NAME = "crediphone-shell-v1";
const SHELL_FILES = ["/panel", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nunca cachear llamadas a la API — siempre datos frescos.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/webhook")) {
    return;
  }

  // Network-first para el resto, con fallback a cache si no hay conexión.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
