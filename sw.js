/* Saujana Sejati Ent — Web Push service worker */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { title: 'Booking baharu', body: event.data ? event.data.text() : 'Semak tempahan Saujana Sejati Ent.' }; }
  const title = data.title || 'Booking baharu — Saujana Sejati Ent';
  const options = {
    body: data.body || 'Ada booking baharu. Tekan untuk melihat.',
    icon: './logo-saujana-sejati.jpg',
    badge: './logo-saujana-sejati.jpg',
    tag: data.tag || 'saujana-booking',
    renotify: true,
    data: { url: data.url || './' },
    vibrate: [250, 100, 250]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const client of list) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow ? clients.openWindow(target) : undefined;
  }));
});
