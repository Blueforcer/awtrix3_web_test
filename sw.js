/**
 * AWTRIX3 Service Worker
 * Provides offline functionality and caching for the PWA
 * @version 2.0.0
 */

const CACHE_NAME = 'awtrix3-v2.0.0';
const STATIC_CACHE = 'awtrix3-static-v2.0.0';
const DYNAMIC_CACHE = 'awtrix3-dynamic-v2.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/modern-style.css',
  '/css/components.css',
  '/js/script.js',
  '/js/config.js',
  '/js/utils.js',
  '/js/error-handler.js',
  '/js/event-manager.js',
  '/js/ui-components.js',
  '/js/api-service.js',
  '/js/theme-manager.js',
  '/js/dashboard.js',
  '/pages/dashboard.html',
  // External resources
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Dynamic cache patterns
const CACHE_PATTERNS = {
  api: /^https?.*\/api\/.*/,
  images: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  fonts: /\.(?:woff|woff2|ttf|eot)$/,
  styles: /\.css$/,
  scripts: /\.js$/
};

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static files...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Static files cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    handleFetch(request, url)
  );
});

async function handleFetch(request, url) {
  try {
    // API requests - network first with cache fallback
    if (CACHE_PATTERNS.api.test(url.pathname)) {
      return await handleAPIRequest(request);
    }
    
    // Static assets - cache first
    if (isStaticAsset(url)) {
      return await handleStaticAsset(request);
    }
    
    // HTML pages - network first with cache fallback
    if (request.headers.get('Accept')?.includes('text/html')) {
      return await handleHTMLRequest(request);
    }
    
    // Default - network first
    return await handleNetworkFirst(request);
    
  } catch (error) {
    console.error('[SW] Fetch error:', error);
    
    // Return offline page for HTML requests
    if (request.headers.get('Accept')?.includes('text/html')) {
      return await getOfflinePage();
    }
    
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return network error
    return new Response('Network error', { 
      status: 408, 
      statusText: 'Network timeout' 
    });
  }
}

// Handle API requests - network first with timeout
async function handleAPIRequest(request) {
  try {
    // Try network with timeout
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 5000)
      )
    ]);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
    
  } catch (error) {
    console.log('[SW] API network failed, trying cache:', request.url);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return error response
    return new Response(JSON.stringify({ 
      error: 'Offline - cached data not available',
      offline: true 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503
    });
  }
}

// Handle static assets - cache first
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
    
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle HTML requests - network first with cache fallback
async function handleHTMLRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
    
  } catch (error) {
    console.log('[SW] HTML network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return await getOfflinePage();
  }
}

// Handle network first requests
async function handleNetworkFirst(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok && shouldCache(request)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
    
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Check if URL is a static asset
function isStaticAsset(url) {
  return (
    CACHE_PATTERNS.images.test(url.pathname) ||
    CACHE_PATTERNS.fonts.test(url.pathname) ||
    CACHE_PATTERNS.styles.test(url.pathname) ||
    CACHE_PATTERNS.scripts.test(url.pathname) ||
    url.pathname.includes('/css/') ||
    url.pathname.includes('/js/') ||
    url.pathname.includes('/icons/')
  );
}

// Check if request should be cached
function shouldCache(request) {
  const url = new URL(request.url);
  
  // Don't cache API requests in network-first mode
  if (CACHE_PATTERNS.api.test(url.pathname)) {
    return false;
  }
  
  // Don't cache large files
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024 * 1024) {
    return false;
  }
  
  return true;
}

// Get offline page
async function getOfflinePage() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AWTRIX3 - Offline</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                text-align: center;
            }
            .container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(20px);
                padding: 40px;
                border-radius: 20px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                max-width: 500px;
            }
            .icon {
                font-size: 4rem;
                margin-bottom: 20px;
            }
            h1 {
                margin: 20px 0;
                font-size: 2rem;
            }
            p {
                margin: 15px 0;
                opacity: 0.9;
                line-height: 1.6;
            }
            .retry-btn {
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 12px 24px;
                border-radius: 10px;
                cursor: pointer;
                margin-top: 20px;
                transition: all 0.3s ease;
            }
            .retry-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">📱</div>
            <h1>AWTRIX3 ist offline</h1>
            <p>Keine Internetverbindung verfügbar.</p>
            <p>Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.</p>
            <button class="retry-btn" onclick="window.location.reload()">
                🔄 Erneut versuchen
            </button>
        </div>
    </body>
    </html>
  `;
  
  return new Response(offlineHTML, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Background sync for API updates
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'update-settings') {
    event.waitUntil(syncSettings());
  }
});

async function syncSettings() {
  try {
    // Sync any pending settings updates
    console.log('[SW] Syncing settings...');
    // Implementation would depend on your API structure
  } catch (error) {
    console.error('[SW] Settings sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: data.data,
    actions: [
      {
        action: 'open',
        title: 'Öffnen',
        icon: '/icons/action-open.png'
      },
      {
        action: 'dismiss',
        title: 'Ignorieren',
        icon: '/icons/action-dismiss.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
      case 'CLEAR_CACHE':
        clearCache();
        break;
    }
  }
});

async function clearCache() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('[SW] All caches cleared');
}