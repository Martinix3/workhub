# KPIs API
# Dashboard de metricas y reportes

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, add_days, add_months, get_first_day, get_last_day
import json

from workhub_frappe_app.api.utils import require_auth


@frappe.whitelist()
def get_dashboard_kpis():
    """KPIs principales para el dashboard"""
    require_auth()

    today = nowdate()
    week_ago = add_days(today, -7)
    month_ago = add_days(today, -30)

    # === PROYECTOS ===
    projects_active = frappe.db.count("WH Project", {"status": "ACTIVE"})
    projects_at_risk = frappe.db.count("WH Project", {"status": "ACTIVE", "health": "RED"})
    projects_warning = frappe.db.count("WH Project", {"status": "ACTIVE", "health": "YELLOW"})
    projects_completed_month = frappe.db.count("WH Project", {
        "status": "COMPLETED",
        "actual_end_date": [">=", month_ago]
    })

    # === TAREAS ===
    tasks_total = frappe.db.count("WH Task", {"status": ["not in", ["DONE"]]})
    tasks_blocked = frappe.db.count("WH Task", {"status": "BLOCKED"})
    tasks_overdue = frappe.db.sql("""
        SELECT COUNT(*) FROM `tabWH Task`
        WHERE status NOT IN ('DONE') AND due_date < CURDATE()
    """)[0][0]
    tasks_completed_week = frappe.db.sql("""
        SELECT COUNT(*) FROM `tabWH Task`
        WHERE status = 'DONE' AND modified >= %s
    """, (week_ago,))[0][0]
    tasks_completed_month = frappe.db.sql("""
        SELECT COUNT(*) FROM `tabWH Task`
        WHERE status = 'DONE' AND modified >= %s
    """, (month_ago,))[0][0]

    # === EQUIPO ===
    # Count unique users from assignees table
    team_size = frappe.db.sql("""
        SELECT COUNT(DISTINCT ta.user)
        FROM `tabWH Task Assignee` ta
        JOIN `tabWH Task` t ON ta.parent = t.name
        WHERE t.status != 'DONE'
    """)[0][0] or 1

    avg_velocity = tasks_completed_week / team_size if team_size else 0

    # === TREND: Comparar esta semana vs semana anterior ===
    two_weeks_ago = add_days(today, -14)
    last_week_completed = frappe.db.sql("""
        SELECT COUNT(*) FROM `tabWH Task`
        WHERE status = 'DONE'
        AND modified >= %s AND modified < %s
    """, (two_weeks_ago, week_ago))[0][0]

    if last_week_completed > 0:
        trend_delta = round((tasks_completed_week - last_week_completed) / last_week_completed * 100, 1)
    else:
        trend_delta = 100.0 if tasks_completed_week > 0 else 0.0

    if trend_delta > 5:
        trend = "up"
    elif trend_delta < -5:
        trend = "down"
    else:
        trend = "stable"

    # === TENDENCIAS ===
    # Tareas completadas por dia (ultimos 14 dias)
    daily_completions = frappe.db.sql("""
        SELECT DATE(modified) as date, COUNT(*) as count
        FROM `tabWH Task`
        WHERE status = 'DONE' AND modified >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        GROUP BY DATE(modified)
        ORDER BY date
    """, as_dict=True)

    # Tareas creadas vs completadas por semana (ultimas 8 semanas)
    weekly_flow = frappe.db.sql("""
        SELECT
            YEARWEEK(creation, 1) as week,
            COUNT(*) as created
        FROM `tabWH Task`
        WHERE creation >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK)
        GROUP BY YEARWEEK(creation, 1)
        ORDER BY week
    """, as_dict=True)

    weekly_completed = frappe.db.sql("""
        SELECT
            YEARWEEK(modified, 1) as week,
            COUNT(*) as completed
        FROM `tabWH Task`
        WHERE status = 'DONE' AND modified >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK)
        GROUP BY YEARWEEK(modified, 1)
        ORDER BY week
    """, as_dict=True)

    # Merge weekly data
    weeks_data = {}
    for w in weekly_flow:
        weeks_data[w["week"]] = {"created": w["created"], "completed": 0}
    for w in weekly_completed:
        if w["week"] in weeks_data:
            weeks_data[w["week"]]["completed"] = w["completed"]
        else:
            weeks_data[w["week"]] = {"created": 0, "completed": w["completed"]}

    weekly_trends = [{"week": k, **v} for k, v in sorted(weeks_data.items())]

    return {
        "projects": {
            "active": projects_active,
            "at_risk": projects_at_risk,
            "warning": projects_warning,
            "completed_month": projects_completed_month,
            "health_rate": round((projects_active - projects_at_risk - projects_warning) / projects_active * 100, 1) if projects_active else 100
        },
        "tasks": {
            "total": tasks_total,
            "blocked": tasks_blocked,
            "overdue": tasks_overdue,
            "completed_week": tasks_completed_week,
            "completed_month": tasks_completed_month,
            "blocked_rate": round(tasks_blocked / tasks_total * 100, 1) if tasks_total else 0,
            "overdue_rate": round(tasks_overdue / tasks_total * 100, 1) if tasks_total else 0
        },
        "team": {
            "size": team_size,
            "avg_velocity": round(avg_velocity, 1),
            "trend": trend,
            "trend_delta": trend_delta
        },
        "trends": {
            "daily_completions": daily_completions,
            "weekly": weekly_trends
        }
    }


