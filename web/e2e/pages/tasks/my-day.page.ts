import { type Page, type Locator } from '@playwright/test'
import { BasePage } from '../base.page'

/**
 * My Day Page Object - TDAH-friendly task view
 */
export class MyDayPage extends BasePage {
  // Main sections
  readonly focusModeSection: Locator
  readonly overdueSection: Locator
  readonly upcomingSection: Locator
  readonly inboxSection: Locator

  // Task cards
  readonly taskCards: Locator
  readonly doingTasks: Locator
  readonly nextTasks: Locator
  readonly overdueTasks: Locator
  readonly inboxTasks: Locator

  // Actions
  readonly quickAddInput: Locator
  readonly completeButton: Locator
  readonly blockButton: Locator

  // Loading/Empty states
  readonly loadingIndicator: Locator
  readonly emptyState: Locator

  // Mini calendar
  readonly miniCalendar: Locator

  constructor(page: Page) {
    super(page)

    // Main sections based on actual UI structure
    this.focusModeSection = page.locator('button:has-text("Focus Mode")')
    this.overdueSection = page.locator('h2:has-text("Vencidas"), text=Vencidas').first()
    this.upcomingSection = page.locator('h2:has-text("Siguiente")').first()
    this.inboxSection = page.locator('h2:has-text("En Progreso")').first()

    // Task cards - h3 headings are task titles
    this.taskCards = page.locator('main h3')
    this.doingTasks = page.locator('h2:has-text("En Progreso") >> xpath=following-sibling::* >> h3')
    this.nextTasks = page.locator('h2:has-text("Siguiente") >> xpath=following-sibling::* >> h3')
    this.overdueTasks = page.locator('text=tareas vencidas >> xpath=following-sibling::* >> p')
    this.inboxTasks = page.locator('h2:has-text("Bloqueadas") >> xpath=following-sibling::* >> h3')

    // Actions
    this.quickAddInput = page.locator('input[placeholder*="tarea"], input[placeholder*="Agregar"]')
    this.completeButton = page.locator('button:has-text("Completar"), button:has-text("Empezar")')
    this.blockButton = page.locator('button:has-text("Bloquear")')

    // States
    this.loadingIndicator = page.locator('text=Cargando')
    this.emptyState = page.locator('text=Sin tareas, text=No hay tareas')

    // Calendar - look for month/year display
    this.miniCalendar = page.locator('text=/enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i')
  }

  // Navigation
  async gotoMyDay() {
    await this.goto('/tareas')
  }

  // Actions
  async quickAddTask(title: string) {
    await this.quickAddInput.fill(title)
    await this.page.keyboard.press('Enter')
    await this.page.waitForTimeout(500)
  }

  async completeTask(taskIndex = 0) {
    await this.taskCards.nth(taskIndex).hover()
    await this.completeButton.first().click()
  }

  async clickTask(taskIndex = 0) {
    await this.taskCards.nth(taskIndex).click()
  }

  // Assertions helpers
  async getTaskCount() {
    return await this.taskCards.count()
  }

  async isLoaded() {
    const isLoading = await this.loadingIndicator.isVisible().catch(() => false)
    return !isLoading
  }
}
