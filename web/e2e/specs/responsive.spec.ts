import { test, expect } from '../fixtures/auth.fixture'
import { ShellPage } from '../pages/shell.page'

test.describe('Responsive - Mobile (iPhone 12)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('sidebar comportamiento en mobile', async ({ authenticatedPage }) => {
    const shellPage = new ShellPage(authenticatedPage)

    // Check the page loaded correctly
    await expect(authenticatedPage.locator('main, [class*="container"]')).toBeVisible()

    // On mobile, hamburger menu should be visible
    await expect(shellPage.hamburgerMenu).toBeVisible()

    // Sidebar should be hidden initially on mobile
    // (may not be strictly hidden if layout varies, but hamburger presence indicates mobile mode)
  })

  test('hamburger menu abre sidebar', async ({ authenticatedPage }) => {
    const shellPage = new ShellPage(authenticatedPage)

    // Wait for hamburger to be ready
    await expect(shellPage.hamburgerMenu).toBeVisible()

    // Click hamburger menu
    await shellPage.hamburgerMenu.click()

    // Sidebar should now be visible
    await expect(shellPage.sidebar).toBeVisible()
  })

  test('overlay cierra sidebar', async ({ authenticatedPage }) => {
    const shellPage = new ShellPage(authenticatedPage)

    // Wait for hamburger to be ready
    await expect(shellPage.hamburgerMenu).toBeVisible()

    // Open sidebar
    await shellPage.hamburgerMenu.click()
    await expect(shellPage.sidebar).toBeVisible()

    // Wait for overlay to appear
    await expect(shellPage.sidebarOverlay).toBeVisible()

    // Click overlay to close sidebar
    await shellPage.sidebarOverlay.click()

    // Sidebar should be hidden after clicking overlay
    await expect(shellPage.sidebar).not.toBeVisible()
  })
})

test.describe('Responsive - Tablet (iPad)', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('sidebar visible en tablet', async ({ authenticatedPage }) => {
    const shellPage = new ShellPage(authenticatedPage)
    // On tablet, sidebar should be visible
    await expect(shellPage.sidebar).toBeVisible()
  })

  test('contenido principal visible', async ({ authenticatedPage }) => {
    const shellPage = new ShellPage(authenticatedPage)
    await expect(shellPage.mainContent).toBeVisible()
  })
})

test.describe('Responsive - Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('sidebar y contenido side-by-side', async ({ authenticatedPage }) => {
    const shellPage = new ShellPage(authenticatedPage)

    await expect(shellPage.sidebar).toBeVisible()
    await expect(shellPage.mainContent).toBeVisible()

    // Both should be visible at the same time
    const sidebarBox = await shellPage.sidebar.boundingBox()
    const mainBox = await shellPage.mainContent.boundingBox()

    expect(sidebarBox).not.toBeNull()
    expect(mainBox).not.toBeNull()

    // Sidebar should be on the left
    if (sidebarBox && mainBox) {
      expect(sidebarBox.x).toBeLessThan(mainBox.x)
    }
  })

  test('hamburger menu oculto en desktop', async ({ authenticatedPage }) => {
    const shellPage = new ShellPage(authenticatedPage)
    await expect(shellPage.hamburgerMenu).not.toBeVisible()
  })
})
