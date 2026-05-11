# WH Project Templates API
# CRUD operations for template management

import frappe
from frappe import _
import json

from workhub_frappe_app.api.utils import require_auth, require_permission


@frappe.whitelist()
def create_template(data):
    """Create a new project template"""
    require_permission("WH Project Template", "create")
    if isinstance(data, str):
        data = json.loads(data)

    if not data.get("template_name"):
        frappe.throw(_("Template name is required"))
    if not data.get("department"):
        frappe.throw(_("Department is required"))

    # Check if template with same name already exists
    if frappe.db.exists("WH Project Template", data["template_name"]):
        frappe.throw(_("Template with name '{0}' already exists").format(data["template_name"]))

    # Create template
    doc = frappe.new_doc("WH Project Template")
    doc.template_name = data["template_name"]
    doc.description = data.get("description")
    doc.department = data["department"]
    doc.default_duration_days = data.get("default_duration_days", 30)
    doc.is_active = data.get("is_active", 1)

    # Add tasks if provided
    if data.get("tasks"):
        for task_data in data["tasks"]:
            task = doc.append("tasks", {})
            task.sequence = task_data.get("sequence", 0)
            task.title = task_data.get("title", "")
            task.description = task_data.get("description", "")
            task.offset_days = task_data.get("offset_days", 0)
            task.duration_days = task_data.get("duration_days", 1)
            task.default_assignee_role = task_data.get("default_assignee_role", "")
            task.depends_on_sequence = task_data.get("depends_on_sequence")
            task.is_milestone = task_data.get("is_milestone", 0)

    doc.insert()
    return {"success": True, "template_id": doc.name}


@frappe.whitelist()
def update_template(template_id, data):
    """Update an existing project template"""
    require_permission("WH Project Template", "write")
    if isinstance(data, str):
        data = json.loads(data)

    if not template_id:
        frappe.throw(_("Template ID is required"))

    # Get template
    doc = frappe.get_doc("WH Project Template", template_id)

    # Update allowed fields
    allowed_fields = [
        "description", "department", "default_duration_days", "is_active"
    ]

    for field in allowed_fields:
        if field in data:
            setattr(doc, field, data[field])

    # Update tasks if provided
    if "tasks" in data:
        # Clear existing tasks
        doc.tasks = []

        # Add new tasks
        for task_data in data["tasks"]:
            task = doc.append("tasks", {})
            task.sequence = task_data.get("sequence", 0)
            task.title = task_data.get("title", "")
            task.description = task_data.get("description", "")
            task.offset_days = task_data.get("offset_days", 0)
            task.duration_days = task_data.get("duration_days", 1)
            task.default_assignee_role = task_data.get("default_assignee_role", "")
            task.depends_on_sequence = task_data.get("depends_on_sequence")
            task.is_milestone = task_data.get("is_milestone", 0)

    doc.save()
    return {"success": True, "template_id": doc.name}


@frappe.whitelist()
def delete_template(template_id):
    """Delete a project template (soft delete by setting is_active=0)"""
    require_permission("WH Project Template", "delete")

    if not template_id:
        frappe.throw(_("Template ID is required"))

    # Check if template exists
    if not frappe.db.exists("WH Project Template", template_id):
        frappe.throw(_("Template '{0}' not found").format(template_id))

    # Check if template is being used by any projects
    projects_using_template = frappe.db.count("WH Project", filters={"template_used": template_id})
    if projects_using_template > 0:
        frappe.throw(_("Cannot delete template '{0}' as it is being used by {1} project(s)").format(
            template_id, projects_using_template))

    # Soft delete - set is_active to 0
    frappe.db.set_value("WH Project Template", template_id, "is_active", 0)

    return {"success": True, "message": _("Template '{0}' has been deactivated").format(template_id)}


@frappe.whitelist()
def duplicate_template(template_id, new_name=None):
    """Duplicate an existing project template"""
    require_permission("WH Project Template", "create")

    if not template_id:
        frappe.throw(_("Template ID is required"))

    # Get source template
    source_template = frappe.get_doc("WH Project Template", template_id)

    # Generate new name if not provided
    if not new_name:
        base_name = source_template.template_name
        counter = 1
        new_name = f"{base_name} (Copy)"
        while frappe.db.exists("WH Project Template", new_name):
            counter += 1
            new_name = f"{base_name} (Copy {counter})"
    else:
        # Check if new name already exists
        if frappe.db.exists("WH Project Template", new_name):
            frappe.throw(_("Template with name '{0}' already exists").format(new_name))

    # Create duplicate
    new_template = frappe.new_doc("WH Project Template")
    new_template.template_name = new_name
    new_template.description = source_template.description
    new_template.department = source_template.department
    new_template.default_duration_days = source_template.default_duration_days
    new_template.is_active = 1

    # Copy tasks
    for task in source_template.tasks:
        new_task = new_template.append("tasks", {})
        new_task.sequence = task.sequence
        new_task.title = task.title
        new_task.description = task.description
        new_task.offset_days = task.offset_days
        new_task.duration_days = task.duration_days
        new_task.default_assignee_role = task.default_assignee_role
        new_task.depends_on_sequence = task.depends_on_sequence
        new_task.is_milestone = task.is_milestone

    new_template.insert()

    return {
        "success": True,
        "template_id": new_template.name,
        "template_name": new_template.template_name,
        "tasks_copied": len(new_template.tasks)
    }


