# Manager API
# Vista para meetings y gestion de equipo

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, add_days, date_diff
import json

from workhub_frappe_app.api.utils import require_auth, require_any_role
from workhub_frappe_app.services.ai_recommendations import (
    detect_at_risk_tasks as detect_at_risk_service,
    analyze_workload_balance
)


def _get_user_task_ids(user):
    """Get task IDs where user is assigned (any role)"""
    task_ids = frappe.get_all("WH Task Assignee",
        filters={"user": user},
        pluck="parent"
    )
    return task_ids if task_ids else []


def _enrich_task_assignees(task):
    """Enrich task with assignees data including user info"""
    if not task.get("name"):
        return []

    assignees = frappe.get_all("WH Task Assignee",
        filters={"parent": task["name"]},
        fields=["user", "role"],
        order_by="idx"
    )

    # Enrich with user info
    for assignee in assignees:
        if assignee.get("user"):
            assignee["user_name"] = frappe.db.get_value("User", assignee["user"], "full_name")

    return assignees


@frappe.whitelist()
def get_overview():
    """Vista completa para meetings - estado de todo el equipo"""
    require_auth()

    # Proyectos por health
    projects = frappe.get_all("WH Project",
        filters={"status": "ACTIVE"},
        fields=["name", "title", "health", "health_reason", "progress_pct",
                "owner_user", "department", "target_date", "blocked_tasks", "overdue_tasks"])

    projects_by_health = {"RED": [], "YELLOW": [], "GREEN": []}
    for p in projects:
        if p.get("owner_user"):
            p["owner_name"] = frappe.db.get_value("User", p["owner_user"], "full_name")
        if p.get("target_date"):
            p["days_remaining"] = date_diff(p["target_date"], nowdate())
        projects_by_health[p.get("health", "GREEN")].append(p)

    # Tareas criticas (P0 no completadas)
    critical_tasks = frappe.get_all("WH Task",
        filters={"priority": "P0", "status": ["not in", ["DONE"]]},
        fields=["name", "title", "status", "assigned_to", "project", "due_date"],
        order_by="due_date asc",
        limit=10)

    for t in critical_tasks:
        # Add assignees
        t["assignees"] = _enrich_task_assignees(t)

        # Keep assigned_name for backward compatibility
        if t.get("assigned_to"):
            t["assigned_name"] = frappe.db.get_value("User", t["assigned_to"], "full_name")
        if t.get("project"):
            t["project_title"] = frappe.db.get_value("WH Project", t["project"], "title")

    # Tareas bloqueadas
    blocked_tasks = frappe.get_all("WH Task",
        filters={"status": "BLOCKED"},
        fields=["name", "title", "assigned_to", "project", "blocked_reason", "due_date"],
        order_by="due_date asc",
        limit=10)

    for t in blocked_tasks:
        # Add assignees
        t["assignees"] = _enrich_task_assignees(t)

        # Keep assigned_name for backward compatibility
        if t.get("assigned_to"):
            t["assigned_name"] = frappe.db.get_value("User", t["assigned_to"], "full_name")

    # Workload por persona (from assignees table)
    team_workload = frappe.db.sql("""
        SELECT
            ta.user as user,
            SUM(CASE WHEN t.status = 'DOING' THEN 1 ELSE 0 END) as doing,
            SUM(CASE WHEN t.status = 'NEXT' THEN 1 ELSE 0 END) as next,
            SUM(CASE WHEN t.status = 'BLOCKED' THEN 1 ELSE 0 END) as blocked,
            SUM(CASE WHEN t.status = 'DONE' AND t.modified >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as completed_week,
            COUNT(DISTINCT ta.parent) as total
        FROM `tabWH Task Assignee` ta
        JOIN `tabWH Task` t ON ta.parent = t.name
        WHERE t.status != 'DONE' OR (t.status = 'DONE' AND t.modified >= DATE_SUB(CURDATE(), INTERVAL 7 DAY))
        GROUP BY ta.user
    """, as_dict=True)

    for member in team_workload:
        if member.get("user"):
            user_data = frappe.db.get_value("User", member["user"],
                ["full_name", "user_image"], as_dict=True)
            if user_data:
                member.update(user_data)
            member["velocity"] = member.get("completed_week", 0)  # tareas/semana

    # Completadas ultimas 24h
    recent_completions = frappe.get_all("WH Task",
        filters={
            "status": "DONE",
            "modified": [">=", add_days(nowdate(), -1)]
        },
        fields=["name", "title", "assigned_to", "project", "modified"],
        order_by="modified desc",
        limit=10)

    for t in recent_completions:
        # Add assignees
        t["assignees"] = _enrich_task_assignees(t)

        # Keep assigned_name for backward compatibility
        if t.get("assigned_to"):
            t["assigned_name"] = frappe.db.get_value("User", t["assigned_to"], "full_name")

    # Hitos proximos 7 dias
    upcoming_milestones = frappe.get_all("WH Task",
        filters={
            "is_milestone": 1,
            "status": ["not in", ["DONE"]],
            "due_date": ["between", [nowdate(), add_days(nowdate(), 7)]]
        },
        fields=["name", "title", "project", "due_date", "assigned_to"],
        order_by="due_date asc")

    for m in upcoming_milestones:
        # Add assignees
        m["assignees"] = _enrich_task_assignees(m)

        if m.get("project"):
            m["project_title"] = frappe.db.get_value("WH Project", m["project"], "title")

    # AI-detected at-risk tasks
    at_risk_tasks = []
    try:
        at_risk_data = detect_at_risk_service(user=None, limit=10)
        for item in at_risk_data:
            task = item["task"]
            at_risk_tasks.append({
                "task_id": task["name"],
                "title": task["title"],
                "status": task["status"],
                "priority": task["priority"],
                "assigned_to": task.get("assigned_to"),
                "assigned_name": frappe.db.get_value("User", task["assigned_to"], "full_name") if task.get("assigned_to") else None,
                "project": task.get("project"),
                "project_title": frappe.db.get_value("WH Project", task["project"], "title") if task.get("project") else None,
                "due_date": task.get("due_date"),
                "days_remaining": date_diff(task["due_date"], nowdate()) if task.get("due_date") else None,
                "risk_score": round(item["risk_score"] * 100, 1),
                "risk_level": item["risk_level"],
                "reason": item["reason"]
            })
    except Exception as e:
        frappe.log_error(f"Error getting AI at-risk tasks: {str(e)}", "Manager Overview AI")

    # AI workload balance suggestions
    workload_balance_suggestions = []
    try:
        workload_data = analyze_workload_balance(department=None)

        # Enhance user data with names
        for user_data in workload_data.get("users", []):
            if user_data.get("user"):
                user_info = frappe.db.get_value("User", user_data["user"],
                    ["full_name", "user_image"], as_dict=True)
                if user_info:
                    user_data.update(user_info)

        # Format suggestions
        for suggestion in workload_data.get("suggestions", []):
            workload_balance_suggestions.append({
                "type": suggestion["type"],
                "from_user": suggestion["from_user"],
                "from_user_name": frappe.db.get_value("User", suggestion["from_user"], "full_name"),
                "to_user": suggestion["to_user"],
                "to_user_name": frappe.db.get_value("User", suggestion["to_user"], "full_name"),
                "reason": suggestion["reason"],
                "from_workload": suggestion["from_workload"],
                "to_workload": suggestion["to_workload"]
            })
    except Exception as e:
        frappe.log_error(f"Error getting AI workload suggestions: {str(e)}", "Manager Overview AI")

    return {
        "projects_by_health": projects_by_health,
        "critical_tasks": critical_tasks,
        "blocked_tasks": blocked_tasks,
        "team_workload": team_workload,
        "recent_completions": recent_completions,
        "upcoming_milestones": upcoming_milestones,
        "at_risk_tasks": at_risk_tasks,
        "workload_balance_suggestions": workload_balance_suggestions,
        "summary": {
            "projects_at_risk": len(projects_by_health["RED"]),
            "projects_warning": len(projects_by_health["YELLOW"]),
            "critical_count": len(critical_tasks),
            "blocked_count": len(blocked_tasks),
            "at_risk_count": len(at_risk_tasks),
            "workload_suggestions_count": len(workload_balance_suggestions)
        }
    }


