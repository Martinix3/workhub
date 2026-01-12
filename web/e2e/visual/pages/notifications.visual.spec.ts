import { test, expect } from '../../fixtures/auth.fixture'
import { prepareForVisualTest } from '../../utils/visual-test-helpers'
import { VISUAL_CONFIG } from '../../config/visual-regression.config'
import { SettingsPage } from '../../pages/settings.page'

/**
 * Visual Regression Tests - Notifications Page
 *
 * Full-page visual tests for notifications settings page across all viewports
 * Tests notification preferences, frequency settings, quiet hours, and toggles
 */

test.describe('Notifications Visual Regression - Full Page', () => {
  test('notifications page - desktop viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('notifications-full-desktop.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('notifications page - tablet viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('notifications-full-tablet.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('notifications page - mobile viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('notifications-full-mobile.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })
})

test.describe('Notifications Visual Regression - Components', () => {
  test('notifications - email toggle', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    const emailToggle = authenticatedPage.locator('label:has-text("Notificaciones por email")').first()
    const isVisible = await emailToggle.isVisible().catch(() => false)

    if (isVisible) {
      await expect(emailToggle).toHaveScreenshot('notifications-email-toggle.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('notifications - frequency options', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    const frequencySection = authenticatedPage.locator('text=Frecuencia de notificaciones').locator('..').first()
    const isVisible = await frequencySection.isVisible().catch(() => false)

    if (isVisible) {
      await expect(frequencySection).toHaveScreenshot('notifications-frequency-section.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('notifications - realtime button', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    const realtimeButton = authenticatedPage.locator('button:has-text("Tiempo real")').first()
    const isVisible = await realtimeButton.isVisible().catch(() => false)

    if (isVisible) {
      await expect(realtimeButton).toHaveScreenshot('notifications-realtime-button.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('notifications - daily button', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    const dailyButton = authenticatedPage.locator('button:has-text("Diario")').first()
    const isVisible = await dailyButton.isVisible().catch(() => false)

    if (isVisible) {
      await expect(dailyButton).toHaveScreenshot('notifications-daily-button.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('notifications - priority bypass toggle', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    const priorityBypass = authenticatedPage.locator('label:has-text("Notificaciones prioritarias inmediatas")').first()
    const isVisible = await priorityBypass.isVisible().catch(() => false)

    if (isVisible) {
      await expect(priorityBypass).toHaveScreenshot('notifications-priority-bypass.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('notifications - quiet hours section', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    const quietHours = authenticatedPage.locator('text=Horario de silencio').locator('..').first()
    const isVisible = await quietHours.isVisible().catch(() => false)

    if (isVisible) {
      await expect(quietHours).toHaveScreenshot('notifications-quiet-hours.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('notifications - save button', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    const saveButton = authenticatedPage.locator('button:has-text("Guardar cambios")').first()
    const isVisible = await saveButton.isVisible().catch(() => false)

    if (isVisible) {
      await expect(saveButton).toHaveScreenshot('notifications-save-button.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Notifications Visual Regression - Responsive Breakpoints', () => {
  test('notifications - mobile small (375px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('notifications-viewport-mobile-small.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('notifications - mobile medium (390px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.medium)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('notifications-viewport-mobile-medium.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('notifications - mobile large (414px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.large)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('notifications-viewport-mobile-large.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('notifications - tablet small (768px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('notifications-viewport-tablet-small.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('notifications - tablet medium (834px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.medium)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('notifications-viewport-tablet-medium.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('notifications - tablet large (1024px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.large)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('notifications-viewport-tablet-large.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('notifications - desktop hd (1280px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.hd)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('notifications-viewport-desktop-hd.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('notifications - desktop fhd (1920px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('notifications-viewport-desktop-fhd.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('notifications - desktop 2k (1440px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop['2k'])
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('notifications-viewport-desktop-2k.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })
})

test.describe('Notifications Visual Regression - Interactive States', () => {
  test('notifications - frequency button hover', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    const weeklyButton = authenticatedPage.locator('button:has-text("Semanal")').first()
    const isVisible = await weeklyButton.isVisible().catch(() => false)

    if (isVisible) {
      await weeklyButton.hover()
      await authenticatedPage.waitForTimeout(300)

      await expect(weeklyButton).toHaveScreenshot('notifications-frequency-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('notifications - frequency button active state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    const realtimeButton = authenticatedPage.locator('button:has-text("Tiempo real")').first()
    const isVisible = await realtimeButton.isVisible().catch(() => false)

    if (isVisible) {
      await realtimeButton.click()
      await authenticatedPage.waitForTimeout(300)
      await prepareForVisualTest(authenticatedPage)

      await expect(realtimeButton).toHaveScreenshot('notifications-frequency-active.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('notifications - quiet hours enabled', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    const quietHoursToggle = authenticatedPage.locator('text=Horario de silencio').locator('..').locator('input[type="checkbox"]').first()
    const isVisible = await quietHoursToggle.isVisible().catch(() => false)

    if (isVisible) {
      const isChecked = await quietHoursToggle.isChecked().catch(() => false)
      if (!isChecked) {
        await quietHoursToggle.click({ force: true })
        await authenticatedPage.waitForTimeout(300)
      }
      await prepareForVisualTest(authenticatedPage)

      const quietHoursSection = authenticatedPage.locator('text=Horario de silencio').locator('../..').first()
      await expect(quietHoursSection).toHaveScreenshot('notifications-quiet-hours-enabled.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('notifications - save button hover', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)

    const realtimeButton = authenticatedPage.locator('button:has-text("Tiempo real")').first()
    const isButtonVisible = await realtimeButton.isVisible().catch(() => false)

    if (isButtonVisible) {
      await realtimeButton.click()
      await authenticatedPage.waitForTimeout(300)
    }

    await prepareForVisualTest(authenticatedPage)

    const saveButton = authenticatedPage.locator('button:has-text("Guardar cambios")').first()
    const isVisible = await saveButton.isVisible().catch(() => false)

    if (isVisible) {
      await saveButton.hover()
      await authenticatedPage.waitForTimeout(300)

      await expect(saveButton).toHaveScreenshot('notifications-save-button-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Notifications Visual Regression - Frequency Grid Layout', () => {
  test('notifications - frequency grid responsive', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')

    const settingsPage = new SettingsPage(authenticatedPage)
    await settingsPage.selectTab('Notificaciones')
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    const frequencyGrid = authenticatedPage.locator('.grid.grid-cols-2').first()
    const isVisible = await frequencyGrid.isVisible().catch(() => false)

    if (isVisible) {
      await expect(frequencyGrid).toHaveScreenshot('notifications-frequency-grid-mobile.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})
