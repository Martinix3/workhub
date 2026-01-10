# WH Bulk Operations API
# Bulk operations for task management with detailed success/failure tracking

import frappe
from frappe import _
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any

from workhub_frappe_app.api.utils import require_auth, require_permission


# Valid values for validation
VALID_STATUSES = ["BACKLOG", "NEXT", "DOING", "BLOCKED", "DONE"]
VALID_PRIORITIES = ["P0", "P1", "P2"]
VALID_DEPARTMENTS = ["SALES", "OPS", "MKT"]
VALID_SOURCE_DOCTYPES = [
    "Account", "Opportunity", "Campaign", "OpsCase", "CalendarEvent",
    "Sales Order", "Delivery Note", "Sales Invoice", "Payment Entry",
    "Purchase Order", "Purchase Receipt", "Purchase Invoice",
    "Work Order", "Stock Entry", "Batch", "Quality Inspection"
]

# Undo mechanism constants
UNDO_CACHE_TTL = 30  # 30 seconds as specified


def _generate_undo_id() -> str:
    """
    Generate a unique undo ID for a bulk operation.

    Returns:
        Unique undo ID string
    """
    return f"undo_{uuid.uuid4().hex[:12]}"


def _store_undo_data(undo_id: str, operation_type: str, task_ids: List[str], previous_values: Dict[str, Any]) -> None:
    """
    Store undo data in Frappe cache with 30-second TTL.

    Args:
        undo_id: Unique identifier for this undo operation
        operation_type: Type of operation (e.g., "change_status", "assign", etc.)
        task_ids: List of task IDs affected
        previous_values: Dictionary mapping task_id to previous values
    """
    undo_data = {
        "operation_type": operation_type,
        "task_ids": task_ids,
        "previous_values": previous_values,
        "timestamp": datetime.now().isoformat(),
        "user": frappe.session.user
    }

    cache_key = f"bulk_operation_undo_{undo_id}"
    frappe.cache().set_value(cache_key, json.dumps(undo_data), expires_in_sec=UNDO_CACHE_TTL)


def _get_undo_data(undo_id: str) -> Dict[str, Any]:
    """
    Retrieve undo data from Frappe cache.

    Args:
        undo_id: Unique identifier for the undo operation

    Returns:
        Dictionary with undo data or None if not found/expired
    """
    cache_key = f"bulk_operation_undo_{undo_id}"
    cached_data = frappe.cache().get_value(cache_key)

    if cached_data:
        return json.loads(cached_data)
    return None


def _process_bulk_operation(task_ids: List[str], operation_func, operation_name: str) -> Dict[str, Any]:
    """
    Generic processor for bulk operations.

    Args:
        task_ids: List of task IDs to process
        operation_func: Function to call for each task (receives task_id, returns dict with success/error)
        operation_name: Name of the operation for error messages

    Returns:
        Dict with success count, failure count, and detailed results
    """
    results = {
        "success": [],
        "failed": []
    }

    for task_id in task_ids:
        try:
            # Check if task exists
            if not frappe.db.exists("WH Task", task_id):
                results["failed"].append({
                    "task_id": task_id,
                    "error": _("Task not found")
                })
                continue

            # Execute operation
            result = operation_func(task_id)

            if result.get("success"):
                results["success"].append({
                    "task_id": task_id,
                    "details": result.get("details", {})
                })
            else:
                results["failed"].append({
                    "task_id": task_id,
                    "error": result.get("error", _("Unknown error"))
                })

        except Exception as e:
            results["failed"].append({
                "task_id": task_id,
                "error": str(e)
            })
            frappe.log_error(
                message=f"Error in {operation_name} for task {task_id}: {str(e)}",
                title=f"{operation_name} Error"
            )

    return {
        "total": len(task_ids),
        "success_count": len(results["success"]),
        "failure_count": len(results["failed"]),
        "results": results
    }


