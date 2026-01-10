import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from '../base.page'

/**
 * Admin Users Page Object
 */
export class AdminUsersPage extends BasePage {
  readonly searchInput: Locator
  readonly userRows: Locator
  readonly newUserButton: Locator
  readonly emptyState: Locator
  readonly prevPageButton: Locator
  readonly nextPageButton: Locator
  readonly currentPage: Locator
  readonly successToast: Locator

  constructor(page: Page) {
    super(page)

    this.searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]')
    this.userRows = page.locator('table tbody tr, [class*="user-row"]')
    this.newUserButton = page.locator('a:has-text("Nuevo"), button:has-text("Nuevo")')
    this.emptyState = page.locator('text=No se encontraron, text=Sin resultados')
    this.prevPageButton = page.locator('button:has-text("Anterior"), button:has(svg[class*="left"])')
    this.nextPageButton = page.locator('button:has-text("Siguiente"), button:has(svg[class*="right"])')
    this.currentPage = page.locator('[class*="current"], span:has-text("Página")')
    this.successToast = page.locator('[class*="toast"], [role="alert"]:has-text("creado")')
  }

  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500) // Debounce
    await this.waitForLoad()
  }

  async clearSearch() {
    await this.searchInput.clear()
    await this.waitForLoad()
  }

  async clickNewUser() {
    await this.newUserButton.click()
    await this.page.waitForURL(/\/admin\/users\/new/)
  }

  async clickUser(nameOrEmail: string) {
    const row = this.page.locator(`tr:has-text("${nameOrEmail}"), [class*="user-row"]:has-text("${nameOrEmail}")`)
    await row.click()
  }

  async nextPage() {
    await this.nextPageButton.click()
    await this.waitForLoad()
  }

  async prevPage() {
    await this.prevPageButton.click()
    await this.waitForLoad()
  }

  async getUserCount() {
    return await this.userRows.count()
  }
}
