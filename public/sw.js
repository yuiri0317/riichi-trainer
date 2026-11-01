// Service Worker：讓 App 可以離線開啟
//
// 策略：
//   - 導航請求（開頁面）：network-first，失敗時回退到快取的 index.html
//   - 其他同源資源（JS/CSS/圖片）：cache-first，第一次抓到就存起來
//   - 跨域請求（Google 字型之類）：不攔，直接走網路
//
// CRA 打包出來的檔名帶 hash，所以舊版本的檔案會自然失效；
// 想強制更新時只要改下面的 CACHE 版本號即可。

const CACHE = "richi-v1";
const SHELL = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => cache.addAll(SHELL))
            .then(() => self.skipWaiting())
            .catch(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // 開頁面：先連網，離線時回退快取
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html") || caches.match("./")))
        );
        return;
    }

    // 靜態資源：先看快取
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                if (response && response.status === 200 && response.type === "basic") {
                    const copy = response.clone();
                    caches.open(CACHE).then((cache) => cache.put(request, copy));
                }
                return response;
            });
        })
    );
});
