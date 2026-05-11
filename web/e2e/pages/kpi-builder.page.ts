import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * KPI Builder Page Object
 * Handles interactions with custom KPI builder components
 */
export class KPIBuilderPage extends BasePage {
  // Settings KPI Tab elements
  readonly kpisTab: Locator
  readonly addKpiButton: Locator
  readonly kpiCards: Locator
  readonly emptyState: Locator

  // KPI Builder Modal elements
  readonly modal: Locator
  readonly modalTitle: Locator
  readonly closeButton: Locator
  readonly titleInput: Locator

  // Step 1: Metric Selection
  readonly metricDropdown: Locator
  readonly metricSearchInput: Locator
  readonly metricOptions: Locator

  // Step 2: Threshold Configuration
  readonly targetInput: Locator
  readonly warningInput: Locator
  readonly criticalInput: Locator
  readonly thresholdPreview: Locator

  // Step 3: Visualization Selection
  readonly visualizationOptions: Locator
  readonly numberCardOption: Locator
  readonly gaugeOption: Locator
  readonly sparklineOption: Locator
  readonly progressOption: Locator

  // Sharing toggle
  readonly shareToggle: Locator
  readonly shareCheckbox: Locator

  // Navigation buttons
  readonly nextButton: Locator
  readonly backButton: Locator
  readonly saveButton: Locator

  // KPI Card actions
  readonly editButtons: Locator
  readonly deleteButtons: Locator

  // Delete confirmation modal
  readonly deleteConfirmModal: Locator
  readonly confirmDeleteButton: Locator
  readonly cancelDeleteButton: Locator

  constructor(page: Page) {
    super(page)

    // Settings tab
    this.kpisTab = page.locator('button:has-text("KPIs")')
    this.addKpiButton = page.locator('button:has-text("Add"), button:has-text("Agregar"), button:has-text("KPI")')
    this.kpiCards = page.locator('[class*="border-2"]:has([class*="gauge"], [class*="sparkline"]), [data-testid="kpi-card"]')
    this.emptyState = page.locator('text=No tienes KPIs, text=Add Your First KPI, text=Agrega tu primer KPI')

    // Modal
    this.modal = page.locator('[role="dialog"], [class*="modal"]')
    this.modalTitle = this.modal.locator('h2, h3').first()
    this.closeButton = this.modal.locator('button:has([class*="X"])')
    this.titleInput = this.modal.locator('input[placeholder*="nombre"], input[placeholder*="title"], input[type="text"]').first()

    // Step 1: Metric Selection
    this.metricDropdown = this.modal.locator('button:has-text("Seleccionar"), button:has-text("Select")')
    this.metricSearchInput = this.modal.locator('input[placeholder*="Buscar"], input[placeholder*="Search"]')
    this.metricOptions = this.modal.locator('[class*="cursor-pointer"]:has-text("SALES"), [class*="cursor-pointer"]:has-text("MKT"), [class*="cursor-pointer"]:has-text("OPS")')

    // Step 2: Thresholds
    this.targetInput = this.modal.locator('input[placeholder*="objetivo"], input[placeholder*="target"]')
    this.warningInput = this.modal.locator('input[placeholder*="advertencia"], input[placeholder*="warning"]')
    this.criticalInput = this.modal.locator('input[placeholder*="crítico"], input[placeholder*="critical"]')
    this.thresholdPreview = this.modal.locator('[class*="relative"]:has([class*="h-8"], [class*="h-6"])')

    // Step 3: Visualization
    this.visualizationOptions = this.modal.locator('[class*="grid"]:has([class*="cursor-pointer"])')
    this.numberCardOption = this.modal.locator('[class*="cursor-pointer"]:has-text("Number"), [class*="cursor-pointer"]:has-text("Número")')
    this.gaugeOption = this.modal.locator('[class*="cursor-pointer"]:has-text("Gauge"), [class*="cursor-pointer"]:has-text("Medidor")')
    this.sparklineOption = this.modal.locator('[class*="cursor-pointer"]:has-text("Sparkline"), [class*="cursor-pointer"]:has-text("Tendencia")')
    this.progressOption = this.modal.locator('[class*="cursor-pointer"]:has-text("Progress"), [class*="cursor-pointer"]:has-text("Progreso")')

    // Sharing
    this.shareToggle = this.modal.locator('text=Share with, text=Compartir con')
    this.shareCheckbox = this.modal.locator('input[type="checkbox"]').last()

    // Navigation
    this.nextButton = this.modal.locator('button:has-text("Siguiente"), button:has-text("Next")')
    this.backButton = this.modal.locator('button:has-text("Atrás"), button:has-text("Back")')
    this.saveButton = this.modal.locator('button:has-text("Crear"), button:has-text("Create"), button:has-text("Guardar"), button:has-text("Update")')

    // Card actions
    this.editButtons = page.locator('button:has([class*="Pencil"]), button[aria-label*="Edit"]')
    this.deleteButtons = page.locator('button:has([class*="Trash"]), button[aria-label*="Delete"]')

    // Delete confirmation
    this.deleteConfirmModal = page.locator('[role="dialog"]:has-text("Eliminar"), [role="dialog"]:has-text("Delete")')
    this.confirmDeleteButton = this.deleteConfirmModal.locator('button:has-text("Eliminar"), button:has-text("Delete")').last()
    this.cancelDeleteButton = this.deleteConfirmModal.locator('button:has-text("Cancelar"), button:has-text("Cancel")')
  }

