import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Shell Page Object - Sidebar, UserMenu, Navigation
 */
export class ShellPage extends BasePage {
  // Selectors
  readonly sidebar: Locator
  readonly userMenuButton: Locator
  readonly userMenuDropdown: Locator
  readonly hamburgerMenu: Locator
  readonly sidebarOverlay: Locator
  readonly searchButton: Locator
  readonly commandPalette: Locator
  readonly mainContent: Locator

  constructor(page: Page) {
    super(page)

    this.sidebar = page.locator('aside')
    this.userMenuButton = page.locator('[class*="relative"] button:has([class*="rounded-full"])')
    this.userMenuDropdown = page.locator('[class*="absolute"][class*="bottom-full"]')
    this.hamburgerMenu = page.locator('header button:has(svg)').first()
    this.sidebarOverlay = page.locator('[class*="fixed"][class*="inset-0"][class*="bg-black"]')
    this.searchButton = page.locator('header button:has(svg):last-child')
    this.commandPalette = page.locator('[class*="fixed"][class*="z-50"]:has(input)')
    this.mainContent = page.locator('main')
  }

  // User Menu
  async openUserMenu() {
    // Wait for page to be fully loaded and stable
    await this.page.waitForLoadState('networkidle').catch(() => {})

    // Wait for user menu button to be visible and enabled (no force click)
    await this.userMenuButton.waitFor({ state: 'visible', timeout: 5000 })

    // Click normally - Playwright will wait for actionability
    await this.userMenuButton.click()

    // Verify dropdown appeared
    await expect(this.userMenuDropdown).toBeVisible({ timeout: 5000 })
  }

  async closeUserMenu() {
    // Click outside to close
    await this.page.click('body', { position: { x: 10, y: 10 } })
    await expect(this.userMenuDropdown).not.toBeVisible()
  }

  async logout() {
    await this.openUserMenu()
    // Use multiple selectors for logout button (prefer data-testid if available)
    const logoutButton = this.page.locator('[data-testid="logout-button"], button:has-text("Cerrar Sesión"), button:has-text("Cerrar Sesion")')
    await logoutButton.click()
  }

  async openSettings() {
    await this.openUserMenu()
    // Use multiple selectors for settings button
    const settingsButton = this.page.locator('[data-testid="settings-button"], button:has-text("Configuración"), button:has-text("Configuracion"), button:has-text("Mi Perfil")')
    await settingsButton.click()
  }

  async openAdmin() {
    await this.openUserMenu()
    // Use multiple selectors for admin button
    const adminButton = this.page.locator('[data-testid="admin-button"], button:has-text("Administración"), button:has-text("Administracion")')

    // Wait for button with timeout to determine if available
    const isVisible = await adminButton.isVisible().catch(() => false)

    if (isVisible) {
      await adminButton.click()
    } else {
      throw new Error('Admin button not visible - user may not have admin role')
    }
  }

  get adminButton() {
    return this.page.locator('[data-testid="admin-button"], button:has-text("Administración"), button:has-text("Administracion")')
  }

  // Navigation
  async navigateTo(section: string) {
    // Click on section in sidebar
    const sectionLink = this.sidebar.locator(`text=${section}`)
    await sectionLink.click()
    await this.waitForLoad()
  }

  async expandSection(sectionLabel: string) {
    const section = this.sidebar.locator(`button:has-text("${sectionLabel}")`)
    await section.click()
  }

  async clickSubItem(itemLabel: string) {
    const item = this.sidebar.locator(`a:has-text("${itemLabel}")`)
    await item.click()
    await this.waitForLoad()
  }

  // Mobile
  async openSidebarMobile() {
    await this.hamburgerMenu.click()
    await expect(this.sidebar).toBeVisible()
  }

  async closeSidebarMobile() {
    await this.sidebarOverlay.click()
    await expect(this.sidebar).not.toBeVisible()
  }

  async toggleSidebar() {
    const isVisible = await this.sidebar.isVisible()
    if (isVisible) {
      await this.closeSidebarMobile()
    } else {
      await this.openSidebarMobile()
    }
  }

  // Command Palette
  async openCommandPalette() {
    await this.searchButton.click()
    await expect(this.commandPalette).toBeVisible()
  }

  async closeCommandPalette() {
    await this.pressEscape()
    await expect(this.commandPalette).not.toBeVisible()
  }

  async searchInPalette(query: string) {
    await this.openCommandPalette()
    await this.commandPalette.locator('input').fill(query)
  }
}
