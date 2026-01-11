import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from '../base.page'

/**
 * Notification Center Page Object - Notification dropdown and interactions
 */
export class NotificationCenterPage extends BasePage {
  // Bell Button
  readonly bellButton: Locator
  readonly unreadBadge: Locator

  // Dropdown Panel
  readonly dropdown: Locator
  readonly dropdownOverlay: Locator
  readonly header: Locator
  readonly title: Locator
  readonly markAllReadButton: Locator

  // Notification List
  readonly notificationList: Locator
  readonly loadingIndicator: Locator
  readonly emptyState: Locator

  // Notification Items
  readonly notificationItems: Locator

  constructor(page: Page) {
    super(page)

    // Bell button with badge
    this.bellButton = page.locator('button[title="Notificaciones"]')
    this.unreadBadge = this.bellButton.locator('span.bg-red-500')

    // Dropdown panel
    this.dropdown = page.locator('div.absolute.bottom-full:has(h3:has-text("Notificaciones"))')
    this.dropdownOverlay = page.locator('div.fixed.inset-0.z-40')

    // Header elements
    this.header = this.dropdown.locator('div.flex.items-center.justify-between').first()
    this.title = this.dropdown.locator('h3:has-text("Notificaciones")')
    this.markAllReadButton = this.dropdown.locator('button:has-text("Marcar todas")')

    // List and states
    this.notificationList = this.dropdown.locator('div.max-h-\\[32rem\\]')
    this.loadingIndicator = this.dropdown.locator('text=Cargando')
    this.emptyState = this.dropdown.locator('text=No tienes notificaciones')

    // Notification items (each notification is in a bordered div)
    this.notificationItems = this.dropdown.locator('div.border-b.border-slate-700')
  }

  // Open/Close
  async open() {
    await this.bellButton.click()
    await expect(this.dropdown).toBeVisible({ timeout: 5000 })
  }

  async close() {
    await this.dropdownOverlay.click()
    await expect(this.dropdown).not.toBeVisible()
  }

  async closeWithEscape() {
    await this.pressEscape()
    await expect(this.dropdown).not.toBeVisible()
  }

  async isOpen(): Promise<boolean> {
    return await this.dropdown.isVisible().catch(() => false)
  }

  // Unread Badge
  async getUnreadCount(): Promise<number> {
    try {
      const badgeText = await this.unreadBadge.textContent()
      if (!badgeText) return 0
      if (badgeText === '9+') return 9
      return parseInt(badgeText, 10)
    } catch {
      return 0
    }
  }

  async hasUnreadBadge(): Promise<boolean> {
    return await this.unreadBadge.isVisible().catch(() => false)
  }

  // Mark as Read
  async markAllRead() {
    await this.markAllReadButton.click()
    await this.page.waitForTimeout(300)
  }

  async markNotificationAsRead(index = 0) {
    const notification = this.notificationItems.nth(index)
    const markReadButton = notification.locator('button[title="Marcar como leida"]')
    await markReadButton.click()
    await this.page.waitForTimeout(300)
  }

  async markNotificationAsReadByTitle(title: string) {
    const notification = this.getNotificationByTitle(title)
    const markReadButton = notification.locator('button[title="Marcar como leida"]')
    await markReadButton.click()
    await this.page.waitForTimeout(300)
  }

  // Delete
  async deleteNotification(index = 0) {
    const notification = this.notificationItems.nth(index)
    const deleteButton = notification.locator('button[title="Eliminar"]')
    await deleteButton.click()
    await this.page.waitForTimeout(300)
  }

  async deleteNotificationByTitle(title: string) {
    const notification = this.getNotificationByTitle(title)
    const deleteButton = notification.locator('button[title="Eliminar"]')
    await deleteButton.click()
    await this.page.waitForTimeout(300)
  }

  // Click Notification
  async clickNotification(index = 0) {
    const notification = this.notificationItems.nth(index)
    const titleButton = notification.locator('button.text-left.w-full')
    await titleButton.click()
    await this.page.waitForTimeout(300)
  }

  async clickNotificationByTitle(title: string) {
    const notification = this.getNotificationByTitle(title)
    const titleButton = notification.locator('button.text-left.w-full')
    await titleButton.click()
    await this.page.waitForTimeout(300)
  }

  // Helpers
  getNotificationByTitle(title: string): Locator {
    return this.dropdown.locator(`h4:has-text("${title}")`).locator('xpath=ancestor::div[@class[contains(., "border-b")]]')
  }

  async getNotificationCount(): Promise<number> {
    try {
      await this.waitForDataLoaded()
      return await this.notificationItems.count()
    } catch {
      return 0
    }
  }

  async waitForDataLoaded() {
    try {
      await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 })
    } catch {
      // Loading indicator might not exist
    }
    await this.page.waitForTimeout(300)
  }

  async hasNotifications(): Promise<boolean> {
    await this.waitForDataLoaded()
    const count = await this.getNotificationCount()
    return count > 0
  }

  async isEmpty(): Promise<boolean> {
    await this.waitForDataLoaded()
    return await this.emptyState.isVisible().catch(() => false)
  }

  async isLoading(): Promise<boolean> {
    return await this.loadingIndicator.isVisible().catch(() => false)
  }

  // Get notification details
  async getNotificationTitle(index = 0): Promise<string> {
    const notification = this.notificationItems.nth(index)
    const title = notification.locator('h4')
    return (await title.textContent()) || ''
  }

  async getNotificationMessage(index = 0): Promise<string> {
    const notification = this.notificationItems.nth(index)
    const message = notification.locator('p.text-xs')
    return (await message.textContent()) || ''
  }

  async isNotificationUnread(index = 0): Promise<boolean> {
    const notification = this.notificationItems.nth(index)
    // Unread notifications have bg-[#1e293b] class
    const classList = await notification.getAttribute('class')
    return classList?.includes('bg-[#1e293b]') || false
  }

  async isNotificationUnreadByTitle(title: string): Promise<boolean> {
    const notification = this.getNotificationByTitle(title)
    const classList = await notification.getAttribute('class')
    return classList?.includes('bg-[#1e293b]') || false
  }

  // Verify states
  async verifyNotificationExists(title: string): Promise<boolean> {
    try {
      const notification = this.getNotificationByTitle(title)
      return await notification.isVisible({ timeout: 3000 })
    } catch {
      return false
    }
  }

  async verifyMarkAllReadButtonVisible(): Promise<boolean> {
    return await this.markAllReadButton.isVisible().catch(() => false)
  }

  /**
   * Wait for notification center to be fully loaded and open
   */
  async waitForOpen() {
    await expect(this.dropdown).toBeVisible({ timeout: 5000 })
    await this.waitForDataLoaded()
  }

  /**
   * Get all notification titles
   */
  async getAllNotificationTitles(): Promise<string[]> {
    await this.waitForDataLoaded()
    const titles = await this.notificationItems.locator('h4').allTextContents()
    return titles
  }

  /**
   * Verify notification order (most recent first)
   */
  async getNotificationTimestamps(): Promise<string[]> {
    await this.waitForDataLoaded()
    const timestamps = await this.notificationItems.locator('span.text-xs.text-slate-500').allTextContents()
    return timestamps
  }
}
