import { type Page, type Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Command Palette Page Object
 * Global search and quick actions dialog (Cmd+K / Ctrl+K)
 */
export class CommandPalettePage extends BasePage {
  // Dialog container
  readonly dialog: Locator
  readonly backdrop: Locator

  // Search
  readonly searchInput: Locator
  readonly searchIcon: Locator
  readonly clearButton: Locator

  // Results
  readonly resultsList: Locator
  readonly resultItems: Locator
  readonly selectedResult: Locator
  readonly noResultsMessage: Locator
  readonly loadingIndicator: Locator

  // Groups
  readonly recentGroup: Locator
  readonly suggestionsGroup: Locator
  readonly actionsGroup: Locator

  // Footer
  readonly keyboardHints: Locator
  readonly closeButton: Locator

  constructor(page: Page) {
    super(page)

    // Dialog container - typically a modal with command palette styling
    this.dialog = page.locator(
      '[role="dialog"][aria-label*="Command"], [class*="command-palette"], [class*="cmdk"], [data-cmdk-root]'
    )
    this.backdrop = page.locator(
      '[class*="fixed"][class*="inset-0"][class*="bg-black"], [class*="overlay"]'
    )

    // Search input
    this.searchInput = page.locator(
      '[data-cmdk-input], input[placeholder*="Buscar"], input[placeholder*="Search"], [class*="command-input"]'
    )
    this.searchIcon = page.locator('svg[class*="Search"], [class*="search-icon"]')
    this.clearButton = page.locator(
      'button:has(svg[class*="X"]):visible, button[aria-label="Clear"]'
    )

    // Results
    this.resultsList = page.locator(
      '[data-cmdk-list], [class*="command-list"], [role="listbox"]'
    )
    this.resultItems = page.locator(
      '[data-cmdk-item], [class*="command-item"], [role="option"]'
    )
    this.selectedResult = page.locator(
      '[data-cmdk-item][aria-selected="true"], [class*="selected"], [role="option"][aria-selected="true"]'
    )
    this.noResultsMessage = page.locator(
      '[data-cmdk-empty], text=No se encontraron resultados, text=Sin resultados'
    )
    this.loadingIndicator = page.locator(
      '[data-cmdk-loading], text=Buscando, [class*="loading"]'
    )

    // Groups
    this.recentGroup = page.locator(
      '[data-cmdk-group]:has-text("Recientes"), [class*="group"]:has-text("Recent")'
    )
    this.suggestionsGroup = page.locator(
      '[data-cmdk-group]:has-text("Sugerencias"), [class*="group"]:has-text("Suggestions")'
    )
    this.actionsGroup = page.locator(
      '[data-cmdk-group]:has-text("Acciones"), [class*="group"]:has-text("Actions")'
    )

    // Footer
    this.keyboardHints = page.locator(
      '[class*="keyboard-hints"], [class*="footer"]:has(kbd)'
    )
    this.closeButton = page.locator(
      'button:has-text("Cerrar"), button[aria-label="Close"]'
    )
  }

  /**
   * Open command palette with keyboard shortcut (Cmd+K on Mac, Ctrl+K on Windows/Linux)
   */
  async openWithKeyboard() {
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await this.page.keyboard.press(`${modifier}+k`)
    await this.page.waitForTimeout(300)
  }

  /**
   * Open command palette by clicking the search button/icon (if exists in header)
   */
  async openWithClick() {
    const searchButton = this.page.locator(
      'button[aria-label*="Buscar"], button[aria-label*="Search"], button:has(svg[class*="Search"])'
    )
    await searchButton.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Check if command palette is open
   */
  async isOpen(): Promise<boolean> {
    return await this.dialog.isVisible().catch(() => false)
  }

  /**
   * Wait for command palette to be visible
   */
  async waitForOpen() {
    await this.dialog.waitFor({ state: 'visible', timeout: 5000 })
  }

  /**
   * Close command palette with Escape key
   */
  async close() {
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(300)
  }

  /**
   * Close by clicking outside (on backdrop)
   */
  async closeByClickingOutside() {
    const backdrop = this.page.locator(
      '[class*="fixed"][class*="inset-0"]'
    ).first()
    await backdrop.click({ position: { x: 10, y: 10 } })
    await this.page.waitForTimeout(300)
  }

  /**
   * Search for a term
   */
  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500) // Debounce
  }

  /**
   * Clear search input
   */
  async clearSearch() {
    const clearVisible = await this.clearButton.isVisible().catch(() => false)
    if (clearVisible) {
      await this.clearButton.click()
    } else {
      await this.searchInput.clear()
    }
    await this.page.waitForTimeout(300)
  }

  /**
   * Select first result
   */
  async selectFirstResult() {
    await this.page.keyboard.press('Enter')
    await this.page.waitForTimeout(300)
  }

  /**
   * Select result by index
   */
  async selectResultByIndex(index: number) {
    // Navigate to the result using arrow keys
    for (let i = 0; i < index; i++) {
      await this.page.keyboard.press('ArrowDown')
      await this.page.waitForTimeout(100)
    }
    await this.page.keyboard.press('Enter')
    await this.page.waitForTimeout(300)
  }

  /**
   * Select result by text
   */
  async selectResultByText(text: string) {
    await this.page.locator(`[data-cmdk-item]:has-text("${text}"), [role="option"]:has-text("${text}")`).click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Navigate down in results
   */
  async navigateDown() {
    await this.page.keyboard.press('ArrowDown')
    await this.page.waitForTimeout(100)
  }

  /**
   * Navigate up in results
   */
  async navigateUp() {
    await this.page.keyboard.press('ArrowUp')
    await this.page.waitForTimeout(100)
  }

  /**
   * Get count of visible results
   */
  async getResultCount(): Promise<number> {
    return await this.resultItems.count()
  }

  /**
   * Get text of selected result
   */
  async getSelectedResultText(): Promise<string> {
    return (await this.selectedResult.textContent()) ?? ''
  }

  /**
   * Check if no results message is shown
   */
  async hasNoResults(): Promise<boolean> {
    return await this.noResultsMessage.isVisible().catch(() => false)
  }

  /**
   * Check if loading indicator is shown
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingIndicator.isVisible().catch(() => false)
  }

  /**
   * Get all result texts
   */
  async getResultTexts(): Promise<string[]> {
    const count = await this.resultItems.count()
    const texts: string[] = []

    for (let i = 0; i < count; i++) {
      const text = await this.resultItems.nth(i).textContent()
      if (text) texts.push(text.trim())
    }

    return texts
  }
}
