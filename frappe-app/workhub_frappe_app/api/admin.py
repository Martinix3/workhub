"""
WorkHub Admin API
CRUD operations for users, roles, and invitations
Requires System Manager or HR Manager role
"""

import frappe
from frappe import _
from frappe.utils import cstr, now_datetime, random_string
import json

from workhub_frappe_app.api.utils import require_auth, require_any_role, validate_json_input


@frappe.whitelist()
def get_users(limit=50, offset=0, search=None):
    """
    List users with pagination and search.

    Args:
        limit: Max users to return (default 50)
        offset: Pagination offset (default 0)
        search: Search string for name or email

    Returns:
        dict: {
            users: list of user objects,
            total: total count,
            limit: current limit,
            offset: current offset
        }
    """
    require_any_role("System Manager", "HR Manager")

    filters = {"enabled": 1, "user_type": "System User"}

    if search:
        filters["full_name"] = ["like", f"%{search}%"]

    # Get total count
    total = frappe.db.count("User", filters)

    # SECURITY: ignore_permissions is safe here because:
    # - Function is protected by require_any_role("System Manager", "HR Manager")
    # - This is an administrative operation to list all users in the system
    # - Regular users don't have read access to User doctype
    # Get users
    users = frappe.get_list("User",
        filters=filters,
        fields=[
            "name", "email", "full_name", "first_name", "last_name",
            "user_image", "enabled", "creation", "last_active"
        ],
        limit_page_length=int(limit),
        limit_start=int(offset),
        order_by="full_name asc",
        ignore_permissions=True
    )

    # Add roles to each user
    for user in users:
        user["roles"] = [r.role for r in frappe.get_doc("User", user["name"]).roles]

    return {
        "users": users,
        "total": total,
        "limit": int(limit),
        "offset": int(offset)
    }


@frappe.whitelist()
def get_user_detail(user_id):
    """
    Get detailed information about a specific user.

    Args:
        user_id: User email/name

    Returns:
        dict: Full user object with roles and permissions
    """
    require_any_role("System Manager", "HR Manager")

    if not user_id:
        frappe.throw(_("User ID is required"))

    user_doc = frappe.get_doc("User", user_id)

    return {
        "name": user_doc.name,
        "email": user_doc.email,
        "full_name": user_doc.full_name,
        "first_name": user_doc.first_name,
        "last_name": user_doc.last_name,
        "user_image": user_doc.user_image,
        "enabled": user_doc.enabled,
        "user_type": user_doc.user_type,
        "creation": str(user_doc.creation),
        "last_active": str(user_doc.last_active) if user_doc.last_active else None,
        "roles": [r.role for r in user_doc.roles],
        "language": user_doc.language,
        "time_zone": user_doc.time_zone,
    }


@frappe.whitelist()
def create_user(email, first_name, last_name=None, roles=None, send_welcome_email=True):
    """
    Create a new user.

    Args:
        email: User email (required)
        first_name: First name (required)
        last_name: Last name (optional)
        roles: List of role names to assign (optional)
        send_welcome_email: Send welcome email (default True)

    Returns:
        dict: Created user object
    """
    require_any_role("System Manager")

    if not email or not first_name:
        frappe.throw(_("Email and first name are required"))

    # Check if user already exists
    if frappe.db.exists("User", email):
        frappe.throw(_("User with email {0} already exists").format(email))

    # Parse roles if string
    if roles and isinstance(roles, str):
        roles = json.loads(roles)

    # Create user
    user_doc = frappe.new_doc("User")
    user_doc.email = email
    user_doc.first_name = first_name
    user_doc.last_name = last_name or ""
    user_doc.full_name = f"{first_name} {last_name or ''}".strip()
    user_doc.user_type = "System User"
    user_doc.enabled = 1
    user_doc.language = "es"

    # Add roles
    if roles:
        for role_name in roles:
            if frappe.db.exists("Role", role_name):
                user_doc.append("roles", {"role": role_name})

    # Set a random password (user will reset via email)
    user_doc.new_password = random_string(16)

    # SECURITY: ignore_permissions is safe here because:
    # - Function is protected by require_any_role("System Manager")
    # - This is an administrative operation to create users
    # - Regular users don't have create permission on User doctype
    user_doc.flags.ignore_permissions = True
    user_doc.insert()

    # Send welcome email if requested
    if send_welcome_email:
        try:
            user_doc.send_welcome_email()
        except Exception:
            pass  # Don't fail if email can't be sent

    frappe.db.commit()

    return get_user_detail(user_doc.name)


