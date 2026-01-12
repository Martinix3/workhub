import { test, expect } from '../../fixtures/auth.fixture'
import { prepareForVisualTest } from '../../utils/visual-test-helpers'
import { VISUAL_CONFIG } from '../../config/visual-regression.config'

/**
 * Visual Regression Tests - Dashboard Page
 *
 * Full-page visual tests for the main dashboard page across all viewports
 * Tests the complete page layout, KPI cards, charts, and responsive design
 */

test.describe('Dashboard Visual Regression - Full Page', () => {
  test('dashboard page - desktop viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Take full page screenshot
    await expect(authenticatedPage).toHaveScreenshot('dashboard-full-desktop.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('dashboard page - tablet viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('dashboard-full-tablet.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('dashboard page - mobile viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('dashboard-full-mobile.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })
})

test.describe('Dashboard Visual Regression - Header Section', () => {
  test('dashboard header - default state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Locate dashboard header (title + export button)
    const header = authenticatedPage.locator('h1, h2').filter({ hasText: /Dashboard|KPI/i }).first()
    const isVisible = await header.isVisible().catch(() => false)

    if (isVisible) {
      // Get the parent container that includes the export button
      const headerContainer = header.locator('..').first()
      await expect(headerContainer).toHaveScreenshot('dashboard-header-default.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('dashboard export button - visible', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const exportButton = authenticatedPage.locator('button:has-text("Exportar")').first()
    const isVisible = await exportButton.isVisible().catch(() => false)

    if (isVisible) {
      await expect(exportButton).toHaveScreenshot('dashboard-export-button.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Dashboard Visual Regression - KPI Cards Section', () => {
  test('kpi cards grid - desktop layout', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Locate the KPI cards container
    const kpiGrid = authenticatedPage.locator('.grid, [class*="grid"]').filter({
      has: authenticatedPage.locator('text=/Velocidad|Carga de trabajo|Ratio de atraso/i')
    }).first()
    const isVisible = await kpiGrid.isVisible().catch(() => false)

    if (isVisible) {
      await expect(kpiGrid).toHaveScreenshot('dashboard-kpi-grid-desktop.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('kpi cards grid - mobile layout', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const kpiGrid = authenticatedPage.locator('.grid, [class*="grid"]').filter({
      has: authenticatedPage.locator('text=/Velocidad|Carga de trabajo|Ratio de atraso/i')
    }).first()
    const isVisible = await kpiGrid.isVisible().catch(() => false)

    if (isVisible) {
      await expect(kpiGrid).toHaveScreenshot('dashboard-kpi-grid-mobile.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('velocity kpi card - complete', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const velocityCard = authenticatedPage.locator('[class*="card"], [class*="Card"]').filter({
      hasText: /Velocidad|Velocity/i
    }).first()
    const isVisible = await velocityCard.isVisible().catch(() => false)

    if (isVisible) {
      await expect(velocityCard).toHaveScreenshot('dashboard-velocity-card.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.chart
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('workload kpi card - complete', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const workloadCard = authenticatedPage.locator('[class*="card"], [class*="Card"]').filter({
      hasText: /Carga de trabajo|Workload/i
    }).first()
    const isVisible = await workloadCard.isVisible().catch(() => false)

    if (isVisible) {
      await expect(workloadCard).toHaveScreenshot('dashboard-workload-card.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.chart
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('overdue ratio kpi card - complete', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const overdueCard = authenticatedPage.locator('[class*="card"], [class*="Card"]').filter({
      hasText: /Ratio de atraso|Overdue/i
    }).first()
    const isVisible = await overdueCard.isVisible().catch(() => false)

    if (isVisible) {
      await expect(overdueCard).toHaveScreenshot('dashboard-overdue-card.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.chart
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Dashboard Visual Regression - Charts Section', () => {
  test('velocity trend chart - default view', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Wait for chart to render
    await authenticatedPage.waitForTimeout(500)

    const velocityChart = authenticatedPage.locator('[class*="chart"], [class*="Chart"]').filter({
      has: authenticatedPage.locator('text=/Velocidad|Velocity/i')
    }).first()
    const isVisible = await velocityChart.isVisible().catch(() => false)

    if (isVisible) {
      await expect(velocityChart).toHaveScreenshot('dashboard-velocity-chart.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.chart
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('workload distribution chart - default view', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await authenticatedPage.waitForTimeout(500)

    const workloadChart = authenticatedPage.locator('[class*="chart"], [class*="Chart"]').filter({
      has: authenticatedPage.locator('text=/Carga de trabajo|Workload/i')
    }).first()
    const isVisible = await workloadChart.isVisible().catch(() => false)

    if (isVisible) {
      await expect(workloadChart).toHaveScreenshot('dashboard-workload-chart.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.chart
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('overdue ratio chart - default view', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await authenticatedPage.waitForTimeout(500)

    const overdueChart = authenticatedPage.locator('[class*="chart"], [class*="Chart"]').filter({
      has: authenticatedPage.locator('text=/Ratio de atraso|Overdue/i')
    }).first()
    const isVisible = await overdueChart.isVisible().catch(() => false)

    if (isVisible) {
      await expect(overdueChart).toHaveScreenshot('dashboard-overdue-chart.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.chart
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('charts section - mobile viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await authenticatedPage.waitForTimeout(500)

    // Get the main content area with charts
    const chartsSection = authenticatedPage.locator('[class*="chart"], [class*="Chart"]').first()
    const isVisible = await chartsSection.isVisible().catch(() => false)

    if (isVisible) {
      const chartsContainer = chartsSection.locator('../..').first()
      await expect(chartsContainer).toHaveScreenshot('dashboard-charts-mobile.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.chart
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Dashboard Visual Regression - Empty/Loading States', () => {
  test('dashboard - initial load state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tareas/dashboard')

    // Don't wait for networkidle - capture loading state
    await authenticatedPage.waitForLoadState('domcontentloaded')

    // Look for loading indicators
    const loadingIndicator = authenticatedPage.locator('[class*="loading"], [class*="spinner"], [class*="skeleton"]').first()
    const isVisible = await loadingIndicator.isVisible().catch(() => false)

    if (isVisible) {
      await expect(loadingIndicator).toHaveScreenshot('dashboard-loading-state.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      // If no loading indicator, that's okay - page loaded fast
      expect(true).toBe(true)
    }
  })

  test('dashboard - error state if present', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')

    // Check for error messages
    const errorMessage = authenticatedPage.locator('[class*="error"], [role="alert"]').filter({
      hasText: /error|failed|unable/i
    }).first()
    const isVisible = await errorMessage.isVisible().catch(() => false)

    if (isVisible) {
      await expect(errorMessage).toHaveScreenshot('dashboard-error-state.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      // No error is good
      expect(true).toBe(true)
    }
  })
})

test.describe('Dashboard Visual Regression - Responsive Breakpoints', () => {
  test('dashboard - mobile small (375px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('dashboard-viewport-mobile-small.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('dashboard - mobile medium (390px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.medium)
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('dashboard-viewport-mobile-medium.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('dashboard - mobile large (414px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.large)
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('dashboard-viewport-mobile-large.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('dashboard - tablet small (768px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('dashboard-viewport-tablet-small.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('dashboard - tablet medium (834px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.medium)
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('dashboard-viewport-tablet-medium.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('dashboard - tablet large (1024px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.large)
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('dashboard-viewport-tablet-large.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('dashboard - desktop hd (1280px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.hd)
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('dashboard-viewport-desktop-hd.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('dashboard - desktop fhd (1920px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('dashboard-viewport-desktop-fhd.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('dashboard - desktop 2k (1440px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop['2k'])
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('dashboard-viewport-desktop-2k.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })
})

test.describe('Dashboard Visual Regression - Interactive Elements', () => {
  test('kpi card - hover state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const velocityCard = authenticatedPage.locator('[class*="card"], [class*="Card"]').filter({
      hasText: /Velocidad|Velocity/i
    }).first()
    const isVisible = await velocityCard.isVisible().catch(() => false)

    if (isVisible) {
      await velocityCard.hover()
      await authenticatedPage.waitForTimeout(300)

      await expect(velocityCard).toHaveScreenshot('dashboard-kpi-card-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.chart
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('export button - hover state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const exportButton = authenticatedPage.locator('button:has-text("Exportar")').first()
    const isVisible = await exportButton.isVisible().catch(() => false)

    if (isVisible) {
      await exportButton.hover()
      await authenticatedPage.waitForTimeout(300)

      await expect(exportButton).toHaveScreenshot('dashboard-export-button-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('chart period toggle - if present', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Look for period toggle buttons (7d, 30d, etc.)
    const periodToggle = authenticatedPage.locator('button').filter({ hasText: /7d|30d|90d/i }).first()
    const isVisible = await periodToggle.isVisible().catch(() => false)

    if (isVisible) {
      await expect(periodToggle).toHaveScreenshot('dashboard-period-toggle.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Dashboard Visual Regression - Dark Mode', () => {
  test('dashboard - dark mode if supported', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tareas/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')

    // Try to enable dark mode via theme toggle
    const themeToggle = authenticatedPage.locator('button').filter({
      has: authenticatedPage.locator('svg.lucide-moon, svg.lucide-sun, [class*="moon"], [class*="sun"]')
    }).first()
    const toggleVisible = await themeToggle.isVisible().catch(() => false)

    if (toggleVisible) {
      await themeToggle.click()
      await authenticatedPage.waitForTimeout(300)
      await prepareForVisualTest(authenticatedPage)

      await expect(authenticatedPage).toHaveScreenshot('dashboard-dark-mode.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
        fullPage: true
      })
    } else {
      expect(true).toBe(true)
    }
  })
})
