import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from '../base.page'

/**
 * Order Detail Panel Page Object
 * Side panel that opens when clicking an order in the list
 */
export class OrderDetailPage extends BasePage {
  // Panel container
  readonly panel: Locator
  readonly closeButton: Locator
  readonly loadingIndicator: Locator

  // Header
  readonly orderNumber: Locator
  readonly orderStatus: Locator
  readonly salesType: Locator
  readonly sellInButton: Locator
  readonly sellOutButton: Locator

  // Customer info
  readonly customerName: Locator
  readonly customerEmail: Locator

  // Products section
  readonly productRows: Locator
  readonly quantityInputs: Locator
  readonly increaseButtons: Locator
  readonly decreaseButtons: Locator
  readonly removeButtons: Locator

  // Totals
  readonly subtotal: Locator
  readonly iva: Locator
  readonly total: Locator

  // Actions
  readonly saveButton: Locator
  readonly cancelOrderButton: Locator
  readonly deleteButton: Locator
  readonly confirmDialogYes: Locator
  readonly confirmDialogNo: Locator

  // Unsaved changes warning
  readonly unsavedWarning: Locator
  readonly discardButton: Locator
  readonly keepEditingButton: Locator

  constructor(page: Page) {
    super(page)

    // Panel container - typically a side drawer
    this.panel = page.locator(
      '[class*="fixed"][class*="right-0"], [class*="drawer"], [role="dialog"]:has([class*="order-detail"])'
    )
    this.closeButton = page.locator(
      'button:has(svg[class*="X"]), button[aria-label="Cerrar"], button:has-text("Cerrar")'
    )
    this.loadingIndicator = page.locator('text=Cargando')

    // Header - order numbers are SAL-YYYY-XXX format
    this.orderNumber = page.locator(
      '[class*="text-xl"]:has-text("SAL-"), [class*="order-number"], h2:has-text("Pedido"), h2:has-text("SAL-")'
    )
    this.orderStatus = page.locator(
      '[class*="badge"], [class*="chip"]:has-text("Borrador"), [class*="status"]'
    )
    this.salesType = page.locator('[class*="flex"]:has(button:has-text("SELL"))')
    this.sellInButton = page.locator('button:has-text("SELL IN")')
    this.sellOutButton = page.locator('button:has-text("SELL OUT")')

    // Customer info
    this.customerName = page.locator(
      '[class*="font-semibold"]:has-text("Cliente"), [class*="customer-name"]'
    )
    this.customerEmail = page.locator('[class*="text-gray"]:has-text("@")')

    // Products section
    this.productRows = page.locator(
      '[class*="border-b"]:has(input[type="number"]), [class*="product-row"], tr:has(input[type="number"])'
    )
    this.quantityInputs = page.locator('input[type="number"]')
    this.increaseButtons = page.locator(
      'button:has(svg[class*="Plus"]), button[aria-label*="aumentar"], button:has-text("+")'
    )
    this.decreaseButtons = page.locator(
      'button:has(svg[class*="Minus"]), button[aria-label*="disminuir"], button:has-text("-")'
    )
    this.removeButtons = page.locator(
      'button:has(svg[class*="Trash"]), button[aria-label*="eliminar"]'
    )

    // Totals
    this.subtotal = page.locator(
      '[class*="font-medium"]:has-text("Subtotal") + *, text=Subtotal >> xpath=following-sibling::*'
    )
    this.iva = page.locator(
      '[class*="font-medium"]:has-text("IVA") + *, text=IVA >> xpath=following-sibling::*'
    )
    this.total = page.locator(
      '[class*="font-bold"]:has-text("$"), [class*="total"], [class*="text-xl"]:has-text("$")'
    )

    // Actions
    this.saveButton = page.locator(
      'button:has-text("Guardar"), button:has-text("Actualizar"), button[type="submit"]'
    )
    this.cancelOrderButton = page.locator(
      'button:has-text("Cancelar Pedido"), button:has-text("Anular")'
    )
    this.deleteButton = page.locator(
      'button:has(svg[class*="Trash"]):not([class*="product"]), button:has-text("Eliminar")'
    )
    this.confirmDialogYes = page.locator(
      'button:has-text("Confirmar"), button:has-text("Aceptar"), button:has-text("Si")'
    )
    this.confirmDialogNo = page.locator('button:has-text("No"), button:has-text("Cancelar")')

    // Unsaved changes warning
    this.unsavedWarning = page.locator(
      '[class*="dialog"]:has-text("sin guardar"), [class*="modal"]:has-text("cambios")'
    )
    this.discardButton = page.locator(
      'button:has-text("Descartar"), button:has-text("Salir sin guardar")'
    )
    this.keepEditingButton = page.locator(
      'button:has-text("Seguir editando"), button:has-text("Continuar")'
    )
  }

