// Service Worker for DUCC PWA

const CACHE_NAME = 'ducc-v4';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/favicon.ico',
        '/images/misc/ducc.png'
      ]).catch(err => console.warn('Pre-caching failed, but service worker will still install', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Handler - Required for PWA installability
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip API requests - let them handle their own errors/caching
  if (url.pathname.startsWith('/api/')) return;

  // Network-first for HTML/Navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/');
      })
    );
    return;
  }

  // Cache-first for assets (images, styles, scripts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request).then((response) => {
        // Only cache valid responses from our own origin
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Cache assets
        const isAsset = url.pathname.includes('.') || url.pathname.startsWith('/assets/');
        if (isAsset) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      });
    })
  );
});

// Push Notification Handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  if (!event.data) {
    console.warn('[SW] Push event had no data.');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data parsed:', data);
    
    const options = {
      body: data.body,
      icon: data.icon || '/images/icons/kayaking.svg',
      badge: '/images/icons/outline/kayaking.svg',
      vibrate: [100, 50, 100],
      tag: 'ducc-notification',
      data: {
        url: data.url || '/'
      },
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
        .then(() => {
          console.log('[SW] Notification shown.');
          // Broadcast to all clients if they are open
          return self.clients.matchAll({ type: 'window' }).then(clients => {
            clients.forEach(client => {
              try {
                client.postMessage({
                  type: 'PUSH_NOTIFICATION_RECEIVED',
                  notification: {
                    title: data.title,
                    body: data.body,
                    url: data.url
                  }
                });
              } catch (e) {
                console.warn('[SW] Failed to postMessage to client:', e);
              }
            });
          });
        })
        .catch(err => console.error('[SW] Failed to show notification:', err))
    );
  } catch (e) {
    console.error('[SW] Error processing push notification:', e);
  }
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const urlToOpen = event.notification.data.url;

      // Check if there is already a window open with this URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