@frappe.whitelist()
def get_project_kpis(project_id):
    """KPIs detallados de un proyecto"""
    require_auth()

    project = frappe.get_doc("WH Project", project_id)

    # Desglose por estado
    status_breakdown = frappe.db.sql("""
        SELECT status, COUNT(*) as count
        FROM `tabWH Task`
        WHERE project = %s
        GROUP BY status
    """, (project_id,), as_dict=True)

    # Desglose por prioridad
    priority_breakdown = frappe.db.sql("""
        SELECT priority, COUNT(*) as count
        FROM `tabWH Task`
        WHERE project = %s AND status != 'DONE'
        GROUP BY priority
    """, (project_id,), as_dict=True)

    # Desglose por persona (from assignees table)
    person_breakdown = frappe.db.sql("""
        SELECT
            ta.user as user,
            SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN t.status != 'DONE' THEN 1 ELSE 0 END) as pending,
            COUNT(DISTINCT ta.parent) as total
        FROM `tabWH Task Assignee` ta
        JOIN `tabWH Task` t ON ta.parent = t.name
        WHERE t.project = %s
        GROUP BY ta.user
    """, (project_id,), as_dict=True)

    for p in person_breakdown:
        if p.get("user"):
            p["full_name"] = frappe.db.get_value("User", p["user"], "full_name")

    # Burndown (tareas pendientes por dia)
    burndown = frappe.db.sql("""
        SELECT DATE(modified) as date,
               (SELECT COUNT(*) FROM `tabWH Task` t2
                WHERE t2.project = %s AND t2.status != 'DONE'
                AND t2.creation <= t1.modified) as remaining
        FROM `tabWH Task` t1
        WHERE t1.project = %s
        GROUP BY DATE(modified)
        ORDER BY date
    """, (project_id, project_id), as_dict=True)

    # Tiempo promedio por tarea
    avg_duration = frappe.db.sql("""
        SELECT AVG(DATEDIFF(actual_end, actual_start)) as avg_days
        FROM `tabWH Task`
        WHERE project = %s AND status = 'DONE'
        AND actual_start IS NOT NULL AND actual_end IS NOT NULL
    """, (project_id,))[0][0]

    return {
        "project": {
            "name": project.name,
            "title": project.title,
            "progress_pct": project.progress_pct,
            "health": project.health,
            "health_reason": project.health_reason,
            "velocity": project.velocity,
            "estimated_completion": project.estimated_completion
        },
        "breakdown": {
            "by_status": {s["status"]: s["count"] for s in status_breakdown},
            "by_priority": {p["priority"]: p["count"] for p in priority_breakdown},
            "by_person": person_breakdown
        },
        "metrics": {
            "avg_task_duration_days": round(avg_duration, 1) if avg_duration else None,
            "total_tasks": project.total_tasks,
            "completed_tasks": project.completed_tasks,
            "blocked_tasks": project.blocked_tasks,
            "overdue_tasks": project.overdue_tasks
        },
        "burndown": burndown
    }


