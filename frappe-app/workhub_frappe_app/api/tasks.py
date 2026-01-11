# WH Tasks API
# CRUD operations for task management

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, add_days, now_datetime
import json

from workhub_frappe_app.api.utils import require_auth, require_permission


def _enrich_task_assignees(task):
    """Enrich task with assignees data including user info"""
    if not task.get("name"):
        return []

    assignees = frappe.get_all("WH Task Assignee",
        filters={"parent": task["name"]},
        fields=["user", "role", "added_at", "added_by"],
        order_by="idx"
    )

    # Enrich with user info
    for assignee in assignees:
        if assignee.get("user"):
            user_info = frappe.db.get_value("User", assignee["user"],
                ["full_name", "email"], as_dict=True)
            if user_info:
                assignee["user_name"] = user_info.full_name
                assignee["user_email"] = user_info.email

    return assignees


@frappe.whitelist()
def get_tasks(filters=None, limit=50, offset=0):
    """Get task list with optional filters"""
    require_auth()
    if filters and isinstance(filters, str):
        filters = json.loads(filters)

    filter_conditions = {}
    assignee_filter = None

    if filters:
        if filters.get("status"):
            if isinstance(filters["status"], list):
                filter_conditions["status"] = ["in", filters["status"]]
            else:
                filter_conditions["status"] = filters["status"]
        if filters.get("priority"):
            filter_conditions["priority"] = filters["priority"]
        if filters.get("project"):
            filter_conditions["project"] = filters["project"]
        if filters.get("department"):
            filter_conditions["department"] = filters["department"]
        # Support both assigned_to (legacy) and assignees filtering
        if filters.get("assigned_to"):
            assignee_filter = filters["assigned_to"]
        if filters.get("assignees"):
            assignee_filter = filters["assignees"]
        if filters.get("is_inbox"):
            filter_conditions["is_inbox"] = 1
        if filters.get("search"):
            filter_conditions["title"] = ["like", f"%{filters['search']}%"]

    # If filtering by assignee, get task IDs first
    if assignee_filter:
        task_ids = frappe.get_all("WH Task Assignee",
            filters={"user": assignee_filter},
            pluck="parent"
        )
        if task_ids:
            filter_conditions["name"] = ["in", task_ids]
        else:
            # No tasks for this assignee
            return []

    tasks = frappe.get_list("WH Task",
        filters=filter_conditions,
        fields=[
            "name", "title", "description", "status", "priority",
            "project", "department", "assigned_to", "created_by",
            "start_date", "due_date", "is_milestone", "is_inbox",
            "worked_today", "total_work_days", "blocked_reason",
            "creation", "modified"
        ],
        limit_page_length=int(limit),
        limit_start=int(offset),
        order_by="priority asc, due_date asc",
        ignore_permissions=True
    )

    # Enrich with project info and assignees
    for task in tasks:
        # Add assignees with user info
        task["assignees"] = _enrich_task_assignees(task)

        if task.get("project"):
            project_data = frappe.db.get_value("WH Project", task["project"],
                ["title", "health"], as_dict=True)
            if project_data:
                task["project_title"] = project_data.title
                task["project_health"] = project_data.health

        # Calculate overdue
        if task.get("due_date") and task.get("status") != "DONE":
            task["is_overdue"] = getdate(task["due_date"]) < getdate(nowdate())
        else:
            task["is_overdue"] = False

    return tasks


@frappe.whitelist()
def get_task(task_id):
    """Get single task with full details"""
    require_auth()
    if not task_id:
        frappe.throw(_("Task ID is required"))

    task = frappe.get_doc("WH Task", task_id)
    task_dict = task.as_dict()

    # Get assignees with user info
    task_dict["assignees"] = _enrich_task_assignees(task_dict)

    # Get dependencies
    predecessors = frappe.get_all("WH Task Dependency",
        filters={"successor": task_id, "is_active": 1},
        fields=["predecessor", "type", "lag_days"])

    for p in predecessors:
        p["predecessor_title"] = frappe.db.get_value("WH Task", p["predecessor"], "title")

    successors = frappe.get_all("WH Task Dependency",
        filters={"predecessor": task_id, "is_active": 1},
        fields=["successor", "type", "lag_days"])

    for s in successors:
        s["successor_title"] = frappe.db.get_value("WH Task", s["successor"], "title")

    # Get subtasks
    subtasks = frappe.get_all("WH Task",
        filters={"parent_task": task_id},
        fields=["name", "title", "status", "priority", "assigned_to"])

    return {
        "task": task_dict,
        "predecessors": predecessors,
        "successors": successors,
        "subtasks": subtasks
    }


