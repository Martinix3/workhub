"""Read-only commercial briefing API.

The endpoint aggregates tasks and Momentum pipeline state into one stable payload
for the recovered Daily Briefing / meeting-prep view. Gmail/Calendar data is
optional and deliberately absent in this first read-only iteration.
"""

from __future__ import annotations

from collections import Counter
from typing import Any

import frappe
from frappe.utils import date_diff, getdate, nowdate


TASK_FIELDS = [
    "name",
    "title",
    "description",
    "status",
    "priority",
    "project",
    "department",
    "assigned_to",
    "due_date",
    "creation",
    "modified",
]

ACCOUNT_FIELDS = [
    "name",
    "account_name",
    "column",
    "assigned_to",
    "last_movement_date",
    "next_follow_up_date",
    "has_overdue_followup",
]

PIPELINE_COLUMNS = ["Backlog", "Pipeline", "Hot", "Won", "Lost", "Loyalty"]


def _user_or_session(user: str | None = None) -> str:
    return user or getattr(frappe.session, "user", None) or "Guest"


def _get_tasks(user: str, status: str | list[str] | None = None, due_filter: list[Any] | None = None, limit: int = 20) -> list[dict[str, Any]]:
    filters: dict[str, Any] = {"assigned_to": user}
    if status:
        filters["status"] = ["in", status] if isinstance(status, list) else status
    else:
        filters["status"] = ["not in", ["DONE"]]
    if due_filter:
        filters["due_date"] = due_filter
    rows = frappe.get_all(
        "WH Task",
        filters=filters,
        fields=TASK_FIELDS,
        order_by="due_date asc, priority asc",
        limit=limit,
        ignore_permissions=False,
    )
    rows = [dict(row) for row in rows]
    if due_filter and due_filter[0] == "<":
        cutoff = str(due_filter[1])
        rows = [row for row in rows if row.get("due_date") and str(row.get("due_date")) < cutoff]
    return rows


def _pipeline_rows(user: str | None = None) -> list[dict[str, Any]]:
    filters = {}
    if user:
        filters["assigned_to"] = user
    accounts = frappe.get_all(
        "Momentum Account",
        filters=filters,
        fields=ACCOUNT_FIELDS,
        limit=500,
        ignore_permissions=False,
    )
    counts = Counter((row.get("column") or "Backlog") for row in accounts)
    return [{"column": column, "count": counts.get(column, 0)} for column in PIPELINE_COLUMNS]


def _hot_stale_insight(user: str) -> dict[str, Any] | None:
    accounts = frappe.get_all(
        "Momentum Account",
        filters={"assigned_to": user, "column": "Hot"},
        fields=ACCOUNT_FIELDS,
        limit=100,
        ignore_permissions=False,
    )
    stale = []
    today = nowdate()
    for account in accounts:
        last = account.get("last_movement_date")
        if not last:
            stale.append(account)
            continue
        try:
            if date_diff(today, last) > 5:
                stale.append(account)
        except Exception:
            pass
    if not stale:
        return None
    return {
        "type": "hot_stale",
        "severity": "warning",
        "text": f"{len(stale)} cuentas Hot sin moverse en más de 5 días",
        "cta": "Revisar cuentas calientes",
        "account_ids": [row.get("name") for row in stale[:5]],
    }


def _build_insights(user: str, overdue: list[dict[str, Any]]) -> list[dict[str, Any]]:
    insights = []
    hot_stale = _hot_stale_insight(user)
    if hot_stale:
        insights.append(hot_stale)
    if overdue:
        insights.append({
            "type": "overdue_tasks",
            "severity": "danger",
            "text": f"{len(overdue)} tareas vencidas necesitan decisión",
            "cta": "Ver tareas vencidas",
            "task_ids": [row.get("name") for row in overdue[:5]],
        })
    return insights[:3]