@frappe.whitelist()
def get_person_summary(user_id, days=7):
    """Resumen de una persona para 1-on-1s"""
    require_auth()

    # Get user task IDs from assignees table
    user_task_ids = _get_user_task_ids(user_id)

    if not user_task_ids:
        # User has no tasks
        completed = []
        current = []
    else:
        # Tareas completadas
        completed = frappe.get_all("WH Task",
            filters={
                "name": ["in", user_task_ids],
                "status": "DONE",
                "modified": [">=", add_days(nowdate(), -days)]
            },
            fields=["name", "title", "project", "modified", "priority"],
            order_by="modified desc")

        # Tareas actuales
        current = frappe.get_all("WH Task",
            filters={
                "name": ["in", user_task_ids],
                "status": ["in", ["DOING", "NEXT", "BLOCKED"]]
            },
            fields=["name", "title", "status", "priority", "project", "due_date", "blocked_reason"],
            order_by="priority asc, due_date asc")

    # Dias trabajados (del work log)
    work_days = frappe.db.sql("""
        SELECT COUNT(DISTINCT wl.date) as days
        FROM `tabWH Task Work Log` wl
        JOIN `tabWH Task` t ON wl.parent = t.name
        WHERE wl.user = %s AND wl.date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
    """, (user_id, days))[0][0]

    # Velocity
    velocity = len(completed) / (days / 7) if days >= 7 else len(completed)

    # Proyectos activos (from assignees table)
    active_projects = frappe.db.sql("""
        SELECT DISTINCT t.project, p.title, p.health
        FROM `tabWH Task Assignee` ta
        JOIN `tabWH Task` t ON ta.parent = t.name
        JOIN `tabWH Project` p ON t.project = p.name
        WHERE ta.user = %s AND t.status != 'DONE' AND t.project IS NOT NULL
    """, (user_id,), as_dict=True)

    user_info = frappe.db.get_value("User", user_id,
        ["full_name", "email", "user_image"], as_dict=True)

    return {
        "user": user_info,
        "period_days": days,
        "completed": completed,
        "completed_count": len(completed),
        "current": current,
        "current_count": len(current),
        "blocked_count": len([t for t in current if t["status"] == "BLOCKED"]),
        "work_days": work_days,
        "velocity": round(velocity, 1),
        "active_projects": active_projects
    }


