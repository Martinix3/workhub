# WorkHub API Utilities
# Authentication and permission helpers for API endpoints

import frappe
from frappe import _


def require_auth():
    """
    Check if user is authenticated.
    Raises AuthenticationError if user is Guest.

    Usage:
        @frappe.whitelist()
        def my_endpoint():
            require_auth()
            # ... endpoint logic
    """
    if frappe.session.user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)


def require_permission(doctype: str, ptype: str = "read"):
    """
    Check if user has permission for a doctype.
    Also checks authentication first.

    Args:
        doctype: The DocType to check permission for
        ptype: Permission type - read, write, create, delete, submit, cancel

    Usage:
        @frappe.whitelist()
        def create_order(data):
            require_permission("Sales Order", "create")
            # ... endpoint logic
    """
    require_auth()
    if not frappe.has_permission(doctype, ptype):
        frappe.throw(
            _("You don't have permission to {0} {1}").format(ptype, doctype),
            frappe.PermissionError
        )


def require_any_role(*roles):
    """
    Check if user has any of the specified roles.

    Args:
        *roles: Role names to check

    Usage:
        @frappe.whitelist()
        def admin_only():
            require_any_role("System Manager", "Administrator")
            # ... endpoint logic
    """
    require_auth()
    user_roles = frappe.get_roles(frappe.session.user)
    if not any(role in user_roles for role in roles):
        frappe.throw(
            _("This action requires one of these roles: {0}").format(", ".join(roles)),
            frappe.PermissionError
        )


def get_current_user_info():
    """
    Get information about the current authenticated user.
    Returns None if user is Guest.

    Returns:
        dict with user, full_name, email, roles or None
    """
    if frappe.session.user == "Guest":
        return None

    user_doc = frappe.get_doc("User", frappe.session.user)
    return {
        "user": frappe.session.user,
        "full_name": user_doc.full_name,
        "email": user_doc.email,
        "roles": [r.role for r in user_doc.roles]
    }


def validate_json_input(data, required_fields: list):
    """
    Validate that required fields are present in input data.

    Args:
        data: Dict or JSON string to validate
        required_fields: List of required field names

    Returns:
        Parsed data dict

    Raises:
        ValidationError if required fields are missing
    """
    import json

    if isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            frappe.throw(_("Invalid JSON input"), frappe.ValidationError)

    if not isinstance(data, dict):
        frappe.throw(_("Input must be a JSON object"), frappe.ValidationError)

    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        frappe.throw(
            _("Missing required fields: {0}").format(", ".join(missing)),
            frappe.ValidationError
        )

    return data


def sanitize_search_term(term: str) -> str:
    """
    Sanitize search term to prevent SQL LIKE pattern manipulation.
    Escapes SQL wildcards (%, _) and backslashes to prevent injection attacks.

    Args:
        term: Search string to sanitize

    Returns:
        Sanitized string safe for use in LIKE clauses

    Usage:
        search = sanitize_search_term(filters.get('search'))
        filters = [['name', 'like', f'%{search}%']]
    """
    if not term:
        return ""

    # Escape in order: backslash first, then % and _
    # This prevents double-escaping
    sanitized = term.replace("\\", "\\\\")
    sanitized = sanitized.replace("%", "\\%")
    sanitized = sanitized.replace("_", "\\_")

    return sanitized
