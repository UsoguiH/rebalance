/* Keeps the app itself working offline. App files: network first, saved copy when offline.
   Gemini calls and style photos are never cached here. */
const CACHE = "new-look-v3";
const SHELL = ["./", "index.html", "css/app.css", "js/app.js", "js/styles.js", "js/prompts.js", "js/gemini.js",
  "js/vision.js", "js/facelock.js", "js/pipeline.js", "js/face3d.js", "manifest.webmanifest", "icons/icon.svg"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))));
});
