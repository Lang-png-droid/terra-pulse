const CACHE_NAME = 'terrapulse-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
];

const CACHE_STRATEGIES = {
  // Cache first for static assets
  static: ['/icons/', '/_next/static/'],
  // Network first for API
  networkFirst: ['/api/'],
  // Stale while revalidate for map tiles
  staleWhileRevalidate: ['https://basemaps.cartocdn.com/', 'https://api.rainviewer.com/', 'https://api.open-meteo.com/'],
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension, data: URLs
  if (!url.protocol.startsWith('http')) return;

  // Determine cache strategy
  let strategy = 'networkFirst';

  if (CACHE_STRATEGIES.static.some((path) => request.url.includes(path))) {
    strategy = 'cacheFirst';
  } else if (CACHE_STRATEGIES.networkFirst.some((path) => request.url.includes(path))) {
    strategy = 'networkFirst';
  } else if (CACHE_STRATEGIES.staleWhileRevalidate.some((path) => request.url.includes(path))) {
    strategy = 'staleWhileRevalidate';
  }

  event.respondWith(handleRequest(request, strategy));
});

async function handleRequest(request, strategy) {
  const cache = await caches.open(CACHE_NAME);

  switch (strategy) {
    case 'cacheFirst': {
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        return new Response('Offline', { status: 503 });
      }
    }

    case 'networkFirst': {
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    case 'staleWhileRevalidate': {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    }

    default: {
      try {
        return await fetch(request);
      } catch {
        const cached = await cache.match(request);
        return cached || new Response('Offline', { status: 503 });
      }
    }
  }
}

// Background sync for offline actions (if needed)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-disaster-reports') {
    event.waitUntil(syncDisasterReports());
  }
});

async function syncDisasterReports() {
  // Placeholder for future offline reporting feature
  console.log('Background sync triggered');
}