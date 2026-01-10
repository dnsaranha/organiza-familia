// Enhanced Service Worker for PWA with Push Notifications
// Updated cache name to force refresh
const CACHE_NAME = 'organiza-v2-' + new Date().toISOString().slice(0, 10);
// Removed '/' from pre-cache to prevent stale index.html
// Removed hardcoded CRA paths ('/static/js/bundle.js') which don't exist in Vite
const urlsToCache = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Navigation requests (HTML) should be Network First to avoid stale index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Other requests: Cache First, fall back to Network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received', event);
  
  let notificationData = {
    title: 'Organiza',
    body: 'Nova notificação do seu app financeiro',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: 'organiza-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Abrir App',
        icon: '/icons/icon-48x48.png'
      },
      {
        action: 'dismiss',
        title: 'Dispensar',
        icon: '/icons/icon-48x48.png'
      }
    ]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (e) {
      console.log('Service Worker: Could not parse notification data');
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open app when notification is clicked
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // If app is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      
      // If app is not open, open it
      return clients.openWindow('/');
    })
  );
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync logic here
      console.log('Service Worker: Performing background sync')
    );
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'VISIBILITY_CHANGE') {
    if (event.data.visible) {
      startTaskChecking();
    } else {
      stopTaskChecking();
    }
  }
});

// Check for scheduled tasks every 30 seconds when page is visible
const checkScheduledTasks = async () => {
  try {
    // Post message to main thread to check tasks
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });
    
    clients.forEach(client => {
      client.postMessage({
        type: 'CHECK_SCHEDULED_TASKS',
        payload: { 
          now: new Date().toISOString(), 
          upcoming: new Date(Date.now() + 1 * 60 * 1000).toISOString() 
        }
      });
    });
  } catch (error) {
    console.log('Error checking scheduled tasks:', error);
  }
};

// Set up periodic task checking
let taskCheckInterval;
const startTaskChecking = () => {
  if (taskCheckInterval) clearInterval(taskCheckInterval);
  taskCheckInterval = setInterval(checkScheduledTasks, 30000); // Every 30 seconds
};

const stopTaskChecking = () => {
  if (taskCheckInterval) {
    clearInterval(taskCheckInterval);
    taskCheckInterval = null;
  }
};

// Start checking when service worker activates and claim clients
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      startTaskChecking(); // Start periodic task checking
      return self.clients.claim();
    })
  );
});
