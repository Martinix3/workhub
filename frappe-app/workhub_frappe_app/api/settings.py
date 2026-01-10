"""
WorkHub User Settings API
Manages user preferences, profile, and department access
"""

import frappe
from frappe import _
from frappe.utils import cstr
import json

from workhub_frappe_app.api.utils import require_auth, validate_json_input


# Department to Role mapping
DEPARTMENT_ROLES = {
    "SALES": ["Sales Manager", "Sales User", "Sales Master Manager"],
    "OPS": ["Manufacturing Manager", "Manufacturing User", "Stock Manager", "Stock User"],
    "MKT": ["Marketing Manager", "Marketing User"],
}

# All departments
ALL_DEPARTMENTS = ["SALES", "OPS", "MKT"]


# ========== HELPER FUNCTIONS ==========

def _get_default_notification_preferences():
    """
    Get default notification preferences with granular control.

    Returns:
        dict: Default notification preferences
    """
    return {
        "email": True,
        "push": False,
        "task_assigned": True,
        "task_status": True,
        "overdue_alerts": True,
        "order_status": True,
        "project_health": True,
        "digest_frequency": "daily"
    }


def _migrate_notification_preferences(old_prefs):
    """
    Migrate old notification format to new granular format.
    Ensures backwards compatibility with existing settings.

    Args:
        old_prefs (dict): Old format preferences

    Returns:
        dict: Migrated preferences with granular fields
    """
    # Start with defaults
    new_prefs = _get_default_notification_preferences()

    # Keep existing email/push settings if present
    if "email" in old_prefs:
        new_prefs["email"] = old_prefs["email"]
    if "push" in old_prefs:
        new_prefs["push"] = old_prefs["push"]

    # Handle old 'digest' field -> 'digest_frequency'
    if "digest" in old_prefs:
        new_prefs["digest_frequency"] = old_prefs["digest"]

    # If already has granular fields, preserve them
    for field in ["task_assigned", "task_status", "overdue_alerts",
                  "order_status", "project_health", "digest_frequency"]:
        if field in old_prefs:
            new_prefs[field] = old_prefs[field]

    return new_prefs


def _validate_notification_preferences(prefs):
    """
    Validate and sanitize notification preferences.
    Ensures all required fields exist with valid values.

    Args:
        prefs (dict): Raw notification preferences from user

    Returns:
        dict: Validated preferences with all required fields
    """
    # Start with defaults to ensure all fields exist
    validated = _get_default_notification_preferences()

    # Update with provided values, validating types
    if "email" in prefs and isinstance(prefs["email"], bool):
        validated["email"] = prefs["email"]

    if "push" in prefs and isinstance(prefs["push"], bool):
        validated["push"] = prefs["push"]

    # Validate boolean notification type preferences
    for field in ["task_assigned", "task_status", "overdue_alerts",
                  "order_status", "project_health"]:
        if field in prefs and isinstance(prefs[field], bool):
            validated[field] = prefs[field]

    # Validate digest_frequency
    if "digest_frequency" in prefs:
        if prefs["digest_frequency"] in ["daily", "weekly", "none"]:
            validated["digest_frequency"] = prefs["digest_frequency"]

    # Handle old 'digest' field for backwards compatibility
    if "digest" in prefs and "digest_frequency" not in prefs:
        if prefs["digest"] in ["daily", "weekly", "none"]:
            validated["digest_frequency"] = prefs["digest"]

    return validated


@frappe.whitelist()
def get_user_settings():
    """
    Get current user's settings/preferences.

    Returns:
        dict: {
            theme: 'light' | 'dark' | 'system',
            language: 'es' | 'en',
            notifications: {
                email: bool,
                push: bool,
                task_assigned: bool,
                task_status: bool,
                overdue_alerts: bool,
                order_status: bool,
                project_health: bool,
                digest_frequency: 'daily'|'weekly'|'none'
            },
            department_access: ['SALES', 'OPS', 'MKT']
        }
    """
    require_auth()
    user = frappe.session.user

    # Try to get existing settings from User doctype custom fields
    # If not available, return defaults
    user_doc = frappe.get_doc("User", user)

    # Get theme from user_type or default
    theme = getattr(user_doc, 'workhub_theme', None) or 'system'
    language = user_doc.language or 'es'

    # Notification settings (stored as JSON in custom field or defaults)
    notifications_json = getattr(user_doc, 'workhub_notifications', None)
    if notifications_json:
        try:
            notifications = json.loads(notifications_json)
            # Migrate old format to new format (backwards compatibility)
            notifications = _migrate_notification_preferences(notifications)
        except (json.JSONDecodeError, TypeError):
            notifications = _get_default_notification_preferences()
    else:
        notifications = _get_default_notification_preferences()

    # Department access based on user roles
    department_access = get_user_departments(user)

    return {
        "theme": theme,
        "language": language,
        "notifications": notifications,
        "department_access": department_access
    }


