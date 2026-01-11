# Rate Limiting Documentation

## Overview

WorkHub implements Redis-based rate limiting on authentication and sensitive API endpoints to prevent brute force attacks, user enumeration, denial of service, and abuse of administrative functions.

## Rate Limiting Strategy

### Algorithm: Sliding Window

We use a **sliding window algorithm** that tracks individual request timestamps within a time window. This provides accurate rate limiting compared to fixed-window approaches:

- **Accurate**: Prevents burst attacks at window boundaries
- **Fair**: Ensures consistent limits across any time period
- **Efficient**: Redis-backed with automatic cleanup of old timestamps

### Identifier Types

Rate limits are enforced based on:

1. **IP Address** (`identifier="ip"`)
   - Used for guest/public endpoints
   - Detects client IP from `X-Forwarded-For` header (proxy support)
   - Falls back to direct connection IP
   - Prevents enumeration and DoS attacks

2. **Authenticated User** (`identifier="user"`)
   - Used for sensitive operations requiring authentication
   - Tracks limits per user account
   - Prevents abuse from compromised accounts
   - Falls back to IP-based limiting for Guest users

### Graceful Degradation

If Redis is unavailable, the rate limiter **fails open** (allows requests) to prevent blocking legitimate traffic. Errors are logged for monitoring.

## Rate Limit Configuration

### Categories

Rate limits are organized into three categories (defined in `config/rate_limits.py`):

| Category | Limit | Window | Use Case |
|----------|-------|--------|----------|
| `AUTH_RATE_LIMIT` | 5 req/min | 60 sec | Authentication operations (login, token generation) |
| `GUEST_RATE_LIMIT` | 20 req/min | 60 sec | Public endpoints accessible to guests |
| `SENSITIVE_RATE_LIMIT` | 10 req/min | 60 sec | Sensitive operations (user creation, invitations) |

### Endpoint-Specific Limits

| Endpoint | Limit | Window | Identifier | Purpose |
|----------|-------|--------|------------|---------|
| `generate_api_token` | 5/min | 60 sec | user | Prevent credential stuffing attacks |
| `get_logged_user` | 20/min | 60 sec | ip | Prevent user enumeration |
| `get_user_info` | 15/min | 60 sec | ip | Prevent information leakage |
| `get_social_login_url` | 10/min | 60 sec | ip | Prevent OAuth flood attacks |
| `create_user` | 10/min | 60 sec | user | Prevent mass account creation |
| `send_invitation` | 10/min | 60 sec | user | Prevent invitation spam |
| `assign_role` | 20/min | 60 sec | user | Allow batch operations, prevent abuse |
| `remove_role` | 20/min | 60 sec | user | Allow batch operations, prevent abuse |

## Usage

### Applying Rate Limits

Use the `@rate_limit` decorator on any `@frappe.whitelist()` method:

```python
from workhub_frappe_app.api.rate_limiter import rate_limit

# IP-based rate limiting (for guest endpoints)
@frappe.whitelist(allow_guest=True)
@rate_limit(limit=20, window=60)
def get_logged_user():
    return frappe.session.user

# User-based rate limiting (for authenticated endpoints)
@frappe.whitelist()
@rate_limit(limit=5, window=60, identifier="user")
def generate_api_token():
    # ... implementation
    pass
```

### Decorator Parameters

- `limit` (int, required): Maximum number of requests allowed
- `window` (int, required): Time window in seconds
- `identifier` (str, optional): `"ip"` (default) or `"user"`
- `endpoint` (str, optional): Custom endpoint name (defaults to function name)

### Response Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 20          # Maximum requests allowed in window
X-RateLimit-Remaining: 15      # Requests remaining in current window
X-RateLimit-Reset: 1704988800  # Unix timestamp when limit resets
```

When rate limit is exceeded (HTTP 429):

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704988800
Retry-After: 45                # Seconds until limit resets

{
    "exc": "Rate limit exceeded. Please try again in 45 seconds."
}
```

## Client-Side Handling

### Handling 429 Responses

Clients should implement exponential backoff and respect the `Retry-After` header:

```javascript
async function callAPI(url, options) {
    const response = await fetch(url, options);

    if (response.status === 429) {
        // Get retry delay from header
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');

        // Show user-friendly message
        console.warn(`Rate limit exceeded. Retrying in ${retryAfter} seconds...`);

        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return callAPI(url, options);
    }

    return response;
}
```

### Best Practices

1. **Check Rate Limit Headers**
   ```javascript
   const remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
   if (remaining < 5) {
       console.warn('Approaching rate limit');
   }
   ```

2. **Implement Retry Logic**
   ```javascript
   function retryWithBackoff(fn, maxRetries = 3) {
       return async function(...args) {
           for (let i = 0; i < maxRetries; i++) {
               try {
                   return await fn(...args);
               } catch (error) {
                   if (error.status === 429 && i < maxRetries - 1) {
                       const delay = Math.pow(2, i) * 1000; // Exponential backoff
                       await new Promise(resolve => setTimeout(resolve, delay));
                   } else {
                       throw error;
                   }
               }
           }
       };
   }
   ```

3. **Cache Responses**
   - Cache non-sensitive data to reduce API calls
   - Use `X-RateLimit-Reset` to know when to clear cache

4. **Batch Operations**
   - Group multiple operations when possible
   - For role assignments, use bulk endpoints if available

### Example: Login Flow

```javascript
async function login(email, password) {
    try {
        const response = await fetch('/api/method/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usr: email, pwd: password })
        });

        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new Error(`Too many login attempts. Please try again in ${retryAfter} seconds.`);
        }

        return await response.json();
    } catch (error) {
        // Handle rate limit error with user-friendly message
        console.error('Login failed:', error.message);
        throw error;
    }
}
```

