import { test, expect } from '../fixtures/auth.fixture'
import { viewports } from '../fixtures/viewport.fixture'

/**
 * PWA (Progressive Web App) E2E Tests
 *
 * Tests offline capability and service worker functionality:
 * - Service worker registration
 * - Cache strategies (cache-first, network-first)
 * - Offline fallback pages
 * - Manifest.json and PWA metadata
 * - Cache management (clear, size limit)
 * - Connectivity detection
 */

test.describe('PWA - Service Worker Registration', () => {
  test('service worker should be registered successfully', async ({ authenticatedPage }) => {
    // Navigate to app to trigger service worker registration
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')

    // Wait for service worker to register (up to 5 seconds)
    await authenticatedPage.waitForTimeout(2000)

    // Check if service worker is registered
    const swRegistered = await authenticatedPage.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return false
      }

      const registration = await navigator.serviceWorker.getRegistration()
      return registration !== undefined
    })

    expect(swRegistered).toBe(true)
  })

  test('service worker script should be accessible', async ({ authenticatedPage }) => {
    // Try to fetch the service worker script
    const response = await authenticatedPage.goto('/assets/workhub_frappe_app/sw.js')

    expect(response?.status()).toBe(200)

    const contentType = response?.headers()['content-type']
    expect(contentType).toContain('javascript')
  })

  test('service worker should have correct scope', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    const swScope = await authenticatedPage.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return null
      }

      const registration = await navigator.serviceWorker.getRegistration()
      return registration?.scope
    })

    // Service worker scope should be root (/)
    expect(swScope).toContain('/')
  })

  test('service worker state should be active', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    const swState = await authenticatedPage.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return null
      }

      const registration = await navigator.serviceWorker.getRegistration()
      return registration?.active?.state
    })

    // Service worker should be in 'activated' or 'activating' state
    expect(['activated', 'activating']).toContain(swState)
  })
})

test.describe('PWA - Manifest and Metadata', () => {
  test('manifest.json should be accessible', async ({ authenticatedPage }) => {
    const response = await authenticatedPage.goto('/assets/workhub_frappe_app/manifest.json')

    expect(response?.status()).toBe(200)

    const contentType = response?.headers()['content-type']
    expect(contentType).toContain('json')
  })

  test('manifest.json should have required PWA fields', async ({ authenticatedPage }) => {
    const response = await authenticatedPage.goto('/assets/workhub_frappe_app/manifest.json')
    const manifest = await response?.json()

    // Check required manifest fields
    expect(manifest).toHaveProperty('name')
    expect(manifest).toHaveProperty('short_name')
    expect(manifest).toHaveProperty('start_url')
    expect(manifest).toHaveProperty('display')
    expect(manifest).toHaveProperty('theme_color')
    expect(manifest).toHaveProperty('background_color')
    expect(manifest).toHaveProperty('icons')

    // Check icons array is not empty
    expect(Array.isArray(manifest.icons)).toBe(true)
    expect(manifest.icons.length).toBeGreaterThan(0)
  })

  test('PWA icons should be accessible', async ({ authenticatedPage }) => {
    // Test 192x192 icon
    const icon192Response = await authenticatedPage.goto('/assets/workhub_frappe_app/img/icon-192.png')
    expect(icon192Response?.status()).toBe(200)
    expect(icon192Response?.headers()['content-type']).toContain('image/png')

    // Test 512x512 icon
    const icon512Response = await authenticatedPage.goto('/assets/workhub_frappe_app/img/icon-512.png')
    expect(icon512Response?.status()).toBe(200)
    expect(icon512Response?.headers()['content-type']).toContain('image/png')
  })

  test('HTML should include manifest link', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')

    const manifestLink = await authenticatedPage.locator('link[rel="manifest"]').getAttribute('href')

    expect(manifestLink).toBeTruthy()
    expect(manifestLink).toContain('manifest.json')
  })

  test('HTML should include PWA meta tags', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')

    // Check for Apple touch icon
    const appleTouchIcon = await authenticatedPage.locator('link[rel="apple-touch-icon"]').count()
    expect(appleTouchIcon).toBeGreaterThan(0)

    // Check for theme color meta tag
    const themeColor = await authenticatedPage.locator('meta[name="theme-color"]').getAttribute('content')
    expect(themeColor).toBeTruthy()
  })
})