def _safe_full_name(user: str) -> str:
    try:
        full_name = frappe.db.get_value("User", user, "full_name")
        return full_name or user
    except Exception:
        return user


@frappe.whitelist()
def get_daily_briefing(date: str | None = None, user: str | None = None) -> dict[str, Any]:
    """Return a stable daily briefing payload. Read-only."""
    target_date = str(getdate(date or nowdate()))
    target_user = _user_or_session(user)

    overdue = _get_tasks(target_user, status=None, due_filter=["<", target_date], limit=20)
    in_progress = _get_tasks(target_user, status="DOING", limit=20)
    next_tasks = _get_tasks(target_user, status="NEXT", due_filter=["in", [target_date, None]], limit=20)
    # Fallback for Frappe filters that do not support None inside "in" reliably.
    if not next_tasks:
        next_tasks = _get_tasks(target_user, status="NEXT", limit=20)

    task_count = len(overdue) + len(in_progress) + len(next_tasks)
    pipeline = _pipeline_rows(target_user)
    insights = _build_insights(target_user, overdue)

    urgent = []
    for task in overdue[:5]:
        urgent.append({
            "type": "task",
            "severity": "danger",
            "title": task.get("title"),
            "reference": task.get("name"),
            "cta": "Resolver",
        })
    for insight in insights:
        if insight.get("type") == "hot_stale":
            urgent.append({
                "type": "account",
                "severity": insight.get("severity"),
                "title": insight.get("text"),
                "reference": None,
                "cta": insight.get("cta"),
            })

    return {
        "greeting": {
            "date": target_date,
            "user": target_user,
            "display_name": _safe_full_name(target_user),
        },
        "summary": {
            "tasks": task_count,
            "overdue_tasks": len(overdue),
            "emails": 0,
            "meetings": 0,
            "urgent": len(urgent),
        },
        "kpis": [],
        "goals": [],
        "urgent": urgent[:5],
        "agenda": [],
        "tasks": {
            "in_progress": in_progress,
            "next": next_tasks,
            "overdue": overdue,
        },
        "emails": [],
        "pipeline": pipeline,
        "insights": insights,
        "projects": [],
        "metadata": {
            "source": "workhub_frappe_app.api.briefing.get_daily_briefing",
            "gmail_status": "not_connected",
            "calendar_status": "not_connected",
            "read_only": True,
        },
    }


@frappe.whitelist()
def get_meeting_prep(account_id: str | None = None, meeting_id: str | None = None, date: str | None = None) -> dict[str, Any]:
    """Return a minimal, read-only meeting prep payload.

    Detailed account context will be expanded after the rotation detail endpoint
    is wired into the static view. The contract is stable now so the frontend can
    render empty states without breaking.
    """
    account = {}
    last_interactions = []
    open_tasks = []
    if account_id:
        account = frappe.db.get_value(
            "Momentum Account",
            account_id,
            ["name", "account_name", "sales_channel", "city", "column", "assigned_to"],
            as_dict=True,
        ) or {}
        if getattr(frappe.db, "exists", lambda *_: False)("DocType", "Momentum Interaction"):
            last_interactions = frappe.get_all(
                "Momentum Interaction",
                filters={"momentum_account": account_id},
                fields=["name", "interaction_type", "interaction_date", "subject", "outcome", "next_action"],
                order_by="interaction_date desc",
                limit=10,
            )
        open_tasks = frappe.get_all(
            "WH Task",
            filters={"status": ["not in", ["DONE"]]},
            fields=TASK_FIELDS,
            order_by="due_date asc, priority asc",
            limit=20,
            ignore_permissions=False,
        )

    return {
        "meeting": {"meeting_id": meeting_id, "date": str(getdate(date or nowdate()))},
        "account": account,
        "last_interactions": last_interactions,
        "open_tasks": open_tasks,
        "recent_orders": [],
        "visibility": [],
        "activations": [],
        "talking_points": [],
        "risks": [],
        "suggested_next_actions": [],
    }
