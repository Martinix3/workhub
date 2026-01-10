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
    // Wait for any overlays to disappear before clicking
    const overlay = this.page.locator('.fixed.inset-0.z-40')
    if (await overlay.isVisible().catch(() => false)) {
      await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
        // If overlay doesn't disappear, click on it first to close
        overlay.click().catch(() => {})
      })
    }
    // Wait a moment for any animations
    await this.page.waitForTimeout(200)
    await this.userMenuButton.click({ force: true })
    await expect(this.userMenuDropdown).toBeVisible({ timeout: 5000 })
  }

  async closeUserMenu() {
    // Click outside to close
    await this.page.click('body', { position: { x: 10, y: 10 } })
    await expect(this.userMenuDropdown).not.toBeVisible()
  }

  async logout() {
    await this.openUserMenu()
    await this.page.click('button:has-text("Cerrar Sesion")')
  }

  async openSettings() {
    await this.openUserMenu()
    await this.page.click('button:has-text("Configuracion"), button:has-text("Mi Perfil")')
  }

  async openAdmin() {
    await this.openUserMenu()
    const adminButton = this.page.locator('button:has-text("Administracion")')
    if (await adminButton.isVisible()) {
      await adminButton.click()
    } else {
      throw new Error('Admin button not visible - user may not have admin role')
    }
  }

  get adminButton() {
    return this.page.locator('button:has-text("Administracion")')
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
