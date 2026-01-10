# Manager Analytics API
# Comprehensive analytics for managers showing team workload, velocity trends,
# blocker analysis, and overdue ratios across departments

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, add_days, date_diff, get_first_day, get_last_day, add_to_date
import json

from workhub_frappe_app.api.utils import require_auth, require_any_role


@frappe.whitelist()
def get_team_workload(department=None):
    """
    Obtener distribucion de carga de trabajo del equipo
    Retorna tareas por persona agrupadas por asignado con desglose por estado

    Args:
        department: Filtrar por departamento (opcional)

    Returns:
        dict: {
            "workload": [
                {
                    "user": "user@example.com",
                    "full_name": "Name",
                    "backlog": 5,
                    "next": 3,
                    "doing": 2,
                    "blocked": 1,
                    "done_recent": 10,
                    "total": 21
                }
            ]
        }
    """
    require_auth()

    # Build WHERE clause for department filter
    where_clause = "WHERE assigned_to IS NOT NULL"
    params = []

    if department:
        where_clause += " AND department = %s"
        params.append(department)

    # Query tasks grouped by assignee with status breakdown
    # Recent done tasks are from the last 30 days
    recent_done_date = add_days(nowdate(), -30)

    query = f"""
        SELECT
            assigned_to as user,
            SUM(CASE WHEN status = 'BACKLOG' THEN 1 ELSE 0 END) as backlog,
            SUM(CASE WHEN status = 'NEXT' THEN 1 ELSE 0 END) as next,
            SUM(CASE WHEN status = 'DOING' THEN 1 ELSE 0 END) as doing,
            SUM(CASE WHEN status = 'BLOCKED' THEN 1 ELSE 0 END) as blocked,
            SUM(CASE WHEN status = 'DONE' AND modified >= %s THEN 1 ELSE 0 END) as done_recent,
            COUNT(*) as total
        FROM `tabWH Task`
        {where_clause}
        GROUP BY assigned_to
        ORDER BY total DESC
    """

    params.insert(0, recent_done_date)
    workload_data = frappe.db.sql(query, tuple(params), as_dict=True)

    # Enrich with full name from User table
    for item in workload_data:
        if item.get("user"):
            full_name = frappe.db.get_value("User", item["user"], "full_name")
            item["full_name"] = full_name or item["user"]
        else:
            item["full_name"] = "Unassigned"

    return {
        "workload": workload_data
    }