@frappe.whitelist()
def bulk_change_status(task_ids, new_status):
    """
    Change status for multiple tasks with detailed success/failure tracking.

    Args:
        task_ids: JSON array or list of task IDs
        new_status: New status value (BACKLOG, NEXT, DOING, BLOCKED, DONE)

    Returns:
        Dict with total, success_count, failure_count, detailed results, and undo_id
    """
    require_permission("WH Task", "write")

    # Parse task_ids if JSON string
    if isinstance(task_ids, str):
        task_ids = json.loads(task_ids)

    if not isinstance(task_ids, list) or len(task_ids) == 0:
        frappe.throw(_("task_ids must be a non-empty array"))

    # Validate status
    if new_status not in VALID_STATUSES:
        frappe.throw(_("Invalid status: {0}. Valid values: {1}").format(
            new_status, ", ".join(VALID_STATUSES)
        ))

    # Collect previous values for undo
    previous_values = {}
    for task_id in task_ids:
        if frappe.db.exists("WH Task", task_id):
            previous_values[task_id] = {
                "status": frappe.db.get_value("WH Task", task_id, "status")
            }

    def change_status_operation(task_id):
        """Change status for a single task"""
        try:
            old_status = frappe.db.get_value("WH Task", task_id, "status")
            frappe.db.set_value("WH Task", task_id, "status", new_status)
            return {
                "success": True,
                "details": {
                    "old_status": old_status,
                    "new_status": new_status
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    result = _process_bulk_operation(
        task_ids,
        change_status_operation,
        "bulk_change_status"
    )

    # Generate undo_id and store undo data
    undo_id = _generate_undo_id()
    _store_undo_data(
        undo_id=undo_id,
        operation_type="change_status",
        task_ids=task_ids,
        previous_values=previous_values
    )

    frappe.db.commit()

    # Add undo_id to result
    result["undo_id"] = undo_id
    return result


@frappe.whitelist()
def bulk_assign(task_ids, assigned_to):
    """
    Assign multiple tasks to a user.

    Args:
        task_ids: JSON array or list of task IDs
        assigned_to: User email to assign tasks to

    Returns:
        Dict with total, success_count, failure_count, detailed results, and undo_id
    """
    require_permission("WH Task", "write")

    # Parse task_ids if JSON string
    if isinstance(task_ids, str):
        task_ids = json.loads(task_ids)

    if not isinstance(task_ids, list) or len(task_ids) == 0:
        frappe.throw(_("task_ids must be a non-empty array"))

    if not assigned_to:
        frappe.throw(_("assigned_to is required"))

    # Validate user exists
    if not frappe.db.exists("User", assigned_to):
        frappe.throw(_("User not found: {0}").format(assigned_to))

    # Collect previous values for undo
    previous_values = {}
    for task_id in task_ids:
        if frappe.db.exists("WH Task", task_id):
            previous_values[task_id] = {
                "assigned_to": frappe.db.get_value("WH Task", task_id, "assigned_to")
            }

    def assign_operation(task_id):
        """Assign a single task"""
        try:
            old_assigned_to = frappe.db.get_value("WH Task", task_id, "assigned_to")
            frappe.db.set_value("WH Task", task_id, "assigned_to", assigned_to)
            return {
                "success": True,
                "details": {
                    "old_assigned_to": old_assigned_to,
                    "new_assigned_to": assigned_to
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    result = _process_bulk_operation(
        task_ids,
        assign_operation,
        "bulk_assign"
    )

    # Generate undo_id and store undo data
    undo_id = _generate_undo_id()
    _store_undo_data(
        undo_id=undo_id,
        operation_type="assign",
        task_ids=task_ids,
        previous_values=previous_values
    )

    frappe.db.commit()

    # Add undo_id to result
    result["undo_id"] = undo_id
    return result


@frappe.whitelist()
def bulk_change_priority(task_ids, new_priority):
    """
    Change priority for multiple tasks.

    Args:
        task_ids: JSON array or list of task IDs
        new_priority: New priority value (P0, P1, P2)

    Returns:
        Dict with total, success_count, failure_count, detailed results, and undo_id
    """
    require_permission("WH Task", "write")

    # Parse task_ids if JSON string
    if isinstance(task_ids, str):
        task_ids = json.loads(task_ids)

    if not isinstance(task_ids, list) or len(task_ids) == 0:
        frappe.throw(_("task_ids must be a non-empty array"))

    # Validate priority
    if new_priority not in VALID_PRIORITIES:
        frappe.throw(_("Invalid priority: {0}. Valid values: {1}").format(
            new_priority, ", ".join(VALID_PRIORITIES)
        ))

    # Collect previous values for undo
    previous_values = {}
    for task_id in task_ids:
        if frappe.db.exists("WH Task", task_id):
            previous_values[task_id] = {
                "priority": frappe.db.get_value("WH Task", task_id, "priority")
            }

    def change_priority_operation(task_id):
        """Change priority for a single task"""
        try:
            old_priority = frappe.db.get_value("WH Task", task_id, "priority")
            frappe.db.set_value("WH Task", task_id, "priority", new_priority)
            return {
                "success": True,
                "details": {
                    "old_priority": old_priority,
                    "new_priority": new_priority
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    result = _process_bulk_operation(
        task_ids,
        change_priority_operation,
        "bulk_change_priority"
    )

    # Generate undo_id and store undo data
    undo_id = _generate_undo_id()
    _store_undo_data(
        undo_id=undo_id,
        operation_type="change_priority",
        task_ids=task_ids,
        previous_values=previous_values
    )

    frappe.db.commit()

    # Add undo_id to result
    result["undo_id"] = undo_id
    return result


@frappe.whitelist()
def bulk_move_project(task_ids, project_id):
    """
    Move multiple tasks to a different project.

    Args:
        task_ids: JSON array or list of task IDs
        project_id: Project ID to move tasks to (or None/empty to clear project)

    Returns:
        Dict with total, success_count, failure_count, detailed results, and undo_id
    """
    require_permission("WH Task", "write")

    # Parse task_ids if JSON string
    if isinstance(task_ids, str):
        task_ids = json.loads(task_ids)

    if not isinstance(task_ids, list) or len(task_ids) == 0:
        frappe.throw(_("task_ids must be a non-empty array"))

    # Validate project exists if provided
    if project_id and not frappe.db.exists("WH Project", project_id):
        frappe.throw(_("Project not found: {0}").format(project_id))

    # Collect previous values for undo
    previous_values = {}
    for task_id in task_ids:
        if frappe.db.exists("WH Task", task_id):
            task_data = frappe.db.get_value("WH Task", task_id,
                ["project", "is_inbox"], as_dict=True)
            previous_values[task_id] = {
                "project": task_data.project,
                "is_inbox": task_data.is_inbox
            }

    def move_project_operation(task_id):
        """Move a single task to project"""
        try:
            task = frappe.get_doc("WH Task", task_id)
            old_project = task.project
            old_is_inbox = task.is_inbox

            # Update project
            task.project = project_id or None

            # Update is_inbox flag
            # If moving to a project, clear inbox flag
            # If clearing project (and no parent_task), set inbox flag
            if project_id:
                task.is_inbox = 0
            elif not task.parent_task:
                task.is_inbox = 1

            task.save()

            return {
                "success": True,
                "details": {
                    "old_project": old_project,
                    "new_project": project_id,
                    "old_is_inbox": old_is_inbox,
                    "new_is_inbox": task.is_inbox
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    result = _process_bulk_operation(
        task_ids,
        move_project_operation,
        "bulk_move_project"
    )

    # Generate undo_id and store undo data
    undo_id = _generate_undo_id()
    _store_undo_data(
        undo_id=undo_id,
        operation_type="move_project",
        task_ids=task_ids,
        previous_values=previous_values
    )

    frappe.db.commit()

    # Add undo_id to result
    result["undo_id"] = undo_id
    return result


@frappe.whitelist()
def bulk_create_worklinks(task_ids, source_doctype, source_id):
    """
    Create WorkLinks for multiple tasks, linking them to the same ERP document.

    Args:
        task_ids: JSON array or list of task IDs
        source_doctype: ERP DocType (e.g., "Sales Order", "Opportunity")
        source_id: ERP document ID

    Returns:
        Dict with total, success_count, failure_count, detailed results, and undo_id
    """
    require_permission("WH Task", "write")
    require_permission("WorkLink", "create")

    # Parse task_ids if JSON string
    if isinstance(task_ids, str):
        task_ids = json.loads(task_ids)

    if not isinstance(task_ids, list) or len(task_ids) == 0:
        frappe.throw(_("task_ids must be a non-empty array"))

    if not source_doctype or not source_id:
        frappe.throw(_("source_doctype and source_id are required"))

    # Validate source_doctype
    if source_doctype not in VALID_SOURCE_DOCTYPES:
        frappe.throw(_("Invalid source_doctype: {0}. Valid values: {1}").format(
            source_doctype, ", ".join(VALID_SOURCE_DOCTYPES)
        ))

    # Validate ERP document exists
    if not frappe.db.exists(source_doctype, source_id):
        frappe.throw(_("{0} not found: {1}").format(source_doctype, source_id))

    # Collect previous values for undo
    previous_values = {}
    for task_id in task_ids:
        if frappe.db.exists("WH Task", task_id):
            task_data = frappe.db.get_value("WH Task", task_id,
                ["worklink", "source_doctype", "source_name"], as_dict=True)
            previous_values[task_id] = {
                "worklink": task_data.worklink,
                "source_doctype": task_data.source_doctype,
                "source_name": task_data.source_name
            }

    def create_worklink_operation(task_id):
        """Create WorkLink for a single task"""
        try:
            task = frappe.get_doc("WH Task", task_id)

            # Check if task already has a WorkLink
            if task.worklink:
                return {
                    "success": False,
                    "error": _("Task already has a WorkLink: {0}").format(task.worklink)
                }

            # Get department from task, default to OPS if not set
            department = task.department or "OPS"

            # Check if a WorkLink already exists for this ERP document
            existing_worklink = frappe.db.get_value(
                "WorkLink",
                {"source_doctype": source_doctype, "source_id": source_id},
                "name"
            )

            if existing_worklink:
                # Update existing WorkLink to link to this task
                frappe.db.set_value("WorkLink", existing_worklink, "wh_task", task_id)
                worklink_id = existing_worklink
            else:
                # Create new WorkLink
                worklink = frappe.new_doc("WorkLink")
                worklink.source_doctype = source_doctype
                worklink.source_id = source_id
                worklink.department = department
                worklink.wh_task = task_id
                worklink.status = task.status
                worklink.priority = task.priority
                worklink.due_date = task.due_date
                worklink.insert()
                worklink_id = worklink.name

            # Update task with WorkLink reference
            task.worklink = worklink_id
            task.source_doctype = source_doctype
            task.source_name = source_id
            task.save()

            return {
                "success": True,
                "details": {
                    "worklink_id": worklink_id,
                    "source_doctype": source_doctype,
                    "source_id": source_id,
                    "department": department
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    result = _process_bulk_operation(
        task_ids,
        create_worklink_operation,
        "bulk_create_worklinks"
    )

    # Generate undo_id and store undo data
    undo_id = _generate_undo_id()
    _store_undo_data(
        undo_id=undo_id,
        operation_type="create_worklinks",
        task_ids=task_ids,
        previous_values=previous_values
    )

    frappe.db.commit()

    # Add undo_id to result
    result["undo_id"] = undo_id
    return result


@frappe.whitelist()
def bulk_remove_worklinks(task_ids):
    """
    Remove WorkLinks from multiple tasks.

    Args:
        task_ids: JSON array or list of task IDs

    Returns:
        Dict with total, success_count, failure_count, detailed results, and undo_id
    """
    require_permission("WH Task", "write")
    require_permission("WorkLink", "write")

    # Parse task_ids if JSON string
    if isinstance(task_ids, str):
        task_ids = json.loads(task_ids)

    if not isinstance(task_ids, list) or len(task_ids) == 0:
        frappe.throw(_("task_ids must be a non-empty array"))

    # Collect previous values for undo
    previous_values = {}
    for task_id in task_ids:
        if frappe.db.exists("WH Task", task_id):
            task_data = frappe.db.get_value("WH Task", task_id,
                ["worklink", "source_doctype", "source_name"], as_dict=True)
            previous_values[task_id] = {
                "worklink": task_data.worklink,
                "source_doctype": task_data.source_doctype,
                "source_name": task_data.source_name
            }

    def remove_worklink_operation(task_id):
        """Remove WorkLink from a single task"""
        try:
            task = frappe.get_doc("WH Task", task_id)

            if not task.worklink:
                return {
                    "success": False,
                    "error": _("Task does not have a WorkLink")
                }

            old_worklink = task.worklink
            old_source_doctype = task.source_doctype
            old_source_name = task.source_name

            # Clear WorkLink reference from WorkLink doc
            frappe.db.set_value("WorkLink", task.worklink, "wh_task", None)

            # Clear WorkLink references from task
            task.worklink = None
            task.source_doctype = None
            task.source_name = None
            task.save()

            return {
                "success": True,
                "details": {
                    "removed_worklink": old_worklink,
                    "source_doctype": old_source_doctype,
                    "source_id": old_source_name
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    result = _process_bulk_operation(
        task_ids,
        remove_worklink_operation,
        "bulk_remove_worklinks"
    )

    # Generate undo_id and store undo data
    undo_id = _generate_undo_id()
    _store_undo_data(
        undo_id=undo_id,
        operation_type="remove_worklinks",
        task_ids=task_ids,
        previous_values=previous_values
    )

    frappe.db.commit()

    # Add undo_id to result
    result["undo_id"] = undo_id
    return result
