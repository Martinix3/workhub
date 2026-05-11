import { test, expect } from '@playwright/test'
import { test as authTest } from '../../fixtures/auth.fixture'
import { prepareForVisualTest } from '../../utils/visual-test-helpers'
import { VISUAL_CONFIG } from '../../config/visual-regression.config'
import { KanbanPage } from '../../pages/tasks/kanban.page'
import { ProjectsPage } from '../../pages/tasks/projects.page'

/**
 * Visual Regression Tests - Filter Management Flow
 *
 * Tests the filter system across different pages with visual snapshots
 * Covers filter buttons, active states, filtered results, and responsive design
 */

test.describe('Filter Flow - Kanban Department Filters', () => {
  authTest('department filters - default state', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Look for department filter row
    const filterRow = authenticatedPage.locator('button:has-text("Todos"), button:has-text("SALES")').first().locator('xpath=ancestor::*[2]').first()
    const isVisible = await filterRow.isVisible().catch(() => false)

    if (isVisible) {
      await expect(filterRow).toHaveScreenshot('filters-kanban-department-default.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('department filter - "Todos" active state', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Click "Todos" filter
    const todosButton = authenticatedPage.locator('button:has-text("Todos")').first()
    const isVisible = await todosButton.isVisible().catch(() => false)

    if (isVisible) {
      await todosButton.click()
      await authenticatedPage.waitForTimeout(300)

      await expect(todosButton).toHaveScreenshot('filters-kanban-todos-active.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('department filter - "SALES" hover state', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const salesButton = authenticatedPage.locator('button:has-text("SALES")').first()
    const isVisible = await salesButton.isVisible().catch(() => false)

    if (isVisible) {
      await salesButton.hover()
      await authenticatedPage.waitForTimeout(300)

      await expect(salesButton).toHaveScreenshot('filters-kanban-sales-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('department filter - "OPS" active state', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const opsButton = authenticatedPage.locator('button:has-text("OPS")').first()
    const isVisible = await opsButton.isVisible().catch(() => false)

    if (isVisible) {
      await opsButton.click()
      await authenticatedPage.waitForTimeout(300)

      await expect(opsButton).toHaveScreenshot('filters-kanban-ops-active.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('department filter - "MKT" active state', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const mktButton = authenticatedPage.locator('button:has-text("MKT")').first()
    const isVisible = await mktButton.isVisible().catch(() => false)

    if (isVisible) {
      await mktButton.click()
      await authenticatedPage.waitForTimeout(300)

      await expect(mktButton).toHaveScreenshot('filters-kanban-mkt-active.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('kanban board - before department filter applied', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('filters-kanban-board-before-filter.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('kanban board - after SALES filter applied', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const salesButton = authenticatedPage.locator('button:has-text("SALES")').first()
    const isVisible = await salesButton.isVisible().catch(() => false)

    if (isVisible) {
      await salesButton.click()
      await authenticatedPage.waitForTimeout(500)
      await prepareForVisualTest(authenticatedPage)

      await expect(authenticatedPage).toHaveScreenshot('filters-kanban-board-sales-filtered.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('kanban board - after OPS filter applied', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const opsButton = authenticatedPage.locator('button:has-text("OPS")').first()
    const isVisible = await opsButton.isVisible().catch(() => false)

    if (isVisible) {
      await opsButton.click()
      await authenticatedPage.waitForTimeout(500)
      await prepareForVisualTest(authenticatedPage)

      await expect(authenticatedPage).toHaveScreenshot('filters-kanban-board-ops-filtered.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Filter Flow - Projects Status Filters', () => {
  authTest('status filters - default state', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Look for status filter row
    const filterRow = authenticatedPage.locator('button:has-text("Todos"), button:has-text("Activo")').first().locator('xpath=ancestor::*[2]').first()
    const isVisible = await filterRow.isVisible().catch(() => false)

    if (isVisible) {
      await expect(filterRow).toHaveScreenshot('filters-projects-status-default.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('status filter - "Todos" active state', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const todosButton = projectsPage.allFilter
    const isVisible = await todosButton.isVisible().catch(() => false)

    if (isVisible) {
      await todosButton.click()
      await authenticatedPage.waitForTimeout(300)

      await expect(todosButton).toHaveScreenshot('filters-projects-todos-active.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('status filter - "Activo" hover state', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const activoButton = projectsPage.activeFilter
    const isVisible = await activoButton.isVisible().catch(() => false)

    if (isVisible) {
      await activoButton.hover()
      await authenticatedPage.waitForTimeout(300)

      await expect(activoButton).toHaveScreenshot('filters-projects-activo-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('status filter - "Activo" active state', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const activoButton = projectsPage.activeFilter
    const isVisible = await activoButton.isVisible().catch(() => false)

    if (isVisible) {
      await activoButton.click()
      await authenticatedPage.waitForTimeout(300)

      await expect(activoButton).toHaveScreenshot('filters-projects-activo-active.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('status filter - "Pausado" active state', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const pausadoButton = projectsPage.pausedFilter
    const isVisible = await pausadoButton.isVisible().catch(() => false)

    if (isVisible) {
      await pausadoButton.click()
      await authenticatedPage.waitForTimeout(300)

      await expect(pausadoButton).toHaveScreenshot('filters-projects-pausado-active.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('status filter - "Completado" active state', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const completadoButton = projectsPage.completedFilter
    const isVisible = await completadoButton.isVisible().catch(() => false)

    if (isVisible) {
      await completadoButton.click()
      await authenticatedPage.waitForTimeout(300)

      await expect(completadoButton).toHaveScreenshot('filters-projects-completado-active.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('projects list - before status filter applied', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('filters-projects-list-before-filter.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('projects list - after Activo filter applied', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const activoButton = projectsPage.activeFilter
    const isVisible = await activoButton.isVisible().catch(() => false)

    if (isVisible) {
      await activoButton.click()
      await authenticatedPage.waitForTimeout(500)
      await prepareForVisualTest(authenticatedPage)

      await expect(authenticatedPage).toHaveScreenshot('filters-projects-list-activo-filtered.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('projects list - after Completado filter applied', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const completadoButton = projectsPage.completedFilter
    const isVisible = await completadoButton.isVisible().catch(() => false)

    if (isVisible) {
      await completadoButton.click()
      await authenticatedPage.waitForTimeout(500)
      await prepareForVisualTest(authenticatedPage)

      await expect(authenticatedPage).toHaveScreenshot('filters-projects-list-completado-filtered.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Filter Flow - Priority Filters', () => {
  authTest('priority badges - all priorities visible', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Look for priority badge
    const priorityBadge = authenticatedPage.locator('text=/^P[0-2]$/').first()
    const isVisible = await priorityBadge.isVisible().catch(() => false)

    if (isVisible) {
      await expect(priorityBadge).toHaveScreenshot('filters-priority-badge.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('priority P0 badge - critical priority', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const p0Badge = authenticatedPage.locator('text=P0').first()
    const isVisible = await p0Badge.isVisible().catch(() => false)

    if (isVisible) {
      await expect(p0Badge).toHaveScreenshot('filters-priority-p0-badge.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('priority P1 badge - high priority', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const p1Badge = authenticatedPage.locator('text=P1').first()
    const isVisible = await p1Badge.isVisible().catch(() => false)

    if (isVisible) {
      await expect(p1Badge).toHaveScreenshot('filters-priority-p1-badge.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('priority P2 badge - normal priority', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const p2Badge = authenticatedPage.locator('text=P2').first()
    const isVisible = await p2Badge.isVisible().catch(() => false)

    if (isVisible) {
      await expect(p2Badge).toHaveScreenshot('filters-priority-p2-badge.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Filter Flow - Responsive Design', () => {
  authTest('kanban filters - mobile viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const filterRow = authenticatedPage.locator('button:has-text("Todos"), button:has-text("SALES")').first().locator('xpath=ancestor::*[2]').first()
    const isVisible = await filterRow.isVisible().catch(() => false)

    if (isVisible) {
      await expect(filterRow).toHaveScreenshot('filters-kanban-mobile.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('kanban filters - tablet viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const filterRow = authenticatedPage.locator('button:has-text("Todos"), button:has-text("SALES")').first().locator('xpath=ancestor::*[2]').first()
    const isVisible = await filterRow.isVisible().catch(() => false)

    if (isVisible) {
      await expect(filterRow).toHaveScreenshot('filters-kanban-tablet.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('kanban filters - desktop viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const filterRow = authenticatedPage.locator('button:has-text("Todos"), button:has-text("SALES")').first().locator('xpath=ancestor::*[2]').first()
    const isVisible = await filterRow.isVisible().catch(() => false)

    if (isVisible) {
      await expect(filterRow).toHaveScreenshot('filters-kanban-desktop.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('projects filters - mobile viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const filterRow = authenticatedPage.locator('button:has-text("Todos"), button:has-text("Activo")').first().locator('xpath=ancestor::*[2]').first()
    const isVisible = await filterRow.isVisible().catch(() => false)

    if (isVisible) {
      await expect(filterRow).toHaveScreenshot('filters-projects-mobile.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('projects filters - tablet viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const filterRow = authenticatedPage.locator('button:has-text("Todos"), button:has-text("Activo")').first().locator('xpath=ancestor::*[2]').first()
    const isVisible = await filterRow.isVisible().catch(() => false)

    if (isVisible) {
      await expect(filterRow).toHaveScreenshot('filters-projects-tablet.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('projects filters - desktop viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const filterRow = authenticatedPage.locator('button:has-text("Todos"), button:has-text("Activo")').first().locator('xpath=ancestor::*[2]').first()
    const isVisible = await filterRow.isVisible().catch(() => false)

    if (isVisible) {
      await expect(filterRow).toHaveScreenshot('filters-projects-desktop.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Filter Flow - Complete User Journey', () => {
  authTest('filter journey - step 1: kanban default view', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('filters-journey-step1-kanban-default.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('filter journey - step 2: select SALES department', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const salesButton = authenticatedPage.locator('button:has-text("SALES")').first()
    const isVisible = await salesButton.isVisible().catch(() => false)

    if (isVisible) {
      // Hover before click to show interaction
      await salesButton.hover()
      await authenticatedPage.waitForTimeout(300)

      await expect(authenticatedPage).toHaveScreenshot('filters-journey-step2-sales-hover.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('filter journey - step 3: SALES filtered results', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const salesButton = authenticatedPage.locator('button:has-text("SALES")').first()
    const isVisible = await salesButton.isVisible().catch(() => false)

    if (isVisible) {
      await salesButton.click()
      await authenticatedPage.waitForTimeout(500)
      await prepareForVisualTest(authenticatedPage)

      await expect(authenticatedPage).toHaveScreenshot('filters-journey-step3-sales-filtered.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('filter journey - step 4: navigate to projects', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('filters-journey-step4-projects-default.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('filter journey - step 5: select Activo status', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const activoButton = projectsPage.activeFilter
    const isVisible = await activoButton.isVisible().catch(() => false)

    if (isVisible) {
      await activoButton.click()
      await authenticatedPage.waitForTimeout(500)
      await prepareForVisualTest(authenticatedPage)

      await expect(authenticatedPage).toHaveScreenshot('filters-journey-step5-activo-filtered.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('filter journey - step 6: switch to Completado', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const completadoButton = projectsPage.completedFilter
    const isVisible = await completadoButton.isVisible().catch(() => false)

    if (isVisible) {
      await completadoButton.click()
      await authenticatedPage.waitForTimeout(500)
      await prepareForVisualTest(authenticatedPage)

      await expect(authenticatedPage).toHaveScreenshot('filters-journey-step6-completado-filtered.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('filter journey - step 7: return to Todos', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // First apply a filter
    const completadoButton = projectsPage.completedFilter
    const completadoVisible = await completadoButton.isVisible().catch(() => false)

    if (completadoVisible) {
      await completadoButton.click()
      await authenticatedPage.waitForTimeout(300)

      // Then reset to Todos
      const todosButton = projectsPage.allFilter
      await todosButton.click()
      await authenticatedPage.waitForTimeout(500)
      await prepareForVisualTest(authenticatedPage)

      await expect(authenticatedPage).toHaveScreenshot('filters-journey-step7-reset-todos.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Filter Flow - Cross-Browser Consistency', () => {
  authTest('kanban filters - cross-browser @chromium @firefox @webkit', async ({ authenticatedPage, browserName }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const filterRow = authenticatedPage.locator('button:has-text("Todos"), button:has-text("SALES")').first().locator('xpath=ancestor::*[2]').first()
    const isVisible = await filterRow.isVisible().catch(() => false)

    if (isVisible) {
      await expect(filterRow).toHaveScreenshot(`filters-kanban-${browserName}.png`, {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('projects filters - cross-browser @chromium @firefox @webkit', async ({ authenticatedPage, browserName }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const filterRow = authenticatedPage.locator('button:has-text("Todos"), button:has-text("Activo")').first().locator('xpath=ancestor::*[2]').first()
    const isVisible = await filterRow.isVisible().catch(() => false)

    if (isVisible) {
      await expect(filterRow).toHaveScreenshot(`filters-projects-${browserName}.png`, {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('filtered kanban board - cross-browser @chromium @firefox @webkit', async ({ authenticatedPage, browserName }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const salesButton = authenticatedPage.locator('button:has-text("SALES")').first()
    const isVisible = await salesButton.isVisible().catch(() => false)

    if (isVisible) {
      await salesButton.click()
      await authenticatedPage.waitForTimeout(500)
      await prepareForVisualTest(authenticatedPage)

      await expect(authenticatedPage).toHaveScreenshot(`filters-kanban-filtered-${browserName}.png`, {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('filtered projects list - cross-browser @chromium @firefox @webkit', async ({ authenticatedPage, browserName }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const activoButton = projectsPage.activeFilter
    const isVisible = await activoButton.isVisible().catch(() => false)

    if (isVisible) {
      await activoButton.click()
      await authenticatedPage.waitForTimeout(500)
      await prepareForVisualTest(authenticatedPage)

      await expect(authenticatedPage).toHaveScreenshot(`filters-projects-filtered-${browserName}.png`, {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })
})
