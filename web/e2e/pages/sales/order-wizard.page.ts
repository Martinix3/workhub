import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from '../base.page'

/**
 * Order Wizard Page Object - Multi-step modal
 */
export class OrderWizardPage extends BasePage {
  // Modal
  readonly modal: Locator

  // Step 1 - Customer & Products
  readonly customerSearchInput: Locator
  readonly customerDropdown: Locator
  readonly customerResults: Locator
  readonly selectedCustomer: Locator
  readonly changeCustomerButton: Locator
  readonly salesTypeToggle: Locator
  readonly sellInButton: Locator
  readonly sellOutButton: Locator
  readonly distributorError: Locator
  readonly productRows: Locator
  readonly addProductButton: Locator
  readonly subtotal: Locator
  readonly nextButton: Locator

  // Step 2 - Summary
  readonly summarySection: Locator
  readonly totalWithIVA: Locator
  readonly confirmButton: Locator
  readonly backButton: Locator

  // Common
  readonly cancelButton: Locator
  readonly noResultsMessage: Locator

  constructor(page: Page) {
    super(page)

    // Modal container
    this.modal = page.locator('[class*="fixed"][class*="inset-0"]:has([class*="max-w-"]), [role="dialog"]')

    // Step 1
    this.customerSearchInput = page.locator('input[placeholder*="cliente"], input[placeholder*="Buscar"]').first()
    this.customerDropdown = page.locator('[class*="absolute"][class*="z-"]:has([class*="cursor-pointer"])')
    this.customerResults = page.locator('[class*="cursor-pointer"]:has-text("@"), [class*="customer-result"]')
    this.selectedCustomer = page.locator('[class*="bg-stone-50"]:has-text("Cliente"), [class*="selected-customer"]')
    this.changeCustomerButton = page.locator('button:has-text("Cambiar")')
    this.salesTypeToggle = page.locator('[class*="flex"]:has(button:has-text("SELL"))')
    this.sellInButton = page.locator('button:has-text("SELL IN")')
    this.sellOutButton = page.locator('button:has-text("SELL OUT")')
    this.distributorError = page.locator('[class*="text-red"]:has-text("distribuidor"), [class*="error"]')
    this.productRows = page.locator('[class*="border-b"]:has(input[type="number"]), [class*="product-row"]')
    this.addProductButton = page.locator('button:has-text("Agregar"), button:has(svg[class*="Plus"])')
    this.subtotal = page.locator('[class*="font-bold"]:has-text("$"), [class*="subtotal"]')
    this.nextButton = page.locator('button:has-text("Siguiente"), button:has-text("Next")')

    // Step 2
    this.summarySection = page.locator('[class*="space-y"]:has-text("Resumen")')
    this.totalWithIVA = page.locator('[class*="text-xl"]:has-text("$"), [class*="total"]')
    this.confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Crear Pedido")')
    this.backButton = page.locator('button:has-text("Atrás"), button:has-text("Anterior")')

    // Common
    this.cancelButton = page.locator('button:has-text("Cancelar")')
    this.noResultsMessage = page.locator('text=No se encontraron, text=Sin resultados')
  }

  // Customer actions
  async searchCustomer(query: string) {
    await this.customerSearchInput.fill(query)
    await this.page.waitForTimeout(500) // Debounce
  }

  async selectCustomer(name: string) {
    await this.page.locator(`[class*="cursor-pointer"]:has-text("${name}")`).click()
  }

  async changeCustomer() {
    await this.changeCustomerButton.click()
  }

  // Sales type
  async setSalesType(type: 'sell_in' | 'sell_out') {
    if (type === 'sell_in') {
      await this.sellInButton.click()
    } else {
      await this.sellOutButton.click()
    }
  }

  // Products
  async addProduct(productName: string, quantity: number) {
    // This depends on the actual ProductSelector implementation
    await this.addProductButton.click()
    // Select product and set quantity
    await this.page.locator(`text=${productName}`).click()
    const qtyInput = this.page.locator('input[type="number"]').last()
    await qtyInput.fill(String(quantity))
  }

  async removeProduct(index: number) {
    const removeButton = this.productRows.nth(index).locator('button:has(svg[class*="Trash"])')
    await removeButton.click()
  }

  // Navigation
  async nextStep() {
    await this.nextButton.click()
    await this.page.waitForTimeout(300)
  }

  async goBack() {
    await this.backButton.click()
    await this.page.waitForTimeout(300)
  }

  async confirm() {
    await this.confirmButton.click()
  }

  async cancel() {
    await this.cancelButton.click()
  }

  // Getters
  async getSubtotalValue(): Promise<string> {
    return await this.subtotal.textContent() ?? ''
  }

  async getTotalValue(): Promise<string> {
    return await this.totalWithIVA.textContent() ?? ''
  }

  async getProductCount(): Promise<number> {
    return await this.productRows.count()
  }
}
