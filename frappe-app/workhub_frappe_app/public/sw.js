/**
 * WorkHub Service Worker
 *
 * Progressive Web App service worker for offline support and caching.
 * Implements cache-first strategy for static assets and network-first for API calls.
 */

// Cache version - increment this to force cache update
const CACHE_VERSION = 'v1';
const CACHE_NAME = `workhub-${CACHE_VERSION}`;

// Cache names for different types of resources
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const IMAGE_CACHE = `${CACHE_NAME}-images`;

// Assets to pre-cache during installation
const STATIC_ASSETS = [
    '/app',
    '/assets/workhub_frappe_app/manifest.json',
    '/assets/workhub_frappe_app/img/icon-192.png',
    '/assets/workhub_frappe_app/img/icon-512.png',
    '/assets/workhub_frappe_app/css/workhub.bundle.css',
    '/assets/workhub_frappe_app/js/workhub.bundle.js',
    '/assets/workhub_frappe_app/js/components/swipeable-task.js'
];

// Maximum cache sizes
const MAX_DYNAMIC_CACHE_SIZE = 50; // Maximum number of dynamic cache entries
const MAX_IMAGE_CACHE_SIZE = 30;   // Maximum number of cached images

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Limit cache size by removing oldest entries
 * @param {string} cacheName - Name of the cache to limit
 * @param {number} maxSize - Maximum number of items
 */
async function limitCacheSize(cacheName, maxSize) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    if (keys.length > maxSize) {
        // Remove oldest entries (first in array)
        const deleteCount = keys.length - maxSize;
        for (let i = 0; i < deleteCount; i++) {
            await cache.delete(keys[i]);
        }
    }
}

/**
 * Check if request is for a static asset
 * @param {Request} request - Request object
 * @returns {boolean}
 */
function isStaticAsset(request) {
    const url = new URL(request.url);
    return url.pathname.match(/\.(css|js|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)$/i);
}

/**
 * Check if request is for an image
 * @param {Request} request - Request object
 * @returns {boolean}
 */
function isImageRequest(request) {
    const url = new URL(request.url);
    return url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i);
}

/**
 * Check if request is for an API call
 * @param {Request} request - Request object
 * @returns {boolean}
 */
function isAPIRequest(request) {
    const url = new URL(request.url);
    return url.pathname.startsWith('/api/') || url.pathname.includes('/method/');
}

// ==========================================
// SERVICE WORKER LIFECYCLE EVENTS
// ==========================================

/**
 * Install Event - Pre-cache essential static assets
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...', CACHE_VERSION);

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Pre-caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Static assets cached successfully');
                // Force the waiting service worker to become the active service worker
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Error caching static assets:', error);
            })
    );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...', CACHE_VERSION);

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete old caches that don't match current version
                        if (cacheName.startsWith('workhub-') && !cacheName.includes(CACHE_VERSION)) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Old caches cleaned up');
                // Take control of all clients immediately
                return self.clients.claim();
            })
    );
});

// ==========================================
// FETCH EVENT - Request Interception
// ==========================================

/**
 * Fetch Event - Implement caching strategies
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Different strategies for different types of requests
    if (isImageRequest(request)) {
        // Cache-first strategy for images
        event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE, MAX_IMAGE_CACHE_SIZE));
    } else if (isStaticAsset(request)) {
        // Cache-first strategy for static assets
        event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    } else if (isAPIRequest(request)) {
        // Network-first strategy for API calls
        event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
    } else {
        // Network-first strategy for HTML pages
        event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
    }
});

// ==========================================
// CACHING STRATEGIES
// ==========================================

/**
 * Cache-First Strategy
 * Returns cached response if available, otherwise fetches from network
 *
 * @param {Request} request - Request object
 * @param {string} cacheName - Name of the cache to use
 * @param {number} maxSize - Maximum cache size (optional)
 * @returns {Promise<Response>}
 */
