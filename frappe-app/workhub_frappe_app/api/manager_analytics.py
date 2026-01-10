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

    # TODO: Implement velocity trends logic
    return {
        "period": period,
        "data": [],
        "trend": "stable",
        "avg_current": 0,
        "avg_previous": 0
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

    # TODO: Implement blocker analysis logic
    return {
        "blocked_areas": [],
        "avg_blocked_time_days": 0,
        "top_blocked_tasks": []
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