@frappe.whitelist()
def update_user(user_id, data):
    """
    Update an existing user.

    Args:
        user_id: User email/name
        data: JSON string or dict with fields to update:
            - first_name, last_name, enabled, language

    Returns:
        dict: Updated user object
    """
    require_any_role("System Manager")

    if not user_id:
        frappe.throw(_("User ID is required"))

    if isinstance(data, str):
        data = json.loads(data)

    user_doc = frappe.get_doc("User", user_id)

    # Update allowed fields
    allowed_fields = ["first_name", "last_name", "enabled", "language", "time_zone"]
    for field in allowed_fields:
        if field in data:
            setattr(user_doc, field, data[field])

    # Update full_name if name fields changed
    if "first_name" in data or "last_name" in data:
        user_doc.full_name = f"{user_doc.first_name or ''} {user_doc.last_name or ''}".strip()

    # SECURITY: ignore_permissions is safe here because:
    # - Function is protected by require_any_role("System Manager")
    # - This is an administrative operation to update users
    # - Regular users don't have write permission on User doctype
    user_doc.flags.ignore_permissions = True
    user_doc.save()
    frappe.db.commit()

    return get_user_detail(user_id)


@frappe.whitelist()
def delete_user(user_id):
    """
    Disable a user (soft delete).
    Does not actually delete the user, just sets enabled=0.

    Args:
        user_id: User email/name

    Returns:
        dict: Success message
    """
    require_any_role("System Manager")

    if not user_id:
        frappe.throw(_("User ID is required"))

    # Prevent deleting yourself
    if user_id == frappe.session.user:
        frappe.throw(_("You cannot disable your own account"))

    # Prevent deleting Administrator
    if user_id == "Administrator":
        frappe.throw(_("Cannot disable Administrator account"))

    user_doc = frappe.get_doc("User", user_id)
    user_doc.enabled = 0
    # SECURITY: ignore_permissions is safe here because:
    # - Function is protected by require_any_role("System Manager")
    # - This is an administrative operation to disable users
    # - Regular users don't have write permission on User doctype
    user_doc.flags.ignore_permissions = True
    user_doc.save()
    frappe.db.commit()

    return {
        "success": True,
        "message": _("User {0} has been disabled").format(user_id)
    }


@frappe.whitelist()
def get_roles():
    """
    Get list of available roles.

    Returns:
        list: List of role objects with name and description
    """
    require_any_role("System Manager")

    # SECURITY: ignore_permissions is safe here because:
    # - Function is protected by require_any_role("System Manager")
    # - This is an administrative operation to list all available roles
    # - Regular users don't have read access to Role doctype
    # Get all non-disabled roles
    roles = frappe.get_list("Role",
        filters={"disabled": 0},
        fields=["name", "desk_access", "is_custom"],
        order_by="name asc",
        ignore_permissions=True
    )

    # Exclude internal roles
    internal_roles = {"Guest", "All", "Blogger", "Website Manager"}

    return [r for r in roles if r["name"] not in internal_roles]


@frappe.whitelist()
def assign_role(user_id, role):
    """
    Assign a role to a user.

    Args:
        user_id: User email/name
        role: Role name to assign

    Returns:
        dict: Updated user with roles
    """
    require_any_role("System Manager")

    if not user_id or not role:
        frappe.throw(_("User ID and role are required"))

    if not frappe.db.exists("Role", role):
        frappe.throw(_("Role {0} does not exist").format(role))

    user_doc = frappe.get_doc("User", user_id)

    # Check if role already assigned
    existing_roles = [r.role for r in user_doc.roles]
    if role in existing_roles:
        return {
            "success": True,
            "message": _("Role already assigned"),
            "roles": existing_roles
        }

    # Add the role
    user_doc.append("roles", {"role": role})
    # SECURITY: ignore_permissions is safe here because:
    # - Function is protected by require_any_role("System Manager")
    # - This is an administrative operation to assign roles
    # - Regular users don't have write permission on User doctype
    user_doc.flags.ignore_permissions = True
    user_doc.save()
    frappe.db.commit()

    return {
        "success": True,
        "message": _("Role {0} assigned to {1}").format(role, user_id),
        "roles": [r.role for r in user_doc.roles]
    }


