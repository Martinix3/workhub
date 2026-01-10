import { type Page, type Locator, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Base Page Object with common methods for all pages
 */
export class BasePage {
  constructor(protected page: Page) {}

  // Navigation
  async goto(path: string) {
    await this.page.goto(path)
    await this.waitForLoad()
  }

  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded')
  }

  async reload() {
    await this.page.reload()
    await this.waitForLoad()
  }

  // Accessibility
  async checkA11y(options?: { exclude?: string[] }) {
    let builder = new AxeBuilder({ page: this.page })
      .withTags(['wcag2a', 'wcag2aa'])

    if (options?.exclude) {
      for (const selector of options.exclude) {
        builder = builder.exclude(selector)
      }
    }

    const results = await builder.analyze()

    // Return violations for custom handling or fail immediately
    return results.violations
  }

  async expectNoA11yViolations(options?: { exclude?: string[] }) {
    const violations = await this.checkA11y(options)
    expect(violations).toEqual([])
  }

  // Common assertions
  async expectVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible()
  }

  async expectNotVisible(selector: string) {
    await expect(this.page.locator(selector)).not.toBeVisible()
  }

  async expectText(selector: string, text: string | RegExp) {
    await expect(this.page.locator(selector)).toContainText(text)
  }

  async expectURL(urlPattern: string | RegExp) {
    await expect(this.page).toHaveURL(urlPattern)
  }

  // Screenshots for debugging
  async screenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true
    })
  }

  // Wait helpers
  async waitForSelector(selector: string, options?: { timeout?: number }) {
    await this.page.waitForSelector(selector, options)
  }

  async waitForHidden(selector: string) {
    await this.page.waitForSelector(selector, { state: 'hidden' })
  }

  // Keyboard helpers
  async pressEscape() {
    await this.page.keyboard.press('Escape')
  }

  async pressTab() {
    await this.page.keyboard.press('Tab')
  }

  async pressEnter() {
    await this.page.keyboard.press('Enter')
  }

  // Get current URL
  get currentURL() {
    return this.page.url()
  }
}
