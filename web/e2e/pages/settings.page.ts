import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Settings Page Object - 4 tabs
 */
export class SettingsPage extends BasePage {
  // Tab buttons
  readonly profileTab: Locator
  readonly preferencesTab: Locator
  readonly notificationsTab: Locator
  readonly departmentsTab: Locator

  // Profile tab elements
  readonly avatar: Locator
  readonly userName: Locator
  readonly userEmail: Locator
  readonly rolesBadges: Locator

  // Preferences tab elements
  readonly themeSelect: Locator
  readonly languageSelect: Locator

  // Notifications tab elements
  readonly emailToggle: Locator
  readonly pushToggle: Locator
  readonly digestSelect: Locator

  // Departments tab elements
  readonly departmentItems: Locator
  readonly lockedDepartments: Locator

  constructor(page: Page) {
    super(page)

    // Tabs
    this.profileTab = page.locator('button:has-text("Perfil")')
    this.preferencesTab = page.locator('button:has-text("Preferencias")')
    this.notificationsTab = page.locator('button:has-text("Notificaciones")')
    this.departmentsTab = page.locator('button:has-text("Departamentos")')

    // Profile
    this.avatar = page.locator('[class*="rounded-full"]:has(img), [class*="rounded-full"][class*="bg-"]')
    this.userName = page.locator('h2, [class*="text-xl"]').first()
    this.userEmail = page.locator('[class*="text-stone-500"], [class*="text-gray-500"]').first()
    this.rolesBadges = page.locator('[class*="bg-blue-"], [class*="badge"]')

    // Preferences
    this.themeSelect = page.locator('select, [role="combobox"]').first()
    this.languageSelect = page.locator('select, [role="combobox"]').last()

    // Notifications
    this.emailToggle = page.locator('[role="switch"], input[type="checkbox"]').first()
    this.pushToggle = page.locator('[role="switch"], input[type="checkbox"]').nth(1)
    this.digestSelect = page.locator('select').first()

    // Departments
    this.departmentItems = page.locator('[class*="border"]:has([class*="Lock"]), [class*="department"]')
    this.lockedDepartments = page.locator('svg[class*="Lock"], [class*="lock"]')
  }

  async selectTab(tabName: 'Perfil' | 'Preferencias' | 'Notificaciones' | 'Departamentos') {
    const tab = this.page.locator(`button:has-text("${tabName}")`)
    await tab.click()
    await this.page.waitForTimeout(200) // Wait for tab transition
  }

  async setTheme(theme: 'light' | 'dark' | 'system') {
    const themeMap = { light: 'Claro', dark: 'Oscuro', system: 'Sistema' }
    await this.themeSelect.click()
    await this.page.locator(`text=${themeMap[theme]}`).click()
  }

  async toggleEmailNotifications() {
    await this.emailToggle.click()
  }

  async togglePushNotifications() {
    await this.pushToggle.click()
  }
}