  /**
   * Wait for the panel to be visible
   */
  async waitForPanel() {
    try {
      await this.panel.waitFor({ state: 'visible', timeout: 10000 })
      await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    } catch {
      // Panel might already be visible
    }
  }

  /**
   * Close the detail panel
   */
  async close() {
    await this.closeButton.click()
    await this.panel.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }

  /**
   * Close with unsaved changes - choose to discard
   */
  async closeAndDiscard() {
    await this.closeButton.click()
    const warningVisible = await this.unsavedWarning.isVisible({ timeout: 2000 }).catch(() => false)
    if (warningVisible) {
      await this.discardButton.click()
    }
    await this.panel.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }

  /**
   * Close with unsaved changes - choose to keep editing
   */
  async closeAndKeepEditing() {
    await this.closeButton.click()
    const warningVisible = await this.unsavedWarning.isVisible({ timeout: 2000 }).catch(() => false)
    if (warningVisible) {
      await this.keepEditingButton.click()
    }
  }

  /**
   * Change product quantity for a specific row
   */
  async setProductQuantity(rowIndex: number, quantity: number) {
    const input = this.productRows.nth(rowIndex).locator('input[type="number"]')
    await input.fill(String(quantity))
  }

  /**
   * Increase quantity for a product row
   */
  async increaseQuantity(rowIndex: number) {
    const increaseBtn = this.productRows.nth(rowIndex).locator(
      'button:has(svg[class*="Plus"]), button:has-text("+")'
    )
    await increaseBtn.click()
  }

  /**
   * Decrease quantity for a product row
   */
  async decreaseQuantity(rowIndex: number) {
    const decreaseBtn = this.productRows.nth(rowIndex).locator(
      'button:has(svg[class*="Minus"]), button:has-text("-")'
    )
    await decreaseBtn.click()
  }

  /**
   * Remove a product from the order
   */
  async removeProduct(rowIndex: number) {
    const removeBtn = this.productRows.nth(rowIndex).locator('button:has(svg[class*="Trash"])')
    await removeBtn.click()
  }

  /**
   * Change sales type (SELL IN / SELL OUT)
   */
  async setSalesType(type: 'sell_in' | 'sell_out') {
    if (type === 'sell_in') {
      await this.sellInButton.click()
    } else {
      await this.sellOutButton.click()
    }
  }

  /**
   * Save changes
   */
  async save() {
    await this.saveButton.click()
    await this.page.waitForTimeout(500) // Wait for save
  }

  /**
   * Cancel the order (with confirmation)
   */
  async cancelOrder() {
    await this.cancelOrderButton.click()
    const confirmVisible = await this.confirmDialogYes.isVisible({ timeout: 2000 }).catch(() => false)
    if (confirmVisible) {
      await this.confirmDialogYes.click()
    }
  }

  /**
   * Delete the order (with confirmation)
   */
  async deleteOrder() {
    await this.deleteButton.click()
    const confirmVisible = await this.confirmDialogYes.isVisible({ timeout: 2000 }).catch(() => false)
    if (confirmVisible) {
      await this.confirmDialogYes.click()
    }
  }

  /**
   * Get the total value as string
   */
  async getTotalValue(): Promise<string> {
    return (await this.total.textContent()) ?? ''
  }

  /**
   * Get current order status
   */
  async getStatus(): Promise<string> {
    return (await this.orderStatus.textContent()) ?? ''
  }

  /**
   * Get product count
   */
  async getProductCount(): Promise<number> {
    return await this.productRows.count()
  }

  /**
   * Check if panel is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.panel.isVisible().catch(() => false)
  }

  /**
   * Check if there are unsaved changes (warning visible on close attempt)
   */
  async hasUnsavedChanges(): Promise<boolean> {
    await this.closeButton.click()
    const hasWarning = await this.unsavedWarning.isVisible({ timeout: 2000 }).catch(() => false)
    if (hasWarning) {
      await this.keepEditingButton.click()
    }
    return hasWarning
  }
}
