"""Read-only APIs for commercial account rotation.

These endpoints intentionally do not create or modify records. They aggregate
Momentum Account, Momentum Interaction, WH Account Visibility and Account
Rotation Alert into the shape needed by the recovered Rotación de Cuentas view.
"""

from __future__ import annotations

from typing import Any

import frappe
from frappe import _
from frappe.utils import date_diff, getdate, nowdate


ACCOUNT_FIELDS = [
    "name",
    "account_name",
    "city",
    "sales_channel",
    "distributor",
    "column",
    "assigned_to",
    "contact_name",
    "email",
    "phone",
    "mobile",
    "linked_customer",
    "sales_last_order_date",
    "sales_orders_last_90d",
    "sales_total_orders",
    "sales_total_boxes",
    "sales_avg_boxes_per_order",
    "last_movement_date",
    "next_follow_up_date",
    "next_follow_up_note",
    "has_overdue_followup",
    "notes",
]

PIPELINE_COLUMNS = ["Backlog", "Pipeline", "Hot", "Won", "Lost", "Loyalty"]


def _as_int(value: Any, default: int = 0) -> int:
    try:
        return int(value or default)
    except (TypeError, ValueError):
        return default


def _safe_date(value: Any):
    if not value:
        return None
    try:
        return getdate(value)
    except Exception:
        return None


def _days_since(value: Any) -> int | None:
    if not value:
        return None
    try:
        return date_diff(nowdate(), value)
    except Exception:
        parsed = _safe_date(value)
        if not parsed:
            return None
        return (getdate(nowdate()) - parsed).days


def _avg_order_frequency_days(account: dict[str, Any]) -> int | None:
    orders_90d = _as_int(account.get("sales_orders_last_90d"))
    if orders_90d > 0:
        return max(1, round(90 / orders_90d))
    total_orders = _as_int(account.get("sales_total_orders"))
    if total_orders > 0:
        # Historical fallback: coarse monthly rhythm when exact order span is unknown.
        return 30
    return None


def _avg_order_value(account: dict[str, Any]) -> float | None:
    avg_boxes = account.get("sales_avg_boxes_per_order")
    if avg_boxes is not None:
        try:
            return float(avg_boxes)
        except (TypeError, ValueError):
            pass
    total_orders = _as_int(account.get("sales_total_orders"))
    total_boxes = _as_int(account.get("sales_total_boxes"))
    if total_orders > 0:
        return round(total_boxes / total_orders, 2)
    return None


def classify_rotation(account: dict[str, Any]) -> dict[str, Any]:
    """Classify account rotation using the plan rules."""
    days_without_order = _days_since(account.get("sales_last_order_date"))
    frequency = _avg_order_frequency_days(account)

    if days_without_order is None:
        status = "muerta"
    elif frequency:
        if days_without_order <= frequency * 1.5:
            status = "activa"
        elif days_without_order <= frequency * 3:
            status = "dormida"
        else:
            status = "muerta"
    elif days_without_order <= 45:
        status = "activa"
    elif days_without_order <= 90:
        status = "dormida"
    else:
        status = "muerta"

    if status == "muerta":
        alert = "crítica"
        priority = 90
    elif status == "dormida":
        alert = "revisar"
        priority = 60
    else:
        alert = "ok"
        priority = 20

    if account.get("column") == "Hot":
        priority += 15
    elif account.get("column") == "Pipeline":
        priority += 8
    if account.get("has_overdue_followup"):
        priority += 20

    return {
        "status": status,
        "rotation_alert": alert,
        "rotation_priority": priority,
        "days_without_order": days_without_order,
        "avg_order_frequency_days": frequency,
        "avg_order_value": _avg_order_value(account),
    }


def _doctype_exists(doctype: str) -> bool:
    try:
        return bool(frappe.db.exists("DocType", doctype))
    except Exception:
        return False


def _latest_interaction(account_id: str) -> dict[str, Any]:
    if not _doctype_exists("Momentum Interaction"):
        return {}
    rows = frappe.get_all(
        "Momentum Interaction",
        filters={"momentum_account": account_id},
        fields=["name", "interaction_type", "interaction_date", "subject", "outcome", "description", "next_action"],
        order_by="interaction_date desc",
        limit=1,
    )
    return rows[0] if rows else {}


def _recent_interactions(account_id: str, limit: int = 10) -> list[dict[str, Any]]:
    if not _doctype_exists("Momentum Interaction"):
        return []
    return frappe.get_all(
        "Momentum Interaction",
        filters={"momentum_account": account_id},
        fields=["name", "interaction_type", "interaction_date", "subject", "outcome", "description", "next_action", "performed_by"],
        order_by="interaction_date desc",
        limit=limit,
    )


def _visibility_rows(account_id: str) -> list[dict[str, Any]]:
    if not _doctype_exists("WH Account Visibility"):
        return []
    return frappe.get_all(
        "WH Account Visibility",
        filters={"momentum_account": account_id, "is_active": 1},
        fields=["name", "visibility_type", "placed_date", "removed_date", "notes", "placed_by", "is_active"],
        order_by="placed_date desc",
        limit=50,
    )


