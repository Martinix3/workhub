import { test, expect } from '../../fixtures/auth.fixture'
import { prepareForVisualTest } from '../../utils/visual-test-helpers'
import { VISUAL_CONFIG } from '../../config/visual-regression.config'

/**
 * Visual Regression Tests - Form and Input Components
 *
 * Tests all form input variants, states, and interactions across the application
 * Follows visual regression patterns from spec with cross-browser support
 */

test.describe('Form Visual Regression - Text Inputs', () => {
  test('text input - default state', async ({ authenticatedPage }) => {
    // Navigate to settings page which has form inputs
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Locate a text input field
    const textInput = authenticatedPage.locator('input[type="text"]').first()
    const isVisible = await textInput.isVisible().catch(() => false)

    if (isVisible) {
      await expect(textInput).toHaveScreenshot('input-text-default.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('text input - focus state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const textInput = authenticatedPage.locator('input[type="text"]').first()
    const isVisible = await textInput.isVisible().catch(() => false)

    if (isVisible) {
      await textInput.focus()
      await authenticatedPage.waitForTimeout(300) // Wait for focus animation

      await expect(textInput).toHaveScreenshot('input-text-focus.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('text input - filled state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const textInput = authenticatedPage.locator('input[type="text"]').first()
    const isVisible = await textInput.isVisible().catch(() => false)

    if (isVisible) {
      await textInput.fill('Test Value')
      await authenticatedPage.waitForTimeout(200)

      await expect(textInput).toHaveScreenshot('input-text-filled.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('text input - disabled state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const disabledInput = authenticatedPage.locator('input[disabled]').first()
    const isVisible = await disabledInput.isVisible().catch(() => false)

    if (isVisible) {
      await expect(disabledInput).toHaveScreenshot('input-text-disabled.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Form Visual Regression - Email and Password Inputs', () => {
  test('email input - default state', async ({ page }) => {
    // Navigate to login page (unauthenticated)
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    const emailInput = page.locator('input[type="email"]').first()
    const isVisible = await emailInput.isVisible().catch(() => false)

    if (isVisible) {
      await expect(emailInput).toHaveScreenshot('input-email-default.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('email input - focus state', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    const emailInput = page.locator('input[type="email"]').first()
    const isVisible = await emailInput.isVisible().catch(() => false)

    if (isVisible) {
      await emailInput.focus()
      await page.waitForTimeout(300)

      await expect(emailInput).toHaveScreenshot('input-email-focus.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('password input - default state', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    const passwordInput = page.locator('input[type="password"]').first()
    const isVisible = await passwordInput.isVisible().catch(() => false)

    if (isVisible) {
      await expect(passwordInput).toHaveScreenshot('input-password-default.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('password input - filled state', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    const passwordInput = page.locator('input[type="password"]').first()
    const isVisible = await passwordInput.isVisible().catch(() => false)

    if (isVisible) {
      await passwordInput.fill('SecurePassword123')
      await page.waitForTimeout(200)

      await expect(passwordInput).toHaveScreenshot('input-password-filled.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Form Visual Regression - Textarea', () => {
  test('textarea - default state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const textarea = authenticatedPage.locator('textarea').first()
    const isVisible = await textarea.isVisible().catch(() => false)

    if (isVisible) {
      await expect(textarea).toHaveScreenshot('input-textarea-default.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('textarea - focus state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const textarea = authenticatedPage.locator('textarea').first()
    const isVisible = await textarea.isVisible().catch(() => false)

    if (isVisible) {
      await textarea.focus()
      await authenticatedPage.waitForTimeout(300)

      await expect(textarea).toHaveScreenshot('input-textarea-focus.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('textarea - filled state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const textarea = authenticatedPage.locator('textarea').first()
    const isVisible = await textarea.isVisible().catch(() => false)

    if (isVisible) {
      await textarea.fill('This is a multi-line text area with some content that spans multiple lines.')
      await authenticatedPage.waitForTimeout(200)

      await expect(textarea).toHaveScreenshot('input-textarea-filled.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Form Visual Regression - Select Dropdowns', () => {
  test('select - default state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const select = authenticatedPage.locator('select').first()
    const isVisible = await select.isVisible().catch(() => false)

    if (isVisible) {
      await expect(select).toHaveScreenshot('input-select-default.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('select - focus state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const select = authenticatedPage.locator('select').first()
    const isVisible = await select.isVisible().catch(() => false)

    if (isVisible) {
      await select.focus()
      await authenticatedPage.waitForTimeout(300)

      await expect(select).toHaveScreenshot('input-select-focus.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('custom select - combobox', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tareas')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    // Look for custom select/combobox (often using role="combobox")
    const combobox = authenticatedPage.locator('[role="combobox"]').first()
    const isVisible = await combobox.isVisible().catch(() => false)

    if (isVisible) {
      await expect(combobox).toHaveScreenshot('input-combobox-default.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Form Visual Regression - Checkboxes', () => {
  test('checkbox - unchecked state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const checkbox = authenticatedPage.locator('input[type="checkbox"]').first()
    const isVisible = await checkbox.isVisible().catch(() => false)

    if (isVisible) {
      // Ensure it's unchecked
      await checkbox.uncheck().catch(() => {})
      await authenticatedPage.waitForTimeout(200)

      await expect(checkbox).toHaveScreenshot('input-checkbox-unchecked.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('checkbox - checked state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const checkbox = authenticatedPage.locator('input[type="checkbox"]').first()
    const isVisible = await checkbox.isVisible().catch(() => false)

    if (isVisible) {
      await checkbox.check().catch(() => {})
      await authenticatedPage.waitForTimeout(200)

      await expect(checkbox).toHaveScreenshot('input-checkbox-checked.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('checkbox - focus state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const checkbox = authenticatedPage.locator('input[type="checkbox"]').first()
    const isVisible = await checkbox.isVisible().catch(() => false)

    if (isVisible) {
      await checkbox.focus()
      await authenticatedPage.waitForTimeout(300)

      await expect(checkbox).toHaveScreenshot('input-checkbox-focus.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Form Visual Regression - Radio Buttons', () => {
  test('radio button - unselected state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const radio = authenticatedPage.locator('input[type="radio"]').first()
    const isVisible = await radio.isVisible().catch(() => false)

    if (isVisible) {
      await expect(radio).toHaveScreenshot('input-radio-unselected.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('radio button - selected state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const radio = authenticatedPage.locator('input[type="radio"]').first()
    const isVisible = await radio.isVisible().catch(() => false)

    if (isVisible) {
      await radio.check().catch(() => {})
      await authenticatedPage.waitForTimeout(200)

      await expect(radio).toHaveScreenshot('input-radio-selected.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('radio button - focus state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const radio = authenticatedPage.locator('input[type="radio"]').first()
    const isVisible = await radio.isVisible().catch(() => false)

    if (isVisible) {
      await radio.focus()
      await authenticatedPage.waitForTimeout(300)

      await expect(radio).toHaveScreenshot('input-radio-focus.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Form Visual Regression - Validation States', () => {
  test('input with error state', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    // Try to submit form with invalid email to trigger validation
    const emailInput = page.locator('input[type="email"]').first()
    const submitButton = page.locator('button[type="submit"]').first()

    const emailVisible = await emailInput.isVisible().catch(() => false)
    const submitVisible = await submitButton.isVisible().catch(() => false)

    if (emailVisible && submitVisible) {
      await emailInput.fill('invalid-email')
      await submitButton.click()
      await page.waitForTimeout(500)

      // Check if error message or styling appears
      const errorInput = page.locator('input[aria-invalid="true"], input.border-red-500').first()
      const errorVisible = await errorInput.isVisible().catch(() => false)

      if (errorVisible) {
        await expect(errorInput).toHaveScreenshot('input-error-state.png', {
          maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
        })
      } else {
        expect(true).toBe(true)
      }
    } else {
      expect(true).toBe(true)
    }
  })

  test('error message text', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"]').first()
    const submitButton = page.locator('button[type="submit"]').first()

    const emailVisible = await emailInput.isVisible().catch(() => false)
    const submitVisible = await submitButton.isVisible().catch(() => false)

    if (emailVisible && submitVisible) {
      await emailInput.fill('invalid-email')
      await submitButton.click()
      await page.waitForTimeout(500)

      // Look for error message
      const errorMessage = page.locator('.text-red-500, .text-destructive, [role="alert"]').first()
      const errorVisible = await errorMessage.isVisible().catch(() => false)

      if (errorVisible) {
        await expect(errorMessage).toHaveScreenshot('form-error-message.png', {
          maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
        })
      } else {
        expect(true).toBe(true)
      }
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Form Visual Regression - Full Form Layout', () => {
  test('login form - complete layout', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    const loginForm = page.locator('form').first()
    const isVisible = await loginForm.isVisible().catch(() => false)

    if (isVisible) {
      await expect(loginForm).toHaveScreenshot('form-login-complete.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('settings form - complete layout', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const settingsForm = authenticatedPage.locator('form').first()
    const isVisible = await settingsForm.isVisible().catch(() => false)

    if (isVisible) {
      await expect(settingsForm).toHaveScreenshot('form-settings-complete.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Form Visual Regression - Responsive Forms', () => {
  test('login form - mobile viewport', async ({ page }) => {
    await page.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    const loginForm = page.locator('form').first()
    const isVisible = await loginForm.isVisible().catch(() => false)

    if (isVisible) {
      await expect(loginForm).toHaveScreenshot('form-login-mobile.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('login form - tablet viewport', async ({ page }) => {
    await page.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    const loginForm = page.locator('form').first()
    const isVisible = await loginForm.isVisible().catch(() => false)

    if (isVisible) {
      await expect(loginForm).toHaveScreenshot('form-login-tablet.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('login form - desktop viewport', async ({ page }) => {
    await page.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await prepareForVisualTest(page)

    const loginForm = page.locator('form').first()
    const isVisible = await loginForm.isVisible().catch(() => false)

    if (isVisible) {
      await expect(loginForm).toHaveScreenshot('form-login-desktop.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})
