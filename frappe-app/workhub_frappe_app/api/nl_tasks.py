# Natural Language Task Creation API
# Parse and create tasks from natural language input

import frappe
from frappe import _
from frappe.utils import nowdate, add_days, now_datetime
import json

from workhub_frappe_app.api.utils import require_auth
from workhub_frappe_app.services.task_parser import (
    parse_task_with_llm,
    match_user,
    match_project
)


@frappe.whitelist()
def parse_task(text: str) -> dict:
    """
    Parse natural language task description and extract structured fields.

    Args:
        text: Natural language task input (e.g., "Call Juan about Santiago order by Friday, high priority")

    Returns:
        ParsedTask structure with extracted fields:
        {
            "title": str,
            "due_date": str (YYYY-MM-DD) or None,
            "priority": "P0"|"P1"|"P2",
            "assignee": {
                "name": str,
                "matched": bool,
                "user": {"id": str, "full_name": str, "email": str} or None,
                "suggestions": [...]
            },
            "project": {
                "name": str,
                "matched": bool,
                "project": {"id": str, "title": str, "department": str, "status": str} or None,
                "suggestions": [...]
            },
            "description": str or None,
            "raw_text": str
        }
    """
    require_auth()

    if not text or not text.strip():
        frappe.throw(_("El texto no puede estar vacío"))

    text = text.strip()

    # Step 1: Extract entities using LLM
    llm_result = parse_task_with_llm(text)

    # Step 2: Match assignee to User records
    assignee_name = llm_result.get("assignee")
    assignee_info = {"name": assignee_name, "matched": False, "user": None, "suggestions": []}
    if assignee_name:
        assignee_match = match_user(assignee_name)
        assignee_info = {
            "name": assignee_name,
            "matched": assignee_match.get("matched", False),
            "user": assignee_match.get("user"),
            "suggestions": assignee_match.get("suggestions", [])
        }

    # Step 3: Match project to WH Project records
    project_hint = llm_result.get("project")
    project_info = {"name": project_hint, "matched": False, "project": None, "suggestions": []}
    if project_hint:
        project_match = match_project(project_hint)
        project_info = {
            "name": project_hint,
            "matched": project_match.get("matched", False),
            "project": project_match.get("project"),
            "suggestions": project_match.get("suggestions", [])
        }

    # Build response
    return {
        "title": llm_result.get("title", ""),
        "due_date": llm_result.get("due_date"),
        "priority": llm_result.get("priority", "P2"),
        "assignee": assignee_info,
        "project": project_info,
        "description": llm_result.get("description"),
        "raw_text": text
    }


@frappe.whitelist()
def create_from_nl(parsed_task: str) -> dict:
    """
    Create WH Task from parsed natural language input.

    Args:
        parsed_task: JSON string of ParsedTask with confirmed fields

    Returns:
        Result with task_id and success status:
        {
            "success": bool,
            "task_id": str,
            "message": str
        }
    """
    require_auth()

    if isinstance(parsed_task, str):
        try:
            parsed_task = json.loads(parsed_task)
        except json.JSONDecodeError:
            frappe.throw(_("Invalid JSON input"))

    # Extract and validate fields
    title = parsed_task.get("title", "").strip()
    if not title:
        frappe.throw(_("El título de la tarea es obligatorio"))

    # Extract assignee
    assignee_info = parsed_task.get("assignee", {})
    assigned_to = None
    if assignee_info and assignee_info.get("user"):
        assigned_to = assignee_info["user"].get("id")

    # Default to current user if no assignee
    if not assigned_to:
        assigned_to = frappe.session.user

    # Extract project
    project_info = parsed_task.get("project", {})
    project = None
    department = None
    if project_info and project_info.get("project"):
        project = project_info["project"].get("id")
        department = project_info["project"].get("department")

    # Extract priority
    priority = parsed_task.get("priority", "P2")
    if priority not in ["P0", "P1", "P2"]:
        priority = "P2"

    # Extract due_date
    due_date = parsed_task.get("due_date")

    # Extract description
    description = parsed_task.get("description", "").strip()
    raw_text = parsed_task.get("raw_text", "").strip()

    # Combine description with raw text if different
    final_description = description
    if raw_text and raw_text != title and raw_text != description:
        if description:
            final_description = f"{description}\n\nTexto original: {raw_text}"
        else:
            final_description = f"Texto original: {raw_text}"

    # Create task
    task = frappe.get_doc({
        "doctype": "WH Task",
        "title": title,
        "description": final_description,
        "priority": priority,
        "status": "BACKLOG",
        "assigned_to": assigned_to,
        "project": project,
        "department": department,
        "due_date": due_date,
        "is_inbox": 1 if not project else 0,
        "created_by": frappe.session.user
    })

    try:
        task.insert(ignore_permissions=True)
        frappe.db.commit()

        return {
            "success": True,
            "task_id": task.name,
            "message": _("Tarea creada exitosamente")
        }
    except Exception as e:
        frappe.log_error(f"Error creating task from NL: {str(e)}", "NL Task Creation")
        frappe.throw(_("Error al crear la tarea: {0}").format(str(e)))