@frappe.whitelist()
def get_velocity_trends(period="daily", days=14):
    """
    Obtener tendencias de velocidad del equipo
    Retorna tareas completadas a lo largo del tiempo con comparacion al periodo anterior

    Args:
        period: "daily" o "weekly"
        days: Numero de dias a analizar (14 para diario, 56 para semanal/8 semanas)

    Returns:
        dict: {
            "period": "daily",
            "data": [
                {
                    "date": "2026-01-01",
                    "completed": 5,
                    "previous_period": 4
                }
            ],
            "trend": "up|down|stable",
            "avg_current": 5.2,
            "avg_previous": 4.8
        }
    """
    require_auth()

    # Convert days parameter to int
    days = int(days)

    # Calculate date ranges
    today = getdate(nowdate())
    current_start = add_days(today, -days)
    current_end = today

    # Previous period has the same length as current period
    previous_start = add_days(current_start, -days)
    previous_end = add_days(current_end, -days)

    if period == "weekly":
        # For weekly, we need 8 weeks = 56 days
        if days < 56:
            days = 56
            current_start = add_days(today, -56)

        # Query completed tasks for current period
        current_query = """
            SELECT
                DATE(modified) as completion_date,
                COUNT(*) as completed
            FROM `tabWH Task`
            WHERE status = 'DONE'
            AND DATE(modified) BETWEEN %s AND %s
            GROUP BY DATE(modified)
            ORDER BY completion_date
        """
        current_data = frappe.db.sql(current_query, (current_start, current_end), as_dict=True)

        # Query completed tasks for previous period
        previous_query = """
            SELECT
                DATE(modified) as completion_date,
                COUNT(*) as completed
            FROM `tabWH Task`
            WHERE status = 'DONE'
            AND DATE(modified) BETWEEN %s AND %s
            GROUP BY DATE(modified)
            ORDER BY completion_date
        """
        previous_data = frappe.db.sql(previous_query, (previous_start, previous_end), as_dict=True)

        # Group by week
        result_data = []
        week_count = 8

        for week_num in range(week_count):
            week_start = add_days(current_start, week_num * 7)
            week_end = add_days(week_start, 6)

            # Count current period completed tasks for this week
            current_completed = sum(
                item['completed'] for item in current_data
                if getdate(week_start) <= getdate(item['completion_date']) <= getdate(week_end)
            )

            # Count previous period completed tasks for equivalent week
            prev_week_start = add_days(previous_start, week_num * 7)
            prev_week_end = add_days(prev_week_start, 6)
            previous_completed = sum(
                item['completed'] for item in previous_data
                if getdate(prev_week_start) <= getdate(item['completion_date']) <= getdate(prev_week_end)
            )

            result_data.append({
                "date": str(week_start),
                "completed": current_completed,
                "previous_period": previous_completed
            })
    else:
        # Daily period (default)
        # Query completed tasks for current period
        current_query = """
            SELECT
                DATE(modified) as completion_date,
                COUNT(*) as completed
            FROM `tabWH Task`
            WHERE status = 'DONE'
            AND DATE(modified) BETWEEN %s AND %s
            GROUP BY DATE(modified)
            ORDER BY completion_date
        """
        current_data = frappe.db.sql(current_query, (current_start, current_end), as_dict=True)

        # Query completed tasks for previous period
        previous_query = """
            SELECT
                DATE(modified) as completion_date,
                COUNT(*) as completed
            FROM `tabWH Task`
            WHERE status = 'DONE'
            AND DATE(modified) BETWEEN %s AND %s
            GROUP BY DATE(modified)
            ORDER BY completion_date
        """
        previous_data = frappe.db.sql(previous_query, (previous_start, previous_end), as_dict=True)

        # Create a dictionary for easy lookup
        current_dict = {str(item['completion_date']): item['completed'] for item in current_data}
        previous_dict = {str(item['completion_date']): item['completed'] for item in previous_data}

        # Build result with all days in range
        result_data = []
        for day_offset in range(days):
            current_date = add_days(current_start, day_offset)
            previous_date = add_days(previous_start, day_offset)

            result_data.append({
                "date": str(current_date),
                "completed": current_dict.get(str(current_date), 0),
                "previous_period": previous_dict.get(str(previous_date), 0)
            })

    # Calculate averages
    total_current = sum(item['completed'] for item in result_data)
    total_previous = sum(item['previous_period'] for item in result_data)

    avg_current = round(total_current / len(result_data), 2) if result_data else 0
    avg_previous = round(total_previous / len(result_data), 2) if result_data else 0

    # Calculate trend
    trend = "stable"
    if avg_current > avg_previous * 1.1:  # 10% threshold
        trend = "up"
    elif avg_current < avg_previous * 0.9:  # 10% threshold
        trend = "down"

    return {
        "period": period,
        "data": result_data,
        "trend": trend,
        "avg_current": avg_current,
        "avg_previous": avg_previous
    }


