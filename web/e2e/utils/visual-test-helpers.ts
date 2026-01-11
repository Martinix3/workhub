import { type Page } from '@playwright/test'

/**
 * Visual Test Helpers
 * Utilities for ensuring stable, consistent screenshots in visual regression tests
 */

/**
 * Hides dynamic content that can cause false positives in visual regression tests
 * Uses CSS injection to hide timestamps, avatars, loading indicators, and other volatile elements
 *
 * @param page - Playwright page instance
 * @example
 * await hideDynamicContent(page)
 * await expect(page).toHaveScreenshot('dashboard-stable.png')
 */
export async function hideDynamicContent(page: Page): Promise<void> {
  // Disable animations for stable screenshots
  await page.emulateMedia({ reducedMotion: 'reduce' })

  // Hide dynamic elements using CSS
  await page.addStyleTag({
    content: `
      /* Hide elements marked with data-dynamic attribute */
      [data-dynamic="timestamp"],
      [data-dynamic="avatar"],
      [data-dynamic="date"],
      [data-dynamic="time"],
      [data-dynamic="user-avatar"],
      [data-dynamic="profile-picture"],

      /* Hide common dynamic UI elements */
      .loading-spinner,
      .skeleton-loader,
      .shimmer,
      [role="progressbar"],

      /* Hide dynamic badges and counters */
      [data-dynamic="count"],
      [data-dynamic="badge"],
      .notification-badge,
      .unread-count,

      /* Hide live timestamps */
      time[datetime],
      .timestamp,
      .relative-time,
      .last-updated,

      /* Hide animated elements */
      .pulse,
      .animate-pulse,
      .animate-spin,
      .animate-bounce {
        visibility: hidden !important;
      }
    `
  })
}

/**
 * Disables animations and transitions for stable screenshots
 * Applies global CSS to disable all animations, transitions, and transforms
 *
 * @param page - Playwright page instance
 * @example
 * await disableAnimations(page)
 */
export async function disableAnimations(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' })

  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `
  })
}

/**
 * Waits for page to be in a stable state for screenshot capture
 * Ensures network is idle, fonts are loaded, and images are rendered
 *
 * @param page - Playwright page instance
 * @param options - Wait options
 * @example
 * await waitForStableState(page)
 * await expect(page).toHaveScreenshot('page.png')
 */
export async function waitForStableState(
  page: Page,
  options?: { timeout?: number }
): Promise<void> {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout: options?.timeout })

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready)

  // Additional small delay to ensure rendering is complete
  await page.waitForTimeout(100)
}

/**
 * Hides specific elements by selector for visual testing
 * Useful for hiding elements that are dynamic or change between test runs
 *
 * @param page - Playwright page instance
 * @param selectors - Array of CSS selectors to hide
 * @example
 * await hideElements(page, ['.user-avatar', '.live-timestamp'])
 */
export async function hideElements(
  page: Page,
  selectors: string[]
): Promise<void> {
  const selectorList = selectors.join(',\n')

  await page.addStyleTag({
    content: `
      ${selectorList} {
        visibility: hidden !important;
      }
    `
  })
}

/**
 * Prepares page for visual regression testing
 * Combines all stability helpers: hides dynamic content, disables animations, and waits for stable state
 *
 * @param page - Playwright page instance
 * @param options - Configuration options
 * @example
 * await prepareForVisualTest(page)
 * await expect(page).toHaveScreenshot('component.png')
 */
export async function prepareForVisualTest(
  page: Page,
  options?: {
    hideSelectors?: string[]
    timeout?: number
  }
): Promise<void> {
  // Disable animations first
  await disableAnimations(page)

  // Hide standard dynamic content
  await hideDynamicContent(page)

  // Hide additional custom elements if provided
  if (options?.hideSelectors && options.hideSelectors.length > 0) {
    await hideElements(page, options.hideSelectors)
  }

  // Wait for stable state
  await waitForStableState(page, { timeout: options?.timeout })
}