## Configuration Customization

### Modifying Rate Limits

Edit `frappe-app/workhub_frappe_app/config/rate_limits.py`:

```python
# Increase guest endpoint limit
GUEST_RATE_LIMIT = {
    "limit": 30,  # Changed from 20
    "window": RATE_LIMIT_WINDOW,
    "description": "Public endpoints accessible to guests"
}

# Add new endpoint-specific limit
ENDPOINT_LIMITS = {
    # ... existing limits
    "my_new_endpoint": {
        "limit": 100,
        "window": RATE_LIMIT_WINDOW,
        "identifier": "user",
        "description": "Custom endpoint with high limit"
    }
}
```

### Using Configuration Helper

```python
from workhub_frappe_app.config.rate_limits import get_rate_limit_config

# Get configuration for specific endpoint
config = get_rate_limit_config("generate_api_token")
# Returns: {"limit": 5, "window": 60, "identifier": "user", ...}

# Get category default
config = get_rate_limit_config("my_endpoint", category="auth")
# Returns: {"limit": 5, "window": 60, "identifier": "ip", ...}
```

## Monitoring

### Redis Keys

Rate limit data is stored in Redis with keys:

```
rate_limit:ip:127.0.0.1:get_logged_user
rate_limit:user:admin@example.com:generate_api_token
```

### Checking Current Usage

```bash
# Connect to Redis
redis-cli

# Check all rate limit keys
KEYS rate_limit:*

# Check specific user's rate limit
GET rate_limit:user:admin@example.com:generate_api_token

# Check key TTL (time to live)
TTL rate_limit:user:admin@example.com:generate_api_token
```

### Logs

Rate limit errors are logged to Frappe's error log:

```python
frappe.log_error(
    f"Rate limiter error for key {key}: {str(e)}",
    "Rate Limiter Error"
)
```

View logs in Frappe Desk: **Settings > Error Log**

## Testing

### Unit Tests

Run rate limiter unit tests:

```bash
cd /Users/martinjaimesamperiz/santabrisa/frappe-bench
bench --site workhub.localhost run-tests --app workhub_frappe_app --module test_rate_limiter
```

### Integration Tests

Test actual endpoint behavior:

```bash
bench --site workhub.localhost run-tests --app workhub_frappe_app --module test_rate_limited_endpoints
```

### Manual Testing

```bash
# Test rate limiting with curl
for i in {1..25}; do
    echo "Request $i:"
    curl -i http://localhost:8001/api/method/workhub_frappe_app.api.auth.get_logged_user
    echo ""
done

# Should see HTTP 429 after 20 requests
```

## Security Considerations

1. **IP Spoofing**: The rate limiter trusts `X-Forwarded-For` headers. Ensure your reverse proxy/load balancer is configured to set this header correctly and strip client-provided values.

2. **Distributed Attacks**: Per-IP limiting may not prevent distributed attacks from botnets. Consider adding additional security layers (WAF, Cloudflare, etc.).

3. **Redis Security**: Ensure Redis is not publicly accessible and requires authentication if exposed to network.

4. **Rate Limit Tuning**: Monitor production traffic and adjust limits as needed. Start conservative and increase based on legitimate usage patterns.

5. **Bypass for Testing**: Never disable rate limiting in production. For testing, use a separate test environment.

## Troubleshooting

### Rate Limiting Not Working

1. **Check Redis Connection**
   ```python
   frappe.cache().get_value("test_key")  # Should work
   ```

2. **Verify Decorator Order**
   ```python
   # Correct order
   @frappe.whitelist()
   @rate_limit(limit=5, window=60)
   def my_endpoint():
       pass
   ```

3. **Check Error Logs**
   - Settings > Error Log in Frappe Desk
   - Look for "Rate Limiter Error" entries

### Legitimate Users Getting Rate Limited

1. **Increase Limit**: Adjust limit in `config/rate_limits.py`
2. **Check for Loops**: Ensure client code isn't making excessive requests
3. **Review Identifier**: Switch from IP to user-based if multiple users share IP (NAT)

### Redis Connection Errors

Rate limiter fails open - requests are allowed but errors are logged. Check:
- Redis service status
- Redis connection settings in Frappe
- Network connectivity

## Architecture

### Components

```
┌─────────────────────────────────────────────┐
│  @frappe.whitelist()                        │
│  @rate_limit(limit=20, window=60)           │
│  def my_endpoint():                         │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  rate_limiter.py                            │
│  ├─ Get client IP / user                    │
│  ├─ Generate Redis key                      │
│  ├─ Check rate limit                        │
│  └─ Set response headers                    │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  RateLimiter Class                          │
│  ├─ Get timestamps from Redis               │
│  ├─ Filter old timestamps (sliding window)  │
│  ├─ Check if under limit                    │
│  ├─ Add current timestamp if allowed        │
│  └─ Return (allowed, remaining, reset_time) │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  Redis (Frappe Cache)                       │
│  Key: rate_limit:{type}:{id}:{endpoint}     │
│  Value: [timestamp1, timestamp2, ...]       │
│  TTL: window + 1 second                     │
└─────────────────────────────────────────────┘
```

### Redis Data Structure

```json
{
  "rate_limit:ip:127.0.0.1:get_logged_user": "[1704988735.123, 1704988740.456, 1704988745.789]",
  "rate_limit:user:admin@example.com:generate_api_token": "[1704988800.123]"
}
```

Each key stores a JSON array of Unix timestamps (with milliseconds) representing when requests were made within the current window.

---

**Last Updated**: 2026-01-11
**Author**: Auto-Claude
**Version**: 1.0
