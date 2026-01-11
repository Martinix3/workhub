# WorkHub Auth API
# Whitelisted methods for authentication

import os
import frappe
from frappe import _
from frappe.utils.oauth import get_oauth2_authorize_url
from frappe.utils.password import get_decrypted_password


@frappe.whitelist(allow_guest=True)
def get_logged_user():
    """Get the currently logged in user (Guest if not logged in)"""
    return frappe.session.user


@frappe.whitelist(allow_guest=True)
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
    an API token and sets it in a secure HTTP-only cookie.
    """
    try:
        # Use our custom callback page that generates and stores the API token
        # The callback sets the token in a secure HTTP-only cookie
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


@frappe.whitelist(allow_guest=True)
def verify_auth_cookie():
    """
    Verify the auth cookie and return user info.
    Reads the workhub_auth cookie, validates the token, and returns user information.
    This endpoint allows the frontend to verify authentication without passing tokens in headers.

    Returns:
        dict: User information if authenticated, or error if not
    """
    # Read the auth cookie
    token = frappe.local.request.cookies.get("workhub_auth")

    if not token:
        return {
            "authenticated": False,
            "user": "Guest",
            "error": "No auth cookie found"
        }

    # Parse token (format: api_key:api_secret)
    try:
        parts = token.split(":")
        if len(parts) != 2:
            return {
                "authenticated": False,
                "user": "Guest",
                "error": "Invalid token format"
            }

        api_key, api_secret = parts

        # Find user by API key
        users = frappe.get_all("User", filters={"api_key": api_key}, fields=["name"])

        if not users:
            return {
                "authenticated": False,
                "user": "Guest",
                "error": "Invalid API key"
            }

        user_name = users[0].name

        # Validate API secret
        try:
            stored_secret = get_decrypted_password("User", user_name, fieldname="api_secret")
        except Exception:
            return {
                "authenticated": False,
                "user": "Guest",
                "error": "Could not retrieve API secret"
            }

        if stored_secret != api_secret:
            return {
                "authenticated": False,
                "user": "Guest",
                "error": "Invalid API secret"
            }

        # Token is valid - get user info
        user_doc = frappe.get_doc("User", user_name)

        return {
            "authenticated": True,
            "user": user_name,
            "full_name": user_doc.full_name,
            "email": user_doc.email,
            "user_image": user_doc.user_image,
            "roles": [r.role for r in user_doc.roles]
        }

    except Exception as e:
        frappe.log_error(f"Error verifying auth cookie: {e}")
        return {
            "authenticated": False,
            "user": "Guest",
            "error": "Authentication verification failed"
        }


@frappe.whitelist(allow_guest=True)
def logout():
    """
    Logout by clearing the auth cookie.
    Sets the workhub_auth cookie with an expired date to clear it from the browser.

    Returns:
        dict: Success message
    """
    is_production = os.environ.get("FRAPPE_ENV", "development") == "production"

    # Clear the auth cookie by setting it with max_age=0 (immediate expiry)
    # Match all cookie attributes from when it was set (including secure flag)
    frappe.local.cookie_manager.set_cookie(
        key="workhub_auth",
        value="",
        httponly=True,
        secure=is_production,  # Match the original cookie settings
        samesite="Lax",
        max_age=0,  # Immediate expiry
        path="/"
    )

    return {
        "success": True,
        "message": "Logged out successfully"
    }
