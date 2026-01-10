import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Login Page Object
 */
export class LoginPage extends BasePage {
  readonly bypassButton: Locator
  readonly loginForm: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator

  constructor(page: Page) {
    super(page)

    this.bypassButton = page.locator('button:has-text("Revisar UI"), button:has-text("Bypass"), [data-testid="bypass-login"]')
    this.loginForm = page.locator('form')
    this.emailInput = page.locator('input[type="email"]')
    this.passwordInput = page.locator('input[type="password"]')
    this.submitButton = page.locator('button[type="submit"]')
  }

  async bypassLogin() {
    await this.bypassButton.click()
    await this.page.waitForURL('/')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async expectLoginPage() {
    await expect(this.page).toHaveURL(/\/login/)
  }
}
