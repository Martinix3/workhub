# Baseline Screenshot Generation Instructions

## Status
✅ All visual test infrastructure is ready
⚠️ Manual execution required (Node.js environment needed)

## Infrastructure Verification

### Visual Test Files Created
- **24 visual test spec files** across all categories:
  - 10 component tests (buttons, forms, modals, dropdowns, tables, cards, navigation, notifications, badges, charts)
  - 7 page tests (dashboard, tasks, task-detail, user-profile, settings, notifications, reports)
  - 6 flow tests (auth, task-creation, multi-assign, filters, notifications-digest, dependencies)
  - 1 performance test (lighthouse)

### Configuration Files
- ✅ `playwright.config.ts` - Cross-browser projects (chromium, firefox, webkit)
- ✅ `e2e/config/visual-regression.config.ts` - Viewport definitions and thresholds
- ✅ `e2e/config/lighthouse.config.ts` - Performance testing thresholds
- ✅ `e2e/config/screenshot.css` - CSS for hiding dynamic elements

### Utility Files
- ✅ `e2e/utils/visual-test-helpers.ts` - Helper functions for stable screenshots

### Package Configuration
- ✅ `package.json` - Includes `test:visual` script and all dependencies
  - `@playwright/test`: ^1.55.0
  - `lighthouse`: ^12.2.1
  - `playwright-lighthouse`: ^4.0.0

## How to Generate Baselines

### Prerequisites
1. Node.js and npm/pnpm installed
2. Dependencies installed: `npm install` or `pnpm install`
3. Playwright browsers installed: `npx playwright install --with-deps`

### Commands

#### From the web service directory:
```bash
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/web

# Install dependencies (if not already done)
npm install

# Install Playwright browsers
npx playwright install --with-deps

# Generate baseline screenshots for all tests across all browsers
npm run test:visual -- --update-snapshots
```

#### Alternative: From the main repository
```bash
# Navigate to the main workhub directory
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/web

# Run the same commands as above
npm install
npx playwright install --with-deps
npm run test:visual -- --update-snapshots
```

## Expected Results

### Test Execution
- **Total tests**: ~150+ test cases (24 spec files × multiple browsers × viewports)
- **Browsers**: Tests will run on chromium, firefox, and webkit
- **Execution time**: Should complete in <10 minutes with parallel execution
- **Baseline screenshots**: Will be generated in `e2e/visual/*-snapshots/` directories

### Directory Structure After Execution
```
e2e/visual/
├── components/
│   ├── buttons.visual.spec.ts
│   ├── buttons.visual.spec.ts-snapshots/
│   │   ├── button-export-default-chromium.png
│   │   ├── button-export-default-firefox.png
│   │   ├── button-export-default-webkit.png
│   │   └── ... (more screenshots)
│   └── ... (other component tests)
├── pages/
│   ├── dashboard.visual.spec.ts
│   ├── dashboard.visual.spec.ts-snapshots/
│   │   └── ... (page screenshots)
│   └── ... (other page tests)
├── flows/
│   └── ... (flow test screenshots)
└── performance/
    └── ... (lighthouse reports)
```

### Verification
After baseline generation, verify with:
```bash
# Run visual tests without update-snapshots to validate baselines
npm run test:visual

# Expected result: All tests should pass (comparing against newly created baselines)
```

## Next Steps After Baseline Generation

1. **Review Baselines**: Examine generated screenshots to ensure they capture the expected UI states
2. **Run Validation**: Execute `npm run test:visual` to confirm tests pass
3. **Commit Baselines**: Add the baseline screenshots to version control
4. **Document Coverage**: Update documentation with actual screenshot counts and coverage

## Troubleshooting

### If tests fail on first run
- Ensure the dev server is running (`npm run dev`)
- Check that environment variables are set (see `.env.example`)
- Verify Playwright browsers are installed
- Check for any console errors in the browser

### If baseline generation is incomplete
- Run specific test files individually to isolate issues
- Check disk space (screenshots can be large)
- Review test output for specific error messages

## Related Documentation
- See `docs/visual-testing-guide.md` for comprehensive visual testing documentation
- See `playwright.config.ts` for cross-browser configuration
- See `e2e/config/visual-regression.config.ts` for viewport and threshold settings
