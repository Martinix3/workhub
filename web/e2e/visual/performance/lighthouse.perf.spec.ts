import { test, expect, chromium, type Page } from '@playwright/test'
import { playAudit } from 'playwright-lighthouse'
import type { LH } from 'playwright-lighthouse/types/lh'
import {
  CRITICAL_PAGES,
  LIGHTHOUSE_THRESHOLDS,
  LIGHTHOUSE_WAIT_OPTIONS,
  getLighthouseOptions,
} from '../../config/lighthouse.config'

/**
 * Lighthouse Performance Tests
 *
 * Tests critical pages against performance thresholds using Lighthouse CI.
 * Validates:
 * - Performance metrics (LCP, FCP, TBT, TTI, CLS, Speed Index)
 * - Accessibility standards (WCAG)
 * - Best practices (security, browser compatibility)
 * - SEO fundamentals
 *
 * NOTE: Lighthouse tests run in their own browser instance for accurate metrics.
 * They don't use the auth fixture since they need a fresh context.
 */

/**
 * Helper function to authenticate a page using bypass mode
 */
async function authenticatePage(page: Page): Promise<void> {
  await page.goto('/login')
  await page.waitForLoadState('domcontentloaded')

  const bypassButton = page.locator(
    'button:has-text("Revisar UI"), button:has-text("Bypass"), [data-testid="bypass-login"]'
  ).first()

  await bypassButton.waitFor({ state: 'visible', timeout: 10000 })
  await bypassButton.click()

  // Wait for redirect to home
  await page.waitForURL('/', { timeout: 15000 })
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Helper function to run Lighthouse audit and validate thresholds
 */
async function runLighthouseAudit(
  page: Page,
  pageName: string,
  pagePath: string
): Promise<void> {
  // Navigate to the page
  await page.goto(pagePath)
  await page.waitForLoadState(LIGHTHOUSE_WAIT_OPTIONS.waitUntil, {
    timeout: LIGHTHOUSE_WAIT_OPTIONS.timeout,
  })

  // Run Lighthouse audit
  const lighthouseOptions = getLighthouseOptions(pageName)

  await playAudit({
    page,
    thresholds: lighthouseOptions.thresholds,
    reports: {
      formats: {
        html: true,
        json: true,
      },
      name: lighthouseOptions.reports.name,
      directory: lighthouseOptions.reports.directory,
    },
    port: 9222, // Default Chrome debugging port
  })
}

test.describe('Lighthouse Performance Tests - Critical Pages', () => {
  test.describe.configure({ mode: 'serial' })

  test('dashboard - performance audit', async () => {
    // Launch browser with remote debugging for Lighthouse
    const browser = await chromium.launch({
      args: ['--remote-debugging-port=9222'],
    })
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // Authenticate
      await authenticatePage(page)

      // Find dashboard page config
      const dashboardPage = CRITICAL_PAGES.find((p) => p.name === 'dashboard')
      if (!dashboardPage) {
        throw new Error('Dashboard page not found in CRITICAL_PAGES')
      }

      // Run audit
      await runLighthouseAudit(page, dashboardPage.name, dashboardPage.path)

      // If we get here, thresholds passed
      expect(true).toBe(true)
    } finally {
      await context.close()
      await browser.close()
    }
  })

  test('tasks list - performance audit', async () => {
    const browser = await chromium.launch({
      args: ['--remote-debugging-port=9222'],
    })
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // Authenticate
      await authenticatePage(page)

      // Find tasks page config
      const tasksPage = CRITICAL_PAGES.find((p) => p.name === 'tasks')
      if (!tasksPage) {
        throw new Error('Tasks page not found in CRITICAL_PAGES')
      }

      // Run audit
      await runLighthouseAudit(page, tasksPage.name, tasksPage.path)

      expect(true).toBe(true)
    } finally {
      await context.close()
      await browser.close()
    }
  })

  test('task detail - performance audit', async () => {
    const browser = await chromium.launch({
      args: ['--remote-debugging-port=9222'],
    })
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // Authenticate
      await authenticatePage(page)

      // Find task detail page config
      const taskDetailPage = CRITICAL_PAGES.find((p) => p.name === 'task-detail')
      if (!taskDetailPage) {
        throw new Error('Task detail page not found in CRITICAL_PAGES')
      }

      // Run audit
      await runLighthouseAudit(page, taskDetailPage.name, taskDetailPage.path)

      expect(true).toBe(true)
    } finally {
      await context.close()
      await browser.close()
    }
  })
})

test.describe('Lighthouse Performance Tests - Threshold Validation', () => {
  test('verify lighthouse thresholds are configured', () => {
    // Validate that thresholds are properly configured
    expect(LIGHTHOUSE_THRESHOLDS.performance).toBeGreaterThan(0)
    expect(LIGHTHOUSE_THRESHOLDS.accessibility).toBeGreaterThan(0)
    expect(LIGHTHOUSE_THRESHOLDS['best-practices']).toBeGreaterThan(0)
    expect(LIGHTHOUSE_THRESHOLDS.seo).toBeGreaterThan(0)

    // Validate critical pages are defined
    expect(CRITICAL_PAGES.length).toBeGreaterThan(0)
    expect(CRITICAL_PAGES.some((p) => p.name === 'dashboard')).toBe(true)
    expect(CRITICAL_PAGES.some((p) => p.name === 'tasks')).toBe(true)
    expect(CRITICAL_PAGES.some((p) => p.name === 'task-detail')).toBe(true)
  })

  test('verify performance metric thresholds', () => {
    // Import metrics to validate they exist
    const { PERFORMANCE_METRICS } = require('../../config/lighthouse.config')

    // Validate LCP threshold (should be ≤2.5s = 2500ms)
    expect(PERFORMANCE_METRICS.lcp.threshold).toBeLessThanOrEqual(2500)

    // Validate FCP threshold (should be ≤1.8s = 1800ms)
    expect(PERFORMANCE_METRICS.fcp.threshold).toBeLessThanOrEqual(1800)

    // Validate CLS threshold (should be ≤0.1)
    expect(PERFORMANCE_METRICS.cls.threshold).toBeLessThanOrEqual(0.1)

    // Validate TBT threshold (should be ≤200ms)
    expect(PERFORMANCE_METRICS.tbt.threshold).toBeLessThanOrEqual(200)

    // Validate TTI threshold (should be ≤3.8s = 3800ms)
    expect(PERFORMANCE_METRICS.tti.threshold).toBeLessThanOrEqual(3800)

    // Validate Speed Index threshold (should be ≤3.4s = 3400ms)
    expect(PERFORMANCE_METRICS.speedIndex.threshold).toBeLessThanOrEqual(3400)
  })
})

test.describe('Lighthouse Performance Tests - Report Generation', () => {
  test('verify report configuration', () => {
    const { REPORT_CONFIG } = require('../../config/lighthouse.config')

    // Validate report formats are configured
    expect(REPORT_CONFIG.formats.html).toBe(true)
    expect(REPORT_CONFIG.formats.json).toBe(true)

    // Validate report directory is set
    expect(REPORT_CONFIG.directory).toBeTruthy()
    expect(REPORT_CONFIG.directory).toContain('lighthouse')
  })
})
