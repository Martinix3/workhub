# WH Projects API
# CRUD operations for project management

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, add_days, date_diff
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
def get_projects(filters=None, limit=50, offset=0):
    """Get project list with optional filters"""
    require_auth()
    if filters and isinstance(filters, str):
        filters = json.loads(filters)

    filter_conditions = {}

    if filters:
        if filters.get("status"):
            if isinstance(filters["status"], list):
                filter_conditions["status"] = ["in", filters["status"]]
            else:
                filter_conditions["status"] = filters["status"]
        if filters.get("health"):
            filter_conditions["health"] = filters["health"]
        if filters.get("department"):
            filter_conditions["department"] = filters["department"]
        if filters.get("owner_user"):
            filter_conditions["owner_user"] = filters["owner_user"]
        if filters.get("search"):
            filter_conditions["title"] = ["like", f"%{filters['search']}%"]

    projects = frappe.get_list("WH Project",
        filters=filter_conditions,
        fields=[
            "name", "title", "description", "status", "health", "health_reason",
            "department", "owner_user", "start_date", "target_date",
            "progress_pct", "total_tasks", "completed_tasks",
            "blocked_tasks", "overdue_tasks", "velocity",
            "creation", "modified"
        ],
        limit_page_length=int(limit),
        limit_start=int(offset),
        order_by="health desc, target_date asc",
        ignore_permissions=True
    )

    # Enrich with user info
    for project in projects:
        if project.get("owner_user"):
            project["owner_name"] = frappe.db.get_value("User", project["owner_user"], "full_name")

        # Calculate days remaining
        if project.get("target_date"):
            days_remaining = date_diff(project["target_date"], nowdate())
            project["days_remaining"] = days_remaining
            project["is_overdue"] = days_remaining < 0 and project["status"] == "ACTIVE"
        else:
            project["days_remaining"] = None
            project["is_overdue"] = False

    return projects


@frappe.whitelist()
def get_project(project_id):
    """Get single project with full details"""
    require_auth()
    if not project_id:
        frappe.throw(_("Project ID is required"))

    project = frappe.get_doc("WH Project", project_id)

    # Get tasks grouped by status
    tasks_by_status = {}
    for status in ["BACKLOG", "NEXT", "DOING", "BLOCKED", "DONE"]:
        tasks = frappe.get_all("WH Task",
            filters={"project": project_id, "status": status},
            fields=["name", "title", "priority", "assigned_to", "due_date", "is_milestone"],
            order_by="priority asc, due_date asc")

        # Enrich with assignees
        for task in tasks:
            task["assignees"] = _enrich_task_assignees(task)

        tasks_by_status[status] = tasks

    # Get milestones
    milestones = frappe.get_all("WH Task",
        filters={"project": project_id, "is_milestone": 1},
        fields=["name", "title", "status", "due_date"],
        order_by="due_date asc")

    # Get team members (from assignees table)
    team = frappe.db.sql("""
        SELECT ta.user, COUNT(DISTINCT ta.parent) as task_count
        FROM `tabWH Task Assignee` ta
        JOIN `tabWH Task` t ON ta.parent = t.name
        WHERE t.project = %s
        GROUP BY ta.user
    """, (project_id,), as_dict=True)

    for member in team:
        user_data = frappe.db.get_value("User", member["user"],
            ["full_name", "user_image"], as_dict=True)
        if user_data:
            member.update(user_data)

    return {
        "project": project.as_dict(),
        "tasks_by_status": tasks_by_status,
        "milestones": milestones,
        "team": team
    }


@frappe.whitelist()
def create_project(data):
    """Create a new project"""
    require_permission("WH Project", "create")
    if isinstance(data, str):
        data = json.loads(data)

    if not data.get("title"):
        frappe.throw(_("Title is required"))
    if not data.get("department"):
        frappe.throw(_("Department is required"))

    doc = frappe.new_doc("WH Project")
    doc.title = data["title"]
    doc.description = data.get("description")
    doc.department = data["department"]
    doc.owner_user = data.get("owner_user") or frappe.session.user
    doc.start_date = data.get("start_date") or nowdate()
    doc.target_date = data.get("target_date")
    doc.template_used = data.get("template")

    doc.insert()
    return {"success": True, "project_id": doc.name}


