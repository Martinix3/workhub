# WH Saved Filters API
# CRUD operations for saved filter management

import frappe
from frappe import _
import json
from frappe.utils import nowdate, get_first_day, get_last_day
from frappe.utils.data import get_first_day_of_week, get_last_day_of_week

from workhub_frappe_app.api.utils import require_auth, require_permission


def resolve_filter_criteria(filter_json):
    """
    Resolve dynamic placeholders in filter criteria to actual values.
    This enables 'intelligent' filters where new items automatically match.

    Dynamic placeholders:
        - '$current_user' -> frappe.session.user
        - '$today' -> nowdate()
        - '$this_week' -> [start_of_week, end_of_week]
        - '$this_month' -> [start_of_month, end_of_month]

    Args:
        filter_json: Dict containing filter criteria with potential placeholders

    Returns:
        Dict with resolved placeholders

    Example:
        >>> resolve_filter_criteria({"assigned_to": "$current_user"})
        {"assigned_to": "user@example.com"}

        >>> resolve_filter_criteria({"due_date_value": "$this_week"})
        {"due_date_value": ["2026-01-06", "2026-01-12"]}
    """
    if not isinstance(filter_json, dict):
        return filter_json

    # Create a copy to avoid modifying the original
    resolved = filter_json.copy()

    # Get current date for date-based placeholders
    today = nowdate()

    # Resolve placeholders recursively
    for key, value in resolved.items():
        if isinstance(value, str):
            # Resolve string placeholders
            if value == "$current_user":
                resolved[key] = frappe.session.user
            elif value == "$today":
                resolved[key] = today
            elif value == "$this_week":
                # Return as list [start, end] for range operations
                week_start = get_first_day_of_week(today)
                week_end = get_last_day_of_week(today)
                resolved[key] = [str(week_start), str(week_end)]
            elif value == "$this_month":
                # Return as list [start, end] for range operations
                month_start = get_first_day(today)
                month_end = get_last_day(today)
                resolved[key] = [str(month_start), str(month_end)]
        elif isinstance(value, list):
            # Recursively resolve items in lists
            resolved[key] = [
                resolve_filter_criteria(item) if isinstance(item, dict) else item
                for item in value
            ]
        elif isinstance(value, dict):
            # Recursively resolve nested dicts
            resolved[key] = resolve_filter_criteria(value)

    return resolved


@frappe.whitelist()
def get_saved_filters(entity_type=None):
    """
    Get saved filters for current user.
    Returns user's own filters + shared filters + presets, sorted by sort_order.

    Args:
        entity_type: Optional filter by entity_type (task/project)

    Returns:
        List of saved filters
    """
    require_auth()

    # Build filters: user's own filters OR shared filters OR presets
    filter_conditions = [
        ["owner", "=", frappe.session.user],  # User's own filters
        ["is_shared", "=", 1],  # Shared filters
        ["is_preset", "=", 1]   # System presets
    ]

    # Combine with OR logic
    filters = {"or_filters": filter_conditions}

    # Add entity_type filter if specified
    if entity_type:
        filters["entity_type"] = entity_type

    saved_filters = frappe.get_list(
        "WH Saved Filter",
        filters=filters,
        fields=[
            "name", "title", "filter_json", "entity_type",
            "owner", "is_shared", "is_preset", "icon", "sort_order",
            "creation", "modified"
        ],
        order_by="sort_order asc, creation asc",
        ignore_permissions=False
    )

    # Parse filter_json for each filter
    for filter_data in saved_filters:
        if filter_data.get("filter_json"):
            try:
                filter_data["filter_json"] = json.loads(filter_data["filter_json"])
            except (json.JSONDecodeError, TypeError):
                filter_data["filter_json"] = {}
        else:
            filter_data["filter_json"] = {}

    return saved_filters


@frappe.whitelist()
def get_saved_filter(filter_id):
    """
    Get single saved filter details.

    Args:
        filter_id: ID of the saved filter

    Returns:
        Saved filter details
    """
    require_auth()

    if not filter_id:
        frappe.throw(_("Filter ID is required"))

    # Check if user has access (own filter, shared, or preset)
    filter_doc = frappe.get_doc("WH Saved Filter", filter_id)

    # Verify access
    if not (filter_doc.owner == frappe.session.user or
            filter_doc.is_shared == 1 or
            filter_doc.is_preset == 1):
        frappe.throw(_("You don't have permission to access this filter"),
                    frappe.PermissionError)

    result = filter_doc.as_dict()

    # Parse filter_json
    if result.get("filter_json"):
        try:
            result["filter_json"] = json.loads(result["filter_json"])
        except (json.JSONDecodeError, TypeError):
            result["filter_json"] = {}
    else:
        result["filter_json"] = {}

    return result