@frappe.whitelist()
def update_user_settings(settings):
    """
    Update current user's settings/preferences.

    Args:
        settings: JSON string or dict with keys:
            - theme: 'light' | 'dark' | 'system'
            - language: 'es' | 'en'
            - notifications: {
                email: bool,
                push: bool,
                task_assigned: bool,
                task_status: bool,
                overdue_alerts: bool,
                order_status: bool,
                project_health: bool,
                digest_frequency: 'daily'|'weekly'|'none'
              }

    Returns:
        dict: Updated settings
    """
    require_auth()
    user = frappe.session.user

    if isinstance(settings, str):
        settings = json.loads(settings)

    user_doc = frappe.get_doc("User", user)

    # Update theme if provided
    if "theme" in settings:
        theme = settings["theme"]
        if theme in ["light", "dark", "system"]:
            # Store in custom field if exists, otherwise skip
            if hasattr(user_doc, 'workhub_theme'):
                user_doc.workhub_theme = theme

    # Update language if provided
    if "language" in settings:
        lang = settings["language"]
        if lang in ["es", "en"]:
            user_doc.language = lang

    # Update notifications if provided
    if "notifications" in settings:
        notif = settings["notifications"]
        # Validate and sanitize notification preferences
        validated_notif = _validate_notification_preferences(notif)
        if hasattr(user_doc, 'workhub_notifications'):
            user_doc.workhub_notifications = json.dumps(validated_notif)

    user_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return get_user_settings()


@frappe.whitelist()
def get_user_profile():
    """
    Get current user's profile information.

    Returns:
        dict: {
            email: str,
            full_name: str,
            first_name: str,
            last_name: str,
            user_image: str | None,
            roles: list[str],
            departments: list[str]
        }
    """
    require_auth()
    user = frappe.session.user

    user_doc = frappe.get_doc("User", user)

    return {
        "email": user_doc.email,
        "full_name": user_doc.full_name,
        "first_name": user_doc.first_name or "",
        "last_name": user_doc.last_name or "",
        "user_image": user_doc.user_image,
        "roles": [r.role for r in user_doc.roles],
        "departments": get_user_departments(user)
    }


@frappe.whitelist()
def update_user_profile(data):
    """
    Update current user's profile.

    Args:
        data: JSON string or dict with keys:
            - first_name: str
            - last_name: str
            - user_image: str (URL)

    Returns:
        dict: Updated profile
    """
    require_auth()
    user = frappe.session.user

    if isinstance(data, str):
        data = json.loads(data)

    user_doc = frappe.get_doc("User", user)

    # Update allowed fields
    if "first_name" in data:
        user_doc.first_name = cstr(data["first_name"])

    if "last_name" in data:
        user_doc.last_name = cstr(data["last_name"])

    # Update full_name
    user_doc.full_name = f"{user_doc.first_name or ''} {user_doc.last_name or ''}".strip()

    if "user_image" in data:
        user_doc.user_image = data["user_image"]

    user_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return get_user_profile()


@frappe.whitelist()
def get_available_departments():
    """
    Get list of departments the current user has access to.
    Based on user roles mapped to departments.

    Returns:
        list: List of department objects with id and name
    """
    require_auth()
    user = frappe.session.user

    departments = get_user_departments(user)

    # Return as list of objects for frontend
    department_info = {
        "SALES": {"id": "SALES", "name": "Ventas", "icon": "shopping-cart"},
        "OPS": {"id": "OPS", "name": "Operaciones", "icon": "factory"},
        "MKT": {"id": "MKT", "name": "Marketing", "icon": "megaphone"},
    }

    return [department_info[d] for d in departments if d in department_info]


def get_user_departments(user):
    """
    Helper function to get departments based on user roles.
    System Manager and Administrator have access to all departments.

    Args:
        user: User email/name

    Returns:
        list: List of department codes ['SALES', 'OPS', 'MKT']
    """
    user_roles = set(frappe.get_roles(user))

    # System Manager and Administrator have access to all
    if "System Manager" in user_roles or "Administrator" in user_roles:
        return ALL_DEPARTMENTS

    # Check which departments user has access to based on roles
    departments = []
    for dept, roles in DEPARTMENT_ROLES.items():
        if any(role in user_roles for role in roles):
            departments.append(dept)

    # If no specific department roles, give access to all (default for now)
    if not departments:
        return ALL_DEPARTMENTS

    return departments