@frappe.whitelist()
def update_project(project_id, data):
    """Update an existing project"""
    require_permission("WH Project", "write")
    if isinstance(data, str):
        data = json.loads(data)

    if not project_id:
        frappe.throw(_("Project ID is required"))

    doc = frappe.get_doc("WH Project", project_id)

    # Update allowed fields
    allowed_fields = [
        "title", "description", "status", "department",
        "owner_user", "start_date", "target_date"
    ]

    for field in allowed_fields:
        if field in data:
            setattr(doc, field, data[field])

    doc.save()
    return {"success": True, "project_id": doc.name}


@frappe.whitelist()
def get_project_options():
    """Get lightweight list of active projects for dropdown selection"""
    require_auth()

    projects = frappe.get_all("WH Project",
        fields=["name", "title"],
        order_by="title asc",
        limit_page_length=100,
        ignore_permissions=True
    )

    return projects


@frappe.whitelist()
def get_templates():
    """Get available project templates"""
    require_auth()
    return frappe.get_all("WH Project Template",
        filters={"is_active": 1},
        fields=["name", "description", "department", "default_duration_days"])


@frappe.whitelist()
def create_from_template(template_id, data):
    """Create project from template"""
    require_permission("WH Project", "create")
    if isinstance(data, str):
        data = json.loads(data)

    template = frappe.get_doc("WH Project Template", template_id)

    # Create project
    project = frappe.new_doc("WH Project")
    project.title = data.get("title") or template.name
    project.description = data.get("description") or template.description
    project.department = data.get("department") or template.department
    project.owner_user = data.get("owner_user") or frappe.session.user
    project.start_date = data.get("start_date") or nowdate()
    project.template_used = template_id

    # Calculate target date from template duration
    if template.default_duration_days:
        project.target_date = add_days(project.start_date, template.default_duration_days)

    project.insert()

    # Create tasks from template
    tasks_created = []
    task_map = {}  # sequence -> task_name

    for task_template in template.tasks:
        task = frappe.new_doc("WH Task")
        task.title = task_template.title
        task.description = task_template.description
        task.project = project.name
        task.department = project.department
        task.assigned_to = data.get("assigned_to") or project.owner_user
        task.is_milestone = task_template.is_milestone
        task.status = "BACKLOG"

        # Calculate dates
        if task_template.offset_days is not None:
            task.start_date = add_days(project.start_date, task_template.offset_days)
            if task_template.duration_days:
                task.due_date = add_days(task.start_date, task_template.duration_days)

        task.insert()
        tasks_created.append(task.name)
        task_map[task_template.sequence] = task.name

        # Create dependency if specified
        if task_template.depends_on_sequence and task_template.depends_on_sequence in task_map:
            dep = frappe.new_doc("WH Task Dependency")
            dep.predecessor = task_map[task_template.depends_on_sequence]
            dep.successor = task.name
            dep.type = "FS"
            dep.is_active = 1
            dep.insert()

    # Recalculate project KPIs
    project.reload()
    project.recalculate_kpis()

    return {
        "success": True,
        "project_id": project.name,
        "tasks_created": len(tasks_created)
    }


@frappe.whitelist()
def preview_template(template_id):
    """Preview what a template would create"""
    require_auth()
    template = frappe.get_doc("WH Project Template", template_id)

    tasks = []
    for task_template in template.tasks:
        tasks.append({
            "sequence": task_template.sequence,
            "title": task_template.title,
            "description": task_template.description,
            "offset_days": task_template.offset_days,
            "duration_days": task_template.duration_days,
            "is_milestone": task_template.is_milestone,
            "depends_on": task_template.depends_on_sequence
        })

    return {
        "template": {
            "name": template.name,
            "description": template.description,
            "department": template.department,
            "default_duration_days": template.default_duration_days
        },
        "tasks": tasks
    }


@frappe.whitelist()
def get_gantt_data(project_id):
    """Get Gantt chart data for a project"""
    require_auth()

    # Get all tasks with dates
    tasks = frappe.get_all("WH Task",
        filters={"project": project_id},
        fields=[
            "name", "title", "status", "priority",
            "start_date", "due_date", "is_milestone",
            "assigned_to"
        ],
        order_by="start_date asc, due_date asc")

    # Get all dependencies
    task_names = [t["name"] for t in tasks]
    dependencies = frappe.get_all("WH Task Dependency",
        filters={"predecessor": ["in", task_names], "is_active": 1},
        fields=["predecessor", "successor", "type", "lag_days", "is_critical"])

    return {
        "tasks": tasks,
        "dependencies": dependencies
    }


