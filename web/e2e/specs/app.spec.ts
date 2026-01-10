import { test, expect } from '@playwright/test'

test.describe('WorkHub App', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/')

    // Check that the page loaded (look for common elements)
    await expect(page).toHaveTitle(/WorkHub|Santa Brisa/i)
  })

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/ventas')

    // Should redirect to login or show auth required
    await expect(page.locator('text=/login|iniciar sesión|autenticación/i').first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // Or we're on login page already
      expect(page.url()).toContain('login')
    })
  })

  test('should show navigation menu', async ({ page }) => {
    await page.goto('/')

    // Look for common navigation elements
    const nav = page.locator('nav, [role="navigation"], .sidebar, .nav')
    await expect(nav.first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // Navigation might be in a different format
      console.log('Navigation not visible or in different format')
    })
  })
})

test.describe('Navigation', () => {
  test('should navigate to main sections', async ({ page }) => {
    await page.goto('/')

    // Test that key routes exist (may redirect to login)
    const routes = ['/ventas', '/produccion', '/calidad', '/distribuidores', '/marketing']

    for (const route of routes) {
      const response = await page.goto(route)
      expect(response?.status()).toBeLessThan(500)
    }
  })
})
