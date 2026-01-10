import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from '../base.page'

/**
 * Customers List Page Object
 * Page for managing customers at /ventas/clientes
 */
export class CustomersPage extends BasePage {
  // Search and filters
  readonly searchInput: Locator
  readonly typeFilter: Locator
  readonly distributorFilter: Locator
  readonly clearFiltersButton: Locator

  // List
  readonly customerRows: Locator
  readonly emptyState: Locator
  readonly loadingIndicator: Locator

  // Pagination
  readonly paginationPrev: Locator
  readonly paginationNext: Locator
  readonly pageInfo: Locator

  // Actions
  readonly newCustomerButton: Locator

  // Customer detail drawer/modal
  readonly customerDetailPanel: Locator
  readonly customerName: Locator
  readonly customerEmail: Locator
  readonly customerPhone: Locator
  readonly customerType: Locator
  readonly customerAddress: Locator
  readonly closeDetailButton: Locator

  constructor(page: Page) {
    super(page)

    // Search and filters
    this.searchInput = page.locator(
      'input[placeholder*="Buscar"], input[placeholder*="cliente"], input[type="search"]'
    )
    this.typeFilter = page.locator(
      'select:has(option:has-text("Tipo")), [class*="select"]:has-text("Tipo"), button:has-text("Tipo")'
    )
    this.distributorFilter = page.locator(
      'select:has(option:has-text("Distribuidor")), [class*="select"]:has-text("Distribuidor")'
    )
    this.clearFiltersButton = page.locator(
      'button:has-text("Limpiar"), button:has-text("Borrar filtros")'
    )

    // List
    this.customerRows = page.locator(
      'table tbody tr, [class*="customer-row"], [class*="cursor-pointer"]:has([class*="@"])'
    )
    this.emptyState = page.locator(
      'text=No hay clientes, text=Sin resultados, text=No se encontraron'
    )
    this.loadingIndicator = page.locator('text=Cargando')

    // Pagination
    this.paginationPrev = page.locator(
      'button:has-text("Anterior"), button[aria-label*="anterior"], button:has(svg[class*="ChevronLeft"])'
    )
    this.paginationNext = page.locator(
      'button:has-text("Siguiente"), button[aria-label*="siguiente"], button:has(svg[class*="ChevronRight"])'
    )
    this.pageInfo = page.locator('[class*="text-sm"]:has-text("de"), [class*="pagination-info"]')

    // Actions
    this.newCustomerButton = page.locator(
      'button:has-text("Nuevo Cliente"), button:has-text("Crear"), button:has(svg[class*="Plus"])'
    )

    // Customer detail panel
    this.customerDetailPanel = page.locator(
      '[class*="fixed"][class*="right-0"], [class*="drawer"], [role="dialog"]:has([class*="customer"])'
    )
    this.customerName = page.locator(
      '[class*="text-xl"], h2, [class*="customer-name"]'
    )
    this.customerEmail = page.locator(
      '[class*="text-gray"]:has-text("@"), a[href^="mailto:"]'
    )
    this.customerPhone = page.locator(
      '[class*="text-gray"]:has-text("+"), a[href^="tel:"]'
    )
    this.customerType = page.locator(
      '[class*="badge"]:has-text("Distribuidor"), [class*="badge"]:has-text("Cliente"), [class*="type"]'
    )
    this.customerAddress = page.locator(
      '[class*="address"], text=Dirección >> xpath=following-sibling::*'
    )
    this.closeDetailButton = page.locator(
      'button:has(svg[class*="X"]), button[aria-label="Cerrar"], button:has-text("Cerrar")'
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
   * Search for customers by name or email
   */
  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500) // Debounce
    await this.waitForDataLoaded()
  }

  /**
   * Clear search input
   */
  async clearSearch() {
    await this.searchInput.clear()
    await this.page.waitForTimeout(500)
    await this.waitForDataLoaded()
  }

  /**
   * Filter customers by type
   * Actual filter buttons: "Todos", "Directos", "Distribuidores"
   */
  async filterByType(type: 'todos' | 'directos' | 'distribuidores') {
    const typeMap: Record<string, string> = {
      todos: 'Todos',
      directos: 'Directos',
      distribuidores: 'Distribuidores'
    }

    const filterButton = this.page.locator(`button:has-text("${typeMap[type]}")`)
    const isVisible = await filterButton.isVisible({ timeout: 3000 }).catch(() => false)

    if (isVisible) {
      await filterButton.click()
      await this.waitForDataLoaded()
    }
    // Silently skip if filter not available
  }

  /**
   * Click on a customer row to open detail
   */
  async clickCustomer(index: number) {
    await this.customerRows.nth(index).click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Click on a customer by name
   */
  async clickCustomerByName(name: string) {
    await this.page.locator(`tr:has-text("${name}"), [class*="customer-row"]:has-text("${name}")`).click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Close customer detail panel
   */
  async closeCustomerDetail() {
    await this.closeDetailButton.click()
    await this.customerDetailPanel.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }

  /**
   * Get total customer count from pagination info
   */
  async getTotalCount(): Promise<number> {
    try {
      const text = await this.pageInfo.textContent()
      if (text) {
        // Parse "X de Y" format
        const match = text.match(/de\s*(\d+)/)
        if (match) {
          return parseInt(match[1], 10)
        }
      }
    } catch {
      // No pagination info
    }
    return await this.customerRows.count()
  }

  /**
   * Get visible customer count
   */
  async getVisibleCount(): Promise<number> {
    return await this.customerRows.count()
  }

  /**
   * Check if customer detail panel is visible
   */
  async isDetailVisible(): Promise<boolean> {
    return await this.customerDetailPanel.isVisible().catch(() => false)
  }

  /**
   * Get customer name from detail panel
   */
  async getDetailName(): Promise<string> {
    return (await this.customerName.textContent()) ?? ''
  }

  /**
   * Get customer email from detail panel
   */
  async getDetailEmail(): Promise<string> {
    return (await this.customerEmail.textContent()) ?? ''
  }

  /**
   * Navigate to next page
   */
  async nextPage() {
    await this.paginationNext.click()
    await this.waitForDataLoaded()
  }

  /**
   * Navigate to previous page
   */
  async prevPage() {
    await this.paginationPrev.click()
    await this.waitForDataLoaded()
  }

  /**
   * Open new customer form
   */
  async openNewCustomerForm() {
    await this.newCustomerButton.click()
    await this.page.waitForTimeout(300)
  }
}