@frappe.whitelist()
def remove_role(user_id, role):
    """
    Remove a role from a user.

    Args:
        user_id: User email/name
        role: Role name to remove

    Returns:
        dict: Updated user with roles
    """
    require_any_role("System Manager")

    if not user_id or not role:
        frappe.throw(_("User ID and role are required"))

    user_doc = frappe.get_doc("User", user_id)

    # Find and remove the role
    role_removed = False
    for i, r in enumerate(user_doc.roles):
        if r.role == role:
            user_doc.roles.remove(r)
            role_removed = True
            break

    if not role_removed:
        return {
            "success": True,
            "message": _("Role was not assigned"),
            "roles": [r.role for r in user_doc.roles]
        }

    # SECURITY: ignore_permissions is safe here because:
    # - Function is protected by require_any_role("System Manager")
    # - This is an administrative operation to remove roles
    # - Regular users don't have write permission on User doctype
    user_doc.flags.ignore_permissions = True
    user_doc.save()
    frappe.db.commit()

    return {
        "success": True,
        "message": _("Role {0} removed from {1}").format(role, user_id),
        "roles": [r.role for r in user_doc.roles]
    }


@frappe.whitelist()
def send_invitation(email, first_name=None, roles=None, message=None):
    """
    Send an invitation email to a new user.
    Creates the user account if it doesn't exist.

    Args:
        email: Email to invite
        first_name: First name (optional, will use email prefix if not provided)
        roles: List of roles to assign (optional)
        message: Custom message to include in email (optional)

    Returns:
        dict: Invitation result
    """
    require_any_role("System Manager")

    if not email:
        frappe.throw(_("Email is required"))

    # Parse roles if string
    if roles and isinstance(roles, str):
        roles = json.loads(roles)

    # Check if user already exists
    if frappe.db.exists("User", email):
        user_doc = frappe.get_doc("User", email)
        if user_doc.enabled:
            frappe.throw(_("User with email {0} already exists and is active").format(email))
        else:
            # Re-enable disabled user
            user_doc.enabled = 1
            # SECURITY: ignore_permissions is safe here because:
            # - Function is protected by require_any_role("System Manager")
            # - This is an administrative operation to re-enable users
            # - Regular users don't have write permission on User doctype
            user_doc.flags.ignore_permissions = True
            user_doc.save()
            user_doc.send_welcome_email()
            return {
                "success": True,
                "message": _("Existing user re-enabled and invitation sent"),
                "user_id": user_doc.name
            }

    # Create new user
    user_doc = frappe.new_doc("User")
    user_doc.email = email
    user_doc.first_name = first_name or email.split("@")[0]
    user_doc.full_name = user_doc.first_name
    user_doc.user_type = "System User"
    user_doc.enabled = 1
    user_doc.language = "es"
    user_doc.new_password = random_string(16)

    # Add roles
    if roles:
        for role_name in roles:
            if frappe.db.exists("Role", role_name):
                user_doc.append("roles", {"role": role_name})

    # SECURITY: ignore_permissions is safe here because:
    # - Function is protected by require_any_role("System Manager")
    # - This is an administrative operation to create users via invitation
    # - Regular users don't have create permission on User doctype
    user_doc.flags.ignore_permissions = True
    user_doc.insert()

    # Send welcome email
    try:
        user_doc.send_welcome_email()
    except Exception as e:
        frappe.db.commit()
        return {
            "success": True,
            "message": _("User created but email could not be sent: {0}").format(str(e)),
            "user_id": user_doc.name,
            "email_sent": False
        }

    frappe.db.commit()

    return {
        "success": True,
        "message": _("Invitation sent to {0}").format(email),
        "user_id": user_doc.name,
        "email_sent": True
    }
