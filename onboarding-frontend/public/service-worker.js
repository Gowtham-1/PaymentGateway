self.addEventListener('push', function (event) {
    if (event.data) {
        const payload = event.data.json();
        const options = {
            body: payload.body,
            icon: '/vite.svg',
            badge: '/vite.svg',
            data: { url: payload.url }
        };

        event.waitUntil(
            self.registration.showNotification(payload.title, options)
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const urlToOpen = event.notification.data.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];

                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If none are open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
