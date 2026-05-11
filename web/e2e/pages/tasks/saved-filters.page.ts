import { type Page, type Locator } from '@playwright/test'
import { BasePage } from '../base.page'

/**
 * Saved Filters Panel Page Object - Filter management sidebar
 */
export class SavedFiltersPage extends BasePage {
  // Panel container
  readonly panel: Locator
  readonly panelHeader: Locator
  readonly panelTitle: Locator

  // Filter sections
  readonly presetFiltersSection: Locator
  readonly presetFiltersHeading: Locator
  readonly customFiltersSection: Locator
  readonly customFiltersHeading: Locator

  // Filter items
  readonly filterItems: Locator
  readonly activeFilterItem: Locator
  readonly filterCountBadges: Locator

  // Actions
  readonly newFilterButton: Locator

  // States
  readonly loadingState: Locator
  readonly emptyState: Locator

  // Save Filter Modal
  readonly saveFilterModal: Locator
  readonly saveFilterTitleInput: Locator
  readonly saveFilterShareCheckbox: Locator
  readonly saveFilterSaveButton: Locator
  readonly saveFilterCancelButton: Locator
  readonly saveFilterChips: Locator
  readonly saveFilterErrorMessage: Locator

  constructor(page: Page) {
    super(page)

    // Panel container - matches 'w-64 bg-white border-r-2 border-stone-900'
    this.panel = page.locator('.w-64.bg-white.border-r-2.border-stone-900').first()
    this.panelHeader = this.panel.locator('[class*="border-b-2"]').first()
    this.panelTitle = this.panelHeader.locator('h2:has-text("VISTAS")')

    // Filter sections
    this.presetFiltersHeading = page.locator('h3:has-text("Filtros Rápidos")')
    this.presetFiltersSection = this.presetFiltersHeading.locator('xpath=following-sibling::div[1]')
    this.customFiltersHeading = page.locator('h3:has-text("Mis Vistas")')
    this.customFiltersSection = this.customFiltersHeading.locator('xpath=following-sibling::div[1]')

    // Filter items - buttons with borders
    this.filterItems = page.locator('button:has([class*="truncate"])')
    this.activeFilterItem = page.locator('button.bg-amber-400')
    this.filterCountBadges = page.locator('[class*="font-mono"]:has-text(/^\\d+$/)')

    // Actions
    this.newFilterButton = page.locator('button:has-text("Nueva Vista")')

    // States
    this.loadingState = page.locator('.animate-pulse')
    this.emptyState = page.locator('text=Guarda tus filtros favoritos para acceso rápido')

    // Save Filter Modal
    this.saveFilterModal = page.locator('text=Guardar Vista >> xpath=ancestor::div[@role="dialog"]')
    this.saveFilterTitleInput = page.locator('input[placeholder*="Tareas de ventas urgentes"]')
    this.saveFilterShareCheckbox = page.locator('input[type="checkbox"]')
    this.saveFilterSaveButton = page.locator('button:has-text("Guardar"):not(:has-text("Guardando"))')
    this.saveFilterCancelButton = page.locator('button:has-text("Cancelar")')
    this.saveFilterChips = page.locator('[class*="bg-stone-100"]:has([class*="uppercase"]):has-text(":")')
    this.saveFilterErrorMessage = page.locator('[class*="bg-red-100"]')
  }

  // Navigation
  async gotoTasksWithFilters() {
    await this.goto('/tareas?filters=true')
  }

  // Panel visibility checks
  async isPanelVisible() {
    return await this.panel.isVisible()
  }

  async isPanelLoaded() {
    const isLoading = await this.loadingState.isVisible().catch(() => false)
    return !isLoading
  }

  async waitForPanelLoaded() {
    try {
      await this.loadingState.waitFor({ state: 'hidden', timeout: 10000 })
    } catch {
      // Loading indicator might not exist
    }
    await this.page.waitForTimeout(300)
  }

  // Filter item interactions
  async clickFilter(filterTitle: string) {
    const filter = this.page.locator(`button:has-text("${filterTitle}")`)
    await filter.click()
    await this.page.waitForTimeout(300)
  }

  async clickFilterByIndex(index: number) {
    await this.filterItems.nth(index).click()
    await this.page.waitForTimeout(300)
  }

  async getActiveFilterTitle(): Promise<string | null> {
    try {
      const titleElement = this.activeFilterItem.locator('[class*="truncate"]')
      return await titleElement.textContent()
    } catch {
      return null
    }
  }

  async isFilterActive(filterTitle: string): Promise<boolean> {
    try {
      const activeFilter = this.page.locator(`button.bg-amber-400:has-text("${filterTitle}")`)
      return await activeFilter.isVisible({ timeout: 2000 })
    } catch {
      return false
    }
  }

