import { type Page, type Locator } from '@playwright/test'
import { BasePage } from '../base.page'

/**
 * Lots Page Object
 * Production lots management at /produccion/lotes
 */
export class LotsPage extends BasePage {
  // Header & Filters
  readonly pageTitle: Locator
  readonly searchInput: Locator
  readonly statusFilter: Locator
  readonly productFilter: Locator
  readonly dateFilter: Locator
  readonly clearFiltersButton: Locator

  // List
  readonly lotCards: Locator
  readonly lotRows: Locator
  readonly emptyState: Locator
  readonly loadingIndicator: Locator

  // Pagination
  readonly paginationPrev: Locator
  readonly paginationNext: Locator
  readonly pageInfo: Locator

  // Status filters (specific buttons)
  readonly allStatusButton: Locator
  readonly pendingStatusButton: Locator
  readonly inProgressStatusButton: Locator
  readonly releasedStatusButton: Locator
  readonly heldStatusButton: Locator

  // Lot actions
  readonly releaseButton: Locator
  readonly holdButton: Locator
  readonly printLabelButton: Locator
  readonly viewDetailsButton: Locator

  // Lot detail panel
  readonly detailPanel: Locator
  readonly lotNumber: Locator
  readonly lotStatus: Locator
  readonly productName: Locator
  readonly quantity: Locator
  readonly expirationDate: Locator
  readonly haccpInfo: Locator
  readonly closeDetailButton: Locator

  constructor(page: Page) {
    super(page)

    // Header & Filters - based on actual UI
    this.pageTitle = page.locator('h1:has-text("Gestion de Lotes"), h1:has-text("Lotes")')
    this.searchInput = page.locator(
      'input[placeholder*="Buscar"], input[placeholder*="lote"], input[type="search"]'
    )
    this.statusFilter = page.locator(
      'select:has(option:has-text("Estado")), [class*="select"]:has-text("Estado")'
    )
    this.productFilter = page.locator(
      'select:has(option:has-text("Producto")), [class*="select"]:has-text("Producto")'
    )
    this.dateFilter = page.locator('input[type="date"]')
    this.clearFiltersButton = page.locator(
      'button:has-text("Limpiar"), button:has-text("Borrar filtros")'
    )

    // List - lot cards have h3 headings with LOT numbers
    this.lotCards = page.locator('main h3:has-text("LOT-")').locator('xpath=ancestor::*[5]')
    this.lotRows = page.locator('table tbody tr, [class*="lot-row"]')
    this.emptyState = page.locator(
      'text=No hay lotes, text=Sin resultados, text=No se encontraron lotes'
    )
    this.loadingIndicator = page.locator('text=Cargando')

    // Pagination
    this.paginationPrev = page.locator(
      'button:has-text("Anterior"), button[aria-label*="anterior"]'
    )
    this.paginationNext = page.locator(
      'button:has-text("Siguiente"), button[aria-label*="siguiente"]'
    )
    this.pageInfo = page.locator('[class*="text-sm"]:has-text("de")')

    // Status filter - these are stats cards, not filter buttons
    // The actual UI shows stats cards that can be clicked
    this.allStatusButton = page.locator('text=Todos').first()
    this.pendingStatusButton = page.locator('text=Pendiente Inspeccion').first()
    this.inProgressStatusButton = page.locator('text=En Produccion').first()
    this.releasedStatusButton = page.locator('text=Liberado').first()
    this.heldStatusButton = page.locator('text=Retenido').first()

    // Lot actions
    this.releaseButton = page.locator(
      'button:has-text("Liberar"), button:has-text("Release")'
    )
    this.holdButton = page.locator(
      'button:has-text("Retener"), button:has-text("Hold")'
    )
    this.printLabelButton = page.locator(
      'button:has-text("Imprimir"), button:has(svg[class*="Printer"])'
    )
    this.viewDetailsButton = page.locator(
      'button:has-text("Ver Detalle"), button:has-text("Detalles")'
    )

    // Lot detail panel
    this.detailPanel = page.locator(
      '[class*="fixed"][class*="right-0"], [class*="drawer"], [role="dialog"]'
    )
    this.lotNumber = page.locator('h3:has-text("LOT-")')
    this.lotStatus = page.locator('text=Liberado, text=Retenido, text=Pendiente, text=En Produccion, text=Rechazado')
    this.productName = page.locator('text=Mezcal, text=Tequila').first()
    this.quantity = page.locator('text=Cantidad >> xpath=following-sibling::*').first()
    this.expirationDate = page.locator('text=Vence en >> xpath=following-sibling::*').first()
    this.haccpInfo = page.locator('text=HACCP, text=Materias Primas').first()
    this.closeDetailButton = page.locator(
      'button:has(svg[class*="X"]), button[aria-label="Cerrar"]'
    )
  }