@frappe.whitelist()
def update_task_dates(task_id, start_date=None, due_date=None):
    """Update task dates (for drag-and-drop in Gantt)"""
    require_permission("WH Task", "write")

    updates = {}
    if start_date:
        updates["start_date"] = start_date
    if due_date:
        updates["due_date"] = due_date

    if updates:
        frappe.db.set_value("WH Task", task_id, updates)

        # Trigger propagation
        task = frappe.get_doc("WH Task", task_id)
        task.propagate_to_successors()

    return {"success": True}


@frappe.whitelist()
def calculate_critical_path(project_id):
    """Calculate critical path for a project"""
    require_auth()

    tasks = frappe.get_all("WH Task",
        filters={"project": project_id},
        fields=["name", "title", "start_date", "due_date", "status"])

    if not tasks:
        return {"critical_path": []}

    task_dict = {t["name"]: t for t in tasks}

    # Get dependencies
    dependencies = frappe.get_all("WH Task Dependency",
        filters={"predecessor": ["in", list(task_dict.keys())], "is_active": 1},
        fields=["predecessor", "successor", "lag_days"])

    # Build adjacency lists
    successors = {}  # task -> [(successor, lag)]
    predecessors = {}  # task -> [(predecessor, lag)]

    for d in dependencies:
        if d["predecessor"] not in successors:
            successors[d["predecessor"]] = []
        successors[d["predecessor"]].append((d["successor"], d["lag_days"] or 0))

        if d["successor"] not in predecessors:
            predecessors[d["successor"]] = []
        predecessors[d["successor"]].append((d["predecessor"], d["lag_days"] or 0))

    # Calculate early start/finish (forward pass)
    early_start = {}
    early_finish = {}

    # Topological sort
    in_degree = {t: 0 for t in task_dict}
    for task_name in task_dict:
        if task_name in predecessors:
            in_degree[task_name] = len(predecessors[task_name])

    queue = [t for t in task_dict if in_degree[t] == 0]

    while queue:
        task_name = queue.pop(0)
        task = task_dict[task_name]

        # Calculate early start
        if task_name in predecessors:
            es = max([
                early_finish.get(p, 0) + lag
                for p, lag in predecessors[task_name]
            ])
        else:
            es = 0

        early_start[task_name] = es

        # Calculate duration
        if task.get("start_date") and task.get("due_date"):
            duration = date_diff(task["due_date"], task["start_date"])
        else:
            duration = 1

        early_finish[task_name] = es + duration

        # Process successors
        if task_name in successors:
            for succ, lag in successors[task_name]:
                in_degree[succ] -= 1
                if in_degree[succ] == 0:
                    queue.append(succ)

    # Calculate late start/finish (backward pass)
    project_end = max(early_finish.values()) if early_finish else 0

    late_finish = {}
    late_start = {}
    slack = {}

    # Reverse topological order
    reverse_order = sorted(task_dict.keys(), key=lambda x: early_finish.get(x, 0), reverse=True)

    for task_name in reverse_order:
        task = task_dict[task_name]

        # Calculate late finish
        if task_name in successors:
            lf = min([
                late_start.get(s, project_end) - lag
                for s, lag in successors[task_name]
            ])
        else:
            lf = project_end

        late_finish[task_name] = lf

        # Calculate duration
        if task.get("start_date") and task.get("due_date"):
            duration = date_diff(task["due_date"], task["start_date"])
        else:
            duration = 1

        late_start[task_name] = lf - duration
        slack[task_name] = late_start[task_name] - early_start[task_name]

    # Critical path = tasks with slack = 0
    critical_tasks = [t for t in task_dict if slack.get(t, 0) == 0]

    # Update tasks in database
    for task_name in critical_tasks:
        # Mark dependencies as critical
        frappe.db.sql("""
            UPDATE `tabWH Task Dependency`
            SET is_critical = 1
            WHERE predecessor = %s OR successor = %s
        """, (task_name, task_name))

    # Update project
    frappe.db.set_value("WH Project", project_id, {
        "critical_path": json.dumps(critical_tasks),
        "slack_days": min(slack.values()) if slack else 0
    })

    return {
        "critical_path": critical_tasks,
        "early_dates": {t: {"start": early_start.get(t), "finish": early_finish.get(t)} for t in task_dict},
        "late_dates": {t: {"start": late_start.get(t), "finish": late_finish.get(t)} for t in task_dict},
        "slack": slack
    }