def _rotation_alert(account_id: str) -> dict[str, Any]:
    if not _doctype_exists("Account Rotation Alert"):
        return {}
    row = frappe.db.get_value(
        "Account Rotation Alert",
        {"account": account_id},
        ["name", "account", "enabled", "threshold_days", "snooze_until", "owner_user", "notes"],
        as_dict=True,
    )
    return row or {}


def _matches_filter(row: dict[str, Any], *, status=None, has_plv=None, activation_90d=None) -> bool:
    if status and row.get("status") != status:
        return False
    if has_plv not in (None, ""):
        wanted = str(has_plv).lower() in {"1", "true", "yes", "si", "sí"}
        if bool(row.get("has_plv")) != wanted:
            return False
    if activation_90d not in (None, ""):
        wanted = str(activation_90d).lower() in {"1", "true", "yes", "si", "sí"}
        if (row.get("activation_count_90d", 0) > 0) != wanted:
            return False
    return True


@frappe.whitelist()
def get_rotation_accounts(
    city: str | None = None,
    distributor: str | None = None,
    sales_channel: str | None = None,
    status: str | None = None,
    has_plv: str | None = None,
    activation_90d: str | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    """Return rotation rows and KPIs for Momentum Accounts. Read-only."""
    filters: dict[str, Any] = {}
    if city:
        filters["city"] = city
    if distributor:
        filters["distributor"] = distributor
    if sales_channel:
        filters["sales_channel"] = sales_channel
    if q:
        filters["account_name"] = ["like", f"%{q}%"]

    fetch_limit = max(int(limit) + int(offset), 500)
    accounts = frappe.get_all(
        "Momentum Account",
        filters=filters,
        fields=ACCOUNT_FIELDS,
        limit_page_length=fetch_limit,
        limit_start=0,
        order_by="modified desc",
        ignore_permissions=False,
    )

    rows: list[dict[str, Any]] = []
    for account in accounts:
        account = dict(account)
        rotation = classify_rotation(account)
        interaction = _latest_interaction(account["name"])
        visibility = _visibility_rows(account["name"])
        row = {
            "account_id": account["name"],
            "account_name": account.get("account_name"),
            "city": account.get("city"),
            "sales_channel": account.get("sales_channel"),
            "distributor": account.get("distributor"),
            "pipeline_column": account.get("column"),
            "owner_user": account.get("assigned_to"),
            "last_order_date": account.get("sales_last_order_date"),
            "last_interaction_date": interaction.get("interaction_date"),
            "last_interaction_type": interaction.get("interaction_type"),
            "has_plv": bool(visibility),
            "activation_count_90d": 0,
            **rotation,
        }
        if _matches_filter(row, status=status, has_plv=has_plv, activation_90d=activation_90d):
            rows.append(row)

    rows.sort(key=lambda row: (row.get("rotation_priority") or 0, row.get("days_without_order") or -1), reverse=True)
    filtered_rows = list(rows)
    total = len(filtered_rows)
    rows = filtered_rows[int(offset): int(offset) + int(limit)]

    kpis = {
        "total_accounts": total,
        "active": sum(1 for row in filtered_rows if row.get("status") == "activa"),
        "sleeping": sum(1 for row in filtered_rows if row.get("status") == "dormida"),
        "dead": sum(1 for row in filtered_rows if row.get("status") == "muerta"),
    }

    return {
        "rows": rows,
        "total": total,
        "kpis": kpis,
        "filters": {
            "city": city,
            "distributor": distributor,
            "sales_channel": sales_channel,
            "status": status,
            "has_plv": has_plv,
            "activation_90d": activation_90d,
            "q": q,
            "limit": int(limit),
            "offset": int(offset),
        },
    }


@frappe.whitelist()
def get_rotation_account_detail(account_id: str) -> dict[str, Any]:
    """Return the drawer payload for a rotation account. Read-only."""
    if not account_id:
        frappe.throw(_("account_id is required"))

    account = frappe.db.get_value("Momentum Account", account_id, ACCOUNT_FIELDS, as_dict=True)
    if not account:
        frappe.throw(_("Momentum Account not found: {0}").format(account_id))
    account = dict(account)
    rotation = classify_rotation(account)
    visibility = _visibility_rows(account_id)
    visits = _recent_interactions(account_id, limit=20)
    alert = _rotation_alert(account_id)

    return {
        "account": {**account, **rotation},
        "kpis": {
            "last_order_date": account.get("sales_last_order_date"),
            "avg_order_frequency_days": rotation.get("avg_order_frequency_days"),
            "avg_order_value": rotation.get("avg_order_value"),
            "total_ytd": account.get("sales_total_boxes") or 0,
            "days_without_order": rotation.get("days_without_order"),
            "rotation_status": rotation.get("status"),
        },
        "products": [],
        "menus": [],
        "visibility": visibility,
        "activations": [],
        "visits": visits,
        "notes": [account.get("notes")] if account.get("notes") else [],
        "alert": alert,
    }
