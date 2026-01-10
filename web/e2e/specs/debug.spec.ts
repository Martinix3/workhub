import { test, expect } from '@playwright/test';

test('debug dashboard', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`CONSOLE ERROR: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(`PAGE ERROR: ${error.message}`);
  });

  // Go to login page first
  await page.goto('http://localhost:5177/');
  await page.waitForLoadState('networkidle');

  // Click on bypass button if we're on login page
  const bypassButton = page.getByText('Revisar UI (sin backend)');
  if (await bypassButton.isVisible()) {
    await bypassButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  }

  // Now go to dashboard
  await page.goto('http://localhost:5177/tareas/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: '/tmp/debug_dashboard.png', fullPage: true });

  // Get body text
  const bodyText = await page.locator('body').innerText();
  console.log('Body text length:', bodyText.length);
  console.log('Body text preview:', bodyText.substring(0, 1000));

  // Log errors
  if (errors.length > 0) {
    console.log('=== ERRORS FOUND ===');
    errors.forEach(e => console.log(e));
  }

  // Check if page has content
  expect(bodyText.length).toBeGreaterThan(50);
});
