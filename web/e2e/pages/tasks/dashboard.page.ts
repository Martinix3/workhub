import { type Page, type Locator } from '@playwright/test'
import { BasePage } from '../base.page'

/**
 * Dashboard Page Object - KPIs for managers
 */
export class TaskDashboardPage extends BasePage {
  // Header
  readonly pageTitle: Locator
  readonly dateDisplay: Locator

  // KPI Cards
  readonly kpiCards: Locator
  readonly activeProjectsCard: Locator
  readonly completedWeekCard: Locator
  readonly blockedRateCard: Locator
  readonly velocityCard: Locator

  // Charts
  readonly healthDistribution: Locator
  readonly weeklyTrend: Locator

  // At Risk Projects
  readonly atRiskSection: Locator
  readonly atRiskProjects: Locator

  // Summary section
  readonly summarySection: Locator

  // Loading states
  readonly loadingIndicator: Locator
  readonly errorState: Locator

  constructor(page: Page) {
    super(page)

    // Header
    this.pageTitle = page.locator('h1:has-text("KPIs Dashboard")')
    this.dateDisplay = page.locator('p.text-stone-500.font-mono')

    // KPI Cards - identified by their labels
    this.kpiCards = page.locator('[class*="shadow-"]:has(p.font-mono)')
    this.activeProjectsCard = page.locator('text=PROYECTOS ACTIVOS >> xpath=ancestor::div[contains(@class, "shadow")]')
    this.completedWeekCard = page.locator('text=COMPLETADAS / SEM >> xpath=ancestor::div[contains(@class, "shadow")]')
    this.blockedRateCard = page.locator('text=TASA BLOQUEO >> xpath=ancestor::div[contains(@class, "shadow")]')
    this.velocityCard = page.locator('text=VELOCITY >> xpath=ancestor::div[contains(@class, "shadow")]')

    // Charts
    this.healthDistribution = page.locator('text=Health Distribution >> xpath=ancestor::div[contains(@class, "shadow")]')
    this.weeklyTrend = page.locator('text=Tendencia Semanal >> xpath=ancestor::div[contains(@class, "shadow")]')

    // At Risk
    this.atRiskSection = page.locator('text=En Riesgo >> xpath=ancestor::div[contains(@class, "shadow")]')
    this.atRiskProjects = page.locator('text=En Riesgo >> xpath=ancestor::div//button')

    // Summary
    this.summarySection = page.locator('text=Resumen >> xpath=ancestor::div[contains(@class, "shadow")]')

    // States
    this.loadingIndicator = page.locator('text=Cargando')
    this.errorState = page.locator('text=Error')
  }

  // Navigation
  async gotoDashboard() {
    await this.goto('/tareas/dashboard')
  }

  // Actions
  async clickAtRiskProject(index = 0) {
    await this.atRiskProjects.nth(index).click()
  }

  // Get KPI values
  async getKPIValue(card: Locator) {
    const valueText = await card.locator('.font-mono.text-4xl').textContent()
    return valueText?.trim() || '0'
  }

  async getActiveProjectsCount() {
    return await this.getKPIValue(this.activeProjectsCard)
  }

  async getCompletedThisWeek() {
    return await this.getKPIValue(this.completedWeekCard)
  }

  async getBlockedRate() {
    return await this.getKPIValue(this.blockedRateCard)
  }

  async getVelocity() {
    return await this.getKPIValue(this.velocityCard)
  }

  // Assertions helpers
  async getKPICardCount() {
    return await this.kpiCards.count()
  }

  async hasHealthDistribution() {
    return await this.healthDistribution.isVisible()
  }

  async hasWeeklyTrend() {
    return await this.weeklyTrend.isVisible()
  }

  async isLoaded() {
    const isLoading = await this.loadingIndicator.isVisible().catch(() => false)
    return !isLoading
  }

  async hasError() {
    return await this.errorState.isVisible().catch(() => false)
  }
}
