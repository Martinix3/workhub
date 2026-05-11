# E2E Testing Troubleshooting Guide

**WorkHub - Playwright E2E Testing Infrastructure**
**Last Updated:** 2026-01-11
**Maintainer:** auto-claude
**Related Docs:** [Test Audit Report](./e2e-test-audit-report.md) | [Root Cause Analysis](./e2e-root-cause-analysis.md)

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Browser Installation Issues](#browser-installation-issues)
3. [Configuration Problems](#configuration-problems)
4. [Environment Setup Issues](#environment-setup-issues)
5. [Common Test Errors](#common-test-errors)
6. [Debugging Techniques](#debugging-techniques)
7. [Snapshot Update Guide](#snapshot-update-guide)
8. [Flaky Test Diagnosis](#flaky-test-diagnosis)
9. [CI/CD Issues](#cicd-issues)
10. [Performance Problems](#performance-problems)

---

## Quick Reference

### Most Common Issues

| Symptom | Quick Fix | Section |
|---------|-----------|---------|
| `Executable doesn't exist at...` | Run `npx playwright install --with-deps chromium` | [Browser Installation](#browser-installation-issues) |
| `Error: connect ECONNREFUSED localhost:5177` | Start dev server: `npm run dev` | [Dev Server](#dev-server-not-starting) |
| `VITE_FRAPPE_URL is not defined` | Check `.env` file | [Environment Variables](#missing-environment-variables) |
| Tests timeout after 30s | Increase timeout or check backend | [Timeouts](#timeout-errors) |
| Snapshot mismatch | Run with `--update-snapshots` flag | [Snapshots](#snapshot-update-guide) |
| Tests pass sometimes, fail others | See flaky test diagnosis | [Flaky Tests](#flaky-test-diagnosis) |
| `Cannot find module` in test file | Run `npm install` | [Dependencies](#missing-dependencies) |
| Port 5177 already in use | Kill existing process or change port | [Port Conflicts](#port-conflicts) |

### Emergency Commands

```bash
# Reset everything
cd ./web
rm -rf node_modules playwright-report test-results .last-run.json
npm install
npx playwright install --with-deps chromium

# Quick test run
npm run test:e2e -- --reporter=list

# Debug specific test
npm run test:e2e e2e/specs/auth.spec.ts -- --headed --debug

# View last test results
npx playwright show-report
```

---

## Browser Installation Issues

### Problem: Playwright browsers not installed

**Symptoms:**
```
Error: Executable doesn't exist at /Users/.../chromium-1234/chrome-mac/Chromium.app/Contents/MacOS/Chromium
```

**Solution 1: Install with system dependencies (RECOMMENDED)**
```bash
cd ./web
npx playwright install --with-deps chromium
```

**Why this works:**
- Installs Chromium browser binary
- Installs system dependencies (fonts, media codecs, etc.)
- Required for headed and headless mode

**Solution 2: Install all browsers**
```bash
npx playwright install --with-deps
```

**Solution 3: Check installation**
```bash
npx playwright --version
npx playwright install --dry-run
```

### Problem: Permission denied when installing

**Symptoms:**
```
EACCES: permission denied, mkdir '/Users/.../ms-playwright'
```

**Solutions:**
1. **Use npx (not global):** `npx playwright install` (not `playwright install`)
2. **Check directory permissions:**
   ```bash
   ls -la ~/Library/Caches/ms-playwright
   # Should be owned by your user
   ```
3. **Manual cleanup:**
   ```bash
   rm -rf ~/Library/Caches/ms-playwright
   npx playwright install --with-deps chromium
   ```

### Problem: Wrong browser version

**Symptoms:**
- Tests fail with "Browser closed unexpectedly"
- Version mismatch errors

**Solution:**
```bash
# Remove old browsers
rm -rf ~/Library/Caches/ms-playwright

# Reinstall matching package version
npm install @playwright/test@latest
npx playwright install --with-deps chromium
```

### Problem: System dependencies missing (Linux)

**Symptoms:**
```
Error: Host system is missing dependencies
libnss3.so.1: cannot open shared object file
```

**Solution (Ubuntu/Debian):**
```bash
sudo npx playwright install-deps chromium
```

**Solution (Other Linux):**
```bash
# Check what's missing
npx playwright install --dry-run chromium

# Install manually based on output
```

---

## Configuration Problems

### Problem: Dev server not starting

**Symptoms:**
```
Error: webServer command failed:
npm run dev exited with code 1
```

**Diagnosis:**
```bash
# Try starting server manually
cd ./web
npm run dev

# Check for errors in output
```

**Common Causes:**

1. **Port already in use:**
   ```bash
   # Find what's using port 5177
   lsof -i :5177

   # Kill the process
   kill -9 <PID>

   # Or change port in .env
   echo "WH_WEB_PORT=5178" >> .env
   ```

2. **Missing dependencies:**
   ```bash
   npm install
   ```

3. **Invalid Vite config:**
   ```bash
   # Check syntax
   cat vite.config.ts

   # Look for TypeScript errors
   npx tsc --noEmit
   ```

4. **Environment variables missing:**
   ```bash
   # Check required variables
   grep VITE_ .env

   # Should have:
   # VITE_FRAPPE_URL=http://localhost:8001
   # VITE_GOOGLE_CLIENT_ID=...
   # VITE_APP_MODE=development
   # VITE_ENABLE_AUTH_BYPASS=false
   ```

### Problem: Playwright config not loading

**Symptoms:**
```
Error: Cannot find module './playwright.config.ts'
```

**Solutions:**
1. **Verify file exists:**
   ```bash
   ls -la ./web/playwright.config.ts
   ```

2. **Check TypeScript compilation:**
   ```bash
   npx tsc --noEmit
   ```

3. **Check imports:**
   ```typescript
   // playwright.config.ts should have:
   import { defineConfig, devices } from '@playwright/test'
   ```

### Problem: Wrong baseURL or port

**Symptoms:**
- Tests try to connect to wrong URL
- 404 errors for all pages

**Diagnosis:**
```bash
# Check playwright.config.ts
grep baseURL playwright.config.ts
# Should be: baseURL: 'http://localhost:5177'

# Check webServer URL
grep "url:" playwright.config.ts
# Should match baseURL
```

**Solution:**
```typescript
// playwright.config.ts
const PORT = process.env.WH_WEB_PORT || '5177'

export default defineConfig({
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

---

## Environment Setup Issues

### Missing environment variables

**Symptoms:**
- Tests fail with "undefined" errors
- API calls fail
- Auth bypass doesn't work

**Required Variables:**
```bash
# ./web/.env
VITE_FRAPPE_URL=http://localhost:8001
VITE_GOOGLE_CLIENT_ID=your-client-id
VITE_APP_MODE=development
VITE_ENABLE_AUTH_BYPASS=false
```

**Diagnosis:**
```bash
cd ./web

# Check if .env exists
ls -la .env

# Check contents
cat .env | grep VITE_

# Compare with example
diff .env .env.example
```

**Solution:**
```bash
# Copy from example
cp .env.example .env

# Edit required values
nano .env
```

### Backend not running

**Symptoms:**
- Tests timeout waiting for API
- Login fails
- Data doesn't load

**Diagnosis:**
```bash
# Check if backend is accessible
curl http://localhost:8001/api/method/ping

# Should return JSON response
```

**Solution:**
```bash
# Start Frappe backend
cd /path/to/frappe-bench
bench start

# Verify it's running
curl http://localhost:8001
```

**Alternative (Mock Mode):**
```bash
# For tests that don't need backend
# Use auth bypass and mock data
VITE_ENABLE_AUTH_BYPASS=true npm run test:e2e
```

### Missing dependencies

**Symptoms:**
```
Cannot find module '@playwright/test'
Cannot find module './fixtures/auth.fixture'
```

**Solution:**
```bash
cd ./web
npm install

# Verify installation
npm list @playwright/test
npm list @axe-core/playwright
```

---

## Common Test Errors

### Timeout errors

**Symptom:**
```
Test timeout of 30000ms exceeded
```

**Causes & Solutions:**

1. **Backend not responding:**
   ```bash
   # Check backend health
   curl http://localhost:8001
   ```

2. **Slow page load:**
   ```typescript
   // In test file, increase timeout
   test('slow test', async ({ page }) => {
     test.setTimeout(60000) // 60 seconds
     // ... test code
   })
   ```

3. **Waiting for element that doesn't exist:**
   ```typescript
   // BAD: Will timeout if element missing
   await page.locator('#missing-element').click()

   // GOOD: Check if element exists first
   const element = page.locator('#missing-element')
   if (await element.isVisible()) {
     await element.click()
   }
   ```

4. **Network delays:**
   ```typescript
   // Wait for network to settle
   await page.waitForLoadState('networkidle')
   ```

### Selector not found

**Symptom:**
```
Error: Locator.click: Target closed
Error: Locator expected to be visible
```

**Diagnosis:**
```typescript
// Add debugging to test
const element = page.locator('[data-testid="my-button"]')
console.log('Is visible:', await element.isVisible())
console.log('Count:', await element.count())
await element.screenshot({ path: 'debug-element.png' })
```

**Common Causes:**

1. **Element doesn't exist:**
   - Check page HTML in browser
   - Verify selector syntax
   - Try simpler selector first

2. **Element not ready yet:**
   ```typescript
   // Wait for element
   await page.waitForSelector('[data-testid="my-button"]')
   await page.locator('[data-testid="my-button"]').click()
   ```

3. **Element behind overlay:**
   ```typescript
   // Wait for overlay to close
   await page.locator('.overlay').waitFor({ state: 'hidden' })
   await page.locator('[data-testid="my-button"]').click()
   ```

4. **Selector changed (CSS classes):**
   - **Never use CSS classes!** They change frequently
   - Use `data-testid` attributes instead
   - See [Root Cause Analysis](./e2e-root-cause-analysis.md#root-cause-1-fragile-selector-strategy)

### Authentication failures

**Symptom:**
- Tests redirect to login page
- "Access denied" errors
- Session not persisting

**Diagnosis:**
```typescript
// Check if auth fixture is being used
import { test, expect } from '../fixtures/auth.fixture'
//                              ^^^^^^^^^ Must import from fixture!

test('authenticated test', async ({ authenticatedPage }) => {
  //                                 ^^^^^^^^^^^^^^^^^^^ Must use fixture
  // Test code
})
```

**Solutions:**

1. **Use auth fixture:**
   ```typescript
   // CORRECT
   import { test, expect } from '../fixtures/auth.fixture'

   test('my test', async ({ authenticatedPage }) => {
     await authenticatedPage.goto('/dashboard')
     // Already authenticated!
   })
   ```

2. **Check auth bypass is enabled:**
   ```bash
   # In .env
   VITE_ENABLE_AUTH_BYPASS=false  # Must be false or true, not missing
   ```

3. **Manual login if needed:**
   ```typescript
   import { LoginPage } from '../pages/login.page'

   test('manual login', async ({ page }) => {
     const loginPage = new LoginPage(page)
     await loginPage.goto('/login')
     await loginPage.bypassLogin()
     // Now authenticated
   })
   ```

### TypeScript errors

**Symptom:**
```
error TS2307: Cannot find module '../fixtures/auth.fixture'
error TS2304: Cannot find name 'expect'
```

**Solution:**
```bash
# Run pretest check
npm run pretest:e2e

# Fix TypeScript errors before running tests
npx tsc --noEmit

# Check tsconfig includes test files
cat tsconfig.json | grep -A5 "include"
```

---

## Debugging Techniques

### Run tests in headed mode

**See what the browser is doing:**
```bash
npm run test:e2e -- --headed
```

**Benefits:**
- Visual feedback
- See actual UI interactions
- Easier to debug timing issues

### Run single test file

**Faster iteration:**
```bash
npm run test:e2e e2e/specs/auth.spec.ts
```

**Run specific test:**
```bash
npm run test:e2e -- --grep "can login"
```

### Use Playwright Inspector

**Step through tests:**
```bash
npm run test:e2e -- --debug
```

**Features:**
- Pause before each action
- Inspect DOM at each step
- Try selectors in inspector
- See network requests

### Add console logs

**Temporary debugging:**
```typescript
test('debug test', async ({ page }) => {
  console.log('Starting test')

  await page.goto('/dashboard')
  console.log('URL:', page.url())

  const element = page.locator('[data-testid="my-button"]')
  console.log('Element visible:', await element.isVisible())
  console.log('Element count:', await element.count())

  await element.click()
  console.log('Clicked successfully')
})
```

### Take screenshots

**Visual debugging:**
```typescript
test('screenshot test', async ({ page }) => {
  await page.goto('/dashboard')

  // Full page screenshot
  await page.screenshot({ path: 'dashboard.png', fullPage: true })

  // Element screenshot
  await page.locator('#content').screenshot({ path: 'content.png' })
})
```

**Automatic screenshots:**
```typescript
// playwright.config.ts already configured:
use: {
  screenshot: 'only-on-failure',  // Auto screenshot on failure
  video: 'on-first-retry',         // Video on retry
  trace: 'on-first-retry',         // Full trace on retry
}
```

### Use trace viewer

**After test failure:**
```bash
npm run test:e2e

# If test fails and retries, trace is saved
npx playwright show-trace test-results/*/trace.zip
```

**Features:**
- See every action
- Network requests
- Console logs
- DOM snapshots
- Screenshots

### Check test artifacts

**Find test results:**
```bash
cd ./web

# Screenshots
ls test-results/*/test-failed-*.png

# Videos
ls test-results/*/*.webm

# Traces
ls test-results/*/trace.zip

# View HTML report
npx playwright show-report
```

### Enable verbose logging

**More detailed output:**
```bash
DEBUG=pw:api npm run test:e2e
```

**Playwright internal logs:**
```bash
DEBUG=pw:* npm run test:e2e
```

---

## Snapshot Update Guide

### Understanding snapshot tests

**What are snapshots?**
- Visual screenshots of UI components
- Stored as PNG files
- Compared pixel-by-pixel on each test run

**When to update:**
- ✅ Intentional UI changes
- ✅ Layout improvements
- ✅ Styling updates
- ❌ **Not** for random changes
- ❌ **Not** without reviewing diff

### Check snapshot status

**Current snapshot tests:**
```bash
cd ./web
grep -r "toHaveScreenshot" e2e/specs/

# Currently in tasks.spec.ts:
# - My Day view snapshot
# - Projects view snapshot
# - Kanban view snapshot
# - Dashboard snapshot
```

**Note:** All snapshot tests are currently skipped with `test.skip()` due to data variability (dynamic dates, counts, user info).

### Update snapshots

**Method 1: Update all snapshots**
```bash
npm run test:e2e -- --update-snapshots
```

**Method 2: Update specific spec**
```bash
npm run test:e2e e2e/specs/tasks.spec.ts -- --update-snapshots
```

**Method 3: Interactive mode**
```bash
npm run test:e2e -- --headed --update-snapshots
# Watch as snapshots are updated
```

### Review snapshot changes

**Before committing:**
```bash
# View changed files
git status

# View PNG diffs (if you have image diff tool)
git diff test-results/

# Check file sizes (should be reasonable)
ls -lh e2e/specs/__screenshots__/
```

**Snapshot best practices:**
1. **Review visual diff** - Don't blindly accept changes
2. **Test in multiple browsers** - If using multiple projects
3. **Consider data variability** - Dynamic content may cause false failures
4. **Document why updated** - In commit message

### Dealing with flaky snapshots

**Symptoms:**
- Snapshots fail intermittently
- Pixel differences in dynamic content

**Solutions:**

1. **Mask dynamic content:**
   ```typescript
   await expect(page).toHaveScreenshot({
     mask: [
       page.locator('.timestamp'),
       page.locator('.user-avatar'),
       page.locator('.dynamic-count'),
     ],
   })
   ```

2. **Set threshold for minor differences:**
   ```typescript
   await expect(page).toHaveScreenshot({
     maxDiffPixels: 100,  // Allow 100 pixels to differ
   })
   ```

3. **Wait for animations to complete:**
   ```typescript
   // Wait for animations
   await page.waitForTimeout(300)

   // Or wait for CSS
   await page.waitForFunction(() => {
     const element = document.querySelector('.animated')
     return getComputedStyle(element).animationPlayState === 'finished'
   })

   await expect(page).toHaveScreenshot()
   ```

4. **Skip snapshot tests for dynamic pages:**
   ```typescript
   // If page has too much dynamic content
   test.skip('snapshot test', async ({ page }) => {
     // Test skipped - data too variable
   })
   ```

### Alternative: Component snapshots

**Instead of full page snapshots:**
```typescript
// Snapshot specific component (more stable)
await expect(page.locator('#header')).toHaveScreenshot('header.png')
await expect(page.locator('#footer')).toHaveScreenshot('footer.png')
```

**Benefits:**
- Less affected by dynamic content elsewhere
- Faster to compare
- Easier to debug differences

---

## Flaky Test Diagnosis

### What are flaky tests?

**Definition:** Tests that pass sometimes and fail other times without code changes.

**Why flaky tests are bad:**
- Reduce confidence in test suite
- Waste developer time investigating
- Hide real bugs
- Block CI/CD pipelines

### Identifying flaky tests

**Method 1: Run multiple times**
```bash
# Run same test 10 times
for i in {1..10}; do
  echo "Run $i"
  npm run test:e2e e2e/specs/auth.spec.ts
done
```

**Method 2: Check test history**
```bash
# In CI, check historical pass rates
# Look for tests that fail ~20-50% of time
```

**Method 3: Playwright test runner**
```bash
# Run tests with retries
npm run test:e2e -- --retries=3

# Check which tests needed retries
npx playwright show-report
# Look for tests with orange/yellow indicators
```

### Common causes of flaky tests

#### 1. Race conditions

**Problem:** Test runs faster than app

**Example:**
```typescript
// FLAKY: Button might not be ready
await page.click('[data-testid="submit"]')

// STABLE: Wait for button to be ready
await page.locator('[data-testid="submit"]').waitFor({ state: 'visible' })
await page.locator('[data-testid="submit"]').click()
```

**Better:**
```typescript
// Playwright's auto-waiting (best)
await page.locator('[data-testid="submit"]').click()
// Automatically waits for visible, stable, enabled
```

#### 2. Network timing

**Problem:** API calls take variable time

**Example:**
```typescript
// FLAKY: Might check before data loads
await page.goto('/dashboard')
await expect(page.locator('.task')).toHaveCount(5)

// STABLE: Wait for network
await page.goto('/dashboard')
await page.waitForLoadState('networkidle')
await expect(page.locator('.task')).toHaveCount(5)
```

#### 3. Animations and transitions

**Problem:** Clicking during animation

**Example:**
```typescript
// FLAKY: Element might be moving
await page.click('.modal-button')

// STABLE: Wait for animations
await page.locator('.modal').waitFor({ state: 'visible' })
await page.waitForTimeout(300) // Wait for animation
await page.click('.modal-button')
```

**Better (if possible):**
```typescript
// Disable animations in test environment
// In app code:
if (import.meta.env.MODE === 'test') {
  document.body.classList.add('no-animations')
}

// In CSS:
.no-animations * {
  animation-duration: 0s !important;
  transition-duration: 0s !important;
}
```

#### 4. Force clicks (CRITICAL)

**Problem:** Bypassing Playwright's actionability checks

**Example:**
```typescript
// FLAKY & DANGEROUS
await page.click('[data-testid="button"]', { force: true })
// Clicks even if button is:
// - Hidden
// - Behind overlay
// - Disabled
// - Moving
```

**Solution:**
```typescript
// Remove force: true
await page.click('[data-testid="button"]')

// If it fails, fix the app or test logic
// Don't force it!
```

**Why force clicks are bad:**
- Tests pass when feature is actually broken
- Creates false confidence
- Masks real UI issues

See [Root Cause Analysis](./e2e-root-cause-analysis.md#root-cause-2-timing-issues-and-race-conditions) for more details.

#### 5. Arbitrary timeouts

**Problem:** Fixed waits are unreliable

**Example:**
```typescript
// FLAKY: Might be too short or too long
await page.waitForTimeout(1000)
await page.click('.button')
```

**Solution:**
```typescript
// STABLE: Wait for condition
await page.locator('.button').waitFor({ state: 'visible' })
await page.click('.button')

// Or wait for network
await page.waitForLoadState('networkidle')
```

#### 6. Shared test state

**Problem:** Tests affect each other

**Example:**
```typescript
// FLAKY: Tests share authentication state
test('test 1', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('[data-testid="logout"]')
  // Next test might fail!
})

test('test 2', async ({ page }) => {
  await page.goto('/dashboard')
  // Might be logged out from test 1
})
```

**Solution:**
```typescript
// Use fixtures for isolation
import { test } from '../fixtures/auth.fixture'

test('test 1', async ({ authenticatedPage }) => {
  // Fresh auth state for each test
})

test('test 2', async ({ authenticatedPage }) => {
  // Independent auth state
})
```

### Fixing flaky tests

**Step-by-step process:**

1. **Reproduce locally:**
   ```bash
   # Run test many times
   for i in {1..20}; do npm run test:e2e path/to/test.spec.ts; done
   ```

2. **Run in headed mode:**
   ```bash
   npm run test:e2e path/to/test.spec.ts -- --headed
   # Watch for timing issues
   ```

3. **Add debugging:**
   ```typescript
   test('flaky test', async ({ page }) => {
     await page.goto('/page')

     // Add screenshot before flaky action
     await page.screenshot({ path: 'before.png' })

     const element = page.locator('[data-testid="button"]')
     console.log('Visible:', await element.isVisible())
     console.log('Enabled:', await element.isEnabled())

     await element.click()
   })
   ```

4. **Identify root cause:**
   - Race condition? → Add proper waits
   - Force click? → Remove it
   - Arbitrary timeout? → Replace with condition
   - Shared state? → Use fixtures

5. **Apply fix and verify:**
   ```bash
   # Run 50 times to verify fix
   for i in {1..50}; do npm run test:e2e path/to/test.spec.ts; done
   ```

### Quarantine flaky tests

**If you can't fix immediately:**

```typescript
// Mark as flaky
test.describe.configure({ retries: 3 })

test('known flaky test', async ({ page }) => {
  // Test code
})

// Or skip temporarily
test.skip('flaky test - TODO: fix race condition', async ({ page }) => {
  // Test code
})
```

**Create tracking issue:**
```markdown
## Flaky Test: "can submit order"

**File:** `e2e/specs/orders.spec.ts`
**Failure rate:** ~30%
**Root cause:** Race condition between modal animation and button click
**Solution:** Remove force click, add animation wait
**Priority:** P1
```

---

## CI/CD Issues

### Tests pass locally, fail in CI

**Common causes:**

1. **Different environment:**
   ```bash
   # CI uses different env vars
   # Check CI environment matches local
   ```

2. **CI mode differences:**
   ```typescript
   // playwright.config.ts
   retries: process.env.CI ? 2 : 0,  // More retries in CI
   workers: process.env.CI ? 1 : undefined,  // Sequential in CI
   ```

3. **Slower CI machines:**
   ```typescript
   // Increase timeouts for CI
   timeout: process.env.CI ? 60000 : 30000
   ```

4. **Reusing existing server:**
   ```typescript
   // playwright.config.ts
   webServer: {
     reuseExistingServer: !process.env.CI,  // Never reuse in CI
   }
   ```

### CI not finding browsers

**GitHub Actions example:**
```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium
  working-directory: ./web

- name: Run E2E tests
  run: npm run test:e2e
  working-directory: ./web
```

**Important:**
- Always install browsers in CI
- Use `--with-deps` flag
- Cache browsers if possible

### CI artifacts not saved

**GitHub Actions example:**
```yaml
- name: Upload test artifacts
  if: always()  # Upload even if tests fail
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: web/playwright-report/
    retention-days: 30

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: web/test-results/
    retention-days: 7
```

---

## Performance Problems

### Tests taking too long

**Diagnosis:**
```bash
# Run with list reporter to see timing
npm run test:e2e -- --reporter=list

# HTML report shows timing breakdown
npx playwright show-report
```

**Solutions:**

1. **Run in parallel:**
   ```typescript
   // playwright.config.ts
   fullyParallel: true,  // Run tests in parallel
   workers: process.env.CI ? 1 : undefined,  // Use all cores locally
   ```

2. **Reduce unnecessary waits:**
   ```typescript
   // BAD
   await page.waitForTimeout(5000)

   // GOOD
   await page.waitForLoadState('networkidle')
   ```

3. **Optimize fixtures:**
   ```typescript
   // Reuse authenticated state
   // Don't login for every test
   ```

4. **Skip slow tests in development:**
   ```typescript
   test.skip('slow visual regression test', async ({ page }) => {
     // Only run in CI
   })
   ```

### High memory usage

**Symptoms:**
- Tests crash with out-of-memory
- CI runs out of resources

**Solutions:**

1. **Limit workers:**
   ```typescript
   // playwright.config.ts
   workers: process.env.CI ? 1 : 2,  // Fewer workers = less memory
   ```

2. **Close pages explicitly:**
   ```typescript
   test('test', async ({ page }) => {
     // Test code
     await page.close()  // Explicit cleanup
   })
   ```

3. **Limit trace/video recording:**
   ```typescript
   // playwright.config.ts
   use: {
     trace: 'on-first-retry',  // Not 'on' (saves disk/memory)
     video: 'on-first-retry',   // Not 'on'
   }
   ```

---

## Getting Help

### Check documentation first

1. **This guide** - Common issues and solutions
2. [Test Audit Report](./e2e-test-audit-report.md) - Current test suite status
3. [Root Cause Analysis](./e2e-root-cause-analysis.md) - Known issues and fixes
4. [Playwright Documentation](https://playwright.dev/docs/intro) - Official docs

### Gather information before asking

**Minimum info needed:**

1. **Error message:**
   ```bash
   npm run test:e2e -- --reporter=list 2>&1 | tee error.log
   ```

2. **Test file and line number:**
   ```
   e2e/specs/auth.spec.ts:45:7
   ```

3. **Environment:**
   ```bash
   node --version
   npm list @playwright/test
   cat .env | grep VITE_
   ```

4. **Screenshot or video:**
   ```bash
   npm run test:e2e -- --headed
   # Or check test-results/
   ```

5. **What you tried:**
   - Reinstalled browsers?
   - Checked environment variables?
   - Ran in headed mode?

### Useful debugging commands

```bash
# Full diagnostic report
cd ./web

echo "=== Node Version ==="
node --version

echo "=== Playwright Version ==="
npx playwright --version

echo "=== Environment Variables ==="
cat .env | grep VITE_

echo "=== Package.json Scripts ==="
cat package.json | grep -A10 '"scripts"'

echo "=== Recent Test Results ==="
ls -lt test-results/ | head -5

echo "=== Dev Server Status ==="
lsof -i :5177

echo "=== Backend Status ==="
curl -I http://localhost:8001
```

---

## Appendix A: Selector Strategy

**Priority order for selectors:**

1. **data-testid** (BEST)
   ```typescript
   page.locator('[data-testid="submit-button"]')
   ```

2. **ARIA roles** (GOOD)
   ```typescript
   page.locator('button[role="submit"]')
   page.getByRole('button', { name: 'Submit' })
   ```

3. **User-facing text** (OK for buttons)
   ```typescript
   page.getByText('Submit')
   page.locator('button:has-text("Submit")')
   ```

4. **CSS classes** (NEVER USE)
   ```typescript
   // ❌ BAD: Will break on refactoring
   page.locator('.btn.btn-primary.btn-lg')
   ```

5. **XPath** (NEVER USE)
   ```typescript
   // ❌ BAD: Will break on structure changes
   page.locator('//div[3]/button[1]')
   ```

See [Root Cause Analysis](./e2e-root-cause-analysis.md#root-cause-1-fragile-selector-strategy) for more details.

---

## Appendix B: Test Patterns

### DO ✅

```typescript
// Use fixtures for authentication
import { test, expect } from '../fixtures/auth.fixture'

test('use fixture', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard')
})

// Wait for conditions, not arbitrary time
await page.locator('[data-testid="button"]').waitFor({ state: 'visible' })
await page.locator('[data-testid="button"]').click()

// Use data-testid selectors
await page.locator('[data-testid="submit"]').click()

// Use Playwright's auto-waiting
await page.click('[data-testid="button"]')
// Automatically waits for visible, stable, enabled

// Make meaningful assertions
await expect(page.locator('[data-testid="title"]')).toHaveText('Dashboard')
```

### DON'T ❌

```typescript
// Don't use force clicks
await page.click('[data-testid="button"]', { force: true })

// Don't use arbitrary timeouts
await page.waitForTimeout(1000)

// Don't use CSS class selectors
await page.click('.btn-primary')

// Don't use XPath
await page.click('//div[3]/button')

// Don't use defensive assertions
expect(taskCount > 0 || hasEmptyState || hasError).toBe(true)

// Don't manually implement login
async function login(page) { ... }
```

---

## Appendix C: Quick Reference Links

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Debugging](https://playwright.dev/docs/debug)
- [Playwright Selectors](https://playwright.dev/docs/selectors)
- [Playwright Assertions](https://playwright.dev/docs/test-assertions)
- [Test Audit Report](./e2e-test-audit-report.md)
- [Root Cause Analysis](./e2e-root-cause-analysis.md)

---

**Document Status:** ✅ COMPLETED
**Created By:** auto-claude (subtask-4-2)
**Last Updated:** 2026-01-11
**Next Steps:** See [Test Audit Report](./e2e-test-audit-report.md) for current status

---

**End of Troubleshooting Guide**