@frappe.whitelist()
def get_board(project_id=None, filters=None):
    """Get Kanban board data as array of columns for frontend"""
    require_auth()

    # Build base filters
    if filters:
        if isinstance(filters, str):
            filters = json.loads(filters)
        base_filters = dict(filters)
    else:
        base_filters = {}

    # Add project filter if specified
    if project_id:
        base_filters["project"] = project_id

    status_labels = {
        "BACKLOG": "Backlog",
        "NEXT": "Siguiente",
        "DOING": "En Progreso",
        "BLOCKED": "Bloqueadas",
        "DONE": "Completadas"
    }

    columns = []
    for status in ["BACKLOG", "NEXT", "DOING", "BLOCKED", "DONE"]:
        status_filters = {**base_filters, "status": status}
        tasks = frappe.get_all("WH Task",
            filters=status_filters,
            fields=[
                "name", "title", "priority", "assigned_to",
                "due_date", "is_milestone", "project", "department",
                "blocked_reason", "status"
            ],
            order_by="priority asc, due_date asc")

        # Enrich with project info, assignees, and overdue flag
        for task in tasks:
            # Add assignees
            task["assignees"] = _enrich_task_assignees(task)

            if task.get("due_date") and status != "DONE":
                task["is_overdue"] = getdate(task["due_date"]) < getdate(nowdate())
            else:
                task["is_overdue"] = False

            # Get project title if exists
            if task.get("project"):
                task["project_title"] = frappe.db.get_value("WH Project", task["project"], "title")

        columns.append({
            "status": status,
            "label": status_labels[status],
            "tasks": tasks
        })

    return columns


@frappe.whitelist()
def move_task(task_id, new_status):
    """Move task to new status (Kanban drag)"""
    require_permission("WH Task", "write")

    valid_statuses = ["BACKLOG", "NEXT", "DOING", "BLOCKED", "DONE"]
    if new_status not in valid_statuses:
        frappe.throw(_("Invalid status: {0}").format(new_status))

    frappe.db.set_value("WH Task", task_id, "status", new_status)

    # If moved to DONE, update actual_end
    if new_status == "DONE":
        frappe.db.set_value("WH Task", task_id, "actual_end", frappe.utils.now_datetime())

    return {"success": True}


@frappe.whitelist()
def get_project_kpis(project_id):
    """Get KPIs for a project"""
    require_auth()

    project = frappe.get_doc("WH Project", project_id)

    # Get task stats
    task_stats = frappe.db.sql("""
        SELECT
            status,
            COUNT(*) as count,
            priority,
            SUM(CASE WHEN due_date < CURDATE() AND status != 'DONE' THEN 1 ELSE 0 END) as overdue
        FROM `tabWH Task`
        WHERE project = %s
        GROUP BY status, priority
    """, (project_id,), as_dict=True)

    # Calculate velocity (tasks completed in last 7 days)
    velocity = frappe.db.sql("""
        SELECT COUNT(*) as count
        FROM `tabWH Task`
        WHERE project = %s
        AND status = 'DONE'
        AND modified >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    """, (project_id,))[0][0]

    return {
        "progress_pct": project.progress_pct,
        "total_tasks": project.total_tasks,
        "completed_tasks": project.completed_tasks,
        "blocked_tasks": project.blocked_tasks,
        "overdue_tasks": project.overdue_tasks,
        "velocity": velocity,
        "health": project.health,
        "health_reason": project.health_reason,
        "estimated_completion": project.estimated_completion,
        "task_breakdown": task_stats
    }


@frappe.whitelist()
def recalculate_health(project_id):
    """Force recalculation of project health"""
    require_permission("WH Project", "write")
    project = frappe.get_doc("WH Project", project_id)
    project.recalculate_kpis()
    project.reload()
    return {
        "health": project.health,
        "health_reason": project.health_reason
    }
