# WorkHub Auth API
# Whitelisted methods for authentication

import frappe
from frappe import _
from frappe.utils.oauth import get_oauth2_authorize_url
from frappe.utils.password import get_decrypted_password
from workhub_frappe_app.api.rate_limiter import rate_limit


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=20, window=60)
def get_logged_user():
    """Get the currently logged in user (Guest if not logged in)"""
    return frappe.session.user


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=15, window=60)
def get_user_info():
    """Get user info for the logged in user"""
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
def get_social_login_url(provider="google", redirect_to=None):
    """Get the OAuth authorization URL for a provider.

    The OAuth flow redirects to /workhub_auth_callback which generates
    an API token and redirects to the frontend with the token.
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
def generate_api_token():
    """
    Generate or retrieve API token for the authenticated user.
    Called after OAuth to get a token for frontend API calls.
    Returns: { api_key, api_secret, token } where token = "api_key:api_secret"
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
