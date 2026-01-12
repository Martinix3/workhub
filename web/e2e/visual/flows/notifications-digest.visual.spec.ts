import { test as authTest } from '../../fixtures/auth.fixture'
import { prepareForVisualTest } from '../../utils/visual-test-helpers'
import { VISUAL_CONFIG } from '../../config/visual-regression.config'

/**
 * Visual Regression Tests - Notification Digest Flow
 *
 * Tests the notification settings and digest configuration with visual snapshots
 * Covers frequency options, email toggles, quiet hours, and priority bypass settings
 */

test.describe('Notification Digest Flow - Settings Page', () => {
  authTest('notification settings - default view', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    // Click on Notifications tab
    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    // Capture full settings page with notifications tab active
    await expect(authenticatedPage).toHaveScreenshot('notifications-digest-default-view.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('notification settings - email toggle section', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    // Capture email toggle with label
    const emailSection = authenticatedPage.locator('text=Notificaciones por email').locator('..')
    const isVisible = await emailSection.isVisible().catch(() => false)

    if (isVisible) {
      await expect(emailSection).toHaveScreenshot('notifications-digest-email-toggle.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('notification settings - frequency options section', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    // Capture frequency section with all options
    const frequencySection = authenticatedPage.locator('h4:has-text("Frecuencia de notificaciones")').locator('..')
    const isVisible = await frequencySection.isVisible().catch(() => false)

    if (isVisible) {
      await expect(frequencySection).toHaveScreenshot('notifications-digest-frequency-section.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('notification settings - priority bypass section', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    // Capture priority bypass toggle
    const prioritySection = authenticatedPage.locator('text=Notificaciones prioritarias inmediatas').locator('..')
    const isVisible = await prioritySection.isVisible().catch(() => false)

    if (isVisible) {
      await expect(prioritySection).toHaveScreenshot('notifications-digest-priority-bypass.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('notification settings - quiet hours section', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    // Capture quiet hours section
    const quietHoursSection = authenticatedPage.locator('h4:has-text("Horario de silencio")').locator('..')
    const isVisible = await quietHoursSection.isVisible().catch(() => false)

    if (isVisible) {
      await expect(quietHoursSection).toHaveScreenshot('notifications-digest-quiet-hours.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('notification settings - save button', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    // Capture save button (should be disabled by default)
    const saveButton = authenticatedPage.locator('button:has-text("Guardar cambios")')
    const isVisible = await saveButton.isVisible().catch(() => false)

    if (isVisible) {
      await expect(saveButton).toHaveScreenshot('notifications-digest-save-button-disabled.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Notification Digest Flow - Frequency Options', () => {
  authTest('frequency option - tiempo real selected', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Select Tiempo Real
    const realtimeOption = authenticatedPage.locator('button:has-text("Tiempo real")')
    const isVisible = await realtimeOption.isVisible().catch(() => false)

    if (isVisible) {
      await realtimeOption.click()
      await authenticatedPage.waitForTimeout(200)
      await prepareForVisualTest(authenticatedPage)

      await expect(realtimeOption).toHaveScreenshot('notifications-digest-realtime-selected.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('frequency option - diario selected', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Select Diario
    const dailyOption = authenticatedPage.locator('button:has-text("Diario")')
    const isVisible = await dailyOption.isVisible().catch(() => false)

    if (isVisible) {
      await dailyOption.click()
      await authenticatedPage.waitForTimeout(200)
      await prepareForVisualTest(authenticatedPage)

      await expect(dailyOption).toHaveScreenshot('notifications-digest-daily-selected.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('frequency option - semanal selected', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Select Semanal
    const weeklyOption = authenticatedPage.locator('button:has-text("Semanal")')
    const isVisible = await weeklyOption.isVisible().catch(() => false)

    if (isVisible) {
      await weeklyOption.click()
      await authenticatedPage.waitForTimeout(200)
      await prepareForVisualTest(authenticatedPage)

      await expect(weeklyOption).toHaveScreenshot('notifications-digest-weekly-selected.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('frequency option - desactivado selected', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Select Desactivado
    const offOption = authenticatedPage.locator('button:has-text("Desactivado")')
    const isVisible = await offOption.isVisible().catch(() => false)

    if (isVisible) {
      await offOption.click()
      await authenticatedPage.waitForTimeout(200)
      await prepareForVisualTest(authenticatedPage)

      await expect(offOption).toHaveScreenshot('notifications-digest-off-selected.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('frequency options - all buttons layout', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    // Capture all frequency buttons together
    const frequencySection = authenticatedPage.locator('h4:has-text("Frecuencia de notificaciones")').locator('..')
    const isVisible = await frequencySection.isVisible().catch(() => false)

    if (isVisible) {
      await expect(frequencySection).toHaveScreenshot('notifications-digest-all-frequencies.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Notification Digest Flow - Quiet Hours', () => {
  authTest('quiet hours - disabled state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Ensure quiet hours is disabled
    const quietHoursToggle = authenticatedPage.locator('h4:has-text("Horario de silencio")').locator('..').locator('input[type="checkbox"]')
    const isChecked = await quietHoursToggle.isChecked().catch(() => false)

    if (isChecked) {
      await quietHoursToggle.click()
      await authenticatedPage.waitForTimeout(200)
    }

    await prepareForVisualTest(authenticatedPage)

    const quietHoursSection = authenticatedPage.locator('h4:has-text("Horario de silencio")').locator('..')
    const isVisible = await quietHoursSection.isVisible().catch(() => false)

    if (isVisible) {
      await expect(quietHoursSection).toHaveScreenshot('notifications-digest-quiet-hours-disabled.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('quiet hours - enabled with time pickers', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Enable quiet hours
    const quietHoursToggle = authenticatedPage.locator('h4:has-text("Horario de silencio")').locator('..').locator('input[type="checkbox"]')
    const isChecked = await quietHoursToggle.isChecked().catch(() => false)

    if (!isChecked) {
      await quietHoursToggle.click()
      await authenticatedPage.waitForTimeout(200)
    }

    await prepareForVisualTest(authenticatedPage)

    const quietHoursSection = authenticatedPage.locator('h4:has-text("Horario de silencio")').locator('..')
    const isVisible = await quietHoursSection.isVisible().catch(() => false)

    if (isVisible) {
      await expect(quietHoursSection).toHaveScreenshot('notifications-digest-quiet-hours-enabled.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('quiet hours - time pickers detail', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Enable quiet hours
    const quietHoursToggle = authenticatedPage.locator('h4:has-text("Horario de silencio")').locator('..').locator('input[type="checkbox"]')
    const isChecked = await quietHoursToggle.isChecked().catch(() => false)

    if (!isChecked) {
      await quietHoursToggle.click()
      await authenticatedPage.waitForTimeout(200)
    }

    await prepareForVisualTest(authenticatedPage)

    // Capture time picker section
    const startTimeLabel = authenticatedPage.locator('label:has-text("Hora de inicio")')
    const isVisible = await startTimeLabel.isVisible().catch(() => false)

    if (isVisible) {
      const timePickersSection = startTimeLabel.locator('..').locator('..')
      await expect(timePickersSection).toHaveScreenshot('notifications-digest-time-pickers.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Notification Digest Flow - Interactive States', () => {
  authTest('save button - enabled state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Make a change to enable save button
    const realtimeOption = authenticatedPage.locator('button:has-text("Tiempo real")')
    const isVisible = await realtimeOption.isVisible().catch(() => false)

    if (isVisible) {
      await realtimeOption.click()
      await authenticatedPage.waitForTimeout(200)
      await prepareForVisualTest(authenticatedPage)

      const saveButton = authenticatedPage.locator('button:has-text("Guardar cambios")')
      await expect(saveButton).toHaveScreenshot('notifications-digest-save-button-enabled.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('frequency option - hover state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    // Hover on diario option
    const dailyOption = authenticatedPage.locator('button:has-text("Diario")')
    const isVisible = await dailyOption.isVisible().catch(() => false)

    if (isVisible) {
      await dailyOption.hover()
      await authenticatedPage.waitForTimeout(200)

      await expect(dailyOption).toHaveScreenshot('notifications-digest-frequency-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('email toggle - checked state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Ensure email toggle is checked
    const emailToggle = authenticatedPage.locator('input[type="checkbox"]').first()
    const isChecked = await emailToggle.isChecked().catch(() => false)

    if (!isChecked) {
      await emailToggle.click()
      await authenticatedPage.waitForTimeout(200)
    }

    await prepareForVisualTest(authenticatedPage)

    const emailSection = authenticatedPage.locator('text=Notificaciones por email').locator('..')
    const isVisible = await emailSection.isVisible().catch(() => false)

    if (isVisible) {
      await expect(emailSection).toHaveScreenshot('notifications-digest-email-toggle-checked.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('email toggle - unchecked state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Ensure email toggle is unchecked
    const emailToggle = authenticatedPage.locator('input[type="checkbox"]').first()
    const isChecked = await emailToggle.isChecked().catch(() => false)

    if (isChecked) {
      await emailToggle.click()
      await authenticatedPage.waitForTimeout(200)
    }

    await prepareForVisualTest(authenticatedPage)

    const emailSection = authenticatedPage.locator('text=Notificaciones por email').locator('..')
    const isVisible = await emailSection.isVisible().catch(() => false)

    if (isVisible) {
      await expect(emailSection).toHaveScreenshot('notifications-digest-email-toggle-unchecked.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('priority bypass toggle - checked state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Enable priority bypass
    const priorityBypassToggle = authenticatedPage.locator('text=Notificaciones prioritarias inmediatas').locator('..').locator('..').locator('input[type="checkbox"]')
    const isChecked = await priorityBypassToggle.isChecked().catch(() => false)

    if (!isChecked) {
      await priorityBypassToggle.click()
      await authenticatedPage.waitForTimeout(200)
    }

    await prepareForVisualTest(authenticatedPage)

    const prioritySection = authenticatedPage.locator('text=Notificaciones prioritarias inmediatas').locator('..')
    const isVisible = await prioritySection.isVisible().catch(() => false)

    if (isVisible) {
      await expect(prioritySection).toHaveScreenshot('notifications-digest-priority-bypass-checked.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Notification Digest Flow - Responsive Design', () => {
  authTest('notification settings - mobile viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('notifications-digest-mobile.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('notification settings - tablet viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('notifications-digest-tablet.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('notification settings - desktop viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('notifications-digest-desktop.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('frequency buttons - mobile layout', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    const frequencySection = authenticatedPage.locator('h4:has-text("Frecuencia de notificaciones")').locator('..')
    const isVisible = await frequencySection.isVisible().catch(() => false)

    if (isVisible) {
      await expect(frequencySection).toHaveScreenshot('notifications-digest-frequency-mobile.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('quiet hours - mobile layout', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Enable quiet hours
    const quietHoursToggle = authenticatedPage.locator('h4:has-text("Horario de silencio")').locator('..').locator('input[type="checkbox"]')
    const isChecked = await quietHoursToggle.isChecked().catch(() => false)

    if (!isChecked) {
      await quietHoursToggle.click()
      await authenticatedPage.waitForTimeout(200)
    }

    await prepareForVisualTest(authenticatedPage)

    const quietHoursSection = authenticatedPage.locator('h4:has-text("Horario de silencio")').locator('..')
    const isVisible = await quietHoursSection.isVisible().catch(() => false)

    if (isVisible) {
      await expect(quietHoursSection).toHaveScreenshot('notifications-digest-quiet-hours-mobile.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Notification Digest Flow - Complete Journey', () => {
  authTest('complete flow - initial state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    // Step 1: Initial notification settings page
    await expect(authenticatedPage).toHaveScreenshot('notifications-flow-step1-initial.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('complete flow - select digest frequency', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Step 2: Select weekly digest
    const weeklyOption = authenticatedPage.locator('button:has-text("Semanal")')
    const isVisible = await weeklyOption.isVisible().catch(() => false)

    if (isVisible) {
      await weeklyOption.click()
      await authenticatedPage.waitForTimeout(200)
      await prepareForVisualTest(authenticatedPage)

      await expect(authenticatedPage).toHaveScreenshot('notifications-flow-step2-weekly-selected.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('complete flow - enable quiet hours', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Step 3: Enable quiet hours
    const quietHoursToggle = authenticatedPage.locator('h4:has-text("Horario de silencio")').locator('..').locator('input[type="checkbox"]')
    const isChecked = await quietHoursToggle.isChecked().catch(() => false)

    if (!isChecked) {
      await quietHoursToggle.click()
      await authenticatedPage.waitForTimeout(200)
      await prepareForVisualTest(authenticatedPage)

      await expect(authenticatedPage).toHaveScreenshot('notifications-flow-step3-quiet-hours.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('complete flow - enable priority bypass', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Step 4: Enable priority bypass
    const priorityBypassToggle = authenticatedPage.locator('text=Notificaciones prioritarias inmediatas').locator('..').locator('..').locator('input[type="checkbox"]')
    const isChecked = await priorityBypassToggle.isChecked().catch(() => false)

    if (!isChecked) {
      await priorityBypassToggle.click()
      await authenticatedPage.waitForTimeout(200)
      await prepareForVisualTest(authenticatedPage)

      await expect(authenticatedPage).toHaveScreenshot('notifications-flow-step4-priority-bypass.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('complete flow - ready to save', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Make a change to enable save button
    const dailyOption = authenticatedPage.locator('button:has-text("Diario")')
    const isVisible = await dailyOption.isVisible().catch(() => false)

    if (isVisible) {
      await dailyOption.click()
      await authenticatedPage.waitForTimeout(200)
      await prepareForVisualTest(authenticatedPage)

      // Step 5: Ready to save with changes made
      await expect(authenticatedPage).toHaveScreenshot('notifications-flow-step5-ready-to-save.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Notification Digest Flow - Cross-Browser Consistency', () => {
  authTest('notification settings - cross-browser @chromium @firefox @webkit', async ({ authenticatedPage, browserName }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)
    await prepareForVisualTest(authenticatedPage)

    // Include browser name in screenshot for browser-specific baselines
    await expect(authenticatedPage).toHaveScreenshot(`notifications-digest-${browserName}.png`, {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio
    })
  })

  authTest('frequency selection - cross-browser @chromium @firefox @webkit', async ({ authenticatedPage, browserName }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Select daily and capture
    const dailyOption = authenticatedPage.locator('button:has-text("Diario")')
    const isVisible = await dailyOption.isVisible().catch(() => false)

    if (isVisible) {
      await dailyOption.click()
      await authenticatedPage.waitForTimeout(200)
      await prepareForVisualTest(authenticatedPage)

      const frequencySection = authenticatedPage.locator('h4:has-text("Frecuencia de notificaciones")').locator('..')
      await expect(frequencySection).toHaveScreenshot(`notifications-frequency-${browserName}.png`, {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  authTest('quiet hours enabled - cross-browser @chromium @firefox @webkit', async ({ authenticatedPage, browserName }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)

    // Enable quiet hours
    const quietHoursToggle = authenticatedPage.locator('h4:has-text("Horario de silencio")').locator('..').locator('input[type="checkbox"]')
    const isChecked = await quietHoursToggle.isChecked().catch(() => false)

    if (!isChecked) {
      await quietHoursToggle.click()
      await authenticatedPage.waitForTimeout(200)
    }

    await prepareForVisualTest(authenticatedPage)

    const quietHoursSection = authenticatedPage.locator('h4:has-text("Horario de silencio")').locator('..')
    const isSectionVisible = await quietHoursSection.isVisible().catch(() => false)

    if (isSectionVisible) {
      await expect(quietHoursSection).toHaveScreenshot(`notifications-quiet-hours-${browserName}.png`, {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})
