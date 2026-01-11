# WorkHub Rate Limiting Configuration
# Centralized configuration for rate limits across different endpoint categories
#
# USAGE:
# ------
# This configuration file is used by the @rate_limit decorator in api/rate_limiter.py
# to determine appropriate limits for different endpoints.
#
# To apply rate limiting to an endpoint:
#   from workhub_frappe_app.api.rate_limiter import rate_limit
#
#   @frappe.whitelist()
#   @rate_limit(limit=10, window=60, identifier="user")
#   def my_sensitive_endpoint():
#       pass
#
# Or use the helper to get configuration:
#   from workhub_frappe_app.config.rate_limits import get_rate_limit_config
#
#   config = get_rate_limit_config("my_endpoint")
#
# MODIFYING LIMITS:
# -----------------
# 1. Edit the appropriate category (AUTH_RATE_LIMIT, GUEST_RATE_LIMIT, SENSITIVE_RATE_LIMIT)
# 2. Or add/update endpoint-specific limits in ENDPOINT_LIMITS
# 3. Restart Frappe bench to apply changes
# 4. Monitor logs for rate limit errors and adjust as needed
#
# See: frappe-app/workhub_frappe_app/api/RATE_LIMITING.md for complete documentation

"""
Rate Limiting Strategy:

This module defines rate limits for different categories of endpoints to prevent
abuse while allowing normal usage patterns:

1. AUTH_RATE_LIMIT: Strictest limits for authentication operations
   - Used for: Login, token generation, password resets
   - Rationale: These endpoints are targets for credential stuffing and brute force

2. GUEST_RATE_LIMIT: Moderate limits for public endpoints
   - Used for: Allow-guest endpoints like get_logged_user, user info
   - Rationale: Need to be accessible but prevent enumeration attacks

3. SENSITIVE_RATE_LIMIT: Limits for sensitive operations
   - Used for: User creation, invitations, OAuth flows
   - Rationale: Prevent spam, mass creation, and resource abuse

All limits use a per-minute window (60 seconds) for consistency.
"""

# Time window for all rate limits (in seconds)
RATE_LIMIT_WINDOW = 60  # 1 minute

# Authentication endpoints - Strictest limits
# Used for: generate_api_token, login, password reset
AUTH_RATE_LIMIT = {
    "limit": 5,
    "window": RATE_LIMIT_WINDOW,
    "description": "Authentication endpoints (login, token generation)"
}

# Guest/public endpoints - Moderate limits
# Used for: get_logged_user, public user info queries
GUEST_RATE_LIMIT = {
    "limit": 20,
    "window": RATE_LIMIT_WINDOW,
    "description": "Public endpoints accessible to guests"
}

# Sensitive operations - Strict but allows batch operations
# Used for: User creation, invitations, OAuth, role management
SENSITIVE_RATE_LIMIT = {
    "limit": 10,
    "window": RATE_LIMIT_WINDOW,
    "description": "Sensitive operations (user creation, invitations, OAuth)"
}

# Endpoint-specific overrides
# Use this for endpoints that need different limits than the category defaults
ENDPOINT_LIMITS = {
    # Auth endpoints
    "generate_api_token": {
        "limit": 5,
        "window": RATE_LIMIT_WINDOW,
        "identifier": "user",  # Rate limit per authenticated user
        "description": "API token generation - strict per-user limit"
    },

    # Guest endpoints
    "get_logged_user": {
        "limit": 20,
        "window": RATE_LIMIT_WINDOW,
        "identifier": "ip",  # Rate limit per IP
        "description": "Check logged-in user status"
    },
    "get_user_info": {
        "limit": 15,
        "window": RATE_LIMIT_WINDOW,
        "identifier": "ip",
        "description": "Get user information - slightly stricter to prevent info leakage"
    },

    # Sensitive operations
    "get_social_login_url": {
        "limit": 10,
        "window": RATE_LIMIT_WINDOW,
        "identifier": "ip",
        "description": "OAuth initiation - prevent OAuth flood attacks"
    },
    "create_user": {
        "limit": 10,
        "window": RATE_LIMIT_WINDOW,
        "identifier": "user",
        "description": "User creation - prevent mass account creation"
    },
    "send_invitation": {
        "limit": 10,
        "window": RATE_LIMIT_WINDOW,
        "identifier": "user",
        "description": "Send invitation - prevent invitation spam"
    },
    "assign_role": {
        "limit": 20,
        "window": RATE_LIMIT_WINDOW,
        "identifier": "user",
        "description": "Role assignment - allow batch operations but prevent abuse"
    },
    "remove_role": {
        "limit": 20,
        "window": RATE_LIMIT_WINDOW,
        "identifier": "user",
        "description": "Role removal - allow batch operations but prevent abuse"
    }
}


def get_rate_limit_config(endpoint_name, category=None):
    """
    Get rate limit configuration for a specific endpoint.

    Args:
        endpoint_name: Name of the endpoint (function name)
        category: Optional category ('auth', 'guest', 'sensitive') if not in ENDPOINT_LIMITS

    Returns:
        dict: Rate limit configuration with keys: limit, window, identifier (optional)

    Usage:
        from workhub_frappe_app.config.rate_limits import get_rate_limit_config

        # Get specific endpoint config
        config = get_rate_limit_config("generate_api_token")

        # Get category default
        config = get_rate_limit_config("my_auth_endpoint", category="auth")
    """
    # Check for endpoint-specific override
    if endpoint_name in ENDPOINT_LIMITS:
        return ENDPOINT_LIMITS[endpoint_name]

    # Fall back to category defaults
    category_map = {
        "auth": AUTH_RATE_LIMIT,
        "guest": GUEST_RATE_LIMIT,
        "sensitive": SENSITIVE_RATE_LIMIT
    }

    if category and category in category_map:
        config = category_map[category].copy()
        # Add default identifier if not specified
        if "identifier" not in config:
            config["identifier"] = "ip"
        return config

    # Default to guest limits if no category specified
    config = GUEST_RATE_LIMIT.copy()
    config["identifier"] = "ip"
    return config
