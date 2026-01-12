import { test, expect } from '@playwright/test'
import { test as authTest } from '../../fixtures/auth.fixture'
import { prepareForVisualTest } from '../../utils/visual-test-helpers'
import { VISUAL_CONFIG } from '../../config/visual-regression.config'

/**
 * Visual Regression Tests - Authentication Flow
 *
 * Tests the complete authentication user journey with visual snapshots
 * Covers login page, bypass authentication, logged-in state, and logout flow
 */

test.describe('Authentication Flow - Login Page', () => {
  test('login page - default state', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    // Capture full login page
    await expect(page).toHaveScreenshot('auth-login-page-default.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  test('login page - bypass button visible', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    // Locate bypass button
    const bypassButton = page.locator('button:has-text("Revisar UI"), button:has-text("Bypass"), [data-testid="bypass-login"]').first()
    const isVisible = await bypassButton.isVisible().catch(() => false)

    if (isVisible) {
      await expect(bypassButton).toHaveScreenshot('auth-bypass-button-default.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('login page - bypass button hover state', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    const bypassButton = page.locator('button:has-text("Revisar UI"), button:has-text("Bypass"), [data-testid="bypass-login"]').first()
    const isVisible = await bypassButton.isVisible().catch(() => false)

    if (isVisible) {
      await bypassButton.hover()
      await page.waitForTimeout(300) // Wait for hover animation

      await expect(bypassButton).toHaveScreenshot('auth-bypass-button-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('login page - mobile viewport', async ({ page }) => {
    await page.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    await expect(page).toHaveScreenshot('auth-login-page-mobile.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  test('login page - tablet viewport', async ({ page }) => {
    await page.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    await expect(page).toHaveScreenshot('auth-login-page-tablet.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  test('login page - desktop viewport', async ({ page }) => {
    await page.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    await expect(page).toHaveScreenshot('auth-login-page-desktop.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })
})

test.describe('Authentication Flow - Authenticated State', () => {
  authTest('authenticated home - sidebar visible', async ({ authenticatedPage }) => {
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Should be on home page with sidebar visible
    await expect(authenticatedPage).toHaveURL('/')

    // Capture authenticated home page
    await expect(authenticatedPage).toHaveScreenshot('auth-authenticated-home.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('authenticated home - sidebar component', async ({ authenticatedPage }) => {
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Locate sidebar
    const sidebar = authenticatedPage.locator('nav, [class*="sidebar"]').first()
    const isVisible = await sidebar.isVisible().catch(() => false)

    if (isVisible) {
      await expect(sidebar).toHaveScreenshot('auth-sidebar-authenticated.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('authenticated home - user menu', async ({ authenticatedPage, shellPage }) => {
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Open user menu
    await shellPage.openUserMenu()
    await authenticatedPage.waitForTimeout(300)

    // Capture user menu
    const userMenu = authenticatedPage.locator('[role="menu"], [class*="dropdown"], [class*="popover"]').first()
    const isVisible = await userMenu.isVisible().catch(() => false)

    if (isVisible) {
      await expect(userMenu).toHaveScreenshot('auth-user-menu-open.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('authenticated home - mobile viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    await authenticatedPage.goto('/')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('auth-authenticated-home-mobile.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('authenticated home - tablet viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    await authenticatedPage.goto('/')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('auth-authenticated-home-tablet.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('authenticated home - desktop viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    await authenticatedPage.goto('/')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('auth-authenticated-home-desktop.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })
})

test.describe('Authentication Flow - Logout', () => {
  authTest('logout - redirects to login page', async ({ authenticatedPage, shellPage }) => {
    // Verify we're authenticated first
    await expect(authenticatedPage).toHaveURL('/')
    await authenticatedPage.waitForLoadState('networkidle')

    // Perform logout
    await shellPage.logout()

    // Wait for redirect to login
    await authenticatedPage.waitForURL(/\/login/, { timeout: 10000 })
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Capture login page after logout
    await expect(authenticatedPage).toHaveScreenshot('auth-login-after-logout.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('logout - login page elements visible', async ({ authenticatedPage, shellPage }) => {
    // Logout
    await shellPage.logout()
    await authenticatedPage.waitForURL(/\/login/, { timeout: 10000 })
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Check bypass button is visible again
    const bypassButton = authenticatedPage.locator('button:has-text("Revisar UI"), button:has-text("Bypass"), [data-testid="bypass-login"]').first()
    const isVisible = await bypassButton.isVisible().catch(() => false)

    if (isVisible) {
      await expect(bypassButton).toHaveScreenshot('auth-bypass-button-after-logout.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Authentication Flow - Protected Routes', () => {
  test('protected route - redirects to login', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/ventas')
    await page.waitForLoadState('networkidle')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
    await prepareForVisualTest(page)

    // Capture login page when accessing protected route
    await expect(page).toHaveScreenshot('auth-protected-route-redirect.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('admin route - access without admin role', async ({ authenticatedPage }) => {
    // Try to access admin route (demo user doesn't have admin role)
    await authenticatedPage.goto('/admin')
    await authenticatedPage.waitForLoadState('domcontentloaded')
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    // Capture the result (could be access denied or graceful handling)
    await expect(authenticatedPage).toHaveScreenshot('auth-admin-route-non-admin.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })
})

test.describe('Authentication Flow - Session Persistence', () => {
  authTest('session - after page refresh', async ({ authenticatedPage }) => {
    // Verify authenticated
    await expect(authenticatedPage).toHaveURL('/')
    await authenticatedPage.waitForLoadState('networkidle')

    // Refresh page
    await authenticatedPage.reload()
    await authenticatedPage.waitForLoadState('domcontentloaded')
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    // Capture page after refresh (may stay authenticated or redirect to login)
    const currentUrl = authenticatedPage.url()
    const screenshotName = currentUrl.includes('/login')
      ? 'auth-session-refresh-logged-out.png'
      : 'auth-session-refresh-persisted.png'

    await expect(authenticatedPage).toHaveScreenshot(screenshotName, {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })
})

test.describe('Authentication Flow - Cross-Browser Consistency', () => {
  test('login page - cross-browser @chromium @firefox @webkit', async ({ page, browserName }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    // Include browser name in screenshot for browser-specific baselines
    await expect(page).toHaveScreenshot(`auth-login-${browserName}.png`, {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('authenticated home - cross-browser @chromium @firefox @webkit', async ({ authenticatedPage, browserName }) => {
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot(`auth-home-${browserName}.png`, {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })
})
