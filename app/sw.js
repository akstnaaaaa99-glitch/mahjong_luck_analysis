// Service Worker（オフラインでも開けるようにする最小限のもの）。
// 方針：同じサイトの GET はネットワークを優先し、成功したら保存。つながらないときは保存済みを返す。
// 牌譜は URL のハッシュ（#z=）で渡すのでサーバーへのリクエストには含まれず、ここで保存されることもない。

const CACHE = "mlk-app-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("./index.html"))),
  );
});
