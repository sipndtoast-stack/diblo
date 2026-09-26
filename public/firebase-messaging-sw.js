// Diblo Firebase Cloud Messaging (FCM) Background Service Worker
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBZgAbbS7_cTo7ml3EkUf5yKxPiADy5k1U',
  authDomain: 'diblo-39440.firebaseapp.com',
  projectId: 'diblo-39440',
  storageBucket: 'diblo-39440.firebasestorage.app',
  messagingSenderId: '650321096736',
  appId: '1:650321096736:web:218a11d36b1ca9e38c0c45'
});

try {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notificationTitle =
      (payload.notification && payload.notification.title) ||
      (payload.data && payload.data.title) ||
      'Diblo Assistance Update';

    const notificationOptions = {
      body:
        (payload.notification && payload.notification.body) ||
        (payload.data && payload.data.body) ||
        'You have a new update on your Diblo booking.',
      icon: '/pwa-192x192.png',
      badge: '/favicon.png',
      tag: (payload.data && payload.data.tag) || 'diblo-fcm-notification',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: payload.data || { url: '/customer/requests' }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn('[Diblo FCM SW] Background messaging setup warning:', err);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || '/customer/requests';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if (client.url && targetUrl) {
            client.postMessage({
              type: 'DIBLO_NOTIFICATION_CLICK',
              url: targetUrl,
              data: event.notification.data
            });
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
