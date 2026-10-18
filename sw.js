const CACHE = "attendance-v1";

const FILES = [
  "./", "./index.html", "./day.html", "./statistics.html", "./edit.html", "./backup.html",
  "./style.css", "./store.js", "./day.js", "./stats.js", "./edit.js", "./backup.js",
  "./manifest.json", "./icon-180.png", "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // add each file separately, so one missing file doesn't break the rest
      return Promise.all(FILES.map(function (f) {
        return c.add(f).catch(function () {});
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== location.origin) return;

  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then(function (res) {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(e.request, { ignoreSearch: true });
      })
  );
});