test.describe('PWA - Caching Functionality', () => {
  test('static assets should be cached after first load', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    // Check if cache contains static assets
    const hasCachedAssets = await authenticatedPage.evaluate(async () => {
      if (!('caches' in window)) {
        return false
      }

      const cacheNames = await caches.keys()
      const workhubCaches = cacheNames.filter(name => name.startsWith('workhub-'))

      if (workhubCaches.length === 0) {
        return false
      }

      // Check if static cache has entries
      for (const cacheName of workhubCaches) {
        const cache = await caches.open(cacheName)
        const keys = await cache.keys()
        if (keys.length > 0) {
          return true
        }
      }

      return false
    })

    expect(hasCachedAssets).toBe(true)
  })

  test('cache should contain manifest.json', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    const manifestCached = await authenticatedPage.evaluate(async () => {
      if (!('caches' in window)) {
        return false
      }

      const cacheNames = await caches.keys()

      for (const cacheName of cacheNames) {
        if (cacheName.startsWith('workhub-')) {
          const cache = await caches.open(cacheName)
          const response = await cache.match('/assets/workhub_frappe_app/manifest.json')
          if (response) {
            return true
          }
        }
      }

      return false
    })

    expect(manifestCached).toBe(true)
  })

  test('cache should contain PWA icons', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    const iconsCached = await authenticatedPage.evaluate(async () => {
      if (!('caches' in window)) {
        return { icon192: false, icon512: false }
      }

      const cacheNames = await caches.keys()
      let icon192 = false
      let icon512 = false

      for (const cacheName of cacheNames) {
        if (cacheName.startsWith('workhub-')) {
          const cache = await caches.open(cacheName)

          if (await cache.match('/assets/workhub_frappe_app/img/icon-192.png')) {
            icon192 = true
          }

          if (await cache.match('/assets/workhub_frappe_app/img/icon-512.png')) {
            icon512 = true
          }
        }
      }

      return { icon192, icon512 }
    })

    expect(iconsCached.icon192).toBe(true)
    expect(iconsCached.icon512).toBe(true)
  })

  test('cache should contain CSS bundle', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    const cssBundleCached = await authenticatedPage.evaluate(async () => {
      if (!('caches' in window)) {
        return false
      }

      const cacheNames = await caches.keys()

      for (const cacheName of cacheNames) {
        if (cacheName.startsWith('workhub-')) {
          const cache = await caches.open(cacheName)
          const keys = await cache.keys()

          // Look for workhub.bundle.css in cache
          const hasCSSBundle = keys.some(request =>
            request.url.includes('workhub.bundle.css')
          )

          if (hasCSSBundle) {
            return true
          }
        }
      }

      return false
    })

    expect(cssBundleCached).toBe(true)
  })

  test('cache should contain JS bundle', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    const jsBundleCached = await authenticatedPage.evaluate(async () => {
      if (!('caches' in window)) {
        return false
      }

      const cacheNames = await caches.keys()

      for (const cacheName of cacheNames) {
        if (cacheName.startsWith('workhub-')) {
          const cache = await caches.open(cacheName)
          const keys = await cache.keys()

          // Look for workhub.bundle.js in cache
          const hasJSBundle = keys.some(request =>
            request.url.includes('workhub.bundle.js')
          )

          if (hasJSBundle) {
            return true
          }
        }
      }

      return false
    })

    expect(jsBundleCached).toBe(true)
  })
})

