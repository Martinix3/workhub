# WorkHub Auth Callback
# Generates API token and redirects to frontend with token in URL

import frappe
from frappe.utils.password import get_decrypted_password

no_cache = 1

def get_context(context):
    """Generate API token for authenticated user and prepare redirect"""
    user = frappe.session.user
    frontend_url = frappe.conf.get("workhub_frontend_url", "http://localhost:5177")

    if user == "Guest":
        # Not logged in - redirect to frontend with error
        context.redirect_url = f"{frontend_url}?auth_error=not_authenticated"
        context.token = None
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

        # Get user info
        context.user_email = user
        context.user_name = user_doc.full_name or user
        context.token = token
        context.redirect_url = f"{frontend_url}?auth_success=true&token={token}"

    except Exception as e:
        frappe.log_error(f"Auth callback error: {e}")
        context.redirect_url = f"{frontend_url}?auth_error={str(e)}"
        context.token = None

    return context