@frappe.whitelist()
def get_user_kpis(user_id, period="week"):
    """KPIs de un usuario"""
    require_auth()

    if period == "week":
        start_date = add_days(nowdate(), -7)
    elif period == "month":
        start_date = add_days(nowdate(), -30)
    else:
        start_date = add_days(nowdate(), -7)

    # Get user task IDs from assignees table
    user_task_ids = frappe.get_all("WH Task Assignee",
        filters={"user": user_id},
        pluck="parent"
    )

    if not user_task_ids:
        # User has no tasks
        current_tasks = []
        completed = 0
    else:
        # Tareas completadas
        completed = frappe.db.sql("""
            SELECT COUNT(*) FROM `tabWH Task`
            WHERE name IN %s AND status = 'DONE' AND modified >= %s
        """, (tuple(user_task_ids), start_date))[0][0]

        # Tareas actuales
        current_tasks = frappe.db.sql("""
            SELECT status, COUNT(*) as count
            FROM `tabWH Task`
            WHERE name IN %s AND status != 'DONE'
            GROUP BY status
        """, (tuple(user_task_ids),), as_dict=True)

    # Dias trabajados
    work_days = frappe.db.sql("""
        SELECT COUNT(DISTINCT wl.date) as days
        FROM `tabWH Task Work Log` wl
        JOIN `tabWH Task` t ON wl.parent = t.name
        WHERE wl.user = %s AND wl.date >= %s
    """, (user_id, start_date))[0][0]

    # Proyectos activos
    if user_task_ids:
        active_projects = frappe.db.sql("""
            SELECT COUNT(DISTINCT project) FROM `tabWH Task`
            WHERE name IN %s AND status != 'DONE' AND project IS NOT NULL
        """, (tuple(user_task_ids),))[0][0]

        # Tendencia diaria
        daily_completed = frappe.db.sql("""
            SELECT DATE(modified) as date, COUNT(*) as count
            FROM `tabWH Task`
            WHERE name IN %s AND status = 'DONE' AND modified >= %s
            GROUP BY DATE(modified)
            ORDER BY date
        """, (tuple(user_task_ids), start_date), as_dict=True)
    else:
        active_projects = 0
        daily_completed = []

    return {
        "user": user_id,
        "period": period,
        "completed": completed,
        "velocity": completed / (7 if period == "week" else 30) * 7,  # normalizado a semana
        "work_days": work_days,
        "active_projects": active_projects,
        "current": {s["status"]: s["count"] for s in current_tasks},
        "daily_trend": daily_completed
    }


@frappe.whitelist()
def get_department_kpis(department, period="month"):
    """KPIs de un departamento"""
    require_auth()

    if period == "week":
        start_date = add_days(nowdate(), -7)
    else:
        start_date = add_days(nowdate(), -30)

    # Proyectos
    projects = frappe.get_all("WH Project",
        filters={"department": department, "status": "ACTIVE"},
        fields=["name", "title", "health", "progress_pct"])

    projects_by_health = {"RED": 0, "YELLOW": 0, "GREEN": 0}
    for p in projects:
        projects_by_health[p.get("health", "GREEN")] += 1

    # Tareas
    task_stats = frappe.db.sql("""
        SELECT
            SUM(CASE WHEN status = 'DONE' AND modified >= %s THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'BLOCKED' THEN 1 ELSE 0 END) as blocked,
            SUM(CASE WHEN status NOT IN ('DONE') AND due_date < CURDATE() THEN 1 ELSE 0 END) as overdue,
            COUNT(*) as total
        FROM `tabWH Task`
        WHERE department = %s
    """, (start_date, department), as_dict=True)[0]

    # Top performers (from assignees table)
    top_performers = frappe.db.sql("""
        SELECT
            ta.user as user,
            COUNT(DISTINCT ta.parent) as completed
        FROM `tabWH Task Assignee` ta
        JOIN `tabWH Task` t ON ta.parent = t.name
        WHERE t.department = %s AND t.status = 'DONE' AND t.modified >= %s
        GROUP BY ta.user
        ORDER BY completed DESC
        LIMIT 5
    """, (department, start_date), as_dict=True)

    for p in top_performers:
        if p.get("user"):
            p["full_name"] = frappe.db.get_value("User", p["user"], "full_name")

    return {
        "department": department,
        "period": period,
        "projects": {
            "total": len(projects),
            "by_health": projects_by_health
        },
        "tasks": task_stats,
        "top_performers": top_performers
    }


@frappe.whitelist()
def export_kpis(format="json", scope="dashboard"):
    """Exportar KPIs para reportes"""
    require_auth()

    if scope == "dashboard":
        data = get_dashboard_kpis()
    else:
        data = get_dashboard_kpis()

    if format == "json":
        return data
    elif format == "csv":
        # Simplified CSV export
        lines = ["Metric,Value"]
        lines.append(f"Projects Active,{data['projects']['active']}")
        lines.append(f"Projects At Risk,{data['projects']['at_risk']}")
        lines.append(f"Tasks Total,{data['tasks']['total']}")
        lines.append(f"Tasks Blocked,{data['tasks']['blocked']}")
        lines.append(f"Tasks Overdue,{data['tasks']['overdue']}")
        lines.append(f"Team Size,{data['team']['size']}")
        lines.append(f"Avg Velocity,{data['team']['avg_velocity']}")
        return "\n".join(lines)
    else:
        return data