@frappe.whitelist()
def get_team_kpis():
    """KPIs agregados del equipo"""
    require_auth()

    # Totales
    total_tasks = frappe.db.count("WH Task", {"status": ["not in", ["DONE"]]})
    total_blocked = frappe.db.count("WH Task", {"status": "BLOCKED"})
    total_overdue = frappe.db.sql("""
        SELECT COUNT(*) FROM `tabWH Task`
        WHERE status NOT IN ('DONE') AND due_date < CURDATE()
    """)[0][0]

    # Completadas esta semana
    completed_week = frappe.db.sql("""
        SELECT COUNT(*) FROM `tabWH Task`
        WHERE status = 'DONE' AND modified >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    """)[0][0]

    # Velocity promedio del equipo (from assignees table)
    team_size = frappe.db.sql("""
        SELECT COUNT(DISTINCT ta.user)
        FROM `tabWH Task Assignee` ta
        JOIN `tabWH Task` t ON ta.parent = t.name
        WHERE t.status != 'DONE'
    """)[0][0] or 1

    avg_velocity = completed_week / team_size

    # Proyectos
    total_projects = frappe.db.count("WH Project", {"status": "ACTIVE"})
    projects_at_risk = frappe.db.count("WH Project", {"status": "ACTIVE", "health": "RED"})

    # Tendencia (comparar con semana anterior)
    completed_prev_week = frappe.db.sql("""
        SELECT COUNT(*) FROM `tabWH Task`
        WHERE status = 'DONE'
        AND modified >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        AND modified < DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    """)[0][0]

    trend = "up" if completed_week > completed_prev_week else "down" if completed_week < completed_prev_week else "stable"

    return {
        "tasks": {
            "total": total_tasks,
            "blocked": total_blocked,
            "overdue": total_overdue,
            "completed_week": completed_week,
            "blocked_rate": round(total_blocked / total_tasks * 100, 1) if total_tasks else 0
        },
        "team": {
            "size": team_size,
            "avg_velocity": round(avg_velocity, 1),
            "trend": trend,
            "trend_delta": completed_week - completed_prev_week
        },
        "projects": {
            "total": total_projects,
            "at_risk": projects_at_risk,
            "risk_rate": round(projects_at_risk / total_projects * 100, 1) if total_projects else 0
        }
    }


@frappe.whitelist()
def reassign_task(task_id, new_user):
    """Reasignar tarea a otro usuario (cambia el owner principal)"""
    require_any_role("System Manager", "Projects Manager")

    task = frappe.get_doc("WH Task", task_id)
    old_user = task.assigned_to

    # Update primary owner
    task.assigned_to = new_user

    # Update assignees table - change the Owner role
    for assignee in task.assignees:
        if assignee.role == "Owner":
            assignee.user = new_user
            break

    task.save()

    # Crear notificacion para nuevo asignado
    _create_notification(
        user=new_user,
        notification_type="TASK_ASSIGNED",
        title=f"Nueva tarea asignada: {task.title}",
        message=f"Te han asignado la tarea '{task.title}'",
        reference_doctype="WH Task",
        reference_name=task_id
    )

    return {"success": True, "old_user": old_user, "new_user": new_user}