@frappe.whitelist()
def create_saved_filter(data):
    """
    Create a new saved filter.

    Args:
        data: Filter data (title, filter_json, entity_type, is_shared, icon)

    Returns:
        Success status and filter_id
    """
    require_permission("WH Saved Filter", "create")

    if isinstance(data, str):
        data = json.loads(data)

    if not data.get("title"):
        frappe.throw(_("Title is required"))

    if not data.get("entity_type"):
        frappe.throw(_("Entity type is required"))

    # Validate entity_type
    if data["entity_type"] not in ["task", "project"]:
        frappe.throw(_("Invalid entity type. Must be 'task' or 'project'"))

    # Create new filter
    doc = frappe.new_doc("WH Saved Filter")
    doc.title = data["title"]
    doc.entity_type = data["entity_type"]

    # Handle filter_json - convert dict to JSON string
    if data.get("filter_json"):
        if isinstance(data["filter_json"], dict):
            doc.filter_json = json.dumps(data["filter_json"])
        elif isinstance(data["filter_json"], str):
            # Validate it's valid JSON
            try:
                json.loads(data["filter_json"])
                doc.filter_json = data["filter_json"]
            except json.JSONDecodeError:
                frappe.throw(_("Invalid JSON in filter_json"))
        else:
            frappe.throw(_("filter_json must be a dict or JSON string"))
    else:
        doc.filter_json = json.dumps({})

    doc.is_shared = data.get("is_shared", 0)
    doc.icon = data.get("icon", "")
    doc.sort_order = data.get("sort_order", 0)

    # Presets can only be created by system - force is_preset to 0
    doc.is_preset = 0

    # Owner is automatically set by Frappe
    doc.insert()

    return {
        "success": True,
        "filter_id": doc.name,
        "message": _("Filter created successfully")
    }


@frappe.whitelist()
def update_saved_filter(filter_id, data):
    """
    Update an existing saved filter.

    Args:
        filter_id: ID of the filter to update
        data: Updated filter data

    Returns:
        Success status
    """
    require_permission("WH Saved Filter", "write")

    if isinstance(data, str):
        data = json.loads(data)

    if not filter_id:
        frappe.throw(_("Filter ID is required"))

    doc = frappe.get_doc("WH Saved Filter", filter_id)

    # Check if user owns this filter or is System Manager
    if doc.owner != frappe.session.user:
        # Check if user has System Manager role
        if "System Manager" not in frappe.get_roles(frappe.session.user):
            frappe.throw(_("You can only update your own filters"),
                        frappe.PermissionError)

    # Prevent updating preset filters (they're read-only)
    if doc.is_preset == 1:
        frappe.throw(_("Cannot update system preset filters"),
                    frappe.PermissionError)

    # Update allowed fields
    if "title" in data:
        doc.title = data["title"]

    if "filter_json" in data:
        if isinstance(data["filter_json"], dict):
            doc.filter_json = json.dumps(data["filter_json"])
        elif isinstance(data["filter_json"], str):
            # Validate it's valid JSON
            try:
                json.loads(data["filter_json"])
                doc.filter_json = data["filter_json"]
            except json.JSONDecodeError:
                frappe.throw(_("Invalid JSON in filter_json"))
        else:
            frappe.throw(_("filter_json must be a dict or JSON string"))

    if "entity_type" in data:
        if data["entity_type"] not in ["task", "project"]:
            frappe.throw(_("Invalid entity type. Must be 'task' or 'project'"))
        doc.entity_type = data["entity_type"]

    if "is_shared" in data:
        doc.is_shared = data["is_shared"]

    if "icon" in data:
        doc.icon = data["icon"]

    if "sort_order" in data:
        doc.sort_order = data["sort_order"]

    # Don't allow changing is_preset
    # Don't allow changing owner

    doc.save()

    return {
        "success": True,
        "filter_id": doc.name,
        "message": _("Filter updated successfully")
    }


@frappe.whitelist()
def delete_saved_filter(filter_id):
    """
    Delete a saved filter.
    Prevents deletion of preset filters.

    Args:
        filter_id: ID of the filter to delete

    Returns:
        Success status
    """
    require_permission("WH Saved Filter", "delete")

    if not filter_id:
        frappe.throw(_("Filter ID is required"))

    doc = frappe.get_doc("WH Saved Filter", filter_id)

    # Check if user owns this filter or is System Manager
    if doc.owner != frappe.session.user:
        # Check if user has System Manager role
        if "System Manager" not in frappe.get_roles(frappe.session.user):
            frappe.throw(_("You can only delete your own filters"),
                        frappe.PermissionError)

    # Prevent deleting preset filters
    if doc.is_preset == 1:
        frappe.throw(_("Cannot delete system preset filters"),
                    frappe.PermissionError)

    frappe.delete_doc("WH Saved Filter", filter_id)

    return {
        "success": True,
        "message": _("Filter deleted successfully")
    }


