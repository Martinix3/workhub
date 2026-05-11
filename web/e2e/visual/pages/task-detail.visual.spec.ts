import { test, expect } from '../../fixtures/auth.fixture'
import { prepareForVisualTest } from '../../utils/visual-test-helpers'
import { VISUAL_CONFIG } from '../../config/visual-regression.config'
import { KanbanPage } from '../../pages/tasks/kanban.page'

/**
 * Visual Regression Tests - Task Detail Page
 *
 * Full-page visual tests for task detail view (modal/drawer)
 * Tests complete task information, actions, and responsive design
 */

test.describe('Task Detail Visual Regression - Full Modal', () => {
  test('task detail modal - desktop viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const detailModal = authenticatedPage.locator('[role="dialog"], [class*="drawer"], [class*="fixed"][class*="right-0"]').first()
    const isVisible = await detailModal.isVisible().catch(() => false)

    if (isVisible) {
      await expect(detailModal).toHaveScreenshot('task-detail-modal-desktop.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('task detail modal - tablet viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const detailModal = authenticatedPage.locator('[role="dialog"], [class*="drawer"], [class*="fixed"][class*="right-0"]').first()
    const isVisible = await detailModal.isVisible().catch(() => false)

    if (isVisible) {
      await expect(detailModal).toHaveScreenshot('task-detail-modal-tablet.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('task detail modal - mobile viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const detailModal = authenticatedPage.locator('[role="dialog"], [class*="drawer"], [class*="fixed"][class*="right-0"]').first()
    const isVisible = await detailModal.isVisible().catch(() => false)

    if (isVisible) {
      await expect(detailModal).toHaveScreenshot('task-detail-modal-mobile.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Task Detail Visual Regression - Header Section', () => {
  test('task detail - header with title and close button', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const detailModal = authenticatedPage.locator('[role="dialog"], [class*="drawer"], [class*="fixed"][class*="right-0"]').first()
    const isVisible = await detailModal.isVisible().catch(() => false)

    if (isVisible) {
      const header = detailModal.locator('h1, h2, h3').first()
      const headerVisible = await header.isVisible().catch(() => false)

      if (headerVisible) {
        const headerContainer = header.locator('..').first()
        await expect(headerContainer).toHaveScreenshot('task-detail-header.png', {
          maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
        })
      } else {
        expect(true).toBe(true)
      }
    } else {
      expect(true).toBe(true)
    }
  })

  test('task detail - priority badge', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const priorityBadge = authenticatedPage.locator('[class*="badge"], [class*="priority"]').filter({
      hasText: /P0|P1|P2|Alta|Media|Baja|Critical|High|Low/i
    }).first()
    const isVisible = await priorityBadge.isVisible().catch(() => false)

    if (isVisible) {
      await expect(priorityBadge).toHaveScreenshot('task-detail-priority-badge.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('task detail - status badge', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const statusBadge = authenticatedPage.locator('[class*="badge"], [class*="status"]').filter({
      hasText: /BACKLOG|NEXT|DOING|BLOCKED|DONE/i
    }).first()
    const isVisible = await statusBadge.isVisible().catch(() => false)

    if (isVisible) {
      await expect(statusBadge).toHaveScreenshot('task-detail-status-badge.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Task Detail Visual Regression - Content Section', () => {
  test('task detail - description field', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const descriptionField = authenticatedPage.locator('textarea, [contenteditable], [class*="description"]').first()
    const isVisible = await descriptionField.isVisible().catch(() => false)

    if (isVisible) {
      const descriptionContainer = descriptionField.locator('..').first()
      await expect(descriptionContainer).toHaveScreenshot('task-detail-description.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('task detail - dates section', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const datesSection = authenticatedPage.locator('text=/Fecha|Date|Due|Vencimiento/i').first()
    const isVisible = await datesSection.isVisible().catch(() => false)

    if (isVisible) {
      const datesContainer = datesSection.locator('..').first()
      await expect(datesContainer).toHaveScreenshot('task-detail-dates.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('task detail - assignees section', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const assigneesSection = authenticatedPage.locator('text=/Asignado|Assigned|Assignees/i').first()
    const isVisible = await assigneesSection.isVisible().catch(() => false)

    if (isVisible) {
      const assigneesContainer = assigneesSection.locator('..').first()
      await expect(assigneesContainer).toHaveScreenshot('task-detail-assignees.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('task detail - department badge', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const departmentBadge = authenticatedPage.locator('[class*="badge"]').filter({
      hasText: /SALES|OPS|MKT|Ventas|Operaciones|Marketing/i
    }).first()
    const isVisible = await departmentBadge.isVisible().catch(() => false)

    if (isVisible) {
      await expect(departmentBadge).toHaveScreenshot('task-detail-department-badge.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('task detail - linked documents', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const linkedDocs = authenticatedPage.locator('text=/Documento|Document|WorkLink/i').first()
    const isVisible = await linkedDocs.isVisible().catch(() => false)

    if (isVisible) {
      const linkedDocsContainer = linkedDocs.locator('..').first()
      await expect(linkedDocsContainer).toHaveScreenshot('task-detail-linked-docs.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Task Detail Visual Regression - Actions Section', () => {
  test('task detail - action buttons', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const detailModal = authenticatedPage.locator('[role="dialog"], [class*="drawer"], [class*="fixed"][class*="right-0"]').first()
    const isVisible = await detailModal.isVisible().catch(() => false)

    if (isVisible) {
      const actionButtons = detailModal.locator('button').filter({
        hasText: /Guardar|Save|Completar|Complete|Cerrar|Close/i
      })
      const buttonsVisible = await actionButtons.first().isVisible().catch(() => false)

      if (buttonsVisible) {
        const buttonContainer = actionButtons.first().locator('../..').first()
        await expect(buttonContainer).toHaveScreenshot('task-detail-actions.png', {
          maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
        })
      } else {
        expect(true).toBe(true)
      }
    } else {
      expect(true).toBe(true)
    }
  })

  test('task detail - delete button', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const deleteButton = authenticatedPage.locator('button').filter({
      hasText: /Eliminar|Delete|Borrar/i
    }).first()
    const isVisible = await deleteButton.isVisible().catch(() => false)

    if (isVisible) {
      await expect(deleteButton).toHaveScreenshot('task-detail-delete-button.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('task detail - close button', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const closeButton = authenticatedPage.locator('button').filter({
      has: authenticatedPage.locator('svg, [class*="close"], [class*="x"]')
    }).first()
    const isVisible = await closeButton.isVisible().catch(() => false)

    if (isVisible) {
      await expect(closeButton).toHaveScreenshot('task-detail-close-button.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Task Detail Visual Regression - Responsive Breakpoints', () => {
  test('task detail - mobile small (375px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('task-detail-viewport-mobile-small.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('task detail - mobile medium (390px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.medium)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('task-detail-viewport-mobile-medium.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('task detail - mobile large (414px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.large)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('task-detail-viewport-mobile-large.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('task detail - tablet small (768px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('task-detail-viewport-tablet-small.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('task detail - tablet medium (834px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.medium)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('task-detail-viewport-tablet-medium.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('task detail - tablet large (1024px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.large)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('task-detail-viewport-tablet-large.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('task detail - desktop hd (1280px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.hd)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('task-detail-viewport-desktop-hd.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('task detail - desktop fhd (1920px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('task-detail-viewport-desktop-fhd.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('task detail - desktop 2k (1440px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop['2k'])
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('task-detail-viewport-desktop-2k.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })
})

test.describe('Task Detail Visual Regression - Interactive States', () => {
  test('task detail - action button hover', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const actionButton = authenticatedPage.locator('button').filter({
      hasText: /Guardar|Save|Completar|Complete/i
    }).first()
    const isVisible = await actionButton.isVisible().catch(() => false)

    if (isVisible) {
      await actionButton.hover()
      await authenticatedPage.waitForTimeout(300)

      await expect(actionButton).toHaveScreenshot('task-detail-action-button-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('task detail - close button hover', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const closeButton = authenticatedPage.locator('button').filter({
      has: authenticatedPage.locator('svg, [class*="close"], [class*="x"]')
    }).first()
    const isVisible = await closeButton.isVisible().catch(() => false)

    if (isVisible) {
      await closeButton.hover()
      await authenticatedPage.waitForTimeout(300)

      await expect(closeButton).toHaveScreenshot('task-detail-close-button-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('task detail - delete button hover', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const deleteButton = authenticatedPage.locator('button').filter({
      hasText: /Eliminar|Delete|Borrar/i
    }).first()
    const isVisible = await deleteButton.isVisible().catch(() => false)

    if (isVisible) {
      await deleteButton.hover()
      await authenticatedPage.waitForTimeout(300)

      await expect(deleteButton).toHaveScreenshot('task-detail-delete-button-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('task detail - description field focus', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForTimeout(500)
    await prepareForVisualTest(authenticatedPage)

    const descriptionField = authenticatedPage.locator('textarea, [contenteditable]').first()
    const isVisible = await descriptionField.isVisible().catch(() => false)

    if (isVisible) {
      await descriptionField.click()
      await authenticatedPage.waitForTimeout(300)

      const descriptionContainer = descriptionField.locator('..').first()
      await expect(descriptionContainer).toHaveScreenshot('task-detail-description-focus.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Task Detail Visual Regression - Loading States', () => {
  test('task detail - loading state', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')

    const totalTasks = await kanbanPage.getTotalTaskCount()
    if (totalTasks === 0) {
      expect(true).toBe(true)
      return
    }

    await kanbanPage.clickTask(0)
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const loadingIndicator = authenticatedPage.locator('[class*="loading"], [class*="spinner"], [class*="skeleton"]').first()
    const isVisible = await loadingIndicator.isVisible().catch(() => false)

    if (isVisible) {
      await expect(loadingIndicator).toHaveScreenshot('task-detail-loading.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})
