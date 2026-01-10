import { type Page, type Locator } from '@playwright/test'
import { BasePage } from '../base.page'

/**
 * Projects Page Object - Project list and management
 */
export class ProjectsPage extends BasePage {
  // Header
  readonly pageTitle: Locator
  readonly newProjectButton: Locator

  // Filters
  readonly allFilter: Locator
  readonly activeFilter: Locator
  readonly pausedFilter: Locator
  readonly completedFilter: Locator

  // Project cards
  readonly projectCards: Locator
  readonly healthIndicators: Locator
  readonly progressBars: Locator

  // Loading/Empty states
  readonly loadingIndicator: Locator
  readonly emptyState: Locator

  constructor(page: Page) {
    super(page)

    // Header
    this.pageTitle = page.locator('h1:has-text("Proyectos")')
    this.newProjectButton = page.locator('button:has-text("Nuevo Proyecto")')

    // Filters - neobrutalismo buttons
    this.allFilter = page.locator('button:has-text("Todos")')
    this.activeFilter = page.locator('button:has-text("Activo")')
    this.pausedFilter = page.locator('button:has-text("Pausado")')
    this.completedFilter = page.locator('button:has-text("Completado")')

    // Project cards
    this.projectCards = page.locator('[class*="shadow-"][class*="border-2"]:has(h3)')
    this.healthIndicators = page.locator('[class*="bg-emerald"], [class*="bg-amber"], [class*="bg-red"]')
    this.progressBars = page.locator('[class*="bg-"][style*="width"]')

    // States
    this.loadingIndicator = page.locator('text=Cargando')
    this.emptyState = page.locator('text=Sin proyectos')
  }

  // Navigation
  async gotoProjects() {
    await this.goto('/tareas/proyectos')
  }

  // Filters
  async filterByStatus(status: 'all' | 'active' | 'paused' | 'completed') {
    const filterMap = {
      all: this.allFilter,
      active: this.activeFilter,
      paused: this.pausedFilter,
      completed: this.completedFilter
    }
    await filterMap[status].click()
    await this.page.waitForTimeout(300)
  }

  // Actions
  async openNewProject() {
    await this.newProjectButton.click()
  }

  async clickProject(index = 0) {
    await this.projectCards.nth(index).click()
  }

  // Assertions helpers
  async getProjectCount() {
    return await this.projectCards.count()
  }

  async getHealthDistribution() {
    const green = await this.page.locator('[class*="bg-emerald-400"]').count()
    const yellow = await this.page.locator('[class*="bg-amber-400"]').count()
    const red = await this.page.locator('[class*="bg-red-500"]').count()
    return { green, yellow, red }
  }

  async isLoaded() {
    const isLoading = await this.loadingIndicator.isVisible().catch(() => false)
    return !isLoading
  }
}
