# Playwright Configuration Analysis

## Summary
Analysis of `playwright.config.ts` against best practices and spec requirements.

**Date**: 2026-01-11
**Config File**: `./web/playwright.config.ts`
**Status**: ✅ MOSTLY COMPLIANT with minor improvements needed

---

## Verification Checklist

### ✅ PASS: Core Requirements
1. **baseURL matches port 5177**: ✅
   - Uses `WH_WEB_PORT` env var with fallback to 5177
   - Properly configured via `BASE_URL` constant
   - Line 3-4: `const PORT = process.env.WH_WEB_PORT || 5177`

2. **webServer command is correct**: ✅
   - Command: `pnpm dev --port ${PORT}`
   - Actually BETTER than spec - explicitly sets port flag
   - Line 35: Properly references PORT variable

3. **retries configured properly**: ✅
   - CI: 2 retries
   - Local: 0 retries
   - Line 10: `retries: process.env.CI ? 2 : 0`

4. **forbidOnly set for CI**: ✅
   - Prevents `test.only()` in CI
   - Line 9: `forbidOnly: !!process.env.CI`

5. **webServer timeout**: ✅
   - 120 seconds (appropriate for dev server startup)
   - Line 38: `timeout: 120 * 1000`

---

## ⚠️ ISSUES IDENTIFIED

### Issue #1: CI Workers Count (Minor)
**Location**: Line 11
**Current**: `workers: process.env.CI ? 2 : undefined`
**Spec Recommendation**: `workers: process.env.CI ? 1 : undefined`
**Severity**: Low
**Impact**: Having 2 workers in CI could cause:
- Resource contention on CI runners
- Potential race conditions in parallel tests
- Flaky test behavior

**Recommendation**: Consider reducing to 1 worker in CI for stability, or document why 2 is preferred.

---

### Issue #2: Missing 'list' Reporter (Minor)
**Location**: Line 12-16
**Current**: Only `html`, `json`, and conditional `github` reporters
**Spec Recommendation**: Include `['list']` reporter
**Severity**: Low
**Impact**:
- No real-time console feedback during test execution
- Harder to debug tests as they run
- Less visibility into which test is currently executing

**Recommendation**: Add `['list']` to reporters array for better DX.

---

### Issue #3: JSON Reporter Output Path (Cosmetic)
**Location**: Line 14
**Current**: `{ outputFile: 'test-results/results.json' }`
**Spec Example**: `{ outputFile: 'test-results.json' }`
**Severity**: Cosmetic
**Impact**:
- Inconsistent with spec example
- Could affect CI result parsing if path is hardcoded elsewhere

**Note**: Current path is actually MORE organized (nested in directory), but should verify downstream dependencies.

---

## ✅ GOOD PRACTICES FOUND

### 1. Environment Variable Configuration
- Proper use of `WH_WEB_PORT` and `WH_BASE_URL` env vars
- Allows flexible configuration across environments
- Lines 3-4: Clear defaults provided

### 2. Video Recording
- Configured `video: 'on-first-retry'` (not in spec example)
- Helps debug flaky tests
- Line 22: Good practice for troubleshooting

### 3. Screenshot Configuration
- `screenshot: 'only-on-failure'` balances debugging and storage
- Line 21: Appropriate setting

### 4. Trace Configuration
- `trace: 'on-first-retry'` provides detailed debugging info when needed
- Line 20: Good balance of detail vs. performance

### 5. Server Reuse Logic
- `reuseExistingServer: !process.env.CI` correctly handles CI vs local
- Line 37: Prevents port conflicts in CI, allows faster local dev

---

## 🔍 MISSING CONFIGURATIONS (Optional but Recommended)

### 1. Global Test Timeout
**Not Present**: No top-level `timeout` property
**Recommendation**:
```typescript
timeout: 30 * 1000, // 30 seconds per test
```
**Rationale**: Prevents tests from hanging indefinitely

---

### 2. Expect Timeout
**Not Present**: No `expect.timeout` in `use` block
**Recommendation**:
```typescript
use: {
  // ... existing config
  expect: {
    timeout: 5 * 1000, // 5 seconds for assertions
  },
}
```
**Rationale**: Faster feedback for failing assertions

---

### 3. WebServer Logging
**Not Present**: No `stdout` or `stderr` configuration for webServer
**Recommendation**:
```typescript
webServer: {
  // ... existing config
  stdout: 'ignore', // or 'pipe' for debugging
  stderr: 'pipe',   // always show errors
}
```
**Rationale**: Cleaner test output, but still see server errors

---

### 4. Additional Browser Projects
**Current**: Only Chromium configured
**Recommendation**: Consider adding Firefox/WebKit for cross-browser testing
**Rationale**: Spec mentions "Add firefox, webkit as needed"

---

## 📊 COMPARISON: Current vs Spec

| Setting | Current | Spec | Status |
|---------|---------|------|--------|
| testDir | `./e2e` | `./e2e` | ✅ Match |
| fullyParallel | `true` | `true` | ✅ Match |
| forbidOnly | `!!process.env.CI` | `!!process.env.CI` | ✅ Match |
| retries | CI: 2, Local: 0 | CI: 2, Local: 0 | ✅ Match |
| workers | CI: 2, Local: undefined | CI: 1, Local: undefined | ⚠️ Different |
| reporters | html, json, github | html, list, json | ⚠️ Different |
| baseURL | Dynamic (5177) | Static (5177) | ✅ Equivalent |
| trace | on-first-retry | on-first-retry | ✅ Match |
| screenshot | only-on-failure | only-on-failure | ✅ Match |
| video | on-first-retry | Not specified | ✅ Bonus |
| webServer.command | `pnpm dev --port ${PORT}` | `pnpm dev` | ✅ Better |
| webServer.url | Dynamic | Static | ✅ Equivalent |
| webServer.timeout | 120s | 120s | ✅ Match |
| webServer.reuseExisting | `!process.env.CI` | `!process.env.CI` | ✅ Match |

---

## 🎯 FINAL VERDICT

**Overall Assessment**: ✅ **CONFIGURATION IS SOUND**

The current `playwright.config.ts` follows best practices and meets all core requirements. The identified issues are minor and do not block test execution.

### Critical Items (All ✅)
- [x] Port 5177 configured correctly
- [x] webServer command valid
- [x] Retries appropriate for CI/local
- [x] forbidOnly prevents test.only() in CI
- [x] Timeouts set appropriately

### Minor Improvements Available
- [ ] Consider reducing CI workers from 2 to 1 (optional)
- [ ] Add 'list' reporter for better console output (recommended)
- [ ] Add global test timeout (recommended)
- [ ] Add expect timeout (recommended)
- [ ] Configure webServer logging (optional)

### No Blockers Found
The configuration will not prevent tests from running. Any test failures are likely due to:
1. Test logic issues
2. Application bugs
3. Missing fixtures/page objects
4. Outdated snapshots
5. Environment variable issues (separate from config)

---

## 📝 RECOMMENDATIONS

1. **Immediate Actions**: None required - config is functional
2. **Quick Wins**: Add 'list' reporter for better DX
3. **Future Improvements**: Add timeout configurations to prevent hanging tests
4. **Consider**: Reducing CI workers if flaky tests appear

---

## 🔗 REFERENCES

- Spec File: `./.auto-claude/specs/040-auditor-a-reparaci-n-y-estabilizaci-n-de-tests-e2e/spec.md`
- Config File: `./web/playwright.config.ts`
- Playwright Docs: https://playwright.dev/docs/test-configuration
