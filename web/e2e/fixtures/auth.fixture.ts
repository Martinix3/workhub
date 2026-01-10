import { test as base, type Page } from '@playwright/test'
import { ShellPage } from '../pages/shell.page'

/**
 * Auth fixtures for E2E tests
 * Provides pre-authenticated pages for different user roles
 */

type AuthFixtures = {
  /** Page with demo user logged in (Sales Manager, Viewer roles) */
  authenticatedPage: Page
  /** ShellPage instance with authenticated user */
  shellPage: ShellPage
  /** Page with admin user (System Manager role) - for admin tests */
  adminPage: Page
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login and use bypass mode
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    // Click bypass login button ("Revisar UI" is the bypass mode button)
    const bypassButton = page.locator('button:has-text("Revisar UI"), button:has-text("Bypass"), [data-testid="bypass-login"]').first()
    await bypassButton.waitFor({ state: 'visible', timeout: 10000 })
    await bypassButton.click()

    // Wait for redirect to home
    await page.waitForURL('/', { timeout: 15000 })
    await page.waitForLoadState('domcontentloaded')

    await use(page)
  },

  shellPage: async ({ authenticatedPage }, use) => {
    const shellPage = new ShellPage(authenticatedPage)
    await use(shellPage)
  },

  adminPage: async ({ browser }, use) => {
    // Create a new context for admin user
    const context = await browser.newContext()
    const page = await context.newPage()

    // Login with bypass (demo user has Sales Manager which is not admin)
    // For now, we'll use the same bypass but tests should check Access Denied
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    const bypassButton = page.locator('button:has-text("Revisar UI"), button:has-text("Bypass"), [data-testid="bypass-login"]').first()
    await bypassButton.waitFor({ state: 'visible', timeout: 10000 })
    await bypassButton.click()
    await page.waitForURL('/', { timeout: 15000 })

    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