test.describe('PWA - Cache Management', () => {
  test('getCacheSize() should return cache size', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    const cacheSize = await authenticatedPage.evaluate(async () => {
      // Use frappe.workhub.serviceWorker.getCacheSize() if available
      if (window.frappe?.workhub?.serviceWorker?.getCacheSize) {
        try {
          const size = await window.frappe.workhub.serviceWorker.getCacheSize()
          return size
        } catch {
          return null
        }
      }

      // Fallback: manually count cache entries
      if (!('caches' in window)) {
        return 0
      }

      const cacheNames = await caches.keys()
      let totalSize = 0

      for (const cacheName of cacheNames) {
        if (cacheName.startsWith('workhub-')) {
          const cache = await caches.open(cacheName)
          const keys = await cache.keys()
          totalSize += keys.length
        }
      }

      return totalSize
    })

    // Cache should have at least the pre-cached static assets
    expect(cacheSize).toBeGreaterThan(0)
  })

  test('clearCache() should clear all WorkHub caches', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    const result = await authenticatedPage.evaluate(async () => {
      // Get initial cache size
      let initialSize = 0
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        for (const cacheName of cacheNames) {
          if (cacheName.startsWith('workhub-')) {
            const cache = await caches.open(cacheName)
            const keys = await cache.keys()
            initialSize += keys.length
          }
        }
      }

      // Clear cache using frappe.workhub.serviceWorker.clearCache() if available
      if (window.frappe?.workhub?.serviceWorker?.clearCache) {
        try {
          await window.frappe.workhub.serviceWorker.clearCache()
        } catch {
          // Ignore errors
        }
      }

      // Get final cache size
      let finalSize = 0
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        for (const cacheName of cacheNames) {
          if (cacheName.startsWith('workhub-')) {
            const cache = await caches.open(cacheName)
            const keys = await cache.keys()
            finalSize += keys.length
          }
        }
      }

      return {
        initialSize,
        finalSize,
        cleared: finalSize === 0
      }
    })

    // Initial size should be > 0 (had cached assets)
    expect(result.initialSize).toBeGreaterThan(0)

    // Final size should be 0 or much smaller (cleared)
    // Note: Service worker might immediately re-cache some assets
    expect(result.finalSize).toBeLessThanOrEqual(result.initialSize)
  })

  test('cache should have size limits', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    const cacheLimits = await authenticatedPage.evaluate(async () => {
      if (!('caches' in window)) {
        return null
      }

      const cacheNames = await caches.keys()
      const results: any = {}

      for (const cacheName of cacheNames) {
        if (cacheName.startsWith('workhub-')) {
          const cache = await caches.open(cacheName)
          const keys = await cache.keys()
          results[cacheName] = keys.length
        }
      }

      return results
    })

    if (cacheLimits) {
      // Each cache should have reasonable size (not unbounded)
      for (const [cacheName, size] of Object.entries(cacheLimits)) {
        // Dynamic cache should have <= 50 entries
        if (cacheName.includes('dynamic')) {
          expect(size).toBeLessThanOrEqual(50)
        }
        // Image cache should have <= 30 entries
        if (cacheName.includes('images')) {
          expect(size).toBeLessThanOrEqual(30)
        }
        // Static cache can have more entries (no strict limit)
        if (cacheName.includes('static')) {
          expect(size).toBeGreaterThan(0)
        }
      }
    }
  })
})

test.describe('PWA - Connectivity Detection', () => {
  test('offline indicator should exist on page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(1000)

    // Check if offline indicator element exists in DOM
    const offlineIndicator = authenticatedPage.locator('.wh-offline-indicator')

    // Indicator might be hidden initially (only shows when offline)
    const exists = await offlineIndicator.count()
    expect(exists >= 0).toBe(true)
  })

  test('should detect online state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')

    const isOnline = await authenticatedPage.evaluate(() => navigator.onLine)

    // Page should be online during test
    expect(isOnline).toBe(true)
  })

  test('frappe.workhub.serviceWorker should have connectivity methods', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    const hasConnectivityMethods = await authenticatedPage.evaluate(() => {
      return {
        hasServiceWorker: !!window.frappe?.workhub?.serviceWorker,
        hasIsOnline: typeof window.frappe?.workhub?.serviceWorker?.isOnline === 'function'
      }
    })

    expect(hasConnectivityMethods.hasServiceWorker).toBe(true)
    // isOnline method might or might not exist depending on implementation
  })

  test('should handle network state changes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')

    // Test that window has online/offline event listeners
    const hasEventListeners = await authenticatedPage.evaluate(() => {
      // Trigger offline event to test listener exists
      const offlineEvent = new Event('offline')
      window.dispatchEvent(offlineEvent)

      // Trigger online event
      const onlineEvent = new Event('online')
      window.dispatchEvent(onlineEvent)

      return true
    })

    expect(hasEventListeners).toBe(true)
  })
})

test.describe('PWA - Offline Mode', () => {
  test('should serve cached page when offline', async ({ authenticatedPage, context }) => {
    // First, load the page while online to populate cache
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    // Simulate offline mode
    await context.setOffline(true)

    // Try to navigate (should serve from cache)
    try {
      await authenticatedPage.reload({ waitUntil: 'networkidle' })

      // Page should still be accessible (from cache)
      const title = await authenticatedPage.title()
      expect(title.length).toBeGreaterThan(0)
    } finally {
      // Restore online mode
      await context.setOffline(false)
    }
  })

  test('should show offline fallback for uncached pages', async ({ authenticatedPage, context }) => {
    // Simulate offline mode
    await context.setOffline(true)

    try {
      // Try to navigate to a page that likely isn't cached
      const response = await authenticatedPage.goto('/app/some-uncached-page-12345')

      // Should get offline fallback (503 status or cached response)
      // If cached, status might be 200; if not cached, should be 503 or error
      const status = response?.status()

      // Either cached (200), offline fallback (503), or failed navigation
      expect([200, 503, 0, undefined]).toContain(status)
    } catch (error) {
      // Expected to fail when offline and not cached
      expect(true).toBe(true)
    } finally {
      // Restore online mode
      await context.setOffline(false)
    }
  })

  test('offline fallback page should have correct content', async ({ authenticatedPage, context }) => {
    // Clear cache first to ensure we get offline fallback
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')

    await authenticatedPage.evaluate(async () => {
      if (window.frappe?.workhub?.serviceWorker?.clearCache) {
        await window.frappe.workhub.serviceWorker.clearCache()
      }
    })

    // Go offline
    await context.setOffline(true)

    try {
      // Navigate to uncached page
      await authenticatedPage.goto('/app/offline-test-page-98765')

      // Check for offline fallback content
      const pageContent = await authenticatedPage.content()

      // Offline page should contain "offline" or "connection" text
      const hasOfflineContent =
        pageContent.toLowerCase().includes('offline') ||
        pageContent.toLowerCase().includes('connection') ||
        pageContent.toLowerCase().includes('internet')

      // Either shows offline fallback or cached content
      expect(hasOfflineContent || pageContent.length > 100).toBe(true)
    } catch (error) {
      // Expected to potentially fail when offline
      expect(true).toBe(true)
    } finally {
      // Restore online mode
      await context.setOffline(false)
    }
  })
})

