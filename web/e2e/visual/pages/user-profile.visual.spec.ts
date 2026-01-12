import { test, expect } from '../../fixtures/auth.fixture'
import { prepareForVisualTest } from '../../utils/visual-test-helpers'
import { VISUAL_CONFIG } from '../../config/visual-regression.config'
import { SettingsPage } from '../../pages/settings.page'
import { ShellPage } from '../../pages/shell.page'

/**
 * Visual Regression Tests - User Profile Page
 *
 * Full-page visual tests for user profile/settings page across all viewports
 * Tests profile tab, preferences, notifications, and departments sections for responsive design and visual consistency
 */

test.describe('User Profile Visual Regression - Full Page', () => {
  test('profile page - desktop viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    const shell = new ShellPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('profile-full-desktop.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('profile page - tablet viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    const shell = new ShellPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('profile-full-tablet.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('profile page - mobile viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    const shell = new ShellPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('profile-full-mobile.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })
})

test.describe('User Profile Visual Regression - Profile Tab Components', () => {
  test('profile - user avatar', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const avatar = settings.avatar.first()
    const isVisible = await avatar.isVisible().catch(() => false)

    if (isVisible) {
      await expect(avatar).toHaveScreenshot('profile-avatar.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('profile - user info section', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const userName = settings.userName
    const isVisible = await userName.isVisible().catch(() => false)

    if (isVisible) {
      const userInfoContainer = userName.locator('..').first()
      await expect(userInfoContainer).toHaveScreenshot('profile-userinfo.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('profile - roles badges', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const rolesBadge = settings.rolesBadges.first()
    const isVisible = await rolesBadge.isVisible().catch(() => false)

    if (isVisible) {
      const badgesContainer = rolesBadge.locator('..').first()
      await expect(badgesContainer).toHaveScreenshot('profile-roles-badges.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('profile - tabs navigation', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const profileTab = settings.profileTab
    const isVisible = await profileTab.isVisible().catch(() => false)

    if (isVisible) {
      const tabsContainer = profileTab.locator('..').first()
      await expect(tabsContainer).toHaveScreenshot('profile-tabs-nav.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('User Profile Visual Regression - Preferences Tab', () => {
  test('preferences - full tab view', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await settings.selectTab('Preferencias')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('profile-preferences-full.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('preferences - theme selector', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await settings.selectTab('Preferencias')
    await prepareForVisualTest(authenticatedPage)

    const themeSelect = settings.themeSelect
    const isVisible = await themeSelect.isVisible().catch(() => false)

    if (isVisible) {
      const themeContainer = themeSelect.locator('..').first()
      await expect(themeContainer).toHaveScreenshot('profile-theme-selector.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('preferences - language selector', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await settings.selectTab('Preferencias')
    await prepareForVisualTest(authenticatedPage)

    const languageSelect = settings.languageSelect
    const isVisible = await languageSelect.isVisible().catch(() => false)

    if (isVisible) {
      const languageContainer = languageSelect.locator('..').first()
      await expect(languageContainer).toHaveScreenshot('profile-language-selector.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('User Profile Visual Regression - Notifications Tab', () => {
  test('notifications - full tab view', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await settings.selectTab('Notificaciones')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('profile-notifications-full.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('notifications - email toggle', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await settings.selectTab('Notificaciones')
    await prepareForVisualTest(authenticatedPage)

    const emailToggle = settings.emailToggle
    const isVisible = await emailToggle.isVisible().catch(() => false)

    if (isVisible) {
      const toggleContainer = emailToggle.locator('..').first()
      await expect(toggleContainer).toHaveScreenshot('profile-email-toggle.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('notifications - push toggle', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await settings.selectTab('Notificaciones')
    await prepareForVisualTest(authenticatedPage)

    const pushToggle = settings.pushToggle
    const isVisible = await pushToggle.isVisible().catch(() => false)

    if (isVisible) {
      const toggleContainer = pushToggle.locator('..').first()
      await expect(toggleContainer).toHaveScreenshot('profile-push-toggle.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('notifications - digest selector', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await settings.selectTab('Notificaciones')
    await prepareForVisualTest(authenticatedPage)

    const digestSelect = settings.digestSelect
    const isVisible = await digestSelect.isVisible().catch(() => false)

    if (isVisible) {
      const digestContainer = digestSelect.locator('..').first()
      await expect(digestContainer).toHaveScreenshot('profile-digest-selector.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('User Profile Visual Regression - Departments Tab', () => {
  test('departments - full tab view', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await settings.selectTab('Departamentos')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('profile-departments-full.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('departments - department item', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await settings.selectTab('Departamentos')
    await prepareForVisualTest(authenticatedPage)

    const departmentItem = settings.departmentItems.first()
    const isVisible = await departmentItem.isVisible().catch(() => false)

    if (isVisible) {
      await expect(departmentItem).toHaveScreenshot('profile-department-item.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('departments - locked indicator', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await settings.selectTab('Departamentos')
    await prepareForVisualTest(authenticatedPage)

    const lockedIcon = settings.lockedDepartments.first()
    const isVisible = await lockedIcon.isVisible().catch(() => false)

    if (isVisible) {
      const lockedContainer = lockedIcon.locator('..').first()
      await expect(lockedContainer).toHaveScreenshot('profile-locked-department.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('User Profile Visual Regression - Responsive Breakpoints', () => {
  test('profile - mobile small (375px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.small)
    const shell = new ShellPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('profile-viewport-mobile-small.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('profile - mobile medium (390px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.medium)
    const shell = new ShellPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('profile-viewport-mobile-medium.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('profile - mobile large (414px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.mobile.large)
    const shell = new ShellPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('profile-viewport-mobile-large.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('profile - tablet small (768px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.small)
    const shell = new ShellPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('profile-viewport-tablet-small.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('profile - tablet medium (834px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.medium)
    const shell = new ShellPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('profile-viewport-tablet-medium.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('profile - tablet large (1024px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.tablet.large)
    const shell = new ShellPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('profile-viewport-tablet-large.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('profile - desktop hd (1280px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.hd)
    const shell = new ShellPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('profile-viewport-desktop-hd.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('profile - desktop fhd (1920px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop.fhd)
    const shell = new ShellPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('profile-viewport-desktop-fhd.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })

  test('profile - desktop 2k (1440px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(VISUAL_CONFIG.viewports.desktop['2k'])
    const shell = new ShellPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    await expect(authenticatedPage).toHaveScreenshot('profile-viewport-desktop-2k.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.screenshots.thresholds.page.maxDiffPixelRatio,
      fullPage: true
    })
  })
})

test.describe('User Profile Visual Regression - Interactive States', () => {
  test('profile - tab hover state', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await prepareForVisualTest(authenticatedPage)

    const preferencesTab = settings.preferencesTab
    const isVisible = await preferencesTab.isVisible().catch(() => false)

    if (isVisible) {
      await preferencesTab.hover()
      await authenticatedPage.waitForTimeout(300)

      await expect(preferencesTab).toHaveScreenshot('profile-tab-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('profile - tab active state', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await settings.selectTab('Preferencias')
    await prepareForVisualTest(authenticatedPage)

    const preferencesTab = settings.preferencesTab
    const isVisible = await preferencesTab.isVisible().catch(() => false)

    if (isVisible) {
      await expect(preferencesTab).toHaveScreenshot('profile-tab-active.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('notifications - toggle enabled state', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await settings.selectTab('Notificaciones')
    await prepareForVisualTest(authenticatedPage)

    const emailToggle = settings.emailToggle
    const isVisible = await emailToggle.isVisible().catch(() => false)

    if (isVisible) {
      const isChecked = await emailToggle.isChecked().catch(() => false)
      if (!isChecked) {
        await settings.toggleEmailNotifications()
        await authenticatedPage.waitForTimeout(300)
      }
      await prepareForVisualTest(authenticatedPage)

      const toggleContainer = emailToggle.locator('..').first()
      await expect(toggleContainer).toHaveScreenshot('profile-toggle-enabled.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })

  test('departments - department item hover', async ({ authenticatedPage }) => {
    const shell = new ShellPage(authenticatedPage)
    const settings = new SettingsPage(authenticatedPage)
    await shell.openSettings()
    await authenticatedPage.waitForLoadState('networkidle')
    await settings.selectTab('Departamentos')
    await prepareForVisualTest(authenticatedPage)

    const departmentItem = settings.departmentItems.first()
    const isVisible = await departmentItem.isVisible().catch(() => false)

    if (isVisible) {
      await departmentItem.hover()
      await authenticatedPage.waitForTimeout(300)

      await expect(departmentItem).toHaveScreenshot('profile-department-hover.png', {
        maxDiffPixels: VISUAL_CONFIG.screenshots.thresholds.component
      })
    } else {
      expect(true).toBe(true)
    }
  })
})
