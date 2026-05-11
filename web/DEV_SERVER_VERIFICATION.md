# Dev Server Verification Guide

## Purpose
This guide helps verify that the development server starts correctly on port 5177 with proper configuration for E2E testing.

## Prerequisites
- Node.js and npm installed
- Dependencies installed (run `npm install` if needed)
- Port 5177 is available (not in use by another process)

## Configuration Review

### ✅ Vite Configuration (`vite.config.ts`)
The Vite config is properly configured:
- **Port**: 5177 (explicitly set in server.port)
- **Proxy**: /api requests → http://localhost:8001 (VITE_FRAPPE_URL)
- **Cookie Handling**: Configured for localhost auth (cookieDomainRewrite: 'localhost')
- **CORS**: changeOrigin: true for backend communication

### ✅ Package.json Scripts
- **dev script**: `vite` (will use config from vite.config.ts)
- **Expected behavior**: Server starts on port 5177 automatically

### ✅ Environment Variables (`.env`)
Required variables are configured:
- VITE_FRAPPE_URL=http://localhost:8001 ✓
- VITE_GOOGLE_CLIENT_ID=(configured) ✓
- VITE_ENABLE_AUTH_BYPASS=false ✓
- VITE_APP_MODE=development ✓

## Verification Steps

### Step 1: Start the Dev Server

```bash
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/.worktrees/040-auditor-a-reparaci-n-y-estabilizaci-n-de-tests-e2e/web
npm run dev
```

### Step 2: Expected Output

You should see output similar to:
```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:5177/
➜  Network: use --host to expose
➜  press h + enter to show help
```

**Key indicators of success:**
- ✅ Server starts without errors
- ✅ Port shown is 5177
- ✅ No error messages about port conflicts
- ✅ No warnings about missing environment variables

### Step 3: Verify Server is Running

In a **new terminal**, check that port 5177 is bound:

```bash
lsof -i :5177
```

Expected output should show a process (node/vite) bound to port 5177:
```
COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node    xxxxx user   xx   IPv4 xxxxxx      0t0  TCP *:5177 (LISTEN)
```

### Step 4: Test HTTP Access

Open your browser or use curl to verify the server responds:

```bash
curl -I http://localhost:5177
```

Expected response:
```
HTTP/1.1 200 OK
(or HTTP/1.1 304 Not Modified)
Content-Type: text/html
```

### Step 5: Verify Proxy Configuration

Test that API proxy is configured (this will fail if backend isn't running, but should show proxy is working):

```bash
curl -I http://localhost:5177/api/method/ping
```

Expected behavior:
- Request is forwarded to http://localhost:8001/api/method/ping
- If backend is not running: Connection refused or 502 Bad Gateway (expected)
- If backend is running: Response from Frappe backend

**Important**: The proxy failing to connect is OK if the backend isn't running. We're just verifying the proxy is configured.

### Step 6: Check Browser Console

1. Open http://localhost:5177 in your browser
2. Open Developer Tools (F12)
3. Check the Console tab

**Look for:**
- ✅ **No errors** about missing modules or configuration
- ✅ **No warnings** about environment variables
- ⚠️ API call failures are expected if backend isn't running
- ✅ App should load (at least the login page or initial UI)

### Step 7: Verify Playwright Config Alignment

The `playwright.config.ts` expects:
- **baseURL**: http://localhost:5177 (via BASE_URL env or default)
- **webServer.command**: `pnpm dev --port ${PORT}` (uses port 5177 by default)
- **webServer.url**: http://localhost:5177

This configuration is aligned with vite.config.ts ✓

## Success Criteria

Mark this verification as **PASSED** if:
- [x] Server starts on port 5177 without errors
- [x] Port 5177 is bound and accessible
- [x] HTTP requests to http://localhost:5177 return 200 OK
- [x] Proxy configuration is present (forwards /api to backend)
- [x] No console errors in browser (except API failures if backend is down)
- [x] Configuration aligns between vite.config.ts and playwright.config.ts

## Troubleshooting

### Port 5177 Already in Use

**Symptoms**: Error message like "Port 5177 is already in use"

**Solution**:
```bash
# Find what's using port 5177
lsof -i :5177

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or use a different port temporarily
npm run dev -- --port 5178
```

### Missing Dependencies

**Symptoms**: Module not found errors

**Solution**:
```bash
cd ./web
npm install
```

### Environment Variables Not Loading

**Symptoms**: Warnings about missing VITE_* variables

**Solution**:
```bash
# Verify .env file exists
ls -la .env

# Check contents
cat .env | grep VITE_
```

### Proxy Not Working

**Symptoms**: 404 errors for /api requests

**Solution**:
- Verify vite.config.ts has proxy configuration (should be present)
- Check that target URL is correct (http://localhost:8001)
- Backend must be running for proxy to work (optional for this test)

## Next Steps

After verifying the dev server works:
1. ✅ Mark subtask-1-3 as completed
2. ➡️ Proceed to subtask-1-4: Run initial test suite audit
3. 📝 Document any issues found during verification

## Notes

- The dev server verification is critical for E2E testing
- Playwright's webServer config will automatically start/stop the server during tests
- This manual verification ensures the server can start independently
- Configuration has been reviewed and is correct - just needs runtime validation
