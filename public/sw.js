// Service Worker for ApexFit.ai Alpha
// Provides offline support, caching, and performance optimizations

const CACHE_NAME = 'apex-fit-v1.0.0'
const STATIC_CACHE = 'apex-fit-static-v1'
const DATA_CACHE = 'apex-fit-data-v1'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/_next/static/css/', // Will be populated during build
  '/_next/static/js/',  // Will be populated during build
]

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/data/user',
  '/api/data/entries',
  '/python-api/performance/stats'
]

// Network-first cache strategies for these routes
const NETWORK_FIRST_ROUTES = [
  '/api/data/entries',
  '/python-api/calculate',
  '/python-api/generate-report'
]

// Cache-first strategies for these routes
const CACHE_FIRST_ROUTES = [
  '/_next/static/',
  '/static/',
  '/images/',
  '/icons/'
]

self.addEventListener('install', (event) => {
  console.log('Service Worker installing')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        return self.skipWaiting()
      })
  )
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && cacheName !== DATA_CACHE) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        return self.clients.claim()
      })
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // Handle different caching strategies
  if (shouldUseNetworkFirst(request)) {
    event.respondWith(networkFirstStrategy(request))
  } else if (shouldUseCacheFirst(request)) {
    event.respondWith(cacheFirstStrategy(request))
  } else {
    event.respondWith(staleWhileRevalidateStrategy(request))
  }
})

// Network-first strategy: Try network, fallback to cache
async function networkFirstStrategy(request) {
  const cache = await caches.open(DATA_CACHE)
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Network request failed, trying cache:', request.url)
    
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || new Response('Offline')
    }
    
    throw error
  }
}

// Cache-first strategy: Try cache, fallback to network
async function cacheFirstStrategy(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Cache-first strategy failed for:', request.url)
    throw error
  }
}

// Stale-while-revalidate: Return cache immediately, update in background
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)
  
  // Return cached version immediately if available
  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone())
        }
      })
      .catch(() => {
        // Ignore network errors for background updates
      })
    
    return cachedResponse
  }
  
  // No cache available, try network
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Return generic offline response
    return new Response('Content not available offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

// Helper functions to determine caching strategy
function shouldUseNetworkFirst(request) {
  return NETWORK_FIRST_ROUTES.some(route => request.url.includes(route))
}

function shouldUseCacheFirst(request) {
  return CACHE_FIRST_ROUTES.some(route => request.url.includes(route))
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  console.log('Running background sync')
  
  // Sync any pending data when connection is restored
  try {
    const cache = await caches.open(DATA_CACHE)
    const requests = await cache.keys()
    
    // Clear stale cache entries
    const now = Date.now()
    const staleTime = 24 * 60 * 60 * 1000 // 24 hours
    
    for (const request of requests) {
      const response = await cache.match(request)
      const cachedTime = response?.headers.get('sw-cached-time')
      
      if (cachedTime && (now - parseInt(cachedTime)) > staleTime) {
        await cache.delete(request)
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0].postMessage(stats)
    })
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({ success: true })
    })
  }
})

async function getCacheStats() {
  const cacheNames = await caches.keys()
  const stats = {}
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    stats[cacheName] = keys.length
  }
  
  return {
    caches: stats,
    totalCaches: cacheNames.length,
    totalEntries: Object.values(stats).reduce((sum, count) => sum + count, 0)
  }
}

async function clearAllCaches() {
  const cacheNames = await caches.keys()
  
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  )
}

// Log service worker events for debugging
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason)
})

console.log('Service Worker loaded')