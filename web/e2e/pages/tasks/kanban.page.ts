import { type Page, type Locator } from '@playwright/test'
import { BasePage } from '../base.page'

/**
 * Kanban Page Object - Drag-and-drop task board
 */
export class KanbanPage extends BasePage {
  // Header
  readonly pageTitle: Locator
  readonly departmentFilters: Locator

  // Columns
  readonly columns: Locator
  readonly backlogColumn: Locator
  readonly nextColumn: Locator
  readonly doingColumn: Locator
  readonly blockedColumn: Locator
  readonly doneColumn: Locator

  // Task cards
  readonly taskCards: Locator
  readonly priorityBadges: Locator

  // Quick add
  readonly quickAddButton: Locator
  readonly quickAddInput: Locator
  readonly quickAddSubmit: Locator

  // Loading states
  readonly loadingIndicator: Locator

  constructor(page: Page) {
    super(page)

    // Header - matches "Todas las Tareas" or "Kanban Board"
    this.pageTitle = page.locator('h1:has-text("Todas las Tareas"), h1:has-text("Kanban")')
    this.departmentFilters = page.locator('button:has-text("Todos"), button:has-text("SALES"), button:has-text("OPS"), button:has-text("MKT")')

    // Columns - based on actual UI structure with column headers
    this.columns = page.locator('main >> text=/^(BACKLOG|NEXT|DOING|BLOCKED|DONE)$/ >> xpath=ancestor::*[3]')
    this.backlogColumn = page.locator('text=BACKLOG >> xpath=ancestor::*[3]')
    this.nextColumn = page.locator('text=NEXT >> xpath=ancestor::*[3]')
    this.doingColumn = page.locator('text=DOING >> xpath=ancestor::*[3]')
    this.blockedColumn = page.locator('text=BLOCKED >> xpath=ancestor::*[3]')
    this.doneColumn = page.locator('text=DONE >> xpath=ancestor::*[3]')

    // Task cards - h3 headings represent task titles
    this.taskCards = page.locator('main h3')
    this.priorityBadges = page.locator('text=/^P[0-2]$/')

    // Quick add in Backlog
    this.quickAddButton = page.locator('button:has-text("Agregar tarea"), button:has-text("Agregar")')
    this.quickAddInput = page.locator('input[placeholder*="Titulo"], input[placeholder*="tarea"]')
    this.quickAddSubmit = page.locator('button[type="submit"]:has-text("Agregar")')

    // States
    this.loadingIndicator = page.locator('text=Cargando')
  }

  // Navigation
  async gotoKanban() {
    await this.goto('/tareas/kanban')
  }

  // Filters
  async filterByDepartment(dept: 'all' | 'sales' | 'ops' | 'mkt') {
    const deptText = dept === 'all' ? 'Todos' : dept.toUpperCase()
    await this.page.locator(`button:has-text("${deptText}")`).click()
    await this.page.waitForTimeout(300)
  }

  // Actions
  async openQuickAdd() {
    await this.quickAddButton.click()
  }

  async quickAddTask(title: string) {
    await this.openQuickAdd()
    await this.quickAddInput.fill(title)
    await this.quickAddSubmit.click()
    await this.page.waitForTimeout(500)
  }

  async dragTaskToColumn(taskIndex: number, targetColumn: 'backlog' | 'next' | 'doing' | 'blocked' | 'done') {
    const columnMap = {
      backlog: this.backlogColumn,
      next: this.nextColumn,
      doing: this.doingColumn,
      blocked: this.blockedColumn,
      done: this.doneColumn
    }
    // Find parent card of the h3 task title
    const task = this.taskCards.nth(taskIndex).locator('xpath=ancestor::*[5]')
    const target = columnMap[targetColumn]

    await task.dragTo(target)
    await this.page.waitForTimeout(300)
  }

  async clickTask(index = 0) {
    await this.taskCards.nth(index).click()
  }

  // Assertions helpers
  async getColumnCount() {
    return await this.columns.count()
  }

  async getTaskCountInColumn(column: 'backlog' | 'next' | 'doing' | 'blocked' | 'done') {
    const columnMap = {
      backlog: this.backlogColumn,
      next: this.nextColumn,
      doing: this.doingColumn,
      blocked: this.blockedColumn,
      done: this.doneColumn
    }
    const col = columnMap[column]
    const countText = await col.locator('.font-mono').textContent()
    return parseInt(countText || '0', 10)
  }

  async isLoaded() {
    const isLoading = await this.loadingIndicator.isVisible().catch(() => false)
    return !isLoading
  }

  /**
   * Wait for kanban data to load
   */
  async waitForDataLoaded() {
    try {
      await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 15000 })
    } catch {
      // Loading indicator might not exist
    }
    await this.page.waitForTimeout(500)
  }

  /**
   * Drag task by title to a specific column
   */
  async dragTaskByTitleToColumn(
    taskTitle: string,
    targetColumn: 'backlog' | 'next' | 'doing' | 'blocked' | 'done'
  ) {
    const columnMap = {
      backlog: this.backlogColumn,
      next: this.nextColumn,
      doing: this.doingColumn,
      blocked: this.blockedColumn,
      done: this.doneColumn
    }
    // Find the task card by its h3 title and get the draggable parent
    const taskCard = this.page.locator(`h3:has-text("${taskTitle}")`).locator('xpath=ancestor::*[3]')
    const target = columnMap[targetColumn]

    await taskCard.dragTo(target)
    await this.page.waitForTimeout(500)
  }

  /**
   * Verify that a task is in a specific column
   */
  async verifyTaskInColumn(
    taskTitle: string,
    columnName: 'backlog' | 'next' | 'doing' | 'blocked' | 'done'
  ): Promise<boolean> {
    const columnMap = {
      backlog: this.backlogColumn,
      next: this.nextColumn,
      doing: this.doingColumn,
      blocked: this.blockedColumn,
      done: this.doneColumn
    }
    const column = columnMap[columnName]

    try {
      const taskInColumn = column.locator(`h3:has-text("${taskTitle}")`)
      return await taskInColumn.isVisible({ timeout: 3000 })
    } catch {
      return false
    }
  }

  /**
   * Get all task titles in a column
   */
  async getTaskTitlesInColumn(
    columnName: 'backlog' | 'next' | 'doing' | 'blocked' | 'done'
  ): Promise<string[]> {
    const columnMap = {
      backlog: this.backlogColumn,
      next: this.nextColumn,
      doing: this.doingColumn,
      blocked: this.blockedColumn,
      done: this.doneColumn
    }
    const column = columnMap[columnName]

    try {
      const taskTitles = column.locator('h3')
      const count = await taskTitles.count()
      const titles: string[] = []

      for (let i = 0; i < count; i++) {
        const title = await taskTitles.nth(i).textContent()
        if (title) titles.push(title.trim())
      }

      return titles
    } catch {
      return []
    }
  }

  /**
   * Get task card element by title
   */
  getTaskByTitle(title: string): Locator {
    return this.page.locator(`h3:has-text("${title}")`).locator('xpath=ancestor::*[3]')
  }

  /**
   * Click on a task by its title
   */
  async clickTaskByTitle(title: string) {
    await this.page.locator(`h3:has-text("${title}")`).click()
  }

  /**
   * Get total task count across all columns
   */
  async getTotalTaskCount(): Promise<number> {
    return await this.taskCards.count()
  }

  /**
   * Check if quick add is available in backlog column
   */
  async isQuickAddAvailable(): Promise<boolean> {
    return await this.quickAddButton.isVisible().catch(() => false)
  }

  /**
   * Get task priority from a specific task card
   */
  async getTaskPriority(taskTitle: string): Promise<string> {
    const taskCard = this.page.locator(`h3:has-text("${taskTitle}")`).locator('xpath=ancestor::*[3]')
    const priorityBadge = taskCard.locator('text=/^P[0-2]$/').first()
    return (await priorityBadge.textContent()) ?? ''
  }

  /**
   * Check if task has blocked indicator
   */
  async isTaskBlocked(taskTitle: string): Promise<boolean> {
    const taskCard = this.page.locator(`h3:has-text("${taskTitle}")`).locator('xpath=ancestor::*[3]')
    const blockedIndicator = taskCard.locator('text=BLOQUEADA, img[alt*="blocked"]')
    return await blockedIndicator.isVisible().catch(() => false)
  }
}
