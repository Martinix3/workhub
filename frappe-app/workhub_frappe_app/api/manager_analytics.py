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
    require_any_role("System Manager", "Sales Manager")

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
    require_any_role("System Manager", "Sales Manager")

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
    require_any_role("System Manager", "Sales Manager")

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
    require_any_role("System Manager", "Sales Manager")

    # Convert weeks parameter to int
    weeks = int(weeks)

    # Calculate date ranges
    today = getdate(nowdate())

    # Department list
    departments = ['SALES', 'OPS', 'MKT']

    result_data = []

    # Process each week from oldest to newest
    for week_num in range(weeks):
        # Calculate week boundaries (going backwards from today)
        week_start = add_days(today, -(weeks - week_num) * 7)
        week_end = add_days(week_start, 6)

        # Query for overall stats for this week
        # Tasks are considered "active" if they have a due_date and status != 'DONE'
        # Tasks are "overdue" if due_date <= week_end and status != 'DONE'
        overall_query = """
            SELECT
                COUNT(*) as total_tasks,
                SUM(CASE WHEN due_date <= %s AND status != 'DONE' THEN 1 ELSE 0 END) as overdue_tasks
            FROM `tabWH Task`
            WHERE due_date IS NOT NULL
            AND due_date <= %s
        """
        overall_result = frappe.db.sql(overall_query, (week_end, week_end), as_dict=True)

        total_tasks = overall_result[0].get('total_tasks') or 0
        overdue_tasks = overall_result[0].get('overdue_tasks') or 0
        overdue_ratio = round((overdue_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

        # Query for department breakdown
        dept_breakdown = {}

        for dept in departments:
            dept_query = """
                SELECT
                    COUNT(*) as total_tasks,
                    SUM(CASE WHEN due_date <= %s AND status != 'DONE' THEN 1 ELSE 0 END) as overdue_tasks
                FROM `tabWH Task`
                WHERE due_date IS NOT NULL
                AND due_date <= %s
                AND department = %s
            """
            dept_result = frappe.db.sql(dept_query, (week_end, week_end, dept), as_dict=True)

            dept_total = dept_result[0].get('total_tasks') or 0
            dept_overdue = dept_result[0].get('overdue_tasks') or 0
            dept_ratio = round((dept_overdue / dept_total * 100), 1) if dept_total > 0 else 0.0

            dept_breakdown[dept] = {
                "total": dept_total,
                "overdue": dept_overdue,
                "ratio": dept_ratio
            }

        result_data.append({
            "week_start": str(week_start),
            "week_end": str(week_end),
            "total_tasks": total_tasks,
            "overdue_tasks": overdue_tasks,
            "overdue_ratio": overdue_ratio,
            "by_department": dept_breakdown
        })

    # Calculate trend based on first half vs second half of the period
    # "improving" = ratio is decreasing, "worsening" = ratio is increasing
    if len(result_data) >= 4:
        # Compare first half average to second half average
        first_half = result_data[:len(result_data)//2]
        second_half = result_data[len(result_data)//2:]

        first_half_avg = sum(w['overdue_ratio'] for w in first_half) / len(first_half) if first_half else 0
        second_half_avg = sum(w['overdue_ratio'] for w in second_half) / len(second_half) if second_half else 0

        # If second half ratio is lower, we're improving (10% threshold)
        if second_half_avg < first_half_avg * 0.9:
            trend = "improving"
        elif second_half_avg > first_half_avg * 1.1:
            trend = "worsening"
        else:
            trend = "stable"
    else:
        trend = "stable"

    return {
        "weeks": result_data,
        "trend": trend
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
    require_any_role("System Manager", "Sales Manager")

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
    require_any_role("System Manager", "Sales Manager")

    if format != "csv":
        frappe.throw(_("Solo formato CSV es soportado actualmente"))

    # Fetch all analytics data
    workload = get_team_workload(department)
    velocity = get_velocity_trends()
    blockers = get_blocker_analysis(department)
    overdue = get_overdue_trends()

    # Build CSV content
    lines = []

    # Section 1: Team Workload Distribution
    lines.append("=== DISTRIBUCION DE CARGA DE TRABAJO ===")
    lines.append("Usuario,Nombre,Backlog,Siguiente,En Progreso,Bloqueadas,Completadas (30d),Total")
    for member in workload.get("workload", []):
        lines.append(f"{member.get('user', '')},{member.get('full_name', '')},"
                    f"{member.get('backlog', 0)},{member.get('next', 0)},"
                    f"{member.get('doing', 0)},{member.get('blocked', 0)},"
                    f"{member.get('done_recent', 0)},{member.get('total', 0)}")

    lines.append("")

    # Section 2: Velocity Trends
    lines.append("=== TENDENCIAS DE VELOCIDAD ===")
    lines.append(f"Periodo: {velocity.get('period', 'daily')}")
    lines.append(f"Promedio Actual: {velocity.get('avg_current', 0)}")
    lines.append(f"Promedio Anterior: {velocity.get('avg_previous', 0)}")
    lines.append(f"Tendencia: {velocity.get('trend', 'stable')}")
    lines.append("")
    lines.append("Fecha,Completadas,Periodo Anterior")
    for data_point in velocity.get("data", []):
        lines.append(f"{data_point.get('date', '')},{data_point.get('completed', 0)},"
                    f"{data_point.get('previous_period', 0)}")

    lines.append("")

    # Section 3: Blocker Analysis
    lines.append("=== ANALISIS DE BLOQUEOS ===")
    lines.append(f"Tiempo Promedio Bloqueado: {blockers.get('avg_blocked_time_days', 0)} dias")
    lines.append("")
    lines.append("Areas Bloqueadas:")
    lines.append("Nombre,Tipo,Cantidad Bloqueadas")
    for area in blockers.get("blocked_areas", []):
        lines.append(f"{area.get('name', '')},{area.get('type', '')},"
                    f"{area.get('blocked_count', 0)}")

    lines.append("")
    lines.append("Top Tareas Bloqueadas:")
    lines.append("ID Tarea,Titulo,Razon Bloqueo,Dias Bloqueada,Asignado A,Nombre Asignado,Proyecto,Departamento")
    for task in blockers.get("top_blocked_tasks", []):
        # Escape commas in title and blocked_reason
        title = str(task.get('title', '')).replace(',', ';')
        blocked_reason = str(task.get('blocked_reason', '')).replace(',', ';')
        lines.append(f"{task.get('task_id', '')},{title},{blocked_reason},"
                    f"{task.get('blocked_days', 0)},{task.get('assigned_to', '')},"
                    f"{task.get('assigned_name', '')},{task.get('project', '')},"
                    f"{task.get('department', '')}")

    lines.append("")

    # Section 4: Overdue Trends
    lines.append("=== TENDENCIAS DE VENCIMIENTO ===")
    lines.append(f"Tendencia General: {overdue.get('trend', 'stable')}")
    lines.append("")
    lines.append("Semana Inicio,Semana Fin,Total Tareas,Tareas Vencidas,Ratio Vencimiento (%)")
    for week in overdue.get("weeks", []):
        lines.append(f"{week.get('week_start', '')},{week.get('week_end', '')},"
                    f"{week.get('total_tasks', 0)},{week.get('overdue_tasks', 0)},"
                    f"{week.get('overdue_ratio', 0)}")

    lines.append("")
    lines.append("Desglose por Departamento (ultima semana):")
    if overdue.get("weeks"):
        last_week = overdue["weeks"][-1]
        lines.append("Departamento,Total,Vencidas,Ratio (%)")
        for dept, stats in last_week.get("by_department", {}).items():
            lines.append(f"{dept},{stats.get('total', 0)},{stats.get('overdue', 0)},"
                        f"{stats.get('ratio', 0)}")

    # Join all lines with newline
    csv_content = "\n".join(lines)

    # Generate filename with department filter if applicable
    dept_suffix = f"_{department}" if department else ""
    filename = f"manager_analytics{dept_suffix}_{nowdate()}.csv"

    return {
        "content": csv_content,
        "filename": filename
    }
