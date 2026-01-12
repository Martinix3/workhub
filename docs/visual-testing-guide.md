# Visual Regression Testing Guide

## Overview

WorkHub uses **Playwright Visual Regression Testing** to catch visual bugs before they reach production. The system captures pixel-perfect screenshots of components, pages, and user flows across multiple browsers and viewports, automatically comparing them against baseline images.

**Key Features:**
- ✅ 100+ visual regression tests (components, pages, flows)
- ✅ Cross-browser testing (Chromium, Firefox, WebKit)
- ✅ Responsive testing (9 viewport sizes: mobile, tablet, desktop)
- ✅ Performance testing (Lighthouse CI for LCP, FCP, CLS metrics)
- ✅ CI/CD integration (GitHub Actions with PR blocking)
- ✅ Automated screenshot diff reports

## Quick Start

### Running Visual Tests

```bash
# From web directory
cd web

# Run all visual regression tests
npm run test:visual

# Run specific test file
npm run test:visual -- e2e/visual/components/buttons.visual.spec.ts

# Run in specific browser
npm run test:visual -- --project=firefox

# Run in debug mode (opens browser)
npm run test:visual -- --debug

# Run in headed mode (see browser)
npm run test:visual -- --headed
```

### First Run - Generating Baselines

The first time you run visual tests, Playwright will automatically generate baseline screenshots:

```bash
# Generate all baseline screenshots (first run)
npm run test:visual -- --update-snapshots
```

This creates baseline images in `e2e/visual/` directories (per-test-file snapshots following Playwright convention).

**Expected output:**
- ~300-500 baseline screenshots across all browsers and viewports
- Execution time: ~10 minutes with parallel workers
- Files stored in: `e2e/visual/**/*-snapshots/`

## Baseline Management

### When to Update Baselines

Update baselines when you have **intentional visual changes** that should become the new "golden" standard:

**✅ Update baselines for:**
- New UI features or components
- Approved design changes
- Layout improvements
- Color scheme updates
- Typography changes
- Spacing/padding adjustments

**❌ Don't update baselines for:**
- Failing tests due to bugs
- Unintended visual regressions
- Random failures (investigate first)

### How to Update Baselines

#### Option 1: Update All Baselines

```bash
# Update all screenshots across all tests
npm run test:visual -- --update-snapshots
```

⚠️ **Warning:** This updates ALL baseline screenshots. Use with caution.

#### Option 2: Update Specific Test File

```bash
# Update only button component baselines
npm run test:visual -- --update-snapshots e2e/visual/components/buttons.visual.spec.ts

# Update only dashboard page baselines
npm run test:visual -- --update-snapshots e2e/visual/pages/dashboard.visual.spec.ts
```

**Recommended approach:** Update baselines for specific test files to avoid accidentally approving unintended changes.

#### Option 3: Update Specific Browser

```bash
# Update baselines only for Firefox
npm run test:visual -- --update-snapshots --project=firefox
```

### Baseline Update Workflow

**Step-by-step process for updating baselines:**

1. **Make your UI changes** (code, styles, etc.)

2. **Run visual tests** to see what changed:
   ```bash
   npm run test:visual
   ```

3. **Review the diffs** (see "Understanding Screenshot Diffs" section below)

4. **If changes are intentional**, update baselines for that specific test:
   ```bash
   npm run test:visual -- --update-snapshots e2e/visual/components/buttons.visual.spec.ts
   ```

5. **Re-run tests** to confirm they pass:
   ```bash
   npm run test:visual
   ```

6. **Commit updated baselines** with a clear message:
   ```bash
   git add e2e/visual/
   git commit -m "visual: update button baselines for new primary color"
   ```

### Reviewing Baseline Changes Before Committing

Before committing updated baselines, review what changed:

```bash
# See which baseline files changed
git status

# Review specific baseline changes (if text-based)
git diff e2e/visual/

# Check file sizes (large changes might indicate issues)
du -sh e2e/visual/**/*-snapshots/
```

**Best practice:** Take screenshots of the "before" and "after" states and attach them to your PR for team review.

## Understanding Screenshot Diffs

### When Tests Fail

When a visual regression is detected, Playwright generates **diff images** showing exactly what changed:

```
e2e/visual/components/
  buttons.visual.spec.ts-snapshots/
    button-primary-default-chromium.png          ← Baseline (expected)
    button-primary-default-chromium-actual.png   ← Current (what test captured)
    button-primary-default-chromium-diff.png     ← Diff (highlights differences)
```

### Interpreting Diff Images

**Diff images use colors to highlight changes:**
- **Red:** Pixels removed (only in baseline)
- **Green:** Pixels added (only in current)
- **Yellow:** Pixels changed (different color/intensity)
- **White/Gray:** Pixels unchanged (match baseline)

### Viewing Diffs

#### Option 1: Playwright HTML Report

```bash
# Generate and open HTML report with diffs
npx playwright show-report
```

The HTML report shows:
- Side-by-side comparison (baseline vs actual)
- Diff image with highlighted changes
- Clickable images to zoom in
- Test failure details

#### Option 2: Manual File Inspection

Open diff images directly:
```bash
# macOS
open e2e/visual/components/buttons.visual.spec.ts-snapshots/*-diff.png

# Linux
xdg-open e2e/visual/components/buttons.visual.spec.ts-snapshots/*-diff.png
```

### Common Visual Regression Patterns

| Diff Pattern | Likely Cause | Action |
|--------------|--------------|--------|
| Entire component shifted | Layout change, margin/padding issue | Check CSS, flexbox, grid changes |
| Color differences | Theme change, CSS variable update | Review color palette changes |
| Font rendering | Font loading, weight change | Check font-face definitions |
| Missing elements | Element not rendered, visibility issue | Check component logic, conditional rendering |
| Extra elements | New feature, z-index overlap | Review component additions |
| Blurry differences | Animation mid-frame, timing issue | Check for animations, add wait states |

## Troubleshooting

### False Positives (Flaky Tests)

**Symptoms:** Tests fail intermittently without actual visual changes.

**Common causes and solutions:**

#### 1. Dynamic Content (Timestamps, Avatars, Loading Spinners)

**Problem:** Elements with dynamic content (dates, user avatars, loading indicators) change between runs.

**Solution:** Use the `prepareForVisualTest()` helper to hide dynamic content:

```typescript
import { prepareForVisualTest } from '../utils/visual-test-helpers'

test('dashboard snapshot', async ({ page }) => {
  await page.goto('/dashboard')

  // Hide timestamps, avatars, loading indicators
  await prepareForVisualTest(page)

  await expect(page).toHaveScreenshot('dashboard.png')
})
```

**Alternative:** Use `stylePath` option to apply global CSS:

```typescript
await expect(page).toHaveScreenshot('dashboard.png', {
  stylePath: 'e2e/config/screenshot.css'
})
```

The `screenshot.css` file hides common dynamic elements:
- `[data-dynamic="timestamp"]`
- `[data-dynamic="avatar"]`
- `.loading-spinner`
- `.toast` (notifications)

**Best practice:** Add `data-dynamic="timestamp"` attributes to dynamic elements in your source code for easy targeting.

#### 2. Animations and Transitions

**Problem:** CSS animations or transitions captured mid-frame cause inconsistent screenshots.

**Solution:** Disable animations before taking screenshots:

```typescript
import { disableAnimations } from '../utils/visual-test-helpers'

test('button hover state', async ({ page }) => {
  await page.goto('/components/buttons')

  // Disable all animations
  await disableAnimations(page)

  const button = page.locator('[data-testid="button-primary"]')
  await button.hover()

  await expect(button).toHaveScreenshot('button-hover.png')
})
```

The `disableAnimations()` helper:
- Uses `page.emulateMedia({ reducedMotion: 'reduce' })`
- Sets `animation-duration: 0s !important`
- Sets `transition-duration: 0s !important`

#### 3. Font Loading Issues

**Problem:** Custom fonts not fully loaded, causing text rendering differences.

**Solution:** Wait for stable page state before screenshots:

```typescript
import { waitForStableState } from '../utils/visual-test-helpers'

test('typography showcase', async ({ page }) => {
  await page.goto('/typography')

  // Wait for fonts, images, network idle
  await waitForStableState(page)

  await expect(page).toHaveScreenshot('typography.png')
})
```

The `waitForStableState()` helper waits for:
- `networkidle` (no network activity for 500ms)
- Document fonts loaded (`document.fonts.ready`)
- Images loaded (`complete` state)

#### 4. Timing Issues (Race Conditions)

**Problem:** Elements not fully rendered before screenshot capture.

**Solution:** Add explicit waits for specific elements:

```typescript
test('modal dialog', async ({ page }) => {
  await page.goto('/dashboard')

  // Open modal
  await page.click('[data-testid="open-modal"]')

  // Wait for modal to be visible AND stable
  const modal = page.locator('[role="dialog"]')
  await modal.waitFor({ state: 'visible' })
  await page.waitForTimeout(100) // Allow for animation

  await expect(modal).toHaveScreenshot('modal-open.png')
})
```

**Recommended waits:**
```typescript
// Wait for element visibility
await element.waitFor({ state: 'visible' })

// Wait for network idle
await page.waitForLoadState('networkidle')

// Wait for specific element
await page.locator('h1').waitFor()

// Explicit timeout (last resort, use sparingly)
await page.waitForTimeout(100)
```

#### 5. Browser-Specific Rendering Differences

**Problem:** Same component renders differently across browsers (font rendering, scrollbars, shadows).

**Solution:** Use browser-specific baselines (Playwright does this automatically):

```typescript
test('cross-browser button', async ({ page, browserName }) => {
  await page.goto('/components/buttons')

  // Playwright automatically creates separate baselines per browser:
  // - button-chromium.png
  // - button-firefox.png
  // - button-webkit.png
  await expect(page).toHaveScreenshot(`button-${browserName}.png`)
})
```

**Expected differences:**
- **Chromium:** Most accurate, default browser
- **Firefox:** Slightly different font rendering, scrollbar styles
- **WebKit:** Safari-specific rendering, button styles

**Tip:** If differences are too large, adjust threshold per-browser:

```typescript
const threshold = browserName === 'webkit' ? 200 : 100

await expect(page).toHaveScreenshot('component.png', {
  maxDiffPixels: threshold
})
```

### Adjusting Comparison Thresholds

**Default thresholds** (configured in `playwright.config.ts`):
- **Components:** `maxDiffPixels: 100` (up to 100 pixels can differ)
- **Pages:** `maxDiffPixelRatio: 0.01` (up to 1% of pixels can differ)
- **Charts:** `maxDiffPixels: 500` (charts have more variance)

**When to adjust thresholds:**

#### Too Strict (False Positives)

If tests fail for minor, acceptable differences:

```typescript
// Increase threshold for this specific test
await expect(page).toHaveScreenshot('complex-chart.png', {
  maxDiffPixels: 500, // Allow more variance for charts
})
```

#### Too Loose (False Negatives)

If tests pass when they shouldn't:

```typescript
// Decrease threshold for critical components
await expect(button).toHaveScreenshot('critical-button.png', {
  maxDiffPixels: 50, // Stricter threshold
})
```

**Threshold guidelines:**
- **Strict (0-50 pixels):** Critical components (buttons, logos, icons)
- **Normal (50-200 pixels):** Standard components (cards, forms, tables)
- **Loose (200-500 pixels):** Complex components (charts, maps, dynamic grids)
- **Very loose (0.01-0.05 ratio):** Full pages with lots of content

### Debugging Flaky Tests

**Step-by-step debugging process:**

1. **Run test 10 times** to confirm flakiness:
   ```bash
   for i in {1..10}; do npm run test:visual -- buttons.visual.spec.ts; done
   ```

2. **Enable trace recording** for detailed debugging:
   ```bash
   npm run test:visual -- --trace=on buttons.visual.spec.ts
   ```

3. **Open trace viewer** to see exact timing:
   ```bash
   npx playwright show-trace trace.zip
   ```

4. **Check for:**
   - Network requests still loading
   - Animations mid-frame
   - Fonts not loaded
   - Dynamic content changing

5. **Add appropriate waits** (see solutions above)

6. **Re-test 10 times** to confirm fix

### Test Execution Time Too Long

**Problem:** Visual tests take longer than 10 minutes.

**Solutions:**

#### Option 1: Run Tests in Parallel (Default)

```bash
# Specify number of workers (default: 50% of CPU cores)
npm run test:visual -- --workers=4
```

#### Option 2: Run Specific Test Suites

```bash
# Run only component tests
npm run test:visual -- e2e/visual/components/

# Run only critical pages
npm run test:visual -- e2e/visual/pages/dashboard.visual.spec.ts e2e/visual/pages/tasks.visual.spec.ts
```

#### Option 3: Skip Non-Critical Viewports

For faster feedback during development, test only desktop:

```typescript
// In your test file, comment out mobile/tablet viewports temporarily
const viewports = [
  // { name: 'mobile-small', width: 375, height: 667 },
  // { name: 'tablet-small', width: 768, height: 1024 },
  { name: 'desktop-hd', width: 1280, height: 720 },
]
```

**Remember:** Always run full suite before committing!

## Lighthouse CI Performance Testing

### Overview

**Lighthouse CI** tracks visual performance metrics for critical pages:
- **LCP (Largest Contentful Paint):** When main content loads
- **FCP (First Contentful Paint):** When first content appears
- **CLS (Cumulative Layout Shift):** Visual stability (no jumping content)
- **TBT (Total Blocking Time):** Interactivity delay
- **TTI (Time to Interactive):** When page becomes fully interactive
- **Speed Index:** How quickly content is visually displayed

### Running Performance Tests

```bash
# Run Lighthouse tests on all critical pages
npx playwright test e2e/visual/performance/lighthouse.perf.spec.ts

# Run on specific page
npx playwright test e2e/visual/performance/lighthouse.perf.spec.ts -g "dashboard"
```

**Note:** Performance tests run only on **Chromium** (Lighthouse requirement).

### Understanding Performance Thresholds

**Configured thresholds** (in `e2e/config/lighthouse.config.ts`):
- **Performance:** 85 (LCP, FCP, TBT, TTI, CLS, Speed Index)
- **Accessibility:** 95 (WCAG compliance)
- **Best Practices:** 90 (Security, browser compatibility)
- **SEO:** 85 (SEO optimization)

**Score ranges:**
- **90-100:** ✅ Good (green)
- **50-89:** ⚠️ Needs improvement (orange)
- **0-49:** ❌ Poor (red)

### Performance Test Failures

**When performance tests fail:**

1. **Check the HTML report:**
   ```bash
   # Open generated Lighthouse report
   open web/e2e/reports/lighthouse/dashboard-performance.html
   ```

2. **Identify failing metrics:**
   - LCP > 2.5s: Slow content loading
   - FCP > 1.8s: Slow initial render
   - CLS > 0.1: Layout shifting
   - TBT > 300ms: JavaScript blocking

3. **Common fixes:**

   **LCP too high (slow loading):**
   - Optimize images (use WebP, lazy loading)
   - Reduce JavaScript bundle size
   - Implement code splitting
   - Use CDN for assets

   **FCP too high (slow render):**
   - Inline critical CSS
   - Remove render-blocking resources
   - Optimize server response time

   **CLS too high (layout shift):**
   - Set explicit width/height on images
   - Reserve space for dynamic content
   - Avoid inserting content above existing content

   **TBT too high (blocking):**
   - Reduce JavaScript execution time
   - Split long tasks
   - Defer non-critical JavaScript

4. **Re-run tests** after optimizations:
   ```bash
   npx playwright test e2e/visual/performance/lighthouse.perf.spec.ts
   ```

### Performance Reports

**Report locations:**
- **HTML reports:** `e2e/reports/lighthouse/*.html`
- **JSON reports:** `e2e/reports/lighthouse/*.json`

**HTML report includes:**
- Overall scores (Performance, Accessibility, Best Practices, SEO)
- Detailed metrics (LCP, FCP, CLS, etc.)
- Opportunities (actionable improvements)
- Diagnostics (detailed analysis)
- Screenshots of page loading

**JSON report** can be parsed for CI:
```bash
# Extract performance score from JSON
cat e2e/reports/lighthouse/dashboard-performance.json | jq '.categories.performance.score'
```

### Adjusting Performance Thresholds

**When to adjust:**

#### Threshold Too Strict

If legitimate pages fail to meet thresholds:

```typescript
// In lighthouse.perf.spec.ts
await playAudit({
  page,
  thresholds: {
    performance: 80,  // Lowered from 85
    accessibility: 95,
  },
})
```

#### Threshold Too Loose

If you want stricter performance requirements:

```typescript
await playAudit({
  page,
  thresholds: {
    performance: 90,  // Increased from 85
    accessibility: 98,
  },
})
```

**Recommended thresholds by page type:**
- **Landing pages:** Performance: 90+
- **Dashboards:** Performance: 85+
- **Data-heavy pages:** Performance: 80+
- **Admin pages:** Performance: 75+

## CI/CD Integration

### GitHub Actions Workflow

Visual regression tests run automatically on every PR via `.github/workflows/visual-regression.yml`.

**Workflow includes:**
1. **Visual Regression Tests:** All component, page, and flow tests
2. **Cross-Browser Validation:** Parallel tests on Chromium, Firefox, WebKit
3. **Performance Tests:** Lighthouse CI on critical pages
4. **Artifact Upload:** Screenshot diffs, HTML reports, test results
5. **PR Comments:** Automated summary with diff links

### PR Blocking

**Failed visual tests block PR merge** via GitHub status checks.

**To unblock:**

1. **Review the PR comment** with test results
2. **Download screenshot artifacts** from GitHub Actions
3. **Determine if changes are intentional:**
   - ✅ **Intentional:** Update baselines (see "Baseline Management")
   - ❌ **Bug:** Fix the visual regression
4. **Push updated baselines or fixes**
5. **CI re-runs automatically**

### PR Comment Format

Example automated PR comment:

```
## 🎨 Visual Regression Test Results

### ✅ Status: Passed
- **Total Tests:** 152
- **Passed:** 152
- **Failed:** 0
- **Skipped:** 0

### 📊 Cross-Browser Results
- ✅ Chromium: 152/152 passed
- ✅ Firefox: 152/152 passed
- ✅ WebKit: 152/152 passed

### ⚡ Performance Results
- ✅ Dashboard: 87 (threshold: 85)
- ✅ Tasks: 89 (threshold: 85)
- ✅ Task Detail: 86 (threshold: 85)

### 📎 Artifacts
- [HTML Report](https://github.com/.../artifacts/...)
- [Lighthouse Reports](https://github.com/.../artifacts/...)
```

**When tests fail:**

```
## 🎨 Visual Regression Test Results

### ❌ Status: Failed
- **Total Tests:** 152
- **Passed:** 148
- **Failed:** 4
- **Skipped:** 0

### ❌ Failed Tests
1. `buttons.visual.spec.ts > primary button - default state`
   - Browser: chromium
   - Diff: [View Diff](https://github.com/.../artifacts/...)

2. `dashboard.visual.spec.ts > full page - desktop`
   - Browser: firefox
   - Diff: [View Diff](https://github.com/.../artifacts/...)

### 📎 Artifacts
- [Screenshot Diffs](https://github.com/.../artifacts/...)
- [HTML Report](https://github.com/.../artifacts/...)
```

### Downloading Artifacts from CI

**Step-by-step:**

1. Go to the **PR page**
2. Scroll to **Checks** section
3. Click on **Visual Regression** workflow
4. Go to **Summary** tab
5. Download artifacts:
   - `playwright-report` (HTML report with diffs)
   - `screenshot-diffs` (PNG diff images)
   - `lighthouse-reports` (Performance reports)

6. **Extract and view:**
   ```bash
   unzip playwright-report.zip
   open playwright-report/index.html
   ```

### Skipping CI Tests (Emergency)

**Use only in emergencies** (broken CI, urgent hotfix):

```bash
# Skip visual tests in commit message
git commit -m "hotfix: critical bug fix [skip visual]"
```

⚠️ **Warning:** Visual regressions won't be detected. Run tests locally before merging!

## Maintenance Procedures

### Regular Maintenance Tasks

#### Weekly: Review False Positive Rate

```bash
# Run tests 10 times to measure stability
for i in {1..10}; do npm run test:visual; done | grep -E "(passed|failed)"
```

**Target:** ≤1 failure across 10 runs (<1% false positive rate)

**If higher:** Investigate flaky tests (see "Troubleshooting" section)

#### Monthly: Review Test Execution Time

```bash
# Time full test suite
time npm run test:visual
```

**Target:** <10 minutes total execution time

**If slower:**
- Profile slow tests
- Optimize waits
- Remove redundant tests
- Increase parallel workers

#### Quarterly: Update Browser Versions

```bash
# Update Playwright browsers
npx playwright install
```

**Note:** Browser updates may cause baseline drift. Review and update baselines after browser updates.

#### After Major UI Changes: Baseline Audit

After significant design system changes (new theme, layout refactor):

1. **Update all baselines:**
   ```bash
   npm run test:visual -- --update-snapshots
   ```

2. **Review changes carefully:**
   ```bash
   git diff e2e/visual/
   ```

3. **Run full test suite:**
   ```bash
   npm run test:visual
   ```

4. **Commit with detailed message:**
   ```bash
   git add e2e/visual/
   git commit -m "visual: update all baselines for design system v2.0"
   ```

### Cleaning Up Old Artifacts

**Remove old screenshot artifacts:**

```bash
# Remove actual/diff images (keep baselines)
find web/e2e/visual/ -name "*-actual.png" -delete
find web/e2e/visual/ -name "*-diff.png" -delete

# Remove old Lighthouse reports (keep last 10)
cd web/e2e/reports/lighthouse/
ls -t | tail -n +11 | xargs rm -f
```

**Git cleanup** (if baselines were committed by mistake):

```bash
# Remove baselines from git (if not needed)
git rm -r e2e/visual/**/*-actual.png
git rm -r e2e/visual/**/*-diff.png
git commit -m "chore: remove test artifacts from git"
```

### Adding New Visual Tests

**When adding new components or pages:**

1. **Create test file** following existing patterns:
   ```typescript
   // e2e/visual/components/my-component.visual.spec.ts
   import { test, expect } from '@playwright/test'
   import { prepareForVisualTest } from '../../utils/visual-test-helpers'
   import { VISUAL_CONFIG } from '../../config/visual-regression.config'

   test.describe('My Component Visual Regression', () => {
     test('default state', async ({ page }) => {
       await page.goto('/my-component')
       await prepareForVisualTest(page)

       const component = page.locator('[data-testid="my-component"]')
       await expect(component).toHaveScreenshot('my-component-default.png', {
         maxDiffPixels: VISUAL_CONFIG.thresholds.component,
       })
     })
   })
   ```

2. **Generate baselines:**
   ```bash
   npm run test:visual -- --update-snapshots e2e/visual/components/my-component.visual.spec.ts
   ```

3. **Run tests to verify:**
   ```bash
   npm run test:visual -- e2e/visual/components/my-component.visual.spec.ts
   ```

4. **Commit test and baselines:**
   ```bash
   git add e2e/visual/components/my-component.visual.spec.ts
   git add e2e/visual/components/my-component.visual.spec.ts-snapshots/
   git commit -m "test: add visual regression tests for MyComponent"
   ```

## Best Practices

### ✅ DO

- **Use data-testid attributes** for reliable element selection
- **Hide dynamic content** (timestamps, avatars) before screenshots
- **Disable animations** for consistent captures
- **Wait for stable state** (networkidle, fonts loaded)
- **Use descriptive screenshot names** (`component-variant-state-browser.png`)
- **Review diffs carefully** before updating baselines
- **Commit baselines with clear messages**
- **Run full suite** before committing
- **Test across all browsers** for cross-browser consistency
- **Document visual changes** in PR descriptions

### ❌ DON'T

- **Don't commit actual/diff images** (only baseline screenshots)
- **Don't update all baselines blindly** (review changes first)
- **Don't use broad selectors** (avoid flaky selectors that match multiple elements)
- **Don't take full-page screenshots for component tests** (use element screenshots for precision)
- **Don't skip cross-browser testing** to save time
- **Don't ignore flaky tests** (fix them, don't disable them)
- **Don't use excessive timeouts** (investigate root cause instead)
- **Don't commit without running tests** locally first
- **Don't bypass CI checks** except in emergencies

### Screenshot Naming Conventions

**Format:** `{component}-{variant}-{state}-{browser}-{viewport}.png`

**Examples:**
- ✅ `button-primary-default-chromium.png`
- ✅ `button-primary-hover-firefox.png`
- ✅ `dashboard-full-page-webkit-mobile-small.png`
- ✅ `modal-confirm-open-chromium-desktop.png`
- ❌ `screenshot-1.png` (not descriptive)
- ❌ `test.png` (not descriptive)

**Benefits:**
- Easy to identify what failed
- Clear organization
- Browser/viewport-specific baselines
- Searchable by component/state

### Test Organization

**Directory structure:**
```
e2e/visual/
├── components/          # Individual component tests
│   ├── buttons.visual.spec.ts
│   ├── forms.visual.spec.ts
│   └── modals.visual.spec.ts
├── pages/              # Full-page tests
│   ├── dashboard.visual.spec.ts
│   ├── tasks.visual.spec.ts
│   └── settings.visual.spec.ts
├── flows/              # User flow tests
│   ├── auth.visual.spec.ts
│   ├── task-creation.visual.spec.ts
│   └── filters.visual.spec.ts
└── performance/        # Lighthouse CI tests
    └── lighthouse.perf.spec.ts
```

**Test naming:**
- Components: `{component-name}.visual.spec.ts`
- Pages: `{page-name}.visual.spec.ts`
- Flows: `{flow-name}.visual.spec.ts`
- Performance: `{test-type}.perf.spec.ts`

## Resources

### Documentation

- **Playwright Visual Comparisons:** https://playwright.dev/docs/test-snapshots
- **Lighthouse CI:** https://github.com/GoogleChrome/lighthouse-ci
- **playwright-lighthouse:** https://github.com/abhinaba-ghosh/playwright-lighthouse

### Configuration Files

- `playwright.config.ts` - Global Playwright configuration
- `e2e/config/visual-regression.config.ts` - Visual testing configuration
- `e2e/config/lighthouse.config.ts` - Lighthouse CI configuration
- `e2e/config/screenshot.css` - Global CSS for hiding dynamic elements
- `e2e/utils/visual-test-helpers.ts` - Visual testing utility functions

### Useful Commands

```bash
# Run all visual tests
npm run test:visual

# Run specific test file
npm run test:visual -- buttons.visual.spec.ts

# Run in specific browser
npm run test:visual -- --project=firefox

# Update baselines
npm run test:visual -- --update-snapshots

# Debug mode (opens browser)
npm run test:visual -- --debug

# Show HTML report
npx playwright show-report

# Show trace viewer
npx playwright show-trace trace.zip

# List all tests
npm run test:visual -- --list

# Run Lighthouse tests
npx playwright test e2e/visual/performance/lighthouse.perf.spec.ts
```

## FAQ

### Q: How long should visual tests take?

**A:** Target <10 minutes for full suite with parallel workers. Individual test files should take <2 minutes.

### Q: Should baselines be committed to git?

**A:** Yes, baseline screenshots should be committed. They serve as the "golden" reference for visual comparisons. Don't commit actual/diff images.

### Q: How many baseline screenshots will I have?

**A:** ~300-500 baseline screenshots across:
- 100+ tests
- 3 browsers (chromium, firefox, webkit)
- Multiple viewports (mobile, tablet, desktop)

### Q: What if my component has animations?

**A:** Use `disableAnimations()` helper or `page.emulateMedia({ reducedMotion: 'reduce' })` before taking screenshots.

### Q: Can I test dark mode?

**A:** Yes, use `page.emulateMedia({ colorScheme: 'dark' })` before taking screenshots. Create separate tests for light/dark modes.

### Q: What if tests are flaky?

**A:** See "Troubleshooting > False Positives" section. Common causes: dynamic content, animations, font loading, timing issues.

### Q: How do I test hover states?

**A:** Use `element.hover()` before screenshot, and disable animations for consistent capture.

### Q: Can I skip tests for specific browsers?

**A:** Yes, use `test.skip()` with browser condition:
```typescript
test.skip(({ browserName }) => browserName === 'webkit', 'Skip on Safari')
```

### Q: How do I test responsive design?

**A:** Use `page.setViewportSize()` before navigation (see examples in page tests).

### Q: What if Lighthouse tests fail in CI but pass locally?

**A:** CI environments are slower. Adjust thresholds or add waits for network/fonts.

---

## Support

For issues or questions:
1. Check this guide first
2. Review existing test files for examples
3. Check Playwright documentation: https://playwright.dev
4. Review CI logs in GitHub Actions
5. Contact the team for help

**Happy testing! 🎨**
