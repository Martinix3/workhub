# Smart Notepad API
# Natural language input for sales activities

import frappe
from frappe import _
import json

from workhub_frappe_app.api.utils import require_auth, sanitize_search_term
from workhub_frappe_app.services.llm_parser import parse_note_with_llm
from workhub_frappe_app.services.customer_matcher import (
    match_customer,
    get_customer_options,
    create_customer
)
from workhub_frappe_app.services.action_executor import (
    execute_actions,
    suggest_actions
)


@frappe.whitelist()
def parse(text: str) -> dict:
    """
    Parse natural language note and extract entities.

    Args:
        text: Natural language input from salesperson

    Returns:
        ParsedNote structure with customer info, activity type,
        outcome, products, and suggested actions
    """
    require_auth()

    if not text or not text.strip():
        frappe.throw(_("El texto no puede estar vacio"))

    text = text.strip()

    # Step 1: Extract entities using LLM
    llm_result = parse_note_with_llm(text)

    # Step 2: Match customer
    customer_name = llm_result.get("customer_name", "")
    customer_info = match_customer(customer_name)

    # Step 3: Suggest actions based on context
    actions = suggest_actions(llm_result, customer_info)

    # Build response
    return {
        "customer": {
            "name": customer_name,
            "matched_id": customer_info["customer"]["id"] if customer_info.get("matched") else None,
            "is_new": customer_info.get("is_new", True),
            "customer_group": customer_info["customer"]["customer_group"] if customer_info.get("matched") else None,
            "is_distributor": customer_info["customer"]["is_distributor"] if customer_info.get("matched") else False,
            "suggestions": customer_info.get("suggestions", [])
        },
        "activity_type": llm_result.get("activity_type", "visit"),
        "outcome": llm_result.get("outcome", "neutral"),
        "interest_level": llm_result.get("interest_level", 3),
        "products": llm_result.get("products", []),
        "notes": llm_result.get("notes", ""),
        "raw_text": text,
        "suggested_actions": actions
    }


@frappe.whitelist()
def execute(parsed_note: str) -> dict:
    """
    Execute confirmed actions from parsed note.

    Args:
        parsed_note: JSON string of ParsedNote with confirmed customer
                    and enabled/disabled actions

    Returns:
        Result with success status and executed actions
    """
    require_auth()

    if isinstance(parsed_note, str):
        try:
            parsed_note = json.loads(parsed_note)
        except json.JSONDecodeError:
            frappe.throw(_("Invalid JSON input"))

    # Validate customer
    customer = parsed_note.get("customer", {})
    customer_id = customer.get("matched_id")

    # If it's a new customer and create_new is enabled, create it
    if customer.get("is_new") and customer.get("create_new"):
        customer_id = create_customer(
            name=customer.get("name"),
            customer_group=customer.get("customer_group"),
            territory=customer.get("territory")
        )
        parsed_note["customer"]["matched_id"] = customer_id

    if not customer_id:
        frappe.throw(_("No se ha seleccionado un cliente"))

    # Execute all enabled actions
    results = execute_actions(parsed_note, customer_id)

    # Count successes and failures
    successes = [r for r in results if r.get("success")]
    failures = [r for r in results if not r.get("success")]

    return {
        "success": len(failures) == 0,
        "customer_id": customer_id,
        "actions_executed": len(successes),
        "actions_failed": len(failures),
        "results": results,
        "message": generate_success_message(results)
    }


@frappe.whitelist()
def search_customers(search: str = "", limit: int = 20) -> list:
    """
    Search customers for autocomplete.

    Args:
        search: Search term
        limit: Maximum results

    Returns:
        List of customer options
    """
    require_auth()
    return get_customer_options(search, int(limit))


@frappe.whitelist()
def get_items(search: str = "", limit: int = 20) -> list:
    """
    Search items for product selection.

    Args:
        search: Search term
        limit: Maximum results

    Returns:
        List of item options
    """
    require_auth()

    filters = {"disabled": 0, "is_sales_item": 1}

    if search:
        filters["item_name"] = ["like", f"%{sanitize_search_term(search)}%"]

    items = frappe.get_all(
        "Item",
        filters=filters,
        fields=["name", "item_name", "item_group", "stock_uom", "standard_rate"],
        limit=int(limit),
        order_by="item_name asc"
    )

    return [
        {
            "id": item.name,
            "name": item.item_name,
            "item_group": item.item_group,
            "uom": item.stock_uom,
            "rate": item.standard_rate
        }
        for item in items
    ]


def generate_success_message(results: list) -> str:
    """
    Generate a human-readable success message.
    Includes both successes and failures.
    """
    success_messages = []
    error_messages = []

    for r in results:
        action_type = r.get("type")
        result = r.get("result", {})

        if r.get("success"):
            if action_type == "add_timeline":
                success_messages.append("Actividad registrada en timeline")

            elif action_type == "create_order":
                order_id = result.get("order_id")
                if order_id:
                    success_messages.append(f"Pedido {order_id} creado")
                    if result.get("warning"):
                        error_messages.append(result["warning"])

            elif action_type == "create_task":
                success_messages.append("Tarea de seguimiento creada")

            elif action_type == "update_pipeline":
                action = result.get("action")
                stage = result.get("stage")
                if action == "won":
                    success_messages.append("Oportunidad marcada como ganada")
                elif action == "created":
                    success_messages.append(f"Oportunidad creada ({stage})")
                else:
                    success_messages.append(f"Oportunidad actualizada ({stage})")

            elif action_type == "close_opportunity":
                success_messages.append("Oportunidad cerrada")
        else:
            # Failed action
            error = r.get("error", "Error desconocido")
            action_labels = {
                "create_order": "Pedido",
                "update_pipeline": "Pipeline",
                "create_task": "Tarea",
                "add_timeline": "Timeline",
                "close_opportunity": "Oportunidad"
            }
            label = action_labels.get(action_type, action_type)
            error_messages.append(f"{label}: {error}")

    # Build final message
    parts = []
    if success_messages:
        parts.append(". ".join(success_messages))
    if error_messages:
        parts.append("⚠️ " + "; ".join(error_messages))

    if not parts:
        return "No se ejecutaron acciones"

    return ". ".join(parts) + "."
