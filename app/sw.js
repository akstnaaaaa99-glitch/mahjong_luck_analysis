// Service Worker（オフラインでも開けるようにする最小限のもの）。
// 方針：同じサイトの GET はネットワークを優先し、成功したら保存。つながらないときは保存済みを返す。
// ネットワークから取るときは、ブラウザの HTTP キャッシュ（GitHub Pages は max-age=600）を使わず、毎回サーバーに新しいかを問い合わせる
// （cache: "no-cache"。変わっていなければ 304 で中身は送られない）。公開の直後に、設定だけ新しく画面が古い、というずれを防ぐため（2026-10-21）。
// ページ本体の読み込み（navigate）の Request に設定を足すと例外になるブラウザがあるので、URL から取り直す。
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
    fetch(req.url, { cache: "no-cache", credentials: "same-origin" })
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
