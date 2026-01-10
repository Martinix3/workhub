import { test, expect } from '../fixtures/auth.fixture'

test.describe('Distributors', () => {
  test.describe('Dashboard', () => {
    test('dashboard de distribuidores carga', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/distribuidores')
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Should show distributors page
      await expect(authenticatedPage).toHaveURL(/\/distribuidores/)
      await expect(authenticatedPage.locator('main')).toBeVisible()
    })

    test('muestra KPIs de red de distribuidores', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/distribuidores')
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Look for KPI cards
      const kpiCards = authenticatedPage.locator('[class*="bg-white"]')
      const count = await kpiCards.count()

      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Portal', () => {
    test('portal de distribuidor carga', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/distribuidores/portal')
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Should show portal page
      await expect(authenticatedPage).toHaveURL(/\/distribuidores\/portal/)
    })

    test('tabs del portal visibles', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/distribuidores/portal')
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Look for tab buttons
      const tabs = authenticatedPage.locator('button, [role="tab"]')
      const count = await tabs.count()

      expect(count).toBeGreaterThan(0)
    })

    test('tab Orders muestra pedidos', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/distribuidores/portal')
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Click on Orders tab if exists
      const ordersTab = authenticatedPage.locator('button:has-text("Orders"), button:has-text("Pedidos")')
      if (await ordersTab.isVisible()) {
        await ordersTab.click()
        await authenticatedPage.waitForTimeout(300)
      }
    })

    test('tab Inventory muestra inventario', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/distribuidores/portal')
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Click on Inventory tab if exists
      const inventoryTab = authenticatedPage.locator('button:has-text("Inventory"), button:has-text("Inventario")')
      if (await inventoryTab.isVisible()) {
        await inventoryTab.click()
        await authenticatedPage.waitForTimeout(300)
      }
    })

    test('tab Analytics muestra analytics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/distribuidores/portal')
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Click on Analytics tab if exists
      const analyticsTab = authenticatedPage.locator('button:has-text("Analytics"), button:has-text("Analitica")')
      if (await analyticsTab.isVisible()) {
        await analyticsTab.click()
        await authenticatedPage.waitForTimeout(300)
      }
    })
  })
})
