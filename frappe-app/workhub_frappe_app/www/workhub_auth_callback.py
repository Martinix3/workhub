# WorkHub Auth Callback
# Generates API token and sets it in a secure HTTP-only cookie

import frappe
from frappe.utils.password import get_decrypted_password
import os

no_cache = 1

def get_context(context):
    """Generate API token for authenticated user and set it in a secure cookie"""
    user = frappe.session.user
    frontend_url = frappe.conf.get("workhub_frontend_url", "http://localhost:5177")
    is_production = os.environ.get("FRAPPE_ENV", "development") == "production"

    if user == "Guest":
        # Not logged in - redirect to frontend with error
        context.redirect_url = f"{frontend_url}?auth_error=not_authenticated"
        return context

    try:
        user_doc = frappe.get_doc("User", user)

        # Check if user already has API keys
        api_key = user_doc.api_key
        api_secret = None

        if api_key:
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

        token = f"{api_key}:{api_secret}"

        # Set secure HTTP-only cookie
        frappe.local.cookie_manager.set_cookie(
            key="workhub_auth",
            value=token,
            httponly=True,
            secure=is_production,  # Only HTTPS in production
            samesite="Lax",  # CSRF protection while allowing OAuth redirect
            max_age=86400 * 7,  # 7 days
            path="/"
        )

        # Redirect to frontend without token in URL
        context.redirect_url = f"{frontend_url}?auth_success=true"

    except Exception as e:
        frappe.log_error(f"Auth callback error: {e}")
        context.redirect_url = f"{frontend_url}?auth_error={str(e)}"

    return context