@frappe.whitelist()
def save_project_as_template(project_id, data):
    """Convert an existing project structure into a new template"""
    require_permission("WH Project Template", "create")
    if isinstance(data, str):
        data = json.loads(data)

    if not project_id:
        frappe.throw(_("Project ID is required"))
    if not data.get("template_name"):
        frappe.throw(_("Template name is required"))

    # Check if template with same name already exists
    if frappe.db.exists("WH Project Template", data["template_name"]):
        frappe.throw(_("Template with name '{0}' already exists").format(data["template_name"]))

    # Get project
    project = frappe.get_doc("WH Project", project_id)

    # Get all tasks from project ordered by start date
    tasks = frappe.get_all("WH Task",
        filters={"project": project_id},
        fields=[
            "name", "title", "description", "start_date", "due_date",
            "is_milestone", "assigned_to"
        ],
        order_by="start_date asc, name asc")

    if not tasks:
        frappe.throw(_("Project '{0}' has no tasks to convert to template").format(project.title))

    # Get task dependencies
    task_names = [t["name"] for t in tasks]
    dependencies = {}
    if task_names:
        deps = frappe.get_all("WH Task Dependency",
            filters={
                "predecessor": ["in", task_names],
                "successor": ["in", task_names],
                "is_active": 1
            },
            fields=["predecessor", "successor"])

        for dep in deps:
            dependencies[dep["successor"]] = dep["predecessor"]

    # Create template
    template = frappe.new_doc("WH Project Template")
    template.template_name = data["template_name"]
    template.description = data.get("description") or project.description
    template.department = data.get("department") or project.department

    # Calculate duration from project dates
    if project.start_date and project.target_date:
        from frappe.utils import date_diff
        template.default_duration_days = date_diff(project.target_date, project.start_date)
    else:
        template.default_duration_days = data.get("default_duration_days", 30)

    template.is_active = 1

    # Create task name to sequence mapping
    task_sequence_map = {}
    for idx, task in enumerate(tasks, start=1):
        task_sequence_map[task["name"]] = idx

    # Add tasks to template
    for idx, task_data in enumerate(tasks, start=1):
        task_template = template.append("tasks", {})
        task_template.sequence = idx
        task_template.title = task_data["title"]
        task_template.description = task_data.get("description", "")

        # Calculate offset_days from project start
        if project.start_date and task_data.get("start_date"):
            from frappe.utils import date_diff
            task_template.offset_days = date_diff(task_data["start_date"], project.start_date)
        else:
            task_template.offset_days = 0

        # Calculate duration_days
        if task_data.get("start_date") and task_data.get("due_date"):
            from frappe.utils import date_diff
            task_template.duration_days = date_diff(task_data["due_date"], task_data["start_date"])
        else:
            task_template.duration_days = 1

        # Get role from assigned user if possible
        if task_data.get("assigned_to"):
            # Try to extract a role from user's roles
            user_roles = frappe.get_roles(task_data["assigned_to"])
            # Filter out system roles
            system_roles = ["All", "Guest", "Administrator", "System Manager"]
            user_roles = [r for r in user_roles if r not in system_roles]
            if user_roles:
                task_template.default_assignee_role = user_roles[0]
            else:
                task_template.default_assignee_role = ""
        else:
            task_template.default_assignee_role = ""

        # Handle dependencies
        if task_data["name"] in dependencies:
            predecessor_name = dependencies[task_data["name"]]
            if predecessor_name in task_sequence_map:
                task_template.depends_on_sequence = task_sequence_map[predecessor_name]

        task_template.is_milestone = task_data.get("is_milestone", 0)

    template.insert()

    return {
        "success": True,
        "template_id": template.name,
        "template_name": template.template_name,
        "tasks_converted": len(tasks),
        "department": template.department,
        "estimated_duration_days": template.default_duration_days
    }
