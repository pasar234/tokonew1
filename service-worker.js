// Service Worker untuk Stok Pintar
const CACHE_NAME = 'stok-pintar-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install Service Worker
self.addEventListener('install', event => {
  console.log('🛠️ Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Cache dibuka, menambahkan file...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Semua file di-cache');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('❌ Gagal caching:', err);
      })
  );
});

// Aktifkan Service Worker
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('🔄 Klaim klien');
      return self.clients.claim();
    })
  );
});

// Handle requests
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Jika ada di cache, kembalikan
        if (cachedResponse) {
          console.log('📂 Dari cache:', event.request.url);
          return cachedResponse;
        }

        // Jika tidak ada, fetch dari network
        return fetch(event.request)
          .then(networkResponse => {
            // Cek jika response valid
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone response untuk cache
            const responseToCache = networkResponse.clone();

            // Buka cache dan simpan response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // Jika offline dan request HTML, kembalikan offline page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            // Untuk CSS dan JS, kembalikan dari cache jika ada
            if (event.request.url.endsWith('.css') || event.request.url.endsWith('.js')) {
              return caches.match(event.request);
            }
            
            return new Response('🔌 Anda sedang offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Handle messages
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Sync event untuk background sync (future feature)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('🔄 Background sync untuk data');
  }
});
