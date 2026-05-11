import { defineConfig, devices } from '@playwright/test'

const PORT = process.env.WH_WEB_PORT || 5177
const BASE_URL = process.env.WH_BASE_URL || `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  timeout: 30 * 1000,

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    expect: {
      timeout: 5 * 1000,
    },
  },

  // Visual regression screenshot defaults
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100, // Allow up to 100 pixels difference for component tests
    },
  },

  projects: [
    // Desktop Chrome - runs all tests
    // Responsive tests handle their own viewports via test.use()
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Desktop Firefox - cross-browser testing
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // Desktop Safari (WebKit) - cross-browser testing
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
