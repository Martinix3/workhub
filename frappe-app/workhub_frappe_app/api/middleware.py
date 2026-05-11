# WorkHub Auth Middleware
# Authenticates requests using the workhub_auth cookie

import frappe
from frappe.utils.password import get_decrypted_password


def authenticate_with_cookie():
    """
    Middleware to authenticate requests using the workhub_auth cookie.

    This function runs before each request and attempts to authenticate the user
    based on the API token stored in the HTTP-only cookie. If authentication
    succeeds, it sets frappe.session.user to the authenticated user.

    The middleware only processes the cookie if:
    1. The user is currently a Guest (not already authenticated)
    2. The workhub_auth cookie is present
    3. The token is valid

    Returns:
        None - Modifies frappe.session.user in place
    """
    # Skip if user is already authenticated (not Guest)
    if frappe.session.user and frappe.session.user != "Guest":
        return

    # Skip if no request object (e.g., background jobs)
    if not hasattr(frappe.local, "request") or not frappe.local.request:
        return

    # Read the auth cookie
    token = frappe.local.request.cookies.get("workhub_auth")

    if not token:
        # No cookie present - user remains as Guest
        return

    try:
        # Parse token (format: api_key:api_secret)
        parts = token.split(":")
        if len(parts) != 2:
            # Invalid token format - log and continue as Guest
            frappe.log_error("Invalid token format in workhub_auth cookie", "Auth Middleware")
            return

        api_key, api_secret = parts

        # Find user by API key
        users = frappe.get_all("User", filters={"api_key": api_key}, fields=["name"])

        if not users:
            # Invalid API key - log and continue as Guest
            frappe.log_error(f"Invalid API key in workhub_auth cookie: {api_key}", "Auth Middleware")
            return

        user_name = users[0].name

        # Validate API secret
        try:
            stored_secret = get_decrypted_password("User", user_name, fieldname="api_secret")
        except Exception as e:
            frappe.log_error(f"Could not retrieve API secret for user {user_name}: {e}", "Auth Middleware")
            return

        if stored_secret != api_secret:
            # Invalid API secret - log and continue as Guest
            frappe.log_error(f"Invalid API secret for user {user_name}", "Auth Middleware")
            return

        # Authentication successful - set the session user
        frappe.set_user(user_name)

    except Exception as e:
        # Log any unexpected errors but don't break the request
        frappe.log_error(f"Error in cookie auth middleware: {e}", "Auth Middleware")
        return


def add_cors_credentials_header():
    """
    Middleware to add Access-Control-Allow-Credentials header to responses.

    This function runs after each request and adds the necessary CORS header
    to allow cookies to be sent with cross-origin requests. This is required
    for cookie-based authentication to work when the frontend and backend are
    on different origins (e.g., different ports in development).

    The Access-Control-Allow-Credentials header must be set to 'true' to allow
    the browser to send cookies with cross-origin requests when using
    credentials: 'include' in the frontend fetch options.

    Returns:
        None - Modifies response headers in place
    """
    # Skip if no response object
    if not hasattr(frappe.local, "response") or not frappe.local.response:
        return

    # Add the Access-Control-Allow-Credentials header
    # This tells the browser it's safe to expose the response to frontend JavaScript
    # when the request's credentials mode is 'include'
    frappe.local.response.headers["Access-Control-Allow-Credentials"] = "true"
