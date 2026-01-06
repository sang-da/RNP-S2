// Service Worker pour RNP Manager
const CACHE_NAME = 'rnp-manager-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx'
];

// Installation du SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation et nettoyage des vieux caches
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
});

// Interception des requêtes (Offline First strategy pour les assets statiques)
self.addEventListener('fetch', (event) => {
  // On ne cache pas les requêtes API/Firebase pour l'instant pour éviter les soucis de données
  if (event.request.url.includes('firestore') || event.request.url.includes('googleapis')) {
      return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Écoute des Notifications Push
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'RNP Manager', body: 'Nouvelle notification' };
  
  const options = {
    body: data.body,
    icon: 'https://raw.githubusercontent.com/sang-da/svg/main/PiXi_2.png',
    badge: 'https://raw.githubusercontent.com/sang-da/svg/main/PiXi_2.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clic sur la notification
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});