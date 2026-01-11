# Initial E2E Test Suite Audit - Baseline Report

**Date**: 2026-01-11
**Status**: PENDING USER EXECUTION
**Subtask**: subtask-1-4
**Purpose**: Establish baseline metrics for Playwright E2E test suite before repair work

---

## Overview

This document provides instructions for running the initial test suite audit to establish a baseline of the current state of the Playwright E2E testing infrastructure. The audit will capture:

- Total number of test files and individual tests
- Current pass/fail rates
- Types of failures (configuration, dependency, logic, flaky, snapshot)
- Infrastructure errors vs. application bugs
- Overall test suite health metrics

**IMPORTANT**: This audit should be run AFTER completing Playwright browser installation (subtask-1-1) and dev server verification (subtask-1-3).

---

## Prerequisites Checklist

Before running the audit, verify:

- [ ] Playwright browsers installed successfully (via `./install-playwright.sh`)
- [ ] Development server verified to start on port 5177
- [ ] Environment variables configured in `.env` file
- [ ] All dependencies installed (`node_modules` present)

---

## Running the Test Audit

### Option 1: Quick Audit (Recommended First Run)

Run the test suite with detailed list output to capture baseline results:

```bash
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/.worktrees/040-auditor-a-reparaci-n-y-estabilizaci-n-de-tests-e2e/web

# Run with list reporter and capture output
npm run test:e2e -- --reporter=list 2>&1 | tee test-audit-baseline.txt
```

**Expected Duration**: 5-15 minutes depending on number of tests and failures

### Option 2: Detailed Audit with Multiple Reporters

For more comprehensive reporting:

```bash
cd ./web

# Run with both list and JSON output
npm run test:e2e -- --reporter=list --reporter=json 2>&1 | tee test-audit-baseline.txt

# After completion, view HTML report
npm run test:e2e -- --reporter=html
npx playwright show-report
```

### Option 3: Dry Run (Test Configuration Only)

To verify Playwright configuration without running tests:

```bash
cd ./web

# List all tests without running them
npx playwright test --list
```

---

## Understanding Test Output

### List Reporter Format

The `--reporter=list` output shows:

```
Running 487 tests using 2 workers

  ✓  1 auth/login.spec.ts:12:5 › Login Flow › should display login form (2.1s)
  ✗  2 auth/login.spec.ts:20:5 › Login Flow › should handle invalid credentials (1.5s)
  ⊘  3 auth/logout.spec.ts:15:5 › Logout Flow › should logout user [skipped]
```

**Symbols**:
- `✓` - Test passed
- `✗` - Test failed
- `⊘` - Test skipped
- `⚠` - Test passed with warnings

### Common Failure Types to Look For

1. **Configuration Errors**
   - `Error: webServer is not running`
   - `Error: page.goto: net::ERR_CONNECTION_REFUSED`
   - `TimeoutError: waiting for locator`

2. **Dependency Issues**
   - `Error: Cannot find module`
   - `TypeError: ... is not a function`
   - Missing imports or broken paths

3. **Snapshot Mismatches**
   - `Error: Screenshot comparison failed`
   - `expected vs actual` differences
   - Visual regression failures

4. **Application Bugs**
   - Assertion failures due to incorrect behavior
   - Elements not appearing as expected
   - Data not loading correctly

5. **Flaky Tests**
   - Intermittent failures
   - Timing-related issues
   - Race conditions

---

## Baseline Metrics to Capture

After running the audit, document these metrics in `test-audit-baseline.txt`:

### High-Level Statistics

```
Total Test Files: ____ / 24
Total Test Cases: ____ / ~487
Tests Passed: ____
Tests Failed: ____
Tests Skipped: ____
Overall Pass Rate: ____%
```

### Failure Categorization

```
Configuration Errors: ____
Dependency Issues: ____
Snapshot Mismatches: ____
Application Bugs: ____
Flaky Tests: ____
Unknown/Other: ____
```

### Test File Status

For each of the 24 spec files, note:
- File name
- Total tests in file
- Pass/fail/skip counts
- Primary failure reasons (if any)

---

## Verification Success Criteria

The audit is successful when:

✓ Test suite starts without configuration errors
✓ Development server launches automatically on port 5177
✓ All 24 spec files are discovered and executed
✓ Output is captured to `test-audit-baseline.txt`
✓ HTML report generates (even with failures)
✓ No infrastructure-level blockers prevent test execution

**Note**: Tests failing due to application bugs or outdated logic is EXPECTED. The goal is to ensure the infrastructure works and capture what's broken.

---

## Output Files

After running the audit, you should have:

1. **test-audit-baseline.txt** - Complete test output with all results
2. **playwright-report/** - HTML report directory
3. **test-results/** - Test artifacts (screenshots, videos, traces)
4. **test-results/results.json** - Machine-readable JSON output

These files will be analyzed in Phase 2 (Root Cause Analysis).

---

## Troubleshooting

### Issue: "Error: Executable doesn't exist"

**Cause**: Playwright browsers not installed
**Solution**: Run `./install-playwright.sh` first

### Issue: "Error: webServer is not running"

**Cause**: Dev server failed to start or port 5177 is in use
**Solution**:
- Check if port 5177 is available: `lsof -i :5177`
- Kill existing process if needed
- Verify dev server starts manually: `npm run dev`

### Issue: "Error: Cannot find module"

**Cause**: Missing dependencies
**Solution**:
- Reinstall dependencies: `npm install`
- Check `node_modules` exists
- Verify `package.json` has all required packages

### Issue: Tests timing out

**Cause**: Application loading slowly or elements not appearing
**Solution**:
- Increase timeout in `playwright.config.ts` temporarily
- Run in headed mode to see what's happening: `npm run test:e2e -- --headed`
- Check backend API is responding at http://localhost:8001

### Issue: "net::ERR_CONNECTION_REFUSED"

**Cause**: Backend API not running
**Solution**:
- Verify VITE_FRAPPE_URL in `.env` is correct
- Ensure backend service is running (if required)
- Check proxy configuration in `vite.config.ts`

---

## Manual Execution Steps

**Step 1**: Navigate to web directory
```bash
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/.worktrees/040-auditor-a-reparaci-n-y-estabilizaci-n-de-tests-e2e/web
```

**Step 2**: Run the test audit command
```bash
npm run test:e2e -- --reporter=list 2>&1 | tee test-audit-baseline.txt
```

**Step 3**: Wait for completion (may take 5-15 minutes)

**Step 4**: Review the output
```bash
# View captured baseline
cat test-audit-baseline.txt

# Count total tests
grep -c "✓\\|✗\\|⊘" test-audit-baseline.txt

# Count passed tests
grep -c "✓" test-audit-baseline.txt

# Count failed tests
grep -c "✗" test-audit-baseline.txt

# View HTML report
npx playwright show-report
```

**Step 5**: Document results
- Note overall statistics (pass/fail counts)
- Identify patterns in failures
- Flag any infrastructure-level blockers
- Prepare findings for Phase 2 analysis

---

## Next Steps After Audit

Once the baseline audit is complete:

1. **Update Subtask Status**: Mark subtask-1-4 as completed in `implementation_plan.json`
2. **Commit Results**: Create git commit with audit output
3. **Phase 2 Begins**: Start Root Cause Analysis using baseline data
4. **Categorize Failures**: Group failures by type for targeted fixes
5. **Plan Fixes**: Prioritize fixes based on impact and effort

---

## Expected Outcomes

### Best Case Scenario
- All tests execute (even if some fail)
- Infrastructure is functional
- Failures are due to application changes or outdated test logic
- Clear path forward for fixes in Phase 3

### Worst Case Scenario
- Configuration errors prevent test execution
- Multiple infrastructure blockers
- Unknown error types requiring investigation
- May need to return to Phase 1 for additional setup

### Most Likely Scenario
- Mix of passing and failing tests
- Some configuration tweaks needed
- Snapshot updates required
- A few application bugs discovered
- Several flaky tests identified
- Clear categorization possible for Phase 2

---

## Audit Checklist

Use this checklist during the audit:

- [ ] Test suite starts without errors
- [ ] Dev server launches on port 5177
- [ ] All 24 spec files are discovered
- [ ] Tests begin executing
- [ ] Output is captured to `test-audit-baseline.txt`
- [ ] Test execution completes (doesn't hang)
- [ ] Final summary statistics are shown
- [ ] HTML report is generated
- [ ] Test artifacts (screenshots, traces) are saved
- [ ] No critical infrastructure blockers

---

## Notes for Analysis Phase

When analyzing the baseline results in Phase 2, consider:

1. **Infrastructure vs. Application**: Separate infrastructure issues (config, setup) from application bugs
2. **Patterns**: Look for common failure reasons across multiple tests
3. **Priority**: Focus on blockers that prevent multiple tests from running
4. **Quick Wins**: Identify easy fixes (timeouts, snapshots) vs. complex issues
5. **Dependencies**: Note if failures cascade (one broken fixture affects many tests)

---

## Appendix: Alternative Commands

### Run Specific Test File
```bash
npm run test:e2e tests/auth/login.spec.ts
```

### Run in Headed Mode (Visual Debugging)
```bash
npm run test:e2e -- --headed
```

### Run with Debug Mode
```bash
npm run test:e2e -- --debug
```

### Run in UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Generate Trace for Failed Tests
```bash
npm run test:e2e -- --trace on
```

### Update All Snapshots (USE WITH CAUTION)
```bash
npm run test:e2e -- --update-snapshots
```

---

## Contact & Support

If you encounter issues not covered in this guide:

1. Check `DEV_SERVER_VERIFICATION.md` for server-related issues
2. Check `MANUAL_PLAYWRIGHT_SETUP.md` for installation issues
3. Review Playwright documentation: https://playwright.dev
4. Check browser console for frontend errors
5. Review `playwright.config.ts` for configuration problems

---

**Document Status**: Ready for user execution
**Blocking**: Phase 2 (Root Cause Analysis)
**Created By**: auto-claude (Session 5, subtask-1-4)
**Last Updated**: 2026-01-11