@frappe.whitelist()
def get_suggestions() -> dict:
    """
    Get suggestions for autocomplete in natural language task creation.

    Returns:
        Dictionary with users and projects:
        {
            "users": [{"id": str, "full_name": str, "email": str, "department": str}, ...],
            "projects": [{"id": str, "title": str, "department": str, "status": str}, ...]
        }
    """
    require_auth()

    # Get active users (limit to 50 most recent)
    users = frappe.get_all(
        "User",
        filters={
            "enabled": 1,
            "name": ["not in", ["Administrator", "Guest"]]
        },
        fields=["name as id", "full_name", "email", "user_image"],
        limit=50,
        order_by="modified desc"
    )

    # Get department for each user if available
    for user in users:
        # Try to get department from Employee if linked
        employee = frappe.db.get_value(
            "Employee",
            {"user_id": user["id"]},
            ["department"],
            as_dict=True
        )
        user["department"] = employee.department if employee else None

    # Get active projects
    projects = frappe.get_all(
        "WH Project",
        filters={"status": ["in", ["ACTIVE", "PLANNING"]]},
        fields=["name as id", "title", "description", "department", "status"],
        limit=50,
        order_by="status asc, modified desc"  # ACTIVE first
    )

    return {
        "users": users,
        "projects": projects
    }


@frappe.whitelist()
def search_users(search: str = "", limit: int = 20) -> list:
    """
    Search users for assignee autocomplete.

    Args:
        search: Search term
        limit: Maximum results

    Returns:
        List of user options
    """
    require_auth()

    filters = {
        "enabled": 1,
        "name": ["not in", ["Administrator", "Guest"]]
    }

    if search:
        search_term = f"%{search}%"
        filters["full_name"] = ["like", search_term]

    users = frappe.get_all(
        "User",
        filters=filters,
        fields=["name as id", "full_name", "email", "user_image"],
        limit=int(limit),
        order_by="full_name asc"
    )

    # Get department for each user if available
    for user in users:
        employee = frappe.db.get_value(
            "Employee",
            {"user_id": user["id"]},
            ["department"],
            as_dict=True
        )
        user["department"] = employee.department if employee else None

    return users


@frappe.whitelist()
def search_projects(search: str = "", limit: int = 20) -> list:
    """
    Search projects for project selection.

    Args:
        search: Search term
        limit: Maximum results

    Returns:
        List of project options
    """
    require_auth()

    filters = {"status": ["in", ["ACTIVE", "PLANNING"]]}

    if search:
        search_term = f"%{search}%"
        filters["title"] = ["like", search_term]

    projects = frappe.get_all(
        "WH Project",
        filters=filters,
        fields=["name as id", "title", "description", "department", "status"],
        limit=int(limit),
        order_by="status asc, title asc"
    )

    return projects


