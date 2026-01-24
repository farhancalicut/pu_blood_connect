/* eslint-disable no-restricted-globals */
const CACHE_NAME = "pu-nss-connect-v2"; // Incremented version to force cache refresh
const RUNTIME_CACHE = "runtime-cache-v2";
const IMAGE_CACHE = "image-cache-v2";

// Files to cache immediately on install
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

// Install event - cache critical resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return cacheNames.filter(
          (cacheName) => !currentCaches.includes(cacheName),
        );
      })
      .then((cachesToDelete) => {
        return Promise.all(
          cachesToDelete.map((cacheToDelete) => {
            return caches.delete(cacheToDelete);
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    // Cache Firebase and Cloudinary images
    if (
      url.hostname.includes("firebasestorage.googleapis.com") ||
      url.hostname.includes("cloudinary.com")
    ) {
      event.respondWith(
        caches.open(IMAGE_CACHE).then((cache) => {
          return cache.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return fetch(request).then((networkResponse) => {
              if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            });
          });
        }),
      );
      return;
    }
    return;
  }

  // Handle navigation requests (HTML pages) - always network first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache navigation requests to prevent stale page issues
          return response;
        })
        .catch(() => {
          // Offline fallback
          return caches.match("/index.html");
        }),
    );
    return;
  }

  // Handle API requests - network first, fallback to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        }),
    );
    return;
  }

  // Handle static assets - cache first, fallback to network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === "error") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      });
    }),
  );
});

// Background Sync - for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-donations") {
    event.waitUntil(syncDonations());
  }
});

async function syncDonations() {
  // Placeholder for syncing offline donations when back online
  const cache = await caches.open(RUNTIME_CACHE);
  const requests = await cache.keys();
  const pendingRequests = requests.filter((req) => req.url.includes("/sync/"));

  for (const request of pendingRequests) {
    try {
      await fetch(request);
      await cache.delete(request);
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }
}

// Push Notifications
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New notification",
    icon: "/icon-192x192.png",
    badge: "/icon-72x72.png",
    vibrate: [200, 100, 200],
    tag: "notification",
    requireInteraction: false,
    actions: [
      {
        action: "open",
        title: "Open App",
        icon: "/icon-72x72.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icon-72x72.png",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification("PU NSS Connect", options),
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "open") {
    event.waitUntil(clients.openWindow("/"));
  }
});

// Message handler for skip waiting
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