  async gotoKPIsSettings() {
    await this.page.goto('/settings')
    await this.page.waitForLoadState('domcontentloaded')
    await this.page.waitForTimeout(500)

    // Click KPIs tab if visible
    if (await this.kpisTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.kpisTab.click()
      await this.page.waitForTimeout(300)
    }
  }

  async openKPIBuilder() {
    // Look for Add KPI button (could be in different places)
    const addButton = this.page.locator('button:has-text("Add"), button:has-text("Agregar")').first()
    await addButton.waitFor({ state: 'visible', timeout: 5000 })
    await addButton.click()

    // Wait for modal to open
    await this.modal.waitFor({ state: 'visible', timeout: 5000 })
    await this.page.waitForTimeout(300)
  }

  async fillKPITitle(title: string) {
    await this.titleInput.fill(title)
    await this.page.waitForTimeout(100)
  }

  async selectMetric(metricName: string) {
    // Click dropdown to open
    await this.metricDropdown.click()
    await this.page.waitForTimeout(200)

    // Find and click the metric option
    const metricOption = this.page.locator(`text=${metricName}`).first()
    await metricOption.waitFor({ state: 'visible', timeout: 5000 })
    await metricOption.click()
    await this.page.waitForTimeout(200)
  }

  async searchAndSelectMetric(searchText: string) {
    await this.metricDropdown.click()
    await this.page.waitForTimeout(200)

    // Type in search if input is available
    if (await this.metricSearchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.metricSearchInput.fill(searchText)
      await this.page.waitForTimeout(300)
    }

    // Click first visible option
    const firstOption = this.metricOptions.first()
    await firstOption.click()
    await this.page.waitForTimeout(200)
  }

  async setThresholds(target?: string, warning?: string, critical?: string) {
    if (target) {
      await this.targetInput.fill(target)
      await this.page.waitForTimeout(100)
    }
    if (warning) {
      await this.warningInput.fill(warning)
      await this.page.waitForTimeout(100)
    }
    if (critical) {
      await this.criticalInput.fill(critical)
      await this.page.waitForTimeout(100)
    }
  }

  async selectVisualization(type: 'number' | 'gauge' | 'sparkline' | 'progress') {
    const optionMap = {
      number: this.numberCardOption,
      gauge: this.gaugeOption,
      sparkline: this.sparklineOption,
      progress: this.progressOption,
    }

    const option = optionMap[type]
    await option.waitFor({ state: 'visible', timeout: 5000 })
    await option.click()
    await this.page.waitForTimeout(200)
  }

  async toggleSharing(enable: boolean) {
    const isChecked = await this.shareCheckbox.isChecked().catch(() => false)

    if (enable && !isChecked) {
      await this.shareCheckbox.click()
      await this.page.waitForTimeout(100)
    } else if (!enable && isChecked) {
      await this.shareCheckbox.click()
      await this.page.waitForTimeout(100)
    }
  }