@frappe.whitelist()
def save_correction(original_text: str, llm_output: str, final_output: str) -> dict:
    """
    Save user correction record for learning system.
    Detects differences between LLM output and final user-corrected output.

    Args:
        original_text: Original natural language input from user
        llm_output: Initial LLM parsing result (JSON string)
        final_output: Final task data after user corrections (JSON string)

    Returns:
        Result with success status and correction ID:
        {
            "success": bool,
            "correction_id": str,
            "message": str
        }
    """
    require_auth()

    # Validate inputs
    if not original_text or not original_text.strip():
        frappe.throw(_("El texto original no puede estar vacío"))

    if not llm_output or not llm_output.strip():
        frappe.throw(_("La salida del LLM no puede estar vacía"))

    if not final_output or not final_output.strip():
        frappe.throw(_("La salida final no puede estar vacía"))

    # Parse JSON strings if needed
    if isinstance(llm_output, str):
        try:
            llm_data = json.loads(llm_output)
        except json.JSONDecodeError:
            frappe.throw(_("La salida del LLM no es JSON válido"))
    else:
        llm_data = llm_output

    if isinstance(final_output, str):
        try:
            final_data = json.loads(final_output)
        except json.JSONDecodeError:
            frappe.throw(_("La salida final no es JSON válido"))
    else:
        final_data = final_output

    # Detect differences between LLM output and final output
    corrections = _detect_corrections(llm_data, final_data)

    # Only save if there were actual corrections
    if not corrections:
        return {
            "success": True,
            "correction_id": None,
            "message": _("No se detectaron correcciones")
        }

    # Create correction record
    correction_doc = frappe.get_doc({
        "doctype": "WH NL Task Correction",
        "user": frappe.session.user,
        "timestamp": now_datetime(),
        "original_text": original_text.strip(),
        "llm_output": json.dumps(llm_data, ensure_ascii=False, indent=2),
        "user_corrections": json.dumps(corrections, ensure_ascii=False, indent=2),
        "final_output": json.dumps(final_data, ensure_ascii=False, indent=2)
    })

    try:
        correction_doc.insert(ignore_permissions=True)
        frappe.db.commit()

        return {
            "success": True,
            "correction_id": correction_doc.name,
            "message": _("Corrección guardada exitosamente")
        }
    except Exception as e:
        frappe.log_error(f"Error saving correction: {str(e)}", "NL Task Correction")
        frappe.throw(_("Error al guardar la corrección: {0}").format(str(e)))


def _detect_corrections(llm_output: dict, final_output: dict) -> dict:
    """
    Detect differences between LLM output and final user-corrected output.

    Args:
        llm_output: Initial LLM parsing result
        final_output: Final task data after user corrections

    Returns:
        Dictionary with detected corrections for each field
    """
    corrections = {}

    # Fields to check for corrections
    fields_to_check = ["title", "due_date", "priority", "assignee", "project", "description"]

    for field in fields_to_check:
        llm_value = llm_output.get(field)
        final_value = final_output.get(field)

        # Handle nested assignee structure (from parse_task response)
        if field == "assignee":
            if isinstance(llm_value, dict):
                llm_value = llm_value.get("name")
            if isinstance(final_value, dict):
                final_value = final_value.get("name") or (final_value.get("user", {}).get("full_name") if final_value.get("user") else None)

        # Handle nested project structure (from parse_task response)
        if field == "project":
            if isinstance(llm_value, dict):
                llm_value = llm_value.get("name")
            if isinstance(final_value, dict):
                final_value = final_value.get("name") or (final_value.get("project", {}).get("title") if final_value.get("project") else None)

        # Normalize values for comparison
        llm_normalized = _normalize_value(llm_value)
        final_normalized = _normalize_value(final_value)

        # Detect if there was a correction
        if llm_normalized != final_normalized:
            corrections[field] = {
                "llm_value": llm_value,
                "final_value": final_value,
                "changed": True
            }

    return corrections


def _normalize_value(value):
    """
    Normalize value for comparison (handle None, empty strings, etc.)

    Args:
        value: Value to normalize

    Returns:
        Normalized value for comparison
    """
    if value is None:
        return None

    if isinstance(value, str):
        value = value.strip()
        if value.lower() in ["", "null", "none", "n/a"]:
            return None
        return value.lower()

    return value
