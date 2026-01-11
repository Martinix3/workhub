# Manual Playwright Browser Installation

## Context

This document provides instructions for manually installing Playwright browsers when automated installation is blocked by sandbox restrictions.

## Prerequisites

- Node.js and npm installed on your system
- Terminal access with appropriate permissions
- Internet connection for downloading browser binaries

## Installation Steps

### Option 1: Using the Installation Script (Recommended)

```bash
# Navigate to the web directory
cd ./web

# Run the installation script
./install-playwright.sh
```

The script will:
1. Install npm dependencies (if not already installed)
2. Install Playwright Chromium browser with system dependencies
3. Verify the installation

### Option 2: Manual Commands

If you prefer to run commands manually:

```bash
# Navigate to the web directory
cd ./web

# Step 1: Install npm dependencies (if not already done)
npm install

# Step 2: Install Playwright browsers with system dependencies
npx playwright install --with-deps chromium

# Optional: Install all browsers (chromium, firefox, webkit)
npx playwright install --with-deps
```

## Verification

After installation, verify everything works:

```bash
# Check Playwright version
npx playwright --version
# Expected output: Version 1.55.0 (or similar)

# List installed browsers
npx playwright install --dry-run
# Expected output: Should show chromium as already installed

# Verify TypeScript compilation
npx tsc --noEmit
# Expected output: No errors

# Run E2E tests
npm run test:e2e
# Expected output: Test suite runs (even if some tests fail)
```

## System Dependencies

The `--with-deps` flag installs required system dependencies for running browsers in headless mode, including:

- Browser libraries (libglib, libatk, etc.)
- Font libraries
- Media codecs
- X11 libraries (for Linux)

### macOS Specifics

On macOS, system dependencies are typically already present. The installation primarily downloads browser binaries.

### Linux Specifics

On Linux, you may need sudo privileges to install system dependencies. The script will prompt for password if needed.

## Troubleshooting

### Error: "npx: command not found"

**Solution**: Install Node.js and npm:
- Visit https://nodejs.org/
- Download and install the LTS version
- Verify installation: `node --version && npm --version`

### Error: "Permission denied"

**Solution**: Run with appropriate permissions:
```bash
# On Linux, you may need sudo for system dependencies
sudo npx playwright install --with-deps chromium
```

### Error: "Browser download failed"

**Solution**: Check your internet connection and try again. If behind a proxy:
```bash
# Set proxy environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
npx playwright install --with-deps chromium
```

### Error: "Port 5177 already in use"

**Solution**: Kill the process using the port:
```bash
# Find the process
lsof -i :5177

# Kill it (replace PID with actual process ID)
kill -9 <PID>
```

## Next Steps

After successful installation:

1. **Configure environment variables** - Ensure `.env` file has required variables:
   - `VITE_FRAPPE_URL=http://localhost:8001`
   - `VITE_ENABLE_AUTH_BYPASS=true`
   - `VITE_APP_MODE=development`

2. **Start dev server** - Test that the dev server starts correctly:
   ```bash
   npm run dev
   # Should start on http://localhost:5177
   ```

3. **Run test suite** - Execute E2E tests to establish baseline:
   ```bash
   npm run test:e2e -- --reporter=list
   ```

4. **View test report** - Open the HTML report:
   ```bash
   npx playwright show-report
   ```

## Related Documentation

- Playwright Installation: https://playwright.dev/docs/intro
- Browser Installation: https://playwright.dev/docs/browsers
- System Requirements: https://playwright.dev/docs/library#system-requirements

## Status

- **Created**: 2026-01-11
- **Purpose**: Workaround for sandbox restrictions on package manager commands
- **Subtask**: subtask-1-1 (Phase 1: Reproduce and Environment Setup)
- **Blocking**: All subsequent subtasks in the investigation workflow
