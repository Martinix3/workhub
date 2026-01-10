# My Day API
# TDAH-friendly personal task views

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, add_days, now_datetime, get_datetime, time_diff_in_seconds
import json

from workhub_frappe_app.api.utils import require_auth


@frappe.whitelist()
def get_my_day():
    """Get personalized daily view - TDAH optimized"""
    require_auth()
    user = frappe.session.user
    today = nowdate()

    # Tareas para HOY (DOING o NEXT con due_date hoy)
    today_tasks = frappe.get_all("WH Task",
        filters={
            "assigned_to": user,
            "status": ["in", ["DOING", "NEXT"]],
            "due_date": today
        },
        fields=["name", "title", "status", "priority", "project", "due_date", "is_milestone"],
        order_by="priority asc")

    # Vencidas (due_date pasada, no completadas)
    overdue = frappe.get_all("WH Task",
        filters={
            "assigned_to": user,
            "status": ["not in", ["DONE"]],
            "due_date": ["<", today]
        },
        fields=["name", "title", "status", "priority", "project", "due_date"],
        order_by="due_date asc",
        limit=10)

    # Proximos 3 dias
    upcoming = frappe.get_all("WH Task",
        filters={
            "assigned_to": user,
            "status": ["not in", ["DONE"]],
            "due_date": ["between", [add_days(today, 1), add_days(today, 3)]]
        },
        fields=["name", "title", "status", "priority", "project", "due_date"],
        order_by="due_date asc",
        limit=10)

    # Mis bloqueadas
    blocked = frappe.get_all("WH Task",
        filters={
            "assigned_to": user,
            "status": "BLOCKED"
        },
        fields=["name", "title", "priority", "project", "blocked_reason"],
        order_by="priority asc",
        limit=5)

    # Tareas que bloqueo a otros (soy predecessor de algo que espera)
    my_task_ids = frappe.get_all("WH Task",
        filters={"assigned_to": user, "status": ["not in", ["DONE"]]},
        pluck="name")

    blocking_others = []
    if my_task_ids:
        blocking_deps = frappe.get_all("WH Task Dependency",
            filters={"predecessor": ["in", my_task_ids], "is_active": 1},
            fields=["predecessor", "successor"])

        for dep in blocking_deps:
            succ_data = frappe.db.get_value("WH Task", dep["successor"],
                ["title", "assigned_to", "status"], as_dict=True)
            if succ_data and succ_data.get("status") != "DONE":
                pred_title = frappe.db.get_value("WH Task", dep["predecessor"], "title")
                blocking_others.append({
                    "my_task": dep["predecessor"],
                    "my_task_title": pred_title,
                    "blocked_task": dep["successor"],
                    "blocked_task_title": succ_data["title"],
                    "blocked_user": succ_data["assigned_to"]
                })

    # Inbox (tareas sueltas)
    inbox = frappe.get_all("WH Task",
        filters={
            "assigned_to": user,
            "is_inbox": 1,
            "status": ["not in", ["DONE"]]
        },
        fields=["name", "title", "priority", "creation"],
        order_by="priority asc, creation desc",
        limit=10)

    # Get active timer
    active_timer = _get_active_timer_internal(user)

    # Get today's tracked time
    today_time_data = _get_today_time_data(user, today)

    # Resumen rapido
    summary = {
        "today_count": len(today_tasks),
        "overdue_count": len(overdue),
        "blocked_count": len(blocked),
        "inbox_count": len(inbox)
    }

    return {
        "summary": summary,
        "today": today_tasks,
        "overdue": overdue,
        "upcoming": upcoming,
        "blocked": blocked,
        "blocking_others": blocking_others[:5],
        "inbox": inbox,
        "active_timer": active_timer,
        "today_tracked_hours": today_time_data["total_hours"],
        "today_time_by_task": today_time_data["by_task"]
    }