  /**
   * Wait for page data to load
   */
  async waitForDataLoaded() {
    try {
      await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 15000 })
    } catch {
      // Loading indicator might not exist
    }
    await this.page.waitForTimeout(500)
  }

  override async goto(path: string) {
    await super.goto(path)
    await this.waitForDataLoaded()
  }

  /**
   * Navigate to lots page
   */
  async gotoLots() {
    await this.goto('/produccion/lotes')
  }

  /**
   * Search for lots
   */
  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500)
    await this.waitForDataLoaded()
  }

  /**
   * Clear search
   */
  async clearSearch() {
    await this.searchInput.clear()
    await this.page.waitForTimeout(500)
    await this.waitForDataLoaded()
  }

  /**
   * Filter by status - clicks on status cards if available
   */
  async filterByStatus(status: 'all' | 'pending' | 'in_progress' | 'released' | 'held') {
    const buttonMap = {
      all: this.allStatusButton,
      pending: this.pendingStatusButton,
      in_progress: this.inProgressStatusButton,
      released: this.releasedStatusButton,
      held: this.heldStatusButton
    }

    const button = buttonMap[status]
    const isVisible = await button.isVisible({ timeout: 3000 }).catch(() => false)

    if (isVisible) {
      await button.click()
      await this.waitForDataLoaded()
    }
    // If button is not visible, silently skip (no filter UI available)
  }

  /**
   * Click on a lot row/card
   */
  async clickLot(index: number) {
    // Click on the "Ver Detalle" button for the nth lot
    const viewButtons = this.page.locator('button:has-text("Ver Detalle")')
    const buttonCount = await viewButtons.count()
    if (buttonCount > index) {
      await viewButtons.nth(index).click()
    } else {
      // Fallback: click on the lot card itself
      const lotHeadings = this.page.locator('main h3:has-text("LOT-")')
      await lotHeadings.nth(index).click()
    }
    await this.page.waitForTimeout(300)
  }

  /**
   * Close detail panel
   */
  async closeDetail() {
    await this.closeDetailButton.click()
    await this.detailPanel.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }

  /**
   * Release a lot (from detail panel)
   */
  async releaseLot() {
    await this.releaseButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Hold a lot (from detail panel)
   */
  async holdLot() {
    await this.holdButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Get visible lot count
   */
  async getVisibleCount(): Promise<number> {
    // Count h3 headings with LOT- prefix
    const lotHeadings = this.page.locator('main h3:has-text("LOT-")')
    const count = await lotHeadings.count()
    if (count > 0) return count
    return await this.lotRows.count()
  }

  /**
   * Check if detail panel is visible
   */
  async isDetailVisible(): Promise<boolean> {
    return await this.detailPanel.isVisible().catch(() => false)
  }

  /**
   * Get lot number from detail panel
   */
  async getDetailLotNumber(): Promise<string> {
    return (await this.lotNumber.textContent()) ?? ''
  }

  /**
   * Get lot status from detail panel
   */
  async getDetailStatus(): Promise<string> {
    return (await this.lotStatus.textContent()) ?? ''
  }

  /**
   * Check if release button is enabled
   */
  async isReleaseEnabled(): Promise<boolean> {
    return await this.releaseButton.isEnabled().catch(() => false)
  }

  /**
   * Check if hold button is enabled
   */
  async isHoldEnabled(): Promise<boolean> {
    return await this.holdButton.isEnabled().catch(() => false)
  }
}
