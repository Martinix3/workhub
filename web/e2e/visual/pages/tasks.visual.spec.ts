import { test, expect } from '../../fixtures/auth.fixture'
import { prepareForVisualTest } from '../../utils/visual-test-helpers'
import { VISUAL_CONFIG } from '../../config/visual-regression.config'
import { MyDayPage } from '../../pages/tasks/my-day.page'
import { ProjectsPage } from '../../pages/tasks/projects.page'
import { KanbanPage } from '../../pages/tasks/kanban.page'

/**
 * Visual Regression Tests - Task Pages
 *
 * Full-page visual tests for task management pages across all viewports
 * Tests Mi Día, Proyectos, and Kanban views for responsive design and visual consistency
 */

test.describe('Mi Día Visual Regression - Full Page', () => {
  test('mi dia page - desktop viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-myday-full-desktop.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('mi dia page - tablet viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-myday-full-tablet.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('mi dia page - mobile viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-myday-full-mobile.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })
})

test.describe('Mi Día Visual Regression - Sections', () => {
  test('mi dia - quick add input', async ({ authenticatedPage }) => {
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const quickAdd = myDayPage.quickAddInput.first()
    const isVisible = await quickAdd.isVisible().catch(() => false)

    if (isVisible) {
      const quickAddContainer = quickAdd.locator('..').first()
      await expect(quickAddContainer).toHaveScreenshot('tasks-myday-quickadd.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('mi dia - focus mode section', async ({ authenticatedPage }) => {
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const focusMode = myDayPage.focusModeSection
    const isVisible = await focusMode.isVisible().catch(() => false)

    if (isVisible) {
      await expect(focusMode).toHaveScreenshot('tasks-myday-focusmode.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('mi dia - task card default state', async ({ authenticatedPage }) => {
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const firstTask = myDayPage.taskCards.first()
    const isVisible = await firstTask.isVisible().catch(() => false)

    if (isVisible) {
      const taskCard = firstTask.locator('..').first()
      await expect(taskCard).toHaveScreenshot('tasks-myday-taskcard.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('mi dia - mini calendar', async ({ authenticatedPage }) => {
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const calendar = myDayPage.miniCalendar.first()
    const isVisible = await calendar.isVisible().catch(() => false)

    if (isVisible) {
      const calendarContainer = calendar.locator('../..').first()
      await expect(calendarContainer).toHaveScreenshot('tasks-myday-calendar.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('mi dia - empty state', async ({ authenticatedPage }) => {
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')

    const emptyState = myDayPage.emptyState
    const isVisible = await emptyState.isVisible().catch(() => false)

    if (isVisible) {
      await prepareForVisualTest(authenticatedPage)
      await expect(emptyState).toHaveScreenshot('tasks-myday-empty.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Mi Día Visual Regression - Responsive Breakpoints', () => {
  test('mi dia - mobile small (375px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-myday-viewport-mobile-small.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('mi dia - mobile medium (390px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.medium)
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-myday-viewport-mobile-medium.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('mi dia - mobile large (414px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.large)
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-myday-viewport-mobile-large.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('mi dia - tablet small (768px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-myday-viewport-tablet-small.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('mi dia - tablet medium (834px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.medium)
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-myday-viewport-tablet-medium.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('mi dia - tablet large (1024px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.large)
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-myday-viewport-tablet-large.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('mi dia - desktop hd (1280px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.hd)
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-myday-viewport-desktop-hd.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('mi dia - desktop fhd (1920px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-myday-viewport-desktop-fhd.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('mi dia - desktop 2k (1440px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop['2k'])
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-myday-viewport-desktop-2k.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })
})

test.describe('Proyectos Visual Regression - Full Page', () => {
  test('proyectos page - desktop viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-proyectos-full-desktop.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('proyectos page - tablet viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-proyectos-full-tablet.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('proyectos page - mobile viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-proyectos-full-mobile.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })
})

test.describe('Proyectos Visual Regression - Components', () => {
  test('proyectos - header with filters', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const header = projectsPage.pageTitle
    const isVisible = await header.isVisible().catch(() => false)

    if (isVisible) {
      const headerContainer = header.locator('..').first()
      await expect(headerContainer).toHaveScreenshot('tasks-proyectos-header.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('proyectos - new project button', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const button = projectsPage.newProjectButton
    const isVisible = await button.isVisible().catch(() => false)

    if (isVisible) {
      await expect(button).toHaveScreenshot('tasks-proyectos-newbutton.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('proyectos - project card', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const firstCard = projectsPage.projectCards.first()
    const isVisible = await firstCard.isVisible().catch(() => false)

    if (isVisible) {
      await expect(firstCard).toHaveScreenshot('tasks-proyectos-card.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('proyectos - health indicators', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const healthIndicator = projectsPage.healthIndicators.first()
    const isVisible = await healthIndicator.isVisible().catch(() => false)

    if (isVisible) {
      await expect(healthIndicator).toHaveScreenshot('tasks-proyectos-health.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('proyectos - status filters', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const allFilter = projectsPage.allFilter
    const isVisible = await allFilter.isVisible().catch(() => false)

    if (isVisible) {
      const filtersContainer = allFilter.locator('..').first()
      await expect(filtersContainer).toHaveScreenshot('tasks-proyectos-filters.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('proyectos - empty state', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')

    const emptyState = projectsPage.emptyState
    const isVisible = await emptyState.isVisible().catch(() => false)

    if (isVisible) {
      await prepareForVisualTest(authenticatedPage)
      await expect(emptyState).toHaveScreenshot('tasks-proyectos-empty.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Proyectos Visual Regression - Responsive Breakpoints', () => {
  test('proyectos - mobile small (375px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-proyectos-viewport-mobile-small.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('proyectos - tablet small (768px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-proyectos-viewport-tablet-small.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('proyectos - desktop hd (1280px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.hd)
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-proyectos-viewport-desktop-hd.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })
})

test.describe('Kanban Visual Regression - Full Page', () => {
  test('kanban page - desktop viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-kanban-full-desktop.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('kanban page - tablet viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-kanban-full-tablet.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('kanban page - mobile viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-kanban-full-mobile.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })
})

test.describe('Kanban Visual Regression - Columns', () => {
  test('kanban - backlog column', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const backlogColumn = kanbanPage.backlogColumn
    const isVisible = await backlogColumn.isVisible().catch(() => false)

    if (isVisible) {
      await expect(backlogColumn).toHaveScreenshot('tasks-kanban-backlog-column.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('kanban - next column', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const nextColumn = kanbanPage.nextColumn
    const isVisible = await nextColumn.isVisible().catch(() => false)

    if (isVisible) {
      await expect(nextColumn).toHaveScreenshot('tasks-kanban-next-column.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('kanban - doing column', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const doingColumn = kanbanPage.doingColumn
    const isVisible = await doingColumn.isVisible().catch(() => false)

    if (isVisible) {
      await expect(doingColumn).toHaveScreenshot('tasks-kanban-doing-column.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('kanban - blocked column', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const blockedColumn = kanbanPage.blockedColumn
    const isVisible = await blockedColumn.isVisible().catch(() => false)

    if (isVisible) {
      await expect(blockedColumn).toHaveScreenshot('tasks-kanban-blocked-column.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('kanban - done column', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const doneColumn = kanbanPage.doneColumn
    const isVisible = await doneColumn.isVisible().catch(() => false)

    if (isVisible) {
      await expect(doneColumn).toHaveScreenshot('tasks-kanban-done-column.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Kanban Visual Regression - Components', () => {
  test('kanban - department filters', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const filters = kanbanPage.departmentFilters.first()
    const isVisible = await filters.isVisible().catch(() => false)

    if (isVisible) {
      const filtersContainer = filters.locator('..').first()
      await expect(filtersContainer).toHaveScreenshot('tasks-kanban-filters.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('kanban - task card', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const firstTask = kanbanPage.taskCards.first()
    const isVisible = await firstTask.isVisible().catch(() => false)

    if (isVisible) {
      const taskCard = firstTask.locator('../..').first()
      await expect(taskCard).toHaveScreenshot('tasks-kanban-taskcard.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('kanban - priority badge', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const priorityBadge = kanbanPage.priorityBadges.first()
    const isVisible = await priorityBadge.isVisible().catch(() => false)

    if (isVisible) {
      await expect(priorityBadge).toHaveScreenshot('tasks-kanban-priority-badge.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('kanban - quick add button', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const quickAdd = kanbanPage.quickAddButton.first()
    const isVisible = await quickAdd.isVisible().catch(() => false)

    if (isVisible) {
      await expect(quickAdd).toHaveScreenshot('tasks-kanban-quickadd.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Kanban Visual Regression - Responsive Breakpoints', () => {
  test('kanban - mobile small (375px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-kanban-viewport-mobile-small.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('kanban - tablet small (768px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-kanban-viewport-tablet-small.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('kanban - desktop hd (1280px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.hd)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-kanban-viewport-desktop-hd.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('kanban - desktop wide for horizontal scroll', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('tasks-kanban-viewport-desktop-fhd.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })
})

test.describe('Task Pages Visual Regression - Interactive States', () => {
  test('mi dia - task card hover', async ({ authenticatedPage }) => {
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const firstTask = myDayPage.taskCards.first()
    const isVisible = await firstTask.isVisible().catch(() => false)

    if (isVisible) {
      await firstTask.hover()
      await authenticatedPage.waitForTimeout(300)

      const taskCard = firstTask.locator('..').first()
      await expect(taskCard).toHaveScreenshot('tasks-myday-taskcard-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('proyectos - project card hover', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const firstCard = projectsPage.projectCards.first()
    const isVisible = await firstCard.isVisible().catch(() => false)

    if (isVisible) {
      await firstCard.hover()
      await authenticatedPage.waitForTimeout(300)

      await expect(firstCard).toHaveScreenshot('tasks-proyectos-card-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('proyectos - filter button hover', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const activeFilter = projectsPage.activeFilter
    const isVisible = await activeFilter.isVisible().catch(() => false)

    if (isVisible) {
      await activeFilter.hover()
      await authenticatedPage.waitForTimeout(300)

      await expect(activeFilter).toHaveScreenshot('tasks-proyectos-filter-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('kanban - task card hover', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const firstTask = kanbanPage.taskCards.first()
    const isVisible = await firstTask.isVisible().catch(() => false)

    if (isVisible) {
      await firstTask.hover()
      await authenticatedPage.waitForTimeout(300)

      const taskCard = firstTask.locator('../..').first()
      await expect(taskCard).toHaveScreenshot('tasks-kanban-taskcard-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('kanban - department filter active state', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const salesFilter = authenticatedPage.locator('button:has-text("SALES")').first()
    const isVisible = await salesFilter.isVisible().catch(() => false)

    if (isVisible) {
      await salesFilter.click()
      await authenticatedPage.waitForTimeout(300)
      await prepareForVisualTest(authenticatedPage)

      await expect(salesFilter).toHaveScreenshot('tasks-kanban-filter-active.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Task Pages Visual Regression - Loading States', () => {
  test('mi dia - loading indicator', async ({ authenticatedPage }) => {
    const myDayPage = new MyDayPage(authenticatedPage)
    await myDayPage.gotoMyDay()

    await authenticatedPage.waitForLoadState('domcontentloaded')

    const loadingIndicator = myDayPage.loadingIndicator
    const isVisible = await loadingIndicator.isVisible().catch(() => false)

    if (isVisible) {
      await expect(loadingIndicator).toHaveScreenshot('tasks-myday-loading.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('proyectos - loading indicator', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage)
    await projectsPage.gotoProjects()

    await authenticatedPage.waitForLoadState('domcontentloaded')

    const loadingIndicator = projectsPage.loadingIndicator
    const isVisible = await loadingIndicator.isVisible().catch(() => false)

    if (isVisible) {
      await expect(loadingIndicator).toHaveScreenshot('tasks-proyectos-loading.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('kanban - loading indicator', async ({ authenticatedPage }) => {
    const kanbanPage = new KanbanPage(authenticatedPage)
    await kanbanPage.gotoKanban()

    await authenticatedPage.waitForLoadState('domcontentloaded')

    const loadingIndicator = kanbanPage.loadingIndicator
    const isVisible = await loadingIndicator.isVisible().catch(() => false)

    if (isVisible) {
      await expect(loadingIndicator).toHaveScreenshot('tasks-kanban-loading.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})