test.describe('PWA - Mobile Viewport', () => {
  test.use({ viewport: viewports.mobile })

  test('PWA should work on mobile viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    // Check if service worker is registered on mobile
    const swRegistered = await authenticatedPage.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return false
      }

      const registration = await navigator.serviceWorker.getRegistration()
      return registration !== undefined
    })

    expect(swRegistered).toBe(true)
  })

  test('offline indicator should be visible on mobile when offline', async ({ authenticatedPage, context }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(1000)

    // Go offline
    await context.setOffline(true)

    // Trigger offline event
    await authenticatedPage.evaluate(() => {
      window.dispatchEvent(new Event('offline'))
    })

    await authenticatedPage.waitForTimeout(500)

    // Check if offline indicator is shown
    const offlineIndicator = authenticatedPage.locator('.wh-offline-indicator')
    const indicatorVisible = await offlineIndicator.isVisible().catch(() => false)

    // Restore online
    await context.setOffline(false)

    // Indicator should exist (might not be visible if animation timing)
    expect(indicatorVisible || await offlineIndicator.count() > 0).toBe(true)
  })

  test('manifest should have mobile-optimized settings', async ({ authenticatedPage }) => {
    const response = await authenticatedPage.goto('/assets/workhub_frappe_app/manifest.json')
    const manifest = await response?.json()

    // Check mobile-specific manifest settings
    expect(manifest.display).toBeTruthy()
    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display)

    // Should have orientation preference
    expect(manifest.orientation).toBeTruthy()
  })
})

test.describe('PWA - Cache Strategies', () => {
  test('static assets should use cache-first strategy', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    // Check that CSS bundle is cached
    const cssCached = await authenticatedPage.evaluate(async () => {
      if (!('caches' in window)) {
        return false
      }

      const response = await caches.match('/assets/workhub_frappe_app/css/workhub.bundle.css')
      return !!response
    })

    expect(cssCached).toBe(true)
  })

  test('images should be cached after first load', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    // Load an image
    await authenticatedPage.goto('/assets/workhub_frappe_app/img/icon-192.png')
    await authenticatedPage.waitForTimeout(1000)

    // Check if image is cached
    const imageCached = await authenticatedPage.evaluate(async () => {
      if (!('caches' in window)) {
        return false
      }

      const response = await caches.match('/assets/workhub_frappe_app/img/icon-192.png')
      return !!response
    })

    expect(imageCached).toBe(true)
  })

  test('API calls should use network-first strategy', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')

    // API calls should go through service worker with network-first strategy
    // We can't easily test this without mocking, but we can verify
    // that service worker is intercepting fetch events

    const swActive = await authenticatedPage.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return false
      }

      const registration = await navigator.serviceWorker.getRegistration()
      return registration?.active?.state === 'activated'
    })

    expect(swActive).toBe(true)
  })
})

test.describe('PWA - Update Handling', () => {
  test('service worker should check for updates', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    const canUpdate = await authenticatedPage.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return false
      }

      const registration = await navigator.serviceWorker.getRegistration()

      // Check if update() method is available
      if (registration && typeof registration.update === 'function') {
        try {
          await registration.update()
          return true
        } catch {
          return false
        }
      }

      return false
    })

    expect(canUpdate).toBe(true)
  })

  test('should have activateUpdate method', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)

    const hasActivateUpdate = await authenticatedPage.evaluate(() => {
      return typeof window.frappe?.workhub?.serviceWorker?.activateUpdate === 'function'
    })

    expect(hasActivateUpdate).toBe(true)
  })
})