@frappe.whitelist()
def create_task(data):
    """Create a new task"""
    require_permission("WH Task", "create")
    if isinstance(data, str):
        data = json.loads(data)

    if not data.get("title"):
        frappe.throw(_("Title is required"))

    doc = frappe.new_doc("WH Task")
    doc.title = data["title"]
    doc.description = data.get("description")
    doc.status = data.get("status", "BACKLOG")
    doc.priority = data.get("priority", "P1")
    doc.project = data.get("project")
    doc.department = data.get("department")
    doc.start_date = data.get("start_date")
    doc.due_date = data.get("due_date")
    doc.estimated_hours = data.get("estimated_hours")
    doc.is_milestone = data.get("is_milestone", 0)
    doc.parent_task = data.get("parent_task")

    # Handle assignees - support both new array format and legacy assigned_to
    if data.get("assignees"):
        # New multi-assignee format
        for assignee_data in data["assignees"]:
            doc.append("assignees", {
                "user": assignee_data.get("user"),
                "role": assignee_data.get("role", "Collaborator"),
                "added_at": now_datetime(),
                "added_by": frappe.session.user
            })
    elif data.get("assigned_to"):
        # Legacy single assignee - convert to Owner
        doc.assigned_to = data["assigned_to"]
    else:
        # Default to current user as Owner
        doc.assigned_to = frappe.session.user

    # If no project, mark as inbox
    if not doc.project and not doc.parent_task:
        doc.is_inbox = 1

    doc.insert()
    return {"success": True, "task_id": doc.name}


@frappe.whitelist()
def update_task(task_id, data):
    """Update an existing task"""
    require_permission("WH Task", "write")
    if isinstance(data, str):
        data = json.loads(data)

    if not task_id:
        frappe.throw(_("Task ID is required"))

    doc = frappe.get_doc("WH Task", task_id)

    # Update allowed fields
    allowed_fields = [
        "title", "description", "status", "priority", "project",
        "department", "assigned_to", "start_date", "due_date",
        "estimated_hours", "is_milestone", "blocked_reason",
        "worked_today", "parent_task"
    ]

    for field in allowed_fields:
        if field in data:
            setattr(doc, field, data[field])

    # Handle assignees update if provided
    if "assignees" in data:
        # Clear existing assignees
        doc.assignees = []
        # Add new assignees
        for assignee_data in data["assignees"]:
            doc.append("assignees", {
                "user": assignee_data.get("user"),
                "role": assignee_data.get("role", "Collaborator"),
                "added_at": now_datetime(),
                "added_by": frappe.session.user
            })

    doc.save()
    return {"success": True, "task_id": doc.name}


@frappe.whitelist()
def delete_task(task_id):
    """Delete a task"""
    require_permission("WH Task", "delete")
    if not task_id:
        frappe.throw(_("Task ID is required"))

    frappe.delete_doc("WH Task", task_id)
    return {"success": True}


@frappe.whitelist()
def change_status(task_id, new_status):
    """Change task status"""
    require_permission("WH Task", "write")
    valid_statuses = ["BACKLOG", "NEXT", "DOING", "BLOCKED", "DONE"]
    if new_status not in valid_statuses:
        frappe.throw(_("Invalid status: {0}").format(new_status))

    doc = frappe.get_doc("WH Task", task_id)
    doc.status = new_status
    doc.save()
    return {"success": True, "status": doc.status}


@frappe.whitelist()
def bulk_change_status(task_ids, new_status):
    """Change status for multiple tasks"""
    require_permission("WH Task", "write")
    if isinstance(task_ids, str):
        task_ids = json.loads(task_ids)

    valid_statuses = ["BACKLOG", "NEXT", "DOING", "BLOCKED", "DONE"]
    if new_status not in valid_statuses:
        frappe.throw(_("Invalid status: {0}").format(new_status))

    for task_id in task_ids:
        frappe.db.set_value("WH Task", task_id, "status", new_status)

    return {"success": True, "count": len(task_ids)}


