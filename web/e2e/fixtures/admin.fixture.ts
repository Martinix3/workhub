import { test as base, type Page } from '@playwright/test'
import { ShellPage } from '../pages/shell.page'

/**
 * Admin fixtures for E2E tests
 * Provides pre-authenticated pages with admin (System Manager) privileges
 */

type AdminFixtures = {
  /** Page with admin user logged in (System Manager role) */
  adminAuthenticatedPage: Page
  /** ShellPage instance with admin user */
  adminShellPage: ShellPage
}

export const test = base.extend<AdminFixtures>({
  adminAuthenticatedPage: async ({ browser }, use) => {
    // Create a new context for admin user
    const context = await browser.newContext()
    const page = await context.newPage()

    // Navigate to login
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    // For admin tests, we use bypass login which gives demo user
    // In a real scenario, we would need actual admin credentials
    // The bypass user typically has limited roles but for UI testing purposes
    // we verify access denied messages when accessing admin-only features
    const bypassButton = page.locator(
      '[data-testid="bypass-login"], button:has-text("Revisar UI"), button:has-text("Bypass")'
    ).first()

    await bypassButton.waitFor({ state: 'visible', timeout: 10000 })
    await bypassButton.click()

    // Wait for redirect to home with proper load state
    await page.waitForURL('/', { timeout: 10000 })
    await page.waitForLoadState('domcontentloaded')

    // Verify page loaded
    await page.locator('aside, nav, main').first().waitFor({ state: 'visible', timeout: 5000 })

    await use(page)
    await context.close()
  },

  adminShellPage: async ({ adminAuthenticatedPage }, use) => {
    const shellPage = new ShellPage(adminAuthenticatedPage)
    await use(shellPage)
  },
})

export { expect } from '@playwright/test'

/**
 * Helper to check if user has admin access
 * Returns true if admin features are accessible, false if access denied
 */
export async function hasAdminAccess(page: Page): Promise<boolean> {
  await page.goto('/admin')
  await page.waitForLoadState('domcontentloaded')

  // Check for access denied message (with better selector pattern)
  const accessDeniedLocator = page.locator('text=/Acceso denegado|No tienes permisos|Access Denied/i')
  const accessDenied = await accessDeniedLocator.isVisible().catch(() => false)

  if (accessDenied) {
    return false
  }

  // Check if admin content is visible (using semantic selectors)
  const adminContent = await page.locator(
    'h1:has-text("Admin"), h1:has-text("Usuarios"), [data-testid="admin-content"]'
  ).first().isVisible().catch(() => false)

  return adminContent
}

/**
 * Helper to navigate to admin section if access is available
 */
export async function navigateToAdminIfAllowed(page: Page): Promise<boolean> {
  const hasAccess = await hasAdminAccess(page)

  if (!hasAccess) {
    // Navigate back to home if access denied
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  }

  return hasAccess
}