@frappe.whitelist()
def get_blocker_analysis(department=None):
    """
    Analizar areas bloqueadas y tiempo promedio de bloqueo
    Retorna areas mas bloqueadas por proyecto/departamento y top tareas bloqueadas

    Args:
        department: Filtrar por departamento (opcional)

    Returns:
        dict: {
            "blocked_areas": [
                {
                    "name": "Project/Department name",
                    "blocked_count": 5,
                    "type": "project|department"
                }
            ],
            "avg_blocked_time_days": 3.5,
            "top_blocked_tasks": [
                {
                    "task_id": "TASK-001",
                    "title": "Task title",
                    "blocked_reason": "Reason",
                    "blocked_days": 5,
                    "assigned_to": "user@example.com",
                    "assigned_name": "Name"
                }
            ]
        }
    """
    require_auth()

    # Build WHERE clause for department filter
    where_clause = "WHERE status = 'BLOCKED'"
    params = []

    if department:
        where_clause += " AND department = %s"
        params.append(department)

    # Get blocked areas by project
    project_query = f"""
        SELECT
            project as name,
            COUNT(*) as blocked_count,
            'project' as type
        FROM `tabWH Task`
        {where_clause}
        AND project IS NOT NULL AND project != ''
        GROUP BY project
        ORDER BY blocked_count DESC
        LIMIT 10
    """
    blocked_by_project = frappe.db.sql(project_query, tuple(params) if params else (), as_dict=True)

    # Get blocked areas by department
    dept_query = f"""
        SELECT
            department as name,
            COUNT(*) as blocked_count,
            'department' as type
        FROM `tabWH Task`
        {where_clause}
        AND department IS NOT NULL AND department != ''
        GROUP BY department
        ORDER BY blocked_count DESC
    """
    blocked_by_department = frappe.db.sql(dept_query, tuple(params) if params else (), as_dict=True)

    # Combine blocked areas (projects + departments)
    blocked_areas = blocked_by_project + blocked_by_department

    # Calculate average blocked time
    # Using modified field as approximation for when task became blocked
    avg_query = f"""
        SELECT
            AVG(DATEDIFF(CURDATE(), DATE(modified))) as avg_days
        FROM `tabWH Task`
        {where_clause}
    """
    avg_result = frappe.db.sql(avg_query, tuple(params) if params else (), as_dict=True)
    avg_blocked_time_days = round(avg_result[0].get('avg_days') or 0, 1)

    # Get top blocked tasks
    top_blocked_query = f"""
        SELECT
            name as task_id,
            title,
            blocked_reason,
            DATEDIFF(CURDATE(), DATE(modified)) as blocked_days,
            assigned_to,
            project,
            department
        FROM `tabWH Task`
        {where_clause}
        ORDER BY blocked_days DESC, modified DESC
        LIMIT 10
    """
    top_blocked_tasks = frappe.db.sql(top_blocked_query, tuple(params) if params else (), as_dict=True)

    # Enrich with full name from User table
    for task in top_blocked_tasks:
        if task.get("assigned_to"):
            full_name = frappe.db.get_value("User", task["assigned_to"], "full_name")
            task["assigned_name"] = full_name or task["assigned_to"]
        else:
            task["assigned_name"] = "Unassigned"

        # Ensure blocked_reason is not None
        if not task.get("blocked_reason"):
            task["blocked_reason"] = ""

    return {
        "blocked_areas": blocked_areas,
        "avg_blocked_time_days": avg_blocked_time_days,
        "top_blocked_tasks": top_blocked_tasks
    }


@frappe.whitelist()
def get_overdue_trends(weeks=8):
    """
    Obtener tendencia de ratio de tareas vencidas semana a semana
    Retorna ratio de vencimiento para las ultimas N semanas con desglose por departamento

    Args:
        weeks: Numero de semanas a analizar (default 8)

    Returns:
        dict: {
            "weeks": [
                {
                    "week_start": "2026-01-01",
                    "week_end": "2026-01-07",
                    "total_tasks": 50,
                    "overdue_tasks": 5,
                    "overdue_ratio": 10.0,
                    "by_department": {
                        "SALES": {"total": 20, "overdue": 2, "ratio": 10.0},
                        "OPS": {"total": 30, "overdue": 3, "ratio": 10.0}
                    }
                }
            ],
            "trend": "improving|worsening|stable"
        }
    """
    require_auth()

    # TODO: Implement overdue trends logic
    return {
        "weeks": [],
        "trend": "stable"
    }


@frappe.whitelist()
def get_manager_dashboard(department=None):
    """
    Obtener dashboard completo de analytics para managers
    Combina todos los datos de analytics en una sola llamada

    Args:
        department: Filtrar por departamento (opcional)

    Returns:
        dict: {
            "workload": {...},
            "velocity": {...},
            "blockers": {...},
            "overdue": {...}
        }
    """
    require_auth()

    # Combinar datos de todos los endpoints
    workload = get_team_workload(department)
    velocity = get_velocity_trends()
    blockers = get_blocker_analysis(department)
    overdue = get_overdue_trends()

    return {
        "workload": workload,
        "velocity": velocity,
        "blockers": blockers,
        "overdue": overdue
    }


@frappe.whitelist()
def export_analytics(format="csv", department=None):
    """
    Exportar datos de analytics en formato CSV

    Args:
        format: Formato de exportacion (solo "csv" por ahora)
        department: Filtrar por departamento (opcional)

    Returns:
        dict: {
            "content": "CSV data as string",
            "filename": "analytics_export_2026-01-10.csv"
        }
    """
    require_auth()

    if format != "csv":
        frappe.throw(_("Solo formato CSV es soportado actualmente"))

    # TODO: Implement CSV export logic
    return {
        "content": "",
        "filename": f"analytics_export_{nowdate()}.csv"
    }
