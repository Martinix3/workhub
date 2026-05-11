"""
WorkHub User Settings API
Manages user preferences, profile, and department access
"""

import frappe
from frappe import _
from frappe.utils import cstr
import json

from workhub_frappe_app.api.utils import require_auth, validate_json_input
from workhub_frappe_app.api.notifications import get_user_notification_preferences


# Department to Role mapping
DEPARTMENT_ROLES = {
    "SALES": ["Sales Manager", "Sales User", "Sales Master Manager"],
    "OPS": ["Manufacturing Manager", "Manufacturing User", "Stock Manager", "Stock User"],
    "MKT": ["Marketing Manager", "Marketing User"],
}

# All departments
ALL_DEPARTMENTS = ["SALES", "OPS", "MKT"]


@frappe.whitelist()
def get_user_settings():
    """
    Get current user's settings/preferences.

    Returns:
        dict: {
            theme: 'light' | 'dark' | 'system',
            language: 'es' | 'en',
            notifications: {
                frequency: 'realtime' | 'daily' | 'weekly' | 'off',
                quiet_hours_enabled: bool,
                quiet_hours_start: str (HH:MM:SS),
                quiet_hours_end: str (HH:MM:SS),
                priority_bypass_enabled: bool,
                email_enabled: bool
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

    # Get notification preferences from WH Notification Preferences DocType
    # This returns: frequency, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
    # priority_bypass_enabled, email_enabled
    notifications = get_user_notification_preferences(user)

    # Department access based on user roles
    department_access = get_user_departments(user)

    return {
        "theme": theme,
        "language": language,
        "notifications": notifications,
        "department_access": department_access
    }


def _update_notification_preferences(user, notif_settings):
    """
    Update notification preferences in WH Notification Preferences DocType.
    Creates the record if it doesn't exist.

    Args:
        user: User email/name
        notif_settings: dict with notification preference fields

    Raises:
        frappe.ValidationError: If validation fails
    """
    prefs_name = user  # autoname is by user field

    # Get or create notification preferences
    try:
        prefs = frappe.get_doc("WH Notification Preferences", prefs_name)
    except frappe.DoesNotExistError:
        # Create new preferences
        prefs = frappe.new_doc("WH Notification Preferences")
        prefs.user = user

    # Update frequency if provided
    if "frequency" in notif_settings:
        frequency = notif_settings["frequency"]
        if frequency not in ["realtime", "daily", "weekly", "off"]:
            frappe.throw(_("Invalid frequency. Must be one of: realtime, daily, weekly, off"))
        prefs.frequency = frequency

    # Update email_enabled if provided
    if "email_enabled" in notif_settings:
        prefs.email_enabled = int(notif_settings["email_enabled"])

    # Update priority_bypass_enabled if provided
    if "priority_bypass_enabled" in notif_settings:
        prefs.priority_bypass_enabled = int(notif_settings["priority_bypass_enabled"])

    # Update quiet hours if provided
    if "quiet_hours_enabled" in notif_settings:
        quiet_hours_enabled = int(notif_settings["quiet_hours_enabled"])
        prefs.quiet_hours_enabled = quiet_hours_enabled

        # If quiet hours are enabled, validate start and end times
        if quiet_hours_enabled:
            quiet_start = notif_settings.get("quiet_hours_start", prefs.quiet_hours_start)
            quiet_end = notif_settings.get("quiet_hours_end", prefs.quiet_hours_end)

            # Ensure both times are provided when enabling
            if not quiet_start or not quiet_end:
                frappe.throw(_("Quiet hours start and end times are required when quiet hours are enabled"))

            # Note: We allow start > end for overnight quiet hours (e.g., 22:00 - 08:00)
            # The should_notify_immediately() function in notifications.py handles this case
            prefs.quiet_hours_start = quiet_start
            prefs.quiet_hours_end = quiet_end

    # Update individual quiet hours fields if provided (even when disabled)
    if "quiet_hours_start" in notif_settings and not prefs.quiet_hours_enabled:
        prefs.quiet_hours_start = notif_settings["quiet_hours_start"]

    if "quiet_hours_end" in notif_settings and not prefs.quiet_hours_enabled:
        prefs.quiet_hours_end = notif_settings["quiet_hours_end"]

    # Save preferences
    if prefs.is_new():
        prefs.insert(ignore_permissions=True)
    else:
        prefs.save(ignore_permissions=True)

    frappe.db.commit()

    # Clear cache so next get_user_notification_preferences() call fetches fresh data
    cache_key = f"notification_preferences:{user}"
    frappe.cache().delete_value(cache_key)


@frappe.whitelist()
def update_user_settings(settings):
    """
    Update current user's settings/preferences.

    Args:
        settings: JSON string or dict with keys:
            - theme: 'light' | 'dark' | 'system'
            - language: 'es' | 'en'
            - notifications: {
                frequency: 'realtime' | 'daily' | 'weekly' | 'off',
                quiet_hours_enabled: bool,
                quiet_hours_start: str (HH:MM:SS),
                quiet_hours_end: str (HH:MM:SS),
                priority_bypass_enabled: bool,
                email_enabled: bool
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

    user_doc.save(ignore_permissions=True)
    frappe.db.commit()

    # Update notification preferences in WH Notification Preferences DocType
    if "notifications" in settings:
        _update_notification_preferences(user, settings["notifications"])

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