  // Filter counts
  async getFilterCount(filterTitle: string): Promise<number> {
    try {
      const filterButton = this.page.locator(`button:has-text("${filterTitle}")`)
      const countBadge = filterButton.locator('[class*="font-mono"]')
      const countText = await countBadge.textContent()
      return parseInt(countText || '0', 10)
    } catch {
      return 0
    }
  }

  async getAllFilterTitles(): Promise<string[]> {
    const titles: string[] = []
    const count = await this.filterItems.count()

    for (let i = 0; i < count; i++) {
      const titleElement = this.filterItems.nth(i).locator('[class*="truncate"]')
      const title = await titleElement.textContent()
      if (title) titles.push(title.trim())
    }

    return titles
  }

  async getPresetFilterTitles(): Promise<string[]> {
    const titles: string[] = []

    try {
      const presetButtons = this.presetFiltersSection.locator('button')
      const count = await presetButtons.count()

      for (let i = 0; i < count; i++) {
        const titleElement = presetButtons.nth(i).locator('[class*="truncate"]')
        const title = await titleElement.textContent()
        if (title) titles.push(title.trim())
      }
    } catch {
      // Section might not exist
    }

    return titles
  }

  async getCustomFilterTitles(): Promise<string[]> {
    const titles: string[] = []

    try {
      const customButtons = this.customFiltersSection.locator('button')
      const count = await customButtons.count()

      for (let i = 0; i < count; i++) {
        const titleElement = customButtons.nth(i).locator('[class*="truncate"]')
        const title = await titleElement.textContent()
        if (title) titles.push(title.trim())
      }
    } catch {
      // Section might not exist
    }

    return titles
  }

  // Filter counts
  async getFilterItemsCount(): Promise<number> {
    return await this.filterItems.count()
  }

  // Empty state check
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible().catch(() => false)
  }

  // New filter action
  async clickNewFilter() {
    await this.newFilterButton.click()
    await this.page.waitForTimeout(300)
  }

  // Save Filter Modal interactions
  async isSaveFilterModalOpen(): Promise<boolean> {
    return await this.saveFilterModal.isVisible().catch(() => false)
  }

  async fillFilterTitle(title: string) {
    await this.saveFilterTitleInput.fill(title)
  }

  async toggleShareFilter() {
    await this.saveFilterShareCheckbox.click()
  }

  async setShareFilter(shared: boolean) {
    const isChecked = await this.saveFilterShareCheckbox.isChecked()
    if (isChecked !== shared) {
      await this.toggleShareFilter()
    }
  }

  async getSaveFilterChips(): Promise<Array<{ label: string; value: string }>> {
    const chips: Array<{ label: string; value: string }> = []
    const chipCount = await this.saveFilterChips.count()

    for (let i = 0; i < chipCount; i++) {
      const chip = this.saveFilterChips.nth(i)
      const labelElement = chip.locator('[class*="uppercase"]')
      const valueElement = chip.locator('[class*="font-medium"]')

      const label = await labelElement.textContent()
      const value = await valueElement.textContent()

      if (label && value) {
        chips.push({
          label: label.replace(':', '').trim(),
          value: value.trim()
        })
      }
    }

    return chips
  }

  async clickSaveFilter() {
    await this.saveFilterSaveButton.click()
    await this.page.waitForTimeout(500)
  }

  async clickCancelSaveFilter() {
    await this.saveFilterCancelButton.click()
    await this.page.waitForTimeout(300)
  }

  async isSaveFilterErrorVisible(): Promise<boolean> {
    return await this.saveFilterErrorMessage.isVisible().catch(() => false)
  }

  async getSaveFilterError(): Promise<string | null> {
    try {
      return await this.saveFilterErrorMessage.textContent()
    } catch {
      return null
    }
  }

  async isSaveButtonDisabled(): Promise<boolean> {
    return await this.saveFilterSaveButton.isDisabled()
  }

  // Complete workflow: create and save a new filter
  async createNewFilter(title: string, shared: boolean = false) {
    await this.clickNewFilter()
    await this.fillFilterTitle(title)
    await this.setShareFilter(shared)
    await this.clickSaveFilter()

    // Wait for modal to close
    await this.saveFilterModal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    await this.page.waitForTimeout(500)
  }

  /**
   * Verify that a filter exists in the panel
   */
  async verifyFilterExists(filterTitle: string): Promise<boolean> {
    try {
      const filter = this.page.locator(`button:has-text("${filterTitle}")`)
      return await filter.isVisible({ timeout: 3000 })
    } catch {
      return false
    }
  }

  /**
   * Verify filter has an icon (preset or custom emoji)
   */
  async verifyFilterHasIcon(filterTitle: string): Promise<boolean> {
    try {
      const filterButton = this.page.locator(`button:has-text("${filterTitle}")`)
      // Check for either preset icons (svg) or custom emoji icons
      const hasIcon = await filterButton.locator('svg, [class*="text-base"]').count() > 0
      return hasIcon
    } catch {
      return false
    }
  }
}