  async clickNext() {
    await this.nextButton.click()
    await this.page.waitForTimeout(300)
  }

  async clickBack() {
    await this.backButton.click()
    await this.page.waitForTimeout(300)
  }

  async clickSave() {
    await this.saveButton.click()
    // Wait for save operation
    await this.page.waitForTimeout(1000)
  }

  async createKPI(params: {
    title: string
    metricName?: string
    target?: string
    warning?: string
    critical?: string
    visualization: 'number' | 'gauge' | 'sparkline' | 'progress'
    shared?: boolean
  }) {
    // Step 1: Fill title and select metric
    await this.fillKPITitle(params.title)

    if (params.metricName) {
      await this.selectMetric(params.metricName)
    } else {
      // Select first available metric
      await this.searchAndSelectMetric('')
    }

    await this.clickNext()

    // Step 2: Set thresholds
    await this.setThresholds(params.target, params.warning, params.critical)
    await this.clickNext()

    // Step 3: Select visualization and sharing
    await this.selectVisualization(params.visualization)

    if (params.shared !== undefined) {
      await this.toggleSharing(params.shared)
    }

    // Save
    await this.clickSave()

    // Wait for modal to close
    await this.modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }

  async editKPI(kpiIndex: number = 0) {
    const editButton = this.editButtons.nth(kpiIndex)
    await editButton.waitFor({ state: 'visible', timeout: 5000 })
    await editButton.click()

    // Wait for modal to open
    await this.modal.waitFor({ state: 'visible', timeout: 5000 })
    await this.page.waitForTimeout(300)
  }

  async deleteKPI(kpiIndex: number = 0, confirm: boolean = true) {
    const deleteButton = this.deleteButtons.nth(kpiIndex)
    await deleteButton.waitFor({ state: 'visible', timeout: 5000 })
    await deleteButton.click()

    // Wait for confirmation modal
    await this.deleteConfirmModal.waitFor({ state: 'visible', timeout: 5000 })
    await this.page.waitForTimeout(200)

    if (confirm) {
      await this.confirmDeleteButton.click()
    } else {
      await this.cancelDeleteButton.click()
    }

    // Wait for modal to close
    await this.page.waitForTimeout(500)
  }

  async getKPICount(): Promise<number> {
    // Count visible KPI cards (excluding the "Add KPI" card)
    const cards = this.kpiCards.filter({ hasNot: this.page.locator('text=Add KPI, text=Agregar KPI') })
    return await cards.count().catch(() => 0)
  }

  async dragKPI(fromIndex: number, toIndex: number) {
    const cards = await this.kpiCards.all()
    if (cards.length <= Math.max(fromIndex, toIndex)) {
      throw new Error('Invalid card indices for drag operation')
    }

    const sourceCard = cards[fromIndex]
    const targetCard = cards[toIndex]

    // Perform drag and drop
    await sourceCard.dragTo(targetCard)
    await this.page.waitForTimeout(500) // Wait for backend update
  }

  async isKPIBuilderModalOpen(): Promise<boolean> {
    return await this.modal.isVisible().catch(() => false)
  }

  async closeModal() {
    if (await this.isKPIBuilderModalOpen()) {
      await this.closeButton.click()
      await this.modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    }
  }

  async waitForKPIsToLoad() {
    // Wait for either KPI cards or empty state to be visible
    await Promise.race([
      this.kpiCards.first().waitFor({ state: 'visible', timeout: 10000 }),
      this.emptyState.waitFor({ state: 'visible', timeout: 10000 }),
    ]).catch(() => {})

    await this.page.waitForTimeout(500)
  }

  async getKPICardByTitle(title: string): Promise<Locator> {
    return this.page.locator(`[class*="border-2"]:has-text("${title}")`)
  }

  async isKPIVisible(title: string): Promise<boolean> {
    const card = await this.getKPICardByTitle(title)
    return await card.isVisible({ timeout: 3000 }).catch(() => false)
  }
}