def _get_active_timer_internal(user):
    """
    Internal helper to get active timer info for a user.
    Returns None if no active timer, or timer details dict.
    """
    # Find active timer (Running or Paused)
    active_timer = frappe.db.get_value(
        "WH Time Timer",
        {"user": user, "status": ["in", ["Running", "Paused"]]},
        ["name", "task", "start_time", "status", "accumulated_seconds"],
        as_dict=True
    )

    if not active_timer:
        return None

    # Get task details
    task = frappe.get_doc("WH Task", active_timer["task"])

    # Calculate running duration
    if active_timer["status"] == "Running":
        # Calculate time from start_time to now
        elapsed_seconds = time_diff_in_seconds(now_datetime(), get_datetime(active_timer["start_time"]))
        total_seconds = (active_timer["accumulated_seconds"] or 0) + elapsed_seconds
    else:  # Paused
        # Just use accumulated_seconds
        total_seconds = active_timer["accumulated_seconds"] or 0

    # Convert to hours and minutes for display
    total_minutes = int(total_seconds // 60)
    hours = total_minutes // 60
    minutes = total_minutes % 60

    return {
        "name": active_timer["name"],
        "task": active_timer["task"],
        "task_title": task.title,
        "project": task.project,
        "status": active_timer["status"],
        "start_time": active_timer["start_time"],
        "accumulated_seconds": active_timer["accumulated_seconds"],
        "running_seconds": total_seconds,
        "running_hours": hours,
        "running_minutes": minutes
    }


def _get_today_time_data(user, today):
    """
    Internal helper to get today's time tracking data for a user.
    Returns total hours and breakdown by task.
    """
    # Query today's work_log entries for this user
    query = """
        SELECT
            wl.parent as task_id,
            wl.hours,
            wl.minutes,
            wl.duration_hours,
            t.title as task_title,
            t.status as task_status,
            t.priority as task_priority,
            t.project
        FROM `tabWH Task Work Log` wl
        INNER JOIN `tabWH Task` t ON wl.parent = t.name
        WHERE wl.user = %(user)s AND wl.date = %(today)s
        ORDER BY wl.creation DESC
    """

    entries = frappe.db.sql(query, {"user": user, "today": today}, as_dict=True)

    # Calculate total hours
    total_hours = sum(entry.get("duration_hours") or 0 for entry in entries)

    # Group by task
    by_task = {}
    for entry in entries:
        task_id = entry.get("task_id")
        duration = entry.get("duration_hours") or 0

        if task_id not in by_task:
            by_task[task_id] = {
                "task_id": task_id,
                "task_title": entry.get("task_title"),
                "task_status": entry.get("task_status"),
                "task_priority": entry.get("task_priority"),
                "project": entry.get("project"),
                "hours": 0
            }
        by_task[task_id]["hours"] += duration

    # Convert to list and sort by hours descending
    by_task_list = sorted(by_task.values(), key=lambda x: x["hours"], reverse=True)

    return {
        "total_hours": total_hours,
        "by_task": by_task_list
    }


@frappe.whitelist()
def get_inbox():
    """Get all inbox (loose) tasks"""
    require_auth()
    user = frappe.session.user

    return frappe.get_all("WH Task",
        filters={
            "assigned_to": user,
            "is_inbox": 1,
            "status": ["not in", ["DONE"]]
        },
        fields=["name", "title", "priority", "status", "due_date", "creation"],
        order_by="priority asc, creation desc")


@frappe.whitelist()
def get_week_view():
    """Get week overview"""
    require_auth()
    user = frappe.session.user
    today = getdate(nowdate())

    # Get week boundaries (Monday to Sunday)
    start_of_week = today - __import__('datetime').timedelta(days=today.weekday())
    end_of_week = start_of_week + __import__('datetime').timedelta(days=6)

    tasks = frappe.get_all("WH Task",
        filters={
            "assigned_to": user,
            "status": ["not in", ["DONE"]],
            "due_date": ["between", [str(start_of_week), str(end_of_week)]]
        },
        fields=["name", "title", "status", "priority", "project", "due_date", "is_milestone"],
        order_by="due_date asc, priority asc")

    # Group by day
    days = {}
    for i in range(7):
        day = str(start_of_week + __import__('datetime').timedelta(days=i))
        days[day] = [t for t in tasks if str(t.get("due_date")) == day]

    return {
        "start_of_week": str(start_of_week),
        "end_of_week": str(end_of_week),
        "days": days
    }


@frappe.whitelist()
def mark_worked_today(task_ids):
    """Mark multiple tasks as worked today"""
    require_auth()
    if isinstance(task_ids, str):
        task_ids = json.loads(task_ids)

    today = nowdate()
    user = frappe.session.user

    for task_id in task_ids:
        task = frappe.get_doc("WH Task", task_id)

        # Check if already logged today
        existing = [
            log for log in (task.work_log or [])
            if str(log.date) == today and log.user == user
        ]

        if not existing:
            task.append("work_log", {
                "date": today,
                "user": user,
                "notes": ""
            })
            task.worked_today = 1
            task.save()

    return {"success": True, "count": len(task_ids)}


@frappe.whitelist()
def get_focus_mode():
    """Get single task to focus on - TDAH optimization"""
    require_auth()
    user = frappe.session.user

    # Priority order:
    # 1. DOING tasks (already started)
    # 2. P0 NEXT tasks
    # 3. Overdue tasks
    # 4. Today's tasks

    # Check for DOING first
    doing = frappe.get_all("WH Task",
        filters={"assigned_to": user, "status": "DOING"},
        fields=["name", "title", "priority", "project", "due_date"],
        order_by="priority asc",
        limit=1)

    if doing:
        return {"focus_task": doing[0], "reason": "Ya empezaste esta tarea"}

    # P0 NEXT
    p0_next = frappe.get_all("WH Task",
        filters={"assigned_to": user, "status": "NEXT", "priority": "P0"},
        fields=["name", "title", "priority", "project", "due_date"],
        limit=1)

    if p0_next:
        return {"focus_task": p0_next[0], "reason": "Prioridad critica"}

    # Overdue
    today = nowdate()
    overdue = frappe.get_all("WH Task",
        filters={
            "assigned_to": user,
            "status": ["not in", ["DONE"]],
            "due_date": ["<", today]
        },
        fields=["name", "title", "priority", "project", "due_date"],
        order_by="due_date asc",
        limit=1)

    if overdue:
        return {"focus_task": overdue[0], "reason": "Vencida - urgente"}

    # Today's task
    today_task = frappe.get_all("WH Task",
        filters={
            "assigned_to": user,
            "status": "NEXT",
            "due_date": today
        },
        fields=["name", "title", "priority", "project", "due_date"],
        order_by="priority asc",
        limit=1)

    if today_task:
        return {"focus_task": today_task[0], "reason": "Para hoy"}

    # Any NEXT task
    any_next = frappe.get_all("WH Task",
        filters={"assigned_to": user, "status": "NEXT"},
        fields=["name", "title", "priority", "project", "due_date"],
        order_by="priority asc, due_date asc",
        limit=1)

    if any_next:
        return {"focus_task": any_next[0], "reason": "Siguiente en cola"}

    return {"focus_task": None, "reason": "No hay tareas pendientes"}


@frappe.whitelist()
def start_focus(task_id):
    """Start focusing on a task - moves to DOING"""
    require_auth()

    task = frappe.get_doc("WH Task", task_id)
    task.status = "DOING"
    task.save()

    return {"success": True, "status": "DOING"}


@frappe.whitelist()
def complete_focus(task_id, notes=""):
    """Complete focused task"""
    require_auth()
    today = nowdate()
    user = frappe.session.user

    task = frappe.get_doc("WH Task", task_id)
    task.status = "DONE"

    # Log work
    task.append("work_log", {
        "date": today,
        "user": user,
        "notes": notes or "Completada"
    })

    task.save()

    # Get next focus
    next_focus = get_focus_mode()

    return {
        "success": True,
        "completed": task_id,
        "next": next_focus
    }
