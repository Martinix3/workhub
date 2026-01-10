import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from '../base.page'

/**
 * Create User Page Object
 */
export class CreateUserPage extends BasePage {
  readonly emailInput: Locator
  readonly firstNameInput: Locator
  readonly lastNameInput: Locator
  readonly roleCheckboxes: Locator
  readonly submitButton: Locator
  readonly cancelButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    super(page)

    this.emailInput = page.locator('input[type="email"], input[name="email"]')
    this.firstNameInput = page.locator('input[name="first_name"], input[placeholder*="Nombre"]').first()
    this.lastNameInput = page.locator('input[name="last_name"], input[placeholder*="Apellido"]')
    this.roleCheckboxes = page.locator('input[type="checkbox"]')
    this.submitButton = page.locator('button[type="submit"], button:has-text("Crear")')
    this.cancelButton = page.locator('button:has-text("Cancelar"), a:has-text("Cancelar")')
    this.errorMessage = page.locator('[class*="text-red"], [class*="error"]')
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email)
  }

  async fillName(firstName: string, lastName?: string) {
    await this.firstNameInput.fill(firstName)
    if (lastName) {
      await this.lastNameInput.fill(lastName)
    }
  }

  async selectRole(roleName: string) {
    const roleLabel = this.page.locator(`label:has-text("${roleName}")`)
    await roleLabel.click()
  }

  async deselectRole(roleName: string) {
    const checkbox = this.page.locator(`label:has-text("${roleName}") input[type="checkbox"]`)
    if (await checkbox.isChecked()) {
      await checkbox.click()
    }
  }

  async submit() {
    await this.submitButton.click()
  }

  async cancel() {
    await this.cancelButton.click()
  }

  async expectError(message?: string) {
    await expect(this.errorMessage).toBeVisible()
    if (message) {
      await expect(this.errorMessage).toContainText(message)
    }
  }
}
