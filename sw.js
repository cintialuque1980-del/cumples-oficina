// Service worker: permite abrir la app sin conexión.
// Los datos NUNCA se guardan acá: siempre se piden a Supabase.
const CACHE = "cumples-v1";
const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
const SHELL = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(SHELL);
    try { await c.add(new Request(CDN, { mode: "no-cors" })); } catch (err) {}
  }));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co")) return; // datos: siempre a la red
  if (req.url === CDN) { // librería: primero caché
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
    return;
  }
  if (url.origin === location.origin) { // app: primero red, si falla caché
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
  }
});
