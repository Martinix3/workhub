# WorkHub Auth API
# Whitelisted methods for authentication

import frappe
from frappe import _
from frappe.utils.oauth import get_oauth2_authorize_url
from frappe.utils.password import get_decrypted_password
from workhub_frappe_app.api.rate_limiter import rate_limit


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=20, window=60)  # Rate Limiting: 20 requests/min per IP to prevent user enumeration attacks on this public endpoint
def get_logged_user():
    """
    Get the currently logged in user (Guest if not logged in).

    Rate Limiting Strategy:
    - Limit: 20 requests/minute per IP address
    - Rationale: This allow_guest=True endpoint could be abused for user enumeration.
      The limit is relatively permissive as it's a common check during session validation.
    - Protection: Prevents attackers from rapidly probing user sessions or enumerating accounts.
    """
    return frappe.session.user


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=15, window=60)  # Rate Limiting: 15 requests/min per IP to prevent information disclosure
def get_user_info():
    """
    Get user info for the logged in user.

    Rate Limiting Strategy:
    - Limit: 15 requests/minute per IP address
    - Rationale: This endpoint returns user details and could leak information if abused.
      Slightly stricter than get_logged_user as it exposes more sensitive data.
    - Protection: Prevents attackers from harvesting user information through rapid requests.
    """
    user = frappe.session.user
    if user == "Guest":
        return {
            "user": "Guest",
            "full_name": "Guest",
            "email": None,
            "user_image": None,
            "roles": []
        }

    user_doc = frappe.get_doc("User", user)
    return {
        "user": user,
        "full_name": user_doc.full_name,
        "email": user_doc.email,
        "user_image": user_doc.user_image,
        "roles": [r.role for r in user_doc.roles]
    }


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=10, window=60)  # Rate Limiting: 10 requests/min per IP to prevent OAuth flood attacks
def get_social_login_url(provider="google", redirect_to=None):
    """
    Get the OAuth authorization URL for a provider.

    The OAuth flow redirects to /workhub_auth_callback which generates
    an API token and redirects to the frontend with the token.

    Rate Limiting Strategy:
    - Limit: 10 requests/minute per IP address
    - Rationale: OAuth initiation should be rate limited to prevent flood attacks
      and abuse of OAuth provider resources.
    - Protection: Prevents attackers from overwhelming the OAuth flow or causing
      service disruption through excessive authorization requests.
    """
    try:
        # Use our custom callback page that generates the API token
        # The callback will then redirect to the frontend with the token
        callback_url = frappe.utils.get_url("/workhub_auth_callback")
        auth_url = get_oauth2_authorize_url(provider, callback_url)
        return {"url": auth_url}
    except Exception as e:
        frappe.log_error(f"Error getting OAuth URL: {e}")
        return {"error": str(e)}


@frappe.whitelist()
@rate_limit(limit=5, window=60, identifier="user")  # Rate Limiting: 5 requests/min PER USER (strictest limit) to prevent credential stuffing
def generate_api_token():
    """
    Generate or retrieve API token for the authenticated user.
    Called after OAuth to get a token for frontend API calls.
    Returns: { api_key, api_secret, token } where token = "api_key:api_secret"

    Rate Limiting Strategy:
    - Limit: 5 requests/minute PER AUTHENTICATED USER (not per IP)
    - Rationale: This is the most sensitive endpoint as it generates API credentials.
      Rate limiting by user (not IP) prevents abuse from compromised accounts.
    - Protection: Prevents credential stuffing attacks and unauthorized API token generation.
      Even if an attacker gains access to an account, they cannot generate unlimited tokens.
    """
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)

    user_doc = frappe.get_doc("User", user)

    # Check if user already has API keys
    api_key = user_doc.api_key
    api_secret = None

    if api_key:
        # Get existing secret
        try:
            api_secret = get_decrypted_password("User", user, "api_secret")
        except Exception:
            api_secret = None

    # Generate new keys if not exists
    if not api_key or not api_secret:
        api_key = frappe.generate_hash(length=15)
        api_secret = frappe.generate_hash(length=15)

        user_doc.api_key = api_key
        user_doc.api_secret = api_secret
        user_doc.save(ignore_permissions=True)
        frappe.db.commit()

    return {
        "api_key": api_key,
        "api_secret": api_secret,
        "token": f"{api_key}:{api_secret}"
    }
