/* Kreezby service worker (installable app + system notifications).
   - Installs the site as an app (with manifest.webmanifest).
   - Pages, scripts and styles are always fetched from the network first, so every account sees
     the latest version; the last copy is used only when the device is offline.
   - Images and icons are served from the cache after the first visit.
   - Shop data (/api/...) is never cached: stock, orders and sales always come live from the server.
   - Offline with no saved copy of a page: offline.html explains that a connection is needed.
   - Clicking a system notification only brings the open Kreezby window to the front. */
var CACHE = 'kreezby-app-v1';
var CORE = ['offline.html', 'manifest.webmanifest', 'assets/logo/icon-192.png', 'assets/logo/icon-512.png'];

self.addEventListener('install', function (event) {
    event.waitUntil(caches.open(CACHE).then(function (cache) {
        return cache.addAll(CORE.map(function (p) { return new Request(self.registration.scope + p, { cache: 'reload' }); }));
    }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
    event.waitUntil(caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k.indexOf('kreezby-app-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
    var req = event.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.indexOf('/api/') >= 0) return; // live data only
    var isImage = req.destination === 'image' || /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname);
    if (isImage) {
        event.respondWith(caches.match(req).then(function (hit) {
            return hit || fetch(req).then(function (res) {
                if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
                return res;
            });
        }));
        return;
    }
    event.respondWith(fetch(req).then(function (res) {
        if (res && res.ok && (req.mode === 'navigate' || /\.(js|css|html)$/i.test(url.pathname))) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
    }).catch(function () {
        return caches.match(req).then(function (hit) {
            if (hit) return hit;
            if (req.mode === 'navigate') return caches.match(self.registration.scope + 'offline.html');
            return Response.error();
        });
    }));
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    var target = (event.notification.data && event.notification.data.href) || (self.registration.scope + 'admin/alert-admin.html');
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
            for (var i = 0; i < clients.length; i++) {
                if ('focus' in clients[i]) return clients[i].focus();
            }
            // No Kreezby window is open at all: open one.
            if (self.clients.openWindow) return self.clients.openWindow(target);
            return null;
        })
    );
});
