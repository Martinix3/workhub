"""API endpoint to ingest Santa Brisa WhatsApp reporting into Momentum CRM."""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _

from workhub_frappe_app.services.whatsapp_reporting import parse_reporting_event, source_marker


ALLOWED_GROUP_ID = "120363424504608768@g.us"
ALLOWED_GROUP_NAME = "Reporting Santa Brisa"


def _interaction_type(value: str | None) -> str:
    """Normalize parser labels to Momentum Interaction Select values."""
    mapping = {
        "Reunión": "Reunión",
        "Reunion": "Reunión",
        "Visita": "Visita",
        "Llamada": "Llamada",
        "Email": "Email",
    }
    return mapping.get(value or "", "Reunión")


def _task_momentum_interaction_type(value: str | None) -> str:
    """Normalize parser labels to WH Task momentum_interaction_type Select values."""
    mapping = {
        "Reunión": "Reunion",
        "Reunion": "Reunion",
        "Visita": "Visita",
        "Llamada": "Llamada",
        "Email": "Email",
    }
    return mapping.get(value or "", "Reunion")


def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, str):
        return json.loads(value)
    return value or {}


def _find_existing_interaction(message_id: str) -> str | None:
    if not message_id:
        return None
    marker = source_marker(message_id)
    rows = frappe.get_all(
        "Momentum Interaction",
        filters={"description": ["like", f"%{marker}%"]},
        fields=["name"],
        limit=1,
    )
    return rows[0].name if rows else None


def _find_or_create_account(parsed: dict[str, Any]) -> str:
    account_name = parsed["account_name"]
    existing = frappe.db.get_value("Momentum Account", {"account_name": account_name}, "name")
    if existing:
        return existing

    doc = frappe.new_doc("Momentum Account")
    doc.account_name = account_name
    doc.account_type = parsed.get("account_type", "Lead")
    doc.sale_type = parsed.get("sale_type", "Sell Out")
    doc.sales_channel = parsed.get("sales_channel", "Horeca")
    doc.level = parsed.get("level", "1")
    doc.column = parsed.get("column", "Backlog")
    doc.contact_name = parsed.get("contact_name")
    doc.notes = parsed.get("description")
    doc.assigned_to = frappe.session.user
    doc.insert(ignore_permissions=True)
    return doc.name


def _create_interaction(account_id: str, parsed: dict[str, Any]) -> str:
    doc = frappe.new_doc("Momentum Interaction")
    doc.momentum_account = account_id
    doc.interaction_type = _interaction_type(parsed.get("interaction_type"))
    doc.interaction_date = parsed.get("interaction_date")
    doc.subject = parsed.get("subject")
    doc.outcome = parsed.get("outcome", "Pendiente")
    doc.description = parsed.get("description")
    doc.contact_name = parsed.get("contact_name")
    doc.next_action = parsed.get("next_action")
    doc.next_action_date = parsed.get("next_action_date")
    doc.performed_by = frappe.session.user
    doc.insert(ignore_permissions=True)
    return doc.name


def _create_task_if_needed(account_id: str, interaction_id: str, parsed: dict[str, Any]) -> str | None:
    next_action = parsed.get("next_action")
    if not next_action or next_action == "Revisar y decidir siguiente paso":
        return None
    if not frappe.db.exists("DocType", "WH Task"):
        return None

    account_name = frappe.db.get_value("Momentum Account", account_id, "account_name") or account_id
    task = frappe.new_doc("WH Task")
    task.title = f"{next_action} - {account_name}"
    task.description = f"Seguimiento generado desde WhatsApp Reporting Santa Brisa.\n\n{parsed.get('description') or ''}"
    task.status = "NEXT"
    task.priority = "P1" if parsed.get("priority") == "Alta" else "P2"
    task.department = "SALES"
    task.assigned_to = frappe.session.user
    task.created_by = frappe.session.user
    task.is_inbox = 0
    task.auto_created = 1
    task.source_doctype = "Momentum Interaction"
    task.source_name = interaction_id
    task.momentum_interaction_type = _task_momentum_interaction_type(parsed.get("interaction_type"))
    task.insert(ignore_permissions=True)
    return task.name


def _move_account_to_pipeline(account_id: str) -> None:
    doc = frappe.get_doc("Momentum Account", account_id)
    if doc.column == "Backlog":
        doc.column = "Pipeline"
        doc.save(ignore_permissions=True)


def _ingest_one(event: dict[str, Any], dry_run: bool = False) -> dict[str, Any]:
    chat_id = event.get("chat_id") or event.get("chatId")
    group_name = event.get("group_name") or event.get("groupName") or event.get("chat_name") or event.get("chatName")
    if chat_id and chat_id != ALLOWED_GROUP_ID:
        return {"ok": False, "skipped": True, "reason": "wrong_group", "chat_id": chat_id}
    if group_name and group_name not in {ALLOWED_GROUP_NAME, ""} and chat_id != ALLOWED_GROUP_ID:
        return {"ok": False, "skipped": True, "reason": "wrong_group", "group_name": group_name}

    parsed = parse_reporting_event(event)
    message_id = parsed.get("source_message_id")
    existing = _find_existing_interaction(message_id)
    if existing:
        return {"ok": True, "skipped": True, "reason": "already_ingested", "interaction_id": existing, "parsed": parsed}
    if dry_run:
        return {"ok": True, "dry_run": True, "parsed": parsed}

    account_id = _find_or_create_account(parsed)
    interaction_id = _create_interaction(account_id, parsed)
    task_id = _create_task_if_needed(account_id, interaction_id, parsed)
    if task_id:
        _move_account_to_pipeline(account_id)
    frappe.db.commit()
    return {
        "ok": True,
        "account_id": account_id,
        "interaction_id": interaction_id,
        "task_id": task_id,
        "parsed": parsed,
    }


@frappe.whitelist()
def ingest_reporting_events(events=None, dry_run=0):
    """Ingest one or more WhatsApp reporting rows into Momentum CRM.

    Expected source is the local Hermes collector SQLite export. Writes are
    idempotent via the WhatsApp message ID stored in Momentum Interaction.description.
    """
    if not events:
        frappe.throw(_("events is required"))
    payload = json.loads(events) if isinstance(events, str) else events
    if isinstance(payload, dict):
        payload = [payload]
    dry = str(dry_run).lower() in {"1", "true", "yes"}
    results = [_ingest_one(_as_dict(event), dry_run=dry) for event in payload]
    return {
        "ok": True,
        "dry_run": dry,
        "received": len(payload),
        "created": sum(1 for item in results if item.get("ok") and not item.get("skipped") and not item.get("dry_run")),
        "skipped": sum(1 for item in results if item.get("skipped")),
        "results": results,
    }