@frappe.whitelist()
def bulk_reassign(task_ids, new_user):
    """Reasignar multiples tareas (cambia el owner principal de todas)"""
    require_any_role("System Manager", "Projects Manager")

    if isinstance(task_ids, str):
        task_ids = json.loads(task_ids)

    for task_id in task_ids:
        task = frappe.get_doc("WH Task", task_id)
        task.assigned_to = new_user

        # Update assignees table - change the Owner role
        for assignee in task.assignees:
            if assignee.role == "Owner":
                assignee.user = new_user
                break

        task.save()

    # Una sola notificacion
    _create_notification(
        user=new_user,
        notification_type="TASK_ASSIGNED",
        title=f"{len(task_ids)} tareas asignadas",
        message=f"Te han asignado {len(task_ids)} tareas",
        reference_doctype="WH Task",
        reference_name=task_ids[0] if task_ids else None
    )

    return {"success": True, "count": len(task_ids)}


@frappe.whitelist()
def get_department_summary(department):
    """Resumen por departamento"""
    require_auth()

    # Proyectos del departamento
    projects = frappe.get_all("WH Project",
        filters={"department": department, "status": "ACTIVE"},
        fields=["name", "title", "health", "progress_pct", "owner_user"])

    # Tareas del departamento
    task_stats = frappe.db.sql("""
        SELECT
            status,
            COUNT(*) as count
        FROM `tabWH Task`
        WHERE department = %s
        GROUP BY status
    """, (department,), as_dict=True)

    # Miembros del departamento con tareas (from assignees table)
    members = frappe.db.sql("""
        SELECT
            ta.user as user,
            COUNT(DISTINCT ta.parent) as task_count,
            SUM(CASE WHEN t.status = 'BLOCKED' THEN 1 ELSE 0 END) as blocked
        FROM `tabWH Task Assignee` ta
        JOIN `tabWH Task` t ON ta.parent = t.name
        WHERE t.department = %s AND t.status != 'DONE'
        GROUP BY ta.user
    """, (department,), as_dict=True)

    for m in members:
        if m.get("user"):
            m["full_name"] = frappe.db.get_value("User", m["user"], "full_name")

    return {
        "department": department,
        "projects": projects,
        "projects_count": len(projects),
        "task_stats": {s["status"]: s["count"] for s in task_stats},
        "members": members
    }


@frappe.whitelist()
def get_blocked_tasks(limit=50, offset=0):
    """Get all blocked tasks with full details and pagination"""
    require_auth()

    # Get total count for pagination metadata
    total_count = frappe.db.count("WH Task", {"status": "BLOCKED"})

    # Fetch blocked tasks with pagination
    blocked_tasks = frappe.get_list("WH Task",
        filters={"status": "BLOCKED"},
        fields=[
            "name", "title", "description", "priority",
            "project", "department", "assigned_to",
            "due_date", "blocked_reason", "is_milestone",
            "creation", "modified"
        ],
        limit_page_length=int(limit),
        limit_start=int(offset),
        order_by="due_date asc",
        ignore_permissions=True
    )

    # Enrich with additional information
    for task in blocked_tasks:
        # Add assignee name
        if task.get("assigned_to"):
            task["assigned_name"] = frappe.db.get_value("User", task["assigned_to"], "full_name")

        # Add project info
        if task.get("project"):
            project_data = frappe.db.get_value("WH Project", task["project"],
                ["title", "health"], as_dict=True)
            if project_data:
                task["project_title"] = project_data.title
                task["project_health"] = project_data.health

        # Calculate overdue status
        if task.get("due_date"):
            task["is_overdue"] = getdate(task["due_date"]) < getdate(nowdate())
        else:
            task["is_overdue"] = False

    return {
        "tasks": blocked_tasks,
        "total": total_count,
        "limit": int(limit),
        "offset": int(offset),
        "has_more": (int(offset) + int(limit)) < total_count
    }


def _create_notification(user, notification_type, title, message, reference_doctype=None, reference_name=None, priority="MEDIUM"):
    """Helper para crear notificaciones"""
    doc = frappe.new_doc("WH Notification")
    doc.user = user
    doc.type = notification_type
    doc.title = title
    doc.message = message
    doc.reference_doctype = reference_doctype
    doc.reference_name = reference_name
    doc.priority = priority
    doc.created_at = frappe.utils.now_datetime()
    doc.insert(ignore_permissions=True)
    return doc.name