@frappe.whitelist()
def share_filter(filter_id, shared):
    """
    Toggle sharing status of a saved filter.

    Args:
        filter_id: ID of the filter to share/unshare
        shared: Boolean or int (1/0) for sharing status

    Returns:
        Success status
    """
    require_permission("WH Saved Filter", "write")

    if not filter_id:
        frappe.throw(_("Filter ID is required"))

    # Convert shared to int
    if isinstance(shared, str):
        shared = 1 if shared.lower() in ["true", "1", "yes"] else 0
    else:
        shared = 1 if shared else 0

    doc = frappe.get_doc("WH Saved Filter", filter_id)

    # Check if user owns this filter
    if doc.owner != frappe.session.user:
        frappe.throw(_("You can only share your own filters"),
                    frappe.PermissionError)

    # Prevent sharing/unsharing preset filters
    if doc.is_preset == 1:
        frappe.throw(_("Cannot modify sharing of system preset filters"),
                    frappe.PermissionError)

    doc.is_shared = shared
    doc.save()

    return {
        "success": True,
        "is_shared": doc.is_shared,
        "message": _("Filter {0}").format(_("shared") if shared else _("unshared"))
    }


@frappe.whitelist()
def get_filter_counts(entity_type=None):
    """
    Get item counts for all user's saved filters.
    Returns {filter_id: count} for showing badge counts in sidebar.

    Args:
        entity_type: Optional filter by entity_type (task/project)

    Returns:
        Dict mapping filter_id to count of matching items
    """
    require_auth()

    # Get all saved filters for the user
    filters = get_saved_filters(entity_type)

    counts = {}

    for filter_data in filters:
        filter_id = filter_data["name"]
        filter_json = filter_data.get("filter_json", {})
        filter_entity_type = filter_data.get("entity_type", "task")

        # Resolve dynamic placeholders
        resolved_criteria = resolve_filter_criteria(filter_json)

        # Build filter conditions for counting
        filter_conditions = _build_filter_conditions(resolved_criteria)

        # Determine the DocType to query
        doctype = "WH Task" if filter_entity_type == "task" else "WH Project"

        # Count matching items
        try:
            count = frappe.db.count(doctype, filters=filter_conditions)
            counts[filter_id] = count
        except Exception as e:
            # Log error but continue with other filters
            frappe.log_error(f"Error counting filter {filter_id}: {str(e)}")
            counts[filter_id] = 0

    return counts


def _build_filter_conditions(resolved_criteria):
    """
    Build Frappe filter conditions from resolved filter criteria.

    Args:
        resolved_criteria: Dict with resolved filter criteria

    Returns:
        Dict of filter conditions for frappe.db.count/get_list
    """
    conditions = {}

    if not resolved_criteria:
        return conditions

    # Handle status filter (can be single value or list)
    if "status" in resolved_criteria and resolved_criteria["status"]:
        status = resolved_criteria["status"]
        if isinstance(status, list):
            conditions["status"] = ["in", status]
        else:
            conditions["status"] = status

    # Handle priority filter (can be single value or list)
    if "priority" in resolved_criteria and resolved_criteria["priority"]:
        priority = resolved_criteria["priority"]
        if isinstance(priority, list):
            conditions["priority"] = ["in", priority]
        else:
            conditions["priority"] = priority

    # Handle department filter
    if "department" in resolved_criteria and resolved_criteria["department"]:
        conditions["department"] = resolved_criteria["department"]

    # Handle assigned_to filter
    if "assigned_to" in resolved_criteria and resolved_criteria["assigned_to"]:
        conditions["assigned_to"] = resolved_criteria["assigned_to"]

    # Handle project filter
    if "project" in resolved_criteria and resolved_criteria["project"]:
        conditions["project"] = resolved_criteria["project"]

    # Handle due_date filter with operators
    if "due_date_op" in resolved_criteria and "due_date_value" in resolved_criteria:
        due_date_op = resolved_criteria["due_date_op"]
        due_date_value = resolved_criteria["due_date_value"]

        if due_date_op and due_date_value:
            if due_date_op == "<":
                conditions["due_date"] = ["<", due_date_value]
            elif due_date_op == ">":
                conditions["due_date"] = [">", due_date_value]
            elif due_date_op == "between" and isinstance(due_date_value, list) and len(due_date_value) >= 2:
                conditions["due_date"] = ["between", [due_date_value[0], due_date_value[1]]]
            elif due_date_op == "in_range" and isinstance(due_date_value, list) and len(due_date_value) >= 2:
                conditions["due_date"] = ["between", [due_date_value[0], due_date_value[1]]]

    # Handle search filter (title contains)
    if "search" in resolved_criteria and resolved_criteria["search"]:
        conditions["title"] = ["like", f"%{resolved_criteria['search']}%"]

    return conditions
