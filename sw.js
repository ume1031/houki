/* 電験三種 法規 暗記デッキ — Service Worker
   ・自分(denken-houki)のキャッシュだけ管理し、エネ管など他アプリのキャッシュは絶対に消さない
   ・同一オリジン以外には一切介入しない
   ・HTMLはネット優先（最新を取得）、静的ファイルはキャッシュ優先 */
const APP   = "denken-houki";
const CACHE = APP + "-anki-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        // ★自分のアプリ(denken-houki-*)の古い版だけ削除。他アプリのキャッシュは残す
        keys.filter((k) => k.startsWith(APP + "-") && k !== CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // ★同一オリジン以外は素通り（他サイト・他アプリに干渉しない）
  if (new URL(req.url).origin !== self.location.origin) return;

  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put("./index.html", copy)).catch(() => {});
        return res;
      }).catch(() =>
        caches.match("./index.html").then((h) => h || caches.match("./"))
      )
    );
  } else {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => caches.match("./index.html"))
      )
    );
  }
});
