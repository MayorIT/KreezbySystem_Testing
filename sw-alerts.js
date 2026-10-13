/* System notifications for head admin, admin, and staff browsers. */
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    var target = (event.notification.data && event.notification.data.href) || '/admin/alert-admin.html';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
            var i;
            for (i = 0; i < clients.length; i++) {
                if (clients[i].url.indexOf(target) !== -1 && 'focus' in clients[i]) {
                    return clients[i].focus();
                }
            }
            if (self.clients.openWindow) return self.clients.openWindow(target);
            return null;
        })
    );
});
