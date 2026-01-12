import { type Page, type Locator } from '@playwright/test'
import { BasePage } from '../base.page'

/**
 * Task Dependencies Page Object - Blocker visualization and dependency management
 */
export class TaskDependenciesPage extends BasePage {
  // Blocked Tasks Panel
  readonly blockedTasksPanel: Locator
  readonly blockedTasksHeader: Locator
  readonly blockedTasksCount: Locator
  readonly blockedTaskCards: Locator
  readonly emptyBlockedState: Locator

  // Blocked Task Card elements
  readonly blockedReasonBox: Locator
  readonly unblockToNextButton: Locator
  readonly unblockToDoingButton: Locator

  // Blocked Reason Modal
  readonly blockedReasonModal: Locator
  readonly blockedReasonModalTitle: Locator
  readonly blockedReasonTextarea: Locator
  readonly blockedReasonError: Locator
  readonly blockedReasonCancelButton: Locator
  readonly blockedReasonConfirmButton: Locator

  // Task Card Blocker Indicators
  readonly blockerBadges: Locator
  readonly blockedByCount: Locator
  readonly blocksCount: Locator

  // Loading states
  readonly loadingIndicator: Locator

  constructor(page: Page) {
    super(page)

    // Blocked Tasks Panel - based on BlockedTasksPanel.tsx
    this.blockedTasksPanel = page.locator('div:has(h2:has-text("Tareas Bloqueadas"))')
    this.blockedTasksHeader = page.locator('h2:has-text("Tareas Bloqueadas")')
    this.blockedTasksCount = page.locator('h2:has-text("Tareas Bloqueadas") >> xpath=../.. >> .font-mono')
    this.blockedTaskCards = page.locator('.bg-stone-50.border-2.border-stone-300')
    this.emptyBlockedState = page.locator('h3:has-text("Sin Bloqueos")')

    // Blocked Task Card elements
    this.blockedReasonBox = page.locator('.bg-red-50.border-l-4.border-red-500')
    this.unblockToNextButton = page.locator('button:has-text("Next")')
    this.unblockToDoingButton = page.locator('button:has-text("Doing"):has(svg)')

    // Blocked Reason Modal - based on BlockedReasonModal.tsx
    this.blockedReasonModal = page.locator('div:has(h2:has-text("Task Blocked"))')
    this.blockedReasonModalTitle = page.locator('h2:has-text("Task Blocked")')
    this.blockedReasonTextarea = page.locator('textarea#blocked-reason')
    this.blockedReasonError = page.locator('.bg-red-50.dark\\:bg-red-900\\/20.border.border-red-200')
    this.blockedReasonCancelButton = page.locator('button:has-text("Cancel")')
    this.blockedReasonConfirmButton = page.locator('button:has-text("Block Task")')

    // Task Card Blocker Indicators
    this.blockerBadges = page.locator('text=/^(VENCIDA|BLOCKED)$/')
    this.blockedByCount = page.locator('[data-testid="blocked-by-count"]')
    this.blocksCount = page.locator('[data-testid="blocks-count"]')

    // States
    this.loadingIndicator = page.locator('text=Cargando')
  }

  // Navigation
  async gotoMyDay() {
    await this.goto('/tareas/mi-dia')
  }

  async gotoKanban() {
    await this.goto('/tareas/kanban')
  }

  async gotoProjects() {
    await this.goto('/tareas/proyectos')
  }

  // Blocked Tasks Panel Actions
  async getBlockedTasksCount(): Promise<number> {
    try {
      const countText = await this.blockedTasksCount.textContent()
      return parseInt(countText || '0', 10)
    } catch {
      return 0
    }
  }

  async isBlockedTasksPanelVisible(): Promise<boolean> {
    try {
      return await this.blockedTasksPanel.isVisible({ timeout: 3000 })
    } catch {
      return false
    }
  }

  async isEmptyBlockedStateVisible(): Promise<boolean> {
    try {
      return await this.emptyBlockedState.isVisible({ timeout: 3000 })
    } catch {
      return false
    }
  }

  async getBlockedTaskCardCount(): Promise<number> {
    return await this.blockedTaskCards.count()
  }

  async clickBlockedTask(index = 0) {
    await this.blockedTaskCards.nth(index).click()
  }

  async clickBlockedTaskByTitle(taskTitle: string) {
    const taskCard = this.page.locator(`h3:has-text("${taskTitle}") >> xpath=ancestor::div[@class*="bg-stone-50"]`)
    await taskCard.click()
  }

  // Blocked Reason Modal Actions
  async isBlockedReasonModalVisible(): Promise<boolean> {
    try {
      return await this.blockedReasonModal.isVisible({ timeout: 3000 })
    } catch {
      return false
    }
  }

  async fillBlockedReason(reason: string) {
    await this.blockedReasonTextarea.fill(reason)
  }

  async getBlockedReasonError(): Promise<string> {
    try {
      return await this.blockedReasonError.textContent() || ''
    } catch {
      return ''
    }
  }

  async clickBlockedReasonCancel() {
    await this.blockedReasonCancelButton.click()
    await this.page.waitForTimeout(300)
  }

  async clickBlockedReasonConfirm() {
    await this.blockedReasonConfirmButton.click()
    await this.page.waitForTimeout(300)
  }

  async blockTaskWithReason(reason: string) {
    await this.fillBlockedReason(reason)
    await this.clickBlockedReasonConfirm()
  }

  // Unblock Actions
  async unblockTaskToNext(index = 0) {
    await this.unblockToNextButton.nth(index).click()
    await this.page.waitForTimeout(500)
  }

  async unblockTaskToDoing(index = 0) {
    await this.unblockToDoingButton.nth(index).click()
    await this.page.waitForTimeout(500)
  }

  async unblockTaskByTitleToNext(taskTitle: string) {
    const taskCard = this.page.locator(`h3:has-text("${taskTitle}") >> xpath=ancestor::div[@class*="bg-stone-50"]`)
    const nextButton = taskCard.locator('button:has-text("Next")')
    await nextButton.click()
    await this.page.waitForTimeout(500)
  }

  async unblockTaskByTitleToDoing(taskTitle: string) {
    const taskCard = this.page.locator(`h3:has-text("${taskTitle}") >> xpath=ancestor::div[@class*="bg-stone-50"]`)
    const doingButton = taskCard.locator('button:has-text("Doing"):has(svg)')
    await doingButton.click()
    await this.page.waitForTimeout(500)
  }

  // Blocked Reason Display
  async getBlockedReason(taskTitle: string): Promise<string> {
    try {
      const taskCard = this.page.locator(`h3:has-text("${taskTitle}") >> xpath=ancestor::div[@class*="bg-stone-50"]`)
      const reasonBox = taskCard.locator('.bg-red-50.border-l-4.border-red-500 p')
      return await reasonBox.textContent() || ''
    } catch {
      return ''
    }
  }

  async hasBlockedReason(taskTitle: string): Promise<boolean> {
    try {
      const taskCard = this.page.locator(`h3:has-text("${taskTitle}") >> xpath=ancestor::div[@class*="bg-stone-50"]`)
      const reasonBox = taskCard.locator('.bg-red-50.border-l-4.border-red-500')
      return await reasonBox.isVisible({ timeout: 3000 })
    } catch {
      return false
    }
  }

  // Task Card Blocker Indicators
  async hasBlockerBadge(taskTitle: string): Promise<boolean> {
    try {
      const taskCard = this.page.locator(`h3:has-text("${taskTitle}")`)
      const badge = taskCard.locator('xpath=../.. >> text=BLOCKED')
      return await badge.isVisible({ timeout: 3000 })
    } catch {
      return false
    }
  }

  async getBlockedByCount(taskTitle: string): Promise<number> {
    try {
      const taskCard = this.page.locator(`h3:has-text("${taskTitle}")`)
      const countBadge = taskCard.locator('xpath=../.. >> [data-testid="blocked-by-count"]')
      const countText = await countBadge.textContent()
      return parseInt(countText || '0', 10)
    } catch {
      return 0
    }
  }

  async getBlocksCount(taskTitle: string): Promise<number> {
    try {
      const taskCard = this.page.locator(`h3:has-text("${taskTitle}")`)
      const countBadge = taskCard.locator('xpath=../.. >> [data-testid="blocks-count"]')
      const countText = await countBadge.textContent()
      return parseInt(countText || '0', 10)
    } catch {
      return 0
    }
  }

  // Assertions helpers
  async isLoaded() {
    const isLoading = await this.loadingIndicator.isVisible().catch(() => false)
    return !isLoading
  }

  async waitForDataLoaded() {
    try {
      await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 15000 })
    } catch {
      // Loading indicator might not exist
    }
    await this.page.waitForTimeout(500)
  }

  /**
   * Verify that a task appears in the blocked tasks panel
   */
  async isTaskInBlockedPanel(taskTitle: string): Promise<boolean> {
    try {
      const taskInPanel = this.blockedTasksPanel.locator(`h3:has-text("${taskTitle}")`)
      return await taskInPanel.isVisible({ timeout: 3000 })
    } catch {
      return false
    }
  }

  /**
   * Get all blocked task titles from the panel
   */
  async getBlockedTaskTitles(): Promise<string[]> {
    try {
      const titleLocators = this.blockedTaskCards.locator('h3')
      const count = await titleLocators.count()
      const titles: string[] = []

      for (let i = 0; i < count; i++) {
        const title = await titleLocators.nth(i).textContent()
        if (title) {
          titles.push(title.trim())
        }
      }

      return titles
    } catch {
      return []
    }
  }

  /**
   * Check if a task has overdue badge
   */
  async isTaskOverdue(taskTitle: string): Promise<boolean> {
    try {
      const taskCard = this.page.locator(`h3:has-text("${taskTitle}") >> xpath=ancestor::div[@class*="bg-stone-50"]`)
      const overdueBadge = taskCard.locator('span:has-text("VENCIDA")')
      return await overdueBadge.isVisible({ timeout: 3000 })
    } catch {
      return false
    }
  }

  /**
   * Get task priority from blocked task card
   */
  async getTaskPriority(taskTitle: string): Promise<string> {
    try {
      const taskCard = this.page.locator(`h3:has-text("${taskTitle}") >> xpath=ancestor::div[@class*="bg-stone-50"]`)
      const priorityBadge = taskCard.locator('span:text-matches("^P[0-2]$")').first()
      return await priorityBadge.textContent() || ''
    } catch {
      return ''
    }
  }

  /**
   * Get task assignee from blocked task card
   */
  async getTaskAssignee(taskTitle: string): Promise<string> {
    try {
      const taskCard = this.page.locator(`h3:has-text("${taskTitle}") >> xpath=ancestor::div[@class*="bg-stone-50"]`)
      const assigneeLocator = taskCard.locator('svg').filter({ has: this.page.locator('[class*="lucide-user"]') }).locator('xpath=..').locator('span')
      return await assigneeLocator.textContent() || ''
    } catch {
      return ''
    }
  }

  /**
   * Check if unblock buttons are visible for a task
   */
  async hasUnblockButtons(taskTitle: string): Promise<boolean> {
    try {
      const taskCard = this.page.locator(`h3:has-text("${taskTitle}") >> xpath=ancestor::div[@class*="bg-stone-50"]`)
      const nextButton = taskCard.locator('button:has-text("Next")')
      return await nextButton.isVisible({ timeout: 3000 })
    } catch {
      return false
    }
  }

  /**
   * Wait for blocked tasks panel to load
   */
  async waitForBlockedPanelLoaded() {
    try {
      // Wait for either the empty state or the task cards to appear
      await Promise.race([
        this.emptyBlockedState.waitFor({ state: 'visible', timeout: 10000 }),
        this.blockedTaskCards.first().waitFor({ state: 'visible', timeout: 10000 })
      ])
    } catch {
      // Panel might not be visible
    }
    await this.page.waitForTimeout(300)
  }
}
