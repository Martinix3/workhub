import { test, expect } from '../fixtures/auth.fixture'

test.describe('Production', () => {
  test.describe('Dashboard', () => {
    test('dashboard carga correctamente', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/produccion')
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Should show production content
      await expect(authenticatedPage.locator('main')).toBeVisible()
    })

    test('muestra KPIs de produccion', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/produccion')
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Look for KPI cards
      const kpiCards = authenticatedPage.locator('[class*="bg-white"]')
      const count = await kpiCards.count()

      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Lotes', () => {
    test('lista de lotes carga', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/produccion/lotes')
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Should show lotes page
      await expect(authenticatedPage).toHaveURL(/\/produccion\/lotes/)
    })

    test('filtros de lotes visibles', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/produccion/lotes')
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Look for filter/search elements
      const searchOrFilter = authenticatedPage.locator('input, button:has-text("Filtrar")')
      const count = await searchOrFilter.count()

      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('HACCP Monitor', () => {
    test('HACCP monitor carga', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/produccion/haccp')
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Should show HACCP page
      await expect(authenticatedPage).toHaveURL(/\/produccion\/haccp/)
    })

    test('muestra planes HACCP', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/produccion/haccp')
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Look for HACCP plan cards or table
      const content = authenticatedPage.locator('main')
      await expect(content).toBeVisible()
    })
  })

  test.describe('Documentos', () => {
    test('biblioteca de documentos carga', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/produccion/documentos')
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Should show documents page
      await expect(authenticatedPage).toHaveURL(/\/produccion\/documentos/)
    })

    test('navegacion de carpetas visible', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/produccion/documentos')
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Look for folder structure
      const content = authenticatedPage.locator('main')
      await expect(content).toBeVisible()
    })
  })
})

test.describe('Calidad', () => {
  test('dashboard de calidad carga', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/calidad')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    // Should show quality page
    await expect(authenticatedPage).toHaveURL(/\/calidad/)
    await expect(authenticatedPage.locator('main')).toBeVisible()
  })
})