@frappe.whitelist()
def add_dependency(predecessor_id, successor_id, dep_type="FS", lag_days=0):
    """Add dependency between tasks"""
    require_permission("WH Task Dependency", "create")

    if predecessor_id == successor_id:
        frappe.throw(_("A task cannot depend on itself"))

    # Check for existing dependency
    existing = frappe.db.exists("WH Task Dependency", {
        "predecessor": predecessor_id,
        "successor": successor_id,
        "is_active": 1
    })

    if existing:
        frappe.throw(_("This dependency already exists"))

    # Check for circular dependency
    if _has_circular_dependency(predecessor_id, successor_id):
        frappe.throw(_("This would create a circular dependency"))

    doc = frappe.new_doc("WH Task Dependency")
    doc.predecessor = predecessor_id
    doc.successor = successor_id
    doc.type = dep_type
    doc.lag_days = lag_days
    doc.is_active = 1
    doc.insert()

    return {"success": True, "dependency_id": doc.name}


def _has_circular_dependency(predecessor_id, successor_id):
    """Check if adding this dependency would create a cycle"""
    visited = set()
    stack = [predecessor_id]

    while stack:
        current = stack.pop()
        if current == successor_id:
            return True
        if current in visited:
            continue
        visited.add(current)

        # Get predecessors of current
        predecessors = frappe.get_all("WH Task Dependency",
            filters={"successor": current, "is_active": 1},
            pluck="predecessor")
        stack.extend(predecessors)

    return False


@frappe.whitelist()
def remove_dependency(dependency_id):
    """Remove a dependency"""
    require_permission("WH Task Dependency", "delete")
    frappe.db.set_value("WH Task Dependency", dependency_id, "is_active", 0)
    return {"success": True}


@frappe.whitelist()
def get_task_dependencies(task_id):
    """Get all dependencies for a task"""
    require_auth()

    predecessors = frappe.get_all("WH Task Dependency",
        filters={"successor": task_id, "is_active": 1},
        fields=["name", "predecessor", "type", "lag_days", "is_critical"])

    for p in predecessors:
        task_data = frappe.db.get_value("WH Task", p["predecessor"],
            ["title", "status", "due_date"], as_dict=True)
        if task_data:
            p.update(task_data)

    successors = frappe.get_all("WH Task Dependency",
        filters={"predecessor": task_id, "is_active": 1},
        fields=["name", "successor", "type", "lag_days", "is_critical"])

    for s in successors:
        task_data = frappe.db.get_value("WH Task", s["successor"],
            ["title", "status", "start_date"], as_dict=True)
        if task_data:
            s.update(task_data)

    return {
        "predecessors": predecessors,
        "successors": successors
    }


@frappe.whitelist()
def log_work(task_id, date=None, notes=""):
    """Log work on a task"""
    require_permission("WH Task", "write")
    task = frappe.get_doc("WH Task", task_id)
    task.append("work_log", {
        "date": date or nowdate(),
        "user": frappe.session.user,
        "notes": notes
    })
    task.save()
    return {"success": True}


@frappe.whitelist()
def get_work_history(task_id):
    """Get work history for a task"""
    require_auth()
    task = frappe.get_doc("WH Task", task_id)
    return task.work_log or []


@frappe.whitelist()
def create_subtask(parent_id, data):
    """Create a subtask"""
    require_permission("WH Task", "create")
    if isinstance(data, str):
        data = json.loads(data)

    # Get parent info
    parent = frappe.get_doc("WH Task", parent_id)

    doc = frappe.new_doc("WH Task")
    doc.title = data["title"]
    doc.description = data.get("description")
    doc.status = data.get("status", "BACKLOG")
    doc.priority = data.get("priority", parent.priority)
    doc.project = parent.project
    doc.department = parent.department
    doc.assigned_to = data.get("assigned_to") or parent.assigned_to
    doc.parent_task = parent_id

    doc.insert()
    return {"success": True, "task_id": doc.name}


