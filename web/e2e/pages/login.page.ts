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

    // Prefer data-testid, fallback to text selectors
    this.bypassButton = page.locator('[data-testid="bypass-login"], button:has-text("Revisar UI"), button:has-text("Bypass")')

    // Scope selectors to form to avoid matching wrong elements
    this.loginForm = page.locator('form, [data-testid="login-form"]')
    this.emailInput = page.locator('input[type="email"], [data-testid="email-input"]')
    this.passwordInput = page.locator('input[type="password"], [data-testid="password-input"]')
    this.submitButton = page.locator('button[type="submit"], [data-testid="submit-button"]')
  }

  async bypassLogin() {
    // Wait for button to be visible and enabled
    await this.bypassButton.waitFor({ state: 'visible', timeout: 10000 })
    await this.bypassButton.click()

    // Wait for redirect with proper load state
    await this.page.waitForURL('/', { timeout: 10000 })
    await this.page.waitForLoadState('domcontentloaded')

    // Verify critical element loaded
    await this.page.locator('aside, nav, main').first().waitFor({ state: 'visible', timeout: 5000 })
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
