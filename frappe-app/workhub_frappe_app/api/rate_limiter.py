# WorkHub Rate Limiter
# Redis-based rate limiting for API endpoints using sliding window algorithm

import time
import frappe
from frappe import _
from functools import wraps


class RateLimiter:
    """
    Redis-based rate limiter using sliding window algorithm.

    Provides accurate rate limiting by tracking individual request timestamps
    within a sliding time window, ensuring fair usage limits.
    """

    def __init__(self, limit, window):
        """
        Initialize rate limiter.

        Args:
            limit: Maximum number of requests allowed
            window: Time window in seconds
        """
        self.limit = limit
        self.window = window
        self.cache = frappe.cache()

    def check_and_increment(self, key):
        """
        Check if request is allowed and increment counter if so.

        Uses sliding window algorithm:
        1. Remove timestamps older than the window
        2. Check if count is below limit
        3. Add current timestamp if allowed

        Args:
            key: Redis key for rate limiting (e.g., "rate_limit:ip:127.0.0.1")

        Returns:
            tuple: (allowed: bool, remaining: int, reset_time: int)
                - allowed: Whether the request is allowed
                - remaining: Number of requests remaining in window
                - reset_time: Unix timestamp when the oldest request expires
        """
        try:
            current_time = time.time()
            window_start = current_time - self.window

            # Get existing timestamps from Redis
            timestamps_str = self.cache.get_value(key) or "[]"

            # Parse timestamps (stored as JSON array)
            import json
            try:
                timestamps = json.loads(timestamps_str)
            except (json.JSONDecodeError, TypeError):
                timestamps = []

            # Remove timestamps outside the sliding window
            timestamps = [ts for ts in timestamps if ts > window_start]

            # Check if limit is exceeded
            allowed = len(timestamps) < self.limit

            if allowed:
                # Add current timestamp
                timestamps.append(current_time)

                # Store back in Redis with expiry
                self.cache.set_value(
                    key,
                    json.dumps(timestamps),
                    expires_in_sec=self.window + 1  # Extra second for safety
                )

            # Calculate remaining requests and reset time
            remaining = max(0, self.limit - len(timestamps))
            reset_time = int(timestamps[0] + self.window) if timestamps else int(current_time + self.window)

            return allowed, remaining, reset_time

        except Exception as e:
            # If Redis is down, fail open (allow request)
            # Log the error but don't block legitimate traffic
            frappe.log_error(
                f"Rate limiter error for key {key}: {str(e)}",
                "Rate Limiter Error"
            )
            return True, self.limit, int(time.time() + self.window)


def get_rate_limit_key(identifier_type, identifier_value, endpoint=None):
    """
    Generate a Redis key for rate limiting.

    Args:
        identifier_type: Type of identifier ("ip", "user", etc.)
        identifier_value: Value of the identifier (IP address, username, etc.)
        endpoint: Optional endpoint name for endpoint-specific limits

    Returns:
        str: Redis key for rate limiting

    Examples:
        get_rate_limit_key("ip", "127.0.0.1")
        # Returns: "rate_limit:ip:127.0.0.1"

        get_rate_limit_key("user", "admin@example.com", "generate_api_token")
        # Returns: "rate_limit:user:admin@example.com:generate_api_token"
    """
    if endpoint:
        return f"rate_limit:{identifier_type}:{identifier_value}:{endpoint}"
    return f"rate_limit:{identifier_type}:{identifier_value}"


def check_rate_limit(key, limit, window):
    """
    Check if a request is allowed under rate limiting rules.

    This is a convenience wrapper around RateLimiter class.

    Args:
        key: Redis key for rate limiting
        limit: Maximum number of requests allowed
        window: Time window in seconds

    Returns:
        tuple: (allowed: bool, remaining: int, reset_time: int)
    """
    limiter = RateLimiter(limit, window)
    return limiter.check_and_increment(key)


def increment_rate_limit(key, limit, window):
    """
    Track a request for rate limiting purposes.

    This function is an alias for check_rate_limit for clarity.
    Use check_rate_limit when you need to check if a request is allowed.
    Use this when you want to track that a request happened.

    Args:
        key: Redis key for rate limiting
        limit: Maximum number of requests allowed
        window: Time window in seconds

    Returns:
        tuple: (allowed: bool, remaining: int, reset_time: int)
    """
    return check_rate_limit(key, limit, window)


def get_client_ip():
    """
    Get the client IP address from the current request.

    Checks X-Forwarded-For header first (for proxied requests),
    then falls back to direct connection IP.

    Returns:
        str: Client IP address
    """
    if not frappe.request:
        return "unknown"

    # Check X-Forwarded-For header (proxy/load balancer)
    forwarded_for = frappe.request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can be comma-separated, take first IP
        return forwarded_for.split(",")[0].strip()

    # Fall back to direct connection IP
    return frappe.request.remote_addr or "unknown"


def rate_limit(limit, window, identifier="ip", endpoint=None):
    """
    Decorator to apply rate limiting to Frappe whitelist methods.

    Args:
        limit: Maximum number of requests allowed
        window: Time window in seconds
        identifier: Type of identifier to use ("ip" or "user")
        endpoint: Optional endpoint name (defaults to function name)

    Usage:
        @frappe.whitelist(allow_guest=True)
        @rate_limit(limit=20, window=60)  # 20 requests per minute per IP
        def get_logged_user():
            return frappe.session.user

        @frappe.whitelist()
        @rate_limit(limit=5, window=60, identifier="user")  # Per user limit
        def generate_api_token():
            # ... implementation

    Response Headers:
        X-RateLimit-Limit: Maximum requests allowed in window
        X-RateLimit-Remaining: Requests remaining in current window
        X-RateLimit-Reset: Unix timestamp when limit resets
        Retry-After: Seconds until limit resets (only on 429)

    Returns:
        429 Too Many Requests if limit exceeded, with proper headers
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Determine identifier value
            if identifier == "user":
                identifier_value = frappe.session.user
                # Don't rate limit Guest users by user, fall back to IP
                if identifier_value == "Guest":
                    identifier_value = get_client_ip()
                    identifier_type = "ip"
                else:
                    identifier_type = "user"
            else:
                identifier_type = "ip"
                identifier_value = get_client_ip()

            # Generate rate limit key
            endpoint_name = endpoint or fn.__name__
            key = get_rate_limit_key(identifier_type, identifier_value, endpoint_name)

            # Check rate limit
            allowed, remaining, reset_time = check_rate_limit(key, limit, window)

            # Set rate limit headers
            if frappe.response:
                frappe.response["http_headers"] = frappe.response.get("http_headers") or {}
                frappe.response["http_headers"]["X-RateLimit-Limit"] = str(limit)
                frappe.response["http_headers"]["X-RateLimit-Remaining"] = str(remaining)
                frappe.response["http_headers"]["X-RateLimit-Reset"] = str(reset_time)

            # If rate limit exceeded, return 429
            if not allowed:
                retry_after = reset_time - int(time.time())
                if frappe.response:
                    frappe.response["http_status_code"] = 429
                    frappe.response["http_headers"]["Retry-After"] = str(max(0, retry_after))

                frappe.throw(
                    _("Rate limit exceeded. Please try again in {0} seconds.").format(
                        max(0, retry_after)
                    ),
                    frappe.RateLimitExceededError
                )

            # Execute the wrapped function
            return fn(*args, **kwargs)

        return wrapper
    return decorator