@frappe.whitelist()
def get_subtasks(task_id):
    """Get subtasks of a task"""
    require_auth()
    return frappe.get_all("WH Task",
        filters={"parent_task": task_id},
        fields=["name", "title", "status", "priority", "assigned_to", "due_date"])


@frappe.whitelist()
def link_to_erp(task_id, doctype, doc_id):
    """Link task to an ERP document via WorkLink"""
    require_permission("WH Task", "write")

    # Check if WorkLink already exists for this ERP doc
    existing = frappe.db.get_value("WorkLink",
        {"source_doctype": doctype, "source_id": doc_id},
        "name")

    if existing:
        # Update existing WorkLink
        worklink = frappe.get_doc("WorkLink", existing)
        worklink.wh_task = task_id
        worklink.sync_assignees()
        worklink.save()
        worklink_id = existing
    else:
        # Create new WorkLink
        worklink = frappe.new_doc("WorkLink")
        worklink.source_doctype = doctype
        worklink.source_id = doc_id
        worklink.department = frappe.db.get_value("WH Task", task_id, "department") or "OPS"
        worklink.wh_task = task_id
        worklink.insert()
        worklink_id = worklink.name

    # Update task
    frappe.db.set_value("WH Task", task_id, {
        "worklink": worklink_id,
        "source_doctype": doctype,
        "source_name": doc_id
    })

    return {"success": True, "worklink_id": worklink_id}


@frappe.whitelist()
def unlink_from_erp(task_id):
    """Remove ERP link from task"""
    require_permission("WH Task", "write")

    task = frappe.get_doc("WH Task", task_id)
    if task.worklink:
        frappe.db.set_value("WorkLink", task.worklink, "wh_task", None)

    task.worklink = None
    task.source_doctype = None
    task.source_name = None
    task.save()

    return {"success": True}


@frappe.whitelist()
def quick_add(title, priority="P1", department=None, assigned_to=None):
    """Quick add task to inbox"""
    require_permission("WH Task", "create")
    doc = frappe.new_doc("WH Task")
    doc.title = title
    doc.priority = priority
    doc.status = "BACKLOG"
    doc.department = department
    doc.assigned_to = assigned_to or frappe.session.user
    doc.is_inbox = 1
    doc.insert()
    return {"success": True, "task_id": doc.name}


@frappe.whitelist()
def add_assignee(task_id, user, role="Collaborator"):
    """Add an assignee to a task"""
    require_permission("WH Task", "write")

    if not task_id:
        frappe.throw(_("Task ID is required"))
    if not user:
        frappe.throw(_("User is required"))

    # Check if user is already assigned
    existing = frappe.db.exists("WH Task Assignee", {
        "parent": task_id,
        "user": user
    })

    if existing:
        frappe.throw(_("User is already assigned to this task"))

    doc = frappe.get_doc("WH Task", task_id)
    doc.append("assignees", {
        "user": user,
        "role": role,
        "added_at": now_datetime(),
        "added_by": frappe.session.user
    })
    doc.save()

    return {"success": True, "task_id": doc.name}


@frappe.whitelist()
def remove_assignee(task_id, user):
    """Remove an assignee from a task"""
    require_permission("WH Task", "write")

    if not task_id:
        frappe.throw(_("Task ID is required"))
    if not user:
        frappe.throw(_("User is required"))

    doc = frappe.get_doc("WH Task", task_id)

    # Find and remove the assignee
    assignee_to_remove = None
    for assignee in doc.assignees:
        if assignee.user == user:
            assignee_to_remove = assignee
            break

    if not assignee_to_remove:
        frappe.throw(_("User is not assigned to this task"))

    # Check if this is the only Owner - if so, don't allow removal
    if assignee_to_remove.role == "Owner":
        other_owners = [a for a in doc.assignees if a.role == "Owner" and a.user != user]
        if not other_owners and len(doc.assignees) > 1:
            frappe.throw(_("Cannot remove the only Owner. Promote another assignee to Owner first"))

    doc.remove(assignee_to_remove)
    doc.save()

    return {"success": True, "task_id": doc.name}