async function cacheFirstStrategy(request, cacheName, maxSize = null) {
    try {
        // Try to get from cache first
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            // Return cached response
            return cachedResponse;
        }

        // Not in cache, fetch from network
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());

            // Limit cache size if specified
            if (maxSize) {
                limitCacheSize(cacheName, maxSize);
            }
        }

        return networkResponse;

    } catch (error) {
        console.error('[SW] Cache-first strategy failed:', error);

        // Try to return cached response as fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline fallback or error response
        return getOfflineFallback(request);
    }
}

/**
 * Network-First Strategy
 * Tries network first, falls back to cache if offline
 *
 * @param {Request} request - Request object
 * @param {string} cacheName - Name of the cache to use
 * @returns {Promise<Response>}
 */
async function networkFirstStrategy(request, cacheName) {
    try {
        // Try network first
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());

            // Limit dynamic cache size
            limitCacheSize(cacheName, MAX_DYNAMIC_CACHE_SIZE);
        }

        return networkResponse;

    } catch (error) {
        console.log('[SW] Network request failed, falling back to cache:', request.url);

        // Network failed, try cache
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // No cache available, return offline fallback
        return getOfflineFallback(request);
    }
}

/**
 * Get offline fallback response
 * @param {Request} request - Request object
 * @returns {Response}
 */
function getOfflineFallback(request) {
    // For HTML requests, return a simple offline page
    if (request.headers.get('accept').includes('text/html')) {
        return new Response(
            `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Offline - WorkHub</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: #ffffff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        padding: 2rem;
                    }
                    .offline-container {
                        text-align: center;
                        max-width: 500px;
                    }
                    .offline-icon {
                        width: 120px;
                        height: 120px;
                        margin: 0 auto 2rem;
                        background: #f5ce3e;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 60px;
                    }
                    h1 {
                        font-size: 2rem;
                        margin-bottom: 1rem;
                        color: #1a1a1a;
                    }
                    p {
                        font-size: 1.125rem;
                        color: #666;
                        line-height: 1.6;
                        margin-bottom: 2rem;
                    }
                    .retry-button {
                        display: inline-block;
                        padding: 0.75rem 2rem;
                        background: #1a1a1a;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 4px;
                        font-weight: 600;
                        border: 2px solid #1a1a1a;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .retry-button:hover {
                        background: #ffffff;
                        color: #1a1a1a;
                    }
                </style>
            </head>
            <body>
                <div class="offline-container">
                    <div class="offline-icon">📡</div>
                    <h1>You're Offline</h1>
                    <p>
                        It looks like you've lost your internet connection.
                        Some cached content may still be available.
                    </p>
                    <button class="retry-button" onclick="window.location.reload()">
                        Try Again
                    </button>
                </div>
            </body>
            </html>
            `,
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-store'
                }
            }
        );
    }

    // For other requests, return a simple error response
    return new Response(
        JSON.stringify({
            error: 'offline',
            message: 'No internet connection available'
        }),
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        }
    );
}

// ==========================================
// MESSAGE EVENTS
// ==========================================

/**
 * Message Event - Handle messages from clients
 */
self.addEventListener('message', (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            // Force service worker to activate immediately
            self.skipWaiting();
            break;

        case 'CLEAR_CACHE':
            // Clear all caches
            event.waitUntil(
                caches.keys().then((cacheNames) => {
                    return Promise.all(
                        cacheNames.map((cacheName) => {
                            if (cacheName.startsWith('workhub-')) {
                                return caches.delete(cacheName);
                            }
                        })
                    );
                }).then(() => {
                    event.ports[0].postMessage({ success: true });
                })
            );
            break;

        case 'GET_CACHE_SIZE':
            // Get current cache size
            event.waitUntil(
                caches.keys().then(async (cacheNames) => {
                    let totalSize = 0;

                    for (const cacheName of cacheNames) {
                        if (cacheName.startsWith('workhub-')) {
                            const cache = await caches.open(cacheName);
                            const keys = await cache.keys();
                            totalSize += keys.length;
                        }
                    }

                    event.ports[0].postMessage({
                        success: true,
                        size: totalSize
                    });
                })
            );
            break;

        default:
            console.log('[SW] Unknown message type:', type);
    }
});

// Log when service worker is ready
console.log('[SW] Service worker script loaded', CACHE_VERSION);
