import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from '../base.page'

/**
 * Orders List Page Object
 */
export class OrdersPage extends BasePage {
  readonly searchInput: Locator
  readonly statusFilters: Locator
  readonly orderRows: Locator
  readonly newOrderButton: Locator
  readonly emptyState: Locator
  readonly paginationPrev: Locator
  readonly paginationNext: Locator
  readonly loadingIndicator: Locator

  constructor(page: Page) {
    super(page)

    this.searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]')
    this.statusFilters = page.locator('[class*="flex"] button, [role="tablist"] button')
    this.orderRows = page.locator('table tbody tr, [class*="order-row"]')
    this.newOrderButton = page.locator('button:has-text("Nuevo Pedido"), button:has-text("Crear"), button:has-text("Nuevo")')
    this.emptyState = page.locator('text=No hay pedidos, text=Sin resultados')
    this.paginationPrev = page.locator('button:has-text("Anterior")')
    this.paginationNext = page.locator('button:has-text("Siguiente")')
    this.loadingIndicator = page.locator('text=Cargando')
  }

  /**
   * Wait for page data to finish loading (loading spinner gone)
   */
  async waitForDataLoaded() {
    // Wait for loading indicator to disappear (if it exists)
    try {
      await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 15000 })
    } catch {
      // Loading indicator might not exist, that's ok
    }
    // Extra wait for any animations
    await this.page.waitForTimeout(500)
  }

  override async goto(path: string) {
    await super.goto(path)
    await this.waitForDataLoaded()
  }

  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500)
    await this.waitForLoad()
  }

  async filterByStatus(status: 'all' | 'draft' | 'confirmed' | 'delivered' | 'cancelled') {
    const statusMap: Record<string, string> = {
      all: 'Todos',
      draft: 'Borrador',
      confirmed: 'Confirmado',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    }
    await this.page.locator(`button:has-text("${statusMap[status]}")`).click()
    await this.waitForLoad()
  }

  async openNewOrderWizard() {
    await this.newOrderButton.click()
  }

  async clickOrder(orderNumber: string) {
    const row = this.page.locator(`tr:has-text("${orderNumber}")`)
    await row.click()
  }

  /**
   * Click "Ver" button to open order detail panel
   */
  async viewOrder(index: number) {
    const viewButton = this.orderRows.nth(index).locator('button:has-text("Ver")')
    const isVisible = await viewButton.isVisible({ timeout: 3000 }).catch(() => false)
    if (isVisible) {
      await viewButton.click()
      await this.page.waitForTimeout(300)
    }
  }

  /**
   * Click "Editar" button for an order
   */
  async editOrder(index: number) {
    const editButton = this.orderRows.nth(index).locator('button:has-text("Editar")')
    const isVisible = await editButton.isVisible({ timeout: 3000 }).catch(() => false)
    if (isVisible) {
      await editButton.click()
      await this.page.waitForTimeout(300)
    }
  }

  async getOrderCount() {
    return await this.orderRows.count()
  }
}
