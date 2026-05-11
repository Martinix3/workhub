import { type Page, type Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Quick Task Modal Page Object
 * Rapid task creation modal (Cmd+K / Ctrl+K)
 */
export class QuickTaskModalPage extends BasePage {
  // Dialog container
  readonly backdrop: Locator
  readonly modal: Locator

  // Header
  readonly header: Locator
  readonly headerIcon: Locator
  readonly headerTitle: Locator
  readonly closeButton: Locator

  // Form fields
  readonly titleInput: Locator
  readonly titleLabel: Locator
  readonly priorityLabel: Locator
  readonly priorityP0Button: Locator
  readonly priorityP1Button: Locator
  readonly priorityP2Button: Locator
  readonly dueDateInput: Locator
  readonly dueDateLabel: Locator
  readonly dueDateIcon: Locator
  readonly projectSelect: Locator
  readonly projectLabel: Locator
  readonly projectLoadingMessage: Locator
  readonly assigneeSelect: Locator
  readonly assigneeLabel: Locator
  readonly assigneeLoadingMessage: Locator
  readonly departmentSelect: Locator
  readonly departmentLabel: Locator

  // WorkLink suggestions
  readonly workLinkSuggestionsContainer: Locator

  // Error display
  readonly errorMessage: Locator

  // Submit button
  readonly submitButton: Locator
  readonly submitButtonIcon: Locator
  readonly submitButtonSpinner: Locator

  // Success state
  readonly successIcon: Locator
  readonly successMessage: Locator
  readonly successAutoCloseMessage: Locator

  // Error state
  readonly errorIcon: Locator
  readonly errorStateMessage: Locator
  readonly errorDetails: Locator
  readonly backButton: Locator
  readonly errorCloseButton: Locator

  constructor(page: Page) {
    super(page)

    // Dialog container
    this.backdrop = page.locator('div.fixed.inset-0').filter({ hasText: '' }).first()
    this.modal = page.locator('div.bg-white.border-2.border-stone-900').filter({
      has: page.locator('h2:has-text("Crear Tarea Rápida"), h2:has-text("Tarea Creada"), h2:has-text("Error")')
    })

    // Header
    this.header = this.modal.locator('div.flex.items-center.justify-between.p-4.border-b-2')
    this.headerIcon = this.header.locator('svg.text-amber-500')
    this.headerTitle = this.header.locator('h2.font-serif')
    this.closeButton = this.header.locator('button:has(svg)', { hasText: '' })

    // Form fields
    this.titleLabel = page.locator('label:has-text("Título")')
    this.titleInput = page.locator('input[type="text"][placeholder*="Ej:"]')

    this.priorityLabel = page.locator('label:has-text("Prioridad")')
    this.priorityP0Button = page.locator('button:has-text("P0 - Crítica")')
    this.priorityP1Button = page.locator('button:has-text("P1 - Alta")')
    this.priorityP2Button = page.locator('button:has-text("P2 - Normal")')

    this.dueDateLabel = page.locator('label:has-text("Fecha de Vencimiento")')
    this.dueDateInput = page.locator('input[type="date"]')
    this.dueDateIcon = page.locator('svg').filter({ has: page.locator('title:has-text("Calendar")') }).or(
      page.locator('.absolute.left-3 svg')
    )

    this.projectLabel = page.locator('label:has-text("Proyecto")')
    this.projectSelect = page.locator('select').filter({
      has: page.locator('option:has-text("Seleccionar proyecto...")')
    })
    this.projectLoadingMessage = page.locator('text=Cargando proyectos...')

    this.assigneeLabel = page.locator('label:has-text("Asignar a")')
    this.assigneeSelect = page.locator('select').filter({
      has: page.locator('option:has-text("Seleccionar usuario...")')
    })
    this.assigneeLoadingMessage = page.locator('text=Cargando usuarios...')

    this.departmentLabel = page.locator('label:has-text("Departamento")')
    this.departmentSelect = page.locator('select').filter({
      has: page.locator('option:has-text("Seleccionar departamento...")')
    })

    // WorkLink suggestions
    this.workLinkSuggestionsContainer = page.locator('[class*="worklink"], [data-testid="worklink-suggestions"]')

    // Error display
    this.errorMessage = page.locator('div.bg-red-50.border-red-200.text-red-700')

    // Submit button
    this.submitButton = page.locator('button[type="submit"]:has-text("Crear Tarea"), button:has-text("Creando...")')
    this.submitButtonIcon = this.submitButton.locator('svg').first()
    this.submitButtonSpinner = this.submitButton.locator('svg.animate-spin')

    // Success state
    this.successIcon = page.locator('svg.text-green-600')
    this.successMessage = page.locator('p.text-lg.font-medium:has-text("Tarea creada exitosamente")')
    this.successAutoCloseMessage = page.locator('text=Cerrando automáticamente...')

    // Error state
    this.errorIcon = page.locator('svg.text-red-600')
    this.errorStateMessage = page.locator('p.text-lg.font-medium.text-red-700')
    this.errorDetails = page.locator('p.text-sm.text-stone-500').filter({
      has: page.locator('~ p.text-lg.font-medium.text-red-700')
    })
    this.backButton = page.locator('button:has-text("Volver")')
    this.errorCloseButton = page.locator('button:has-text("Cerrar")')
  }

  /**
   * Open quick task modal with keyboard shortcut (Cmd+K on Mac, Ctrl+K on Windows/Linux)
   */
  async openWithKeyboard() {
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await this.page.keyboard.press(`${modifier}+k`)
    await this.page.waitForTimeout(300)
  }

  /**
   * Open quick task modal by clicking a trigger button (if exists in UI)
   * Note: Implement this based on your actual UI trigger button
   */
  async openWithClick() {
    const quickTaskButton = this.page.locator(
      'button[aria-label*="Crear tarea rápida"], button[aria-label*="Quick task"], button:has-text("Crear tarea rápida")'
    )
    await quickTaskButton.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Check if quick task modal is open
   */
  async isOpen(): Promise<boolean> {
    return await this.modal.isVisible().catch(() => false)
  }

  /**
   * Wait for modal to be visible
   */
  async waitForOpen() {
    await this.modal.waitFor({ state: 'visible', timeout: 5000 })
  }

  /**
   * Close modal with Escape key
   */
  async close() {
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(300)
  }

  /**
   * Close modal by clicking the X button
   */
  async closeWithButton() {
    await this.closeButton.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Close by clicking outside (on backdrop)
   */
  async closeByClickingOutside() {
    await this.backdrop.click({ position: { x: 10, y: 10 } })
    await this.page.waitForTimeout(300)
  }

  /**
   * Fill task title
   */
  async fillTitle(title: string) {
    await this.titleInput.fill(title)
    await this.page.waitForTimeout(100)
  }

  /**
   * Get current title value
   */
  async getTitle(): Promise<string> {
    return await this.titleInput.inputValue()
  }

  /**
   * Select priority level
   */
  async selectPriority(priority: 'P0' | 'P1' | 'P2') {
    const buttonMap = {
      P0: this.priorityP0Button,
      P1: this.priorityP1Button,
      P2: this.priorityP2Button
    }
    await buttonMap[priority].click()
    await this.page.waitForTimeout(100)
  }

  /**
   * Get currently selected priority
   */
  async getSelectedPriority(): Promise<'P0' | 'P1' | 'P2' | null> {
    if (await this.priorityP0Button.evaluate(el => el.classList.contains('bg-red-100'))) {
      return 'P0'
    }
    if (await this.priorityP1Button.evaluate(el => el.classList.contains('bg-orange-100'))) {
      return 'P1'
    }
    if (await this.priorityP2Button.evaluate(el => el.classList.contains('bg-blue-100'))) {
      return 'P2'
    }
    return null
  }

  /**
   * Set due date
   */
  async setDueDate(date: string) {
    await this.dueDateInput.fill(date)
    await this.page.waitForTimeout(100)
  }

  /**
   * Get due date value
   */
  async getDueDate(): Promise<string> {
    return await this.dueDateInput.inputValue()
  }

  /**
   * Select project by visible text
   */
  async selectProject(projectName: string) {
    await this.projectSelect.selectOption({ label: projectName })
    await this.page.waitForTimeout(100)
  }

  /**
   * Get selected project
   */
  async getSelectedProject(): Promise<string> {
    return await this.projectSelect.inputValue()
  }

  /**
   * Get all available project options
   */
  async getProjectOptions(): Promise<string[]> {
    return await this.projectSelect.locator('option').allTextContents()
  }

  /**
   * Select assignee by visible name
   */
  async selectAssignee(userName: string) {
    await this.assigneeSelect.selectOption({ label: userName })
    await this.page.waitForTimeout(100)
  }

  /**
   * Get selected assignee
   */
  async getSelectedAssignee(): Promise<string> {
    return await this.assigneeSelect.inputValue()
  }

  /**
   * Get all available assignee options
   */
  async getAssigneeOptions(): Promise<string[]> {
    return await this.assigneeSelect.locator('option').allTextContents()
  }

  /**
   * Select department
   */
  async selectDepartment(department: 'SALES' | 'OPS' | 'MKT') {
    const departmentMap = {
      SALES: 'Ventas',
      OPS: 'Operaciones',
      MKT: 'Marketing'
    }
    await this.departmentSelect.selectOption({ label: departmentMap[department] })
    await this.page.waitForTimeout(100)
  }

  /**
   * Get selected department
   */
  async getSelectedDepartment(): Promise<string> {
    return await this.departmentSelect.inputValue()
  }

  /**
   * Check if WorkLink suggestions are visible
   */
  async hasWorkLinkSuggestions(): Promise<boolean> {
    return await this.workLinkSuggestionsContainer.isVisible().catch(() => false)
  }

  /**
   * Check if form has validation errors
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible().catch(() => false)
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.hasError()) {
      return await this.errorMessage.textContent()
    }
    return null
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled()
  }

  /**
   * Check if form is in submitting state
   */
  async isSubmitting(): Promise<boolean> {
    return await this.submitButtonSpinner.isVisible().catch(() => false)
  }

  /**
   * Submit the form
   */
  async submit() {
    await this.submitButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Fill complete form and submit
   */
  async createQuickTask(data: {
    title: string
    priority?: 'P0' | 'P1' | 'P2'
    dueDate?: string
    project?: string
    assignee?: string
    department?: 'SALES' | 'OPS' | 'MKT'
  }) {
    await this.fillTitle(data.title)

    if (data.priority) {
      await this.selectPriority(data.priority)
    }

    if (data.dueDate) {
      await this.setDueDate(data.dueDate)
    }

    if (data.project) {
      await this.selectProject(data.project)
    }

    if (data.assignee) {
      await this.selectAssignee(data.assignee)
    }

    if (data.department) {
      await this.selectDepartment(data.department)
    }

    await this.submit()
  }

  /**
   * Check if modal is in success state
   */
  async isSuccessState(): Promise<boolean> {
    return await this.successIcon.isVisible().catch(() => false)
  }

  /**
   * Get success message
   */
  async getSuccessMessage(): Promise<string | null> {
    if (await this.isSuccessState()) {
      return await this.successMessage.textContent()
    }
    return null
  }

  /**
   * Wait for success state to appear
   */
  async waitForSuccess() {
    await this.successIcon.waitFor({ state: 'visible', timeout: 5000 })
  }

  /**
   * Check if modal is in error state
   */
  async isErrorState(): Promise<boolean> {
    return await this.errorIcon.isVisible().catch(() => false)
  }

  /**
   * Get error state message
   */
  async getErrorStateMessage(): Promise<string | null> {
    if (await this.isErrorState()) {
      return await this.errorStateMessage.textContent()
    }
    return null
  }

  /**
   * Click back button in error state
   */
  async clickBackFromError() {
    await this.backButton.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Click close button in error state
   */
  async clickCloseFromError() {
    await this.errorCloseButton.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Wait for modal to auto-close (after success)
   */
  async waitForAutoClose() {
    await this.modal.waitFor({ state: 'hidden', timeout: 3000 })
  }

  /**
   * Check if options are still loading
   */
  async isLoadingOptions(): Promise<boolean> {
    const projectLoading = await this.projectLoadingMessage.isVisible().catch(() => false)
    const assigneeLoading = await this.assigneeLoadingMessage.isVisible().catch(() => false)
    return projectLoading || assigneeLoading
  }

  /**
   * Wait for options to finish loading
   */
  async waitForOptionsToLoad() {
    // Wait for loading messages to disappear
    if (await this.projectLoadingMessage.isVisible().catch(() => false)) {
      await this.projectLoadingMessage.waitFor({ state: 'hidden', timeout: 5000 })
    }
    if (await this.assigneeLoadingMessage.isVisible().catch(() => false)) {
      await this.assigneeLoadingMessage.waitFor({ state: 'hidden', timeout: 5000 })
    }
  }

  /**
   * Get current modal step based on header title
   */
  async getCurrentStep(): Promise<'input' | 'success' | 'error'> {
    const headerText = await this.headerTitle.textContent()
    if (headerText?.includes('Tarea Creada')) return 'success'
    if (headerText?.includes('Error')) return 'error'
    return 'input'
  }
}
