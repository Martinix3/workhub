# Action Executor Service for Smart Notepad
# Executes confirmed actions: create orders, tasks, timeline entries, etc.

import frappe
from frappe import _
from frappe.utils import today, nowdate, add_days


def execute_actions(parsed_note: dict, customer_id: str) -> list:
    """
    Execute all enabled actions from parsed note.

    Args:
        parsed_note: The complete parsed note with suggested_actions
        customer_id: The confirmed customer ID

    Returns:
        List of executed actions with results
    """
    results = []
    actions = parsed_note.get("suggested_actions", [])

    for action in actions:
        if not action.get("enabled", False):
            continue

        action_type = action.get("type")
        params = action.get("params", {})

        try:
            if action_type == "add_timeline":
                result = add_timeline_entry(
                    customer_id=customer_id,
                    activity_type=parsed_note.get("activity_type", "visit"),
                    notes=parsed_note.get("notes", ""),
                    outcome=parsed_note.get("outcome", "neutral"),
                    raw_text=parsed_note.get("raw_text", "")
                )
                results.append({"type": action_type, "success": True, "result": result})

            elif action_type == "create_order":
                result = create_sales_order(
                    customer_id=customer_id,
                    products=parsed_note.get("products", []),
                    is_distributor=params.get("is_distributor", False)
                )
                results.append({"type": action_type, "success": True, "result": result})

            elif action_type == "create_task":
                result = create_followup_task(
                    customer_id=customer_id,
                    notes=parsed_note.get("notes", ""),
                    due_date=params.get("due_date")
                )
                results.append({"type": action_type, "success": True, "result": result})

            elif action_type == "update_pipeline":
                result = update_opportunity_pipeline(
                    customer_id=customer_id,
                    interest_level=parsed_note.get("interest_level", 3),
                    outcome=parsed_note.get("outcome", "neutral"),
                    notes=parsed_note.get("notes", "")
                )
                results.append({"type": action_type, "success": True, "result": result})

            elif action_type == "close_opportunity":
                result = close_opportunity(
                    customer_id=customer_id,
                    reason=params.get("reason", "Lost to competitor")
                )
                results.append({"type": action_type, "success": True, "result": result})

            else:
                results.append({"type": action_type, "success": False, "error": "Unknown action type"})

        except Exception as e:
            frappe.log_error(f"Action execution error: {str(e)}", "Smart Notepad")
            results.append({"type": action_type, "success": False, "error": str(e)})

    return results


def add_timeline_entry(customer_id: str, activity_type: str, notes: str, outcome: str, raw_text: str) -> dict:
    """
    Add a timeline/communication entry for the customer.
    Uses Frappe's Communication doctype.

    SECURITY: Internal service function called by execute_actions (background operation).
    Not exposed as API endpoint - runs in context of user who triggered the action.
    Uses ignore_permissions because regular users don't have create permission on
    Communication doctype, but need to log customer interactions automatically.
    """
    activity_labels = {
        "visit": "Visita",
        "call": "Llamada",
        "email": "Email",
        "order": "Pedido",
        "quote": "Cotizacion"
    }

    outcome_labels = {
        "positive": "Positivo",
        "neutral": "Neutral",
        "negative": "Negativo",
        "order": "Pedido"
    }

    subject = f"{activity_labels.get(activity_type, activity_type)} - {outcome_labels.get(outcome, outcome)}"

    doc = frappe.new_doc("Communication")
    doc.communication_type = "Communication"
    doc.communication_medium = "Other"
    doc.subject = subject
    doc.content = f"<p><strong>Nota original:</strong> {raw_text}</p><p><strong>Resumen:</strong> {notes}</p>"
    doc.reference_doctype = "Customer"
    doc.reference_name = customer_id
    doc.sent_or_received = "Sent"
    doc.status = "Linked"

    # SECURITY: Safe - internal service operation, user lacks Communication create permission
    doc.insert(ignore_permissions=True)

    return {
        "communication_id": doc.name,
        "subject": subject
    }


def create_sales_order(customer_id: str, products: list, is_distributor: bool = False) -> dict:
    """
    Create a sales order or distributor sell-out order.

    SECURITY: Internal service function called by execute_actions (background operation).
    Not exposed as API endpoint - runs in context of user who triggered the action.
    Uses ignore_permissions to allow automated order creation from smart notepad,
    where regular users may lack direct Sales Order create permission.

    Raises:
        ValueError: If no products specified or no valid items found
    """
    if not products:
        raise ValueError("No se especificaron productos")

    # For sell-out (distributor), we would use "Distributor Sell Out Order" if it exists
    # For now, use Sales Order for both
    doctype = "Sales Order"

    doc = frappe.new_doc(doctype)
    doc.customer = customer_id
    doc.delivery_date = add_days(today(), 7)  # Default delivery in 7 days
    doc.order_type = "Sales"

    # Track unmatched products
    unmatched_products = []

    # Add items
    for product in products:
        # First check if user already selected an item (matched_item)
        item_code = product.get("matched_item")

        # If not, try to find matching item by description
        if not item_code:
            item_code = find_item_by_description(product.get("description", ""))

        if item_code:
            doc.append("items", {
                "item_code": item_code,
                "qty": product.get("qty", 1),
                "delivery_date": add_days(today(), 7)
            })
        else:
            unmatched_products.append(product.get('description', 'Unknown'))

    if not doc.items:
        raise ValueError(f"No se encontraron productos que coincidan: {', '.join(unmatched_products)}")

    # SECURITY: Safe - internal service operation for automated order creation
    doc.insert(ignore_permissions=True)

    result = {
        "order_id": doc.name,
        "doctype": doctype,
        "is_distributor": is_distributor
    }

    # Add warning if some products weren't matched
    if unmatched_products:
        result["warning"] = f"Productos no encontrados: {', '.join(unmatched_products)}"

    return result


def create_followup_task(customer_id: str, notes: str, due_date: str = None) -> dict:
    """
    Create a follow-up task (WH Task or ToDo).

    SECURITY: Internal service function called by execute_actions (background operation).
    Not exposed as API endpoint - runs in context of user who triggered the action.
    Uses ignore_permissions to allow automated task creation from smart notepad,
    where the user may lack direct WH Task/ToDo create permission.
    """
    if not due_date:
        due_date = add_days(today(), 3)  # Default 3 days

    # Try WH Task first (custom doctype)
    try:
        doc = frappe.new_doc("WH Task")
        doc.title = f"Seguimiento: {customer_id}"
        doc.description = notes
        doc.status = "NEXT"
        doc.department = "SALES"
        doc.priority = "P2"
        doc.due_date = due_date
        doc.assigned_to = frappe.session.user
        # SECURITY: Safe - internal service operation for automated task creation
        doc.insert(ignore_permissions=True)

        return {"task_id": doc.name, "doctype": "WH Task"}
    except Exception:
        # Fallback to ToDo
        doc = frappe.new_doc("ToDo")
        doc.description = f"Seguimiento {customer_id}: {notes}"
        doc.date = due_date
        doc.reference_type = "Customer"
        doc.reference_name = customer_id
        doc.allocated_to = frappe.session.user
        # SECURITY: Safe - internal service operation for automated task creation (fallback)
        doc.insert(ignore_permissions=True)

        return {"task_id": doc.name, "doctype": "ToDo"}


def update_opportunity_pipeline(customer_id: str, interest_level: int, outcome: str, notes: str) -> dict:
    """
    Update or create opportunity in pipeline.
    Handles 'order' outcome as a won opportunity.

    SECURITY: Internal service function called by execute_actions (background operation).
    Not exposed as API endpoint - runs in context of user who triggered the action.
    Uses ignore_permissions to allow automated opportunity management from smart notepad,
    where regular users may lack direct Opportunity create/write permission.
    """
    # Valid sales stages from ERPNext
    stages = {
        1: "Prospecting",
        2: "Qualification",
        3: "Needs Analysis",
        4: "Proposal/Price Quote",
        5: "Negotiation/Review"
    }

    # Check for existing open opportunity
    existing = frappe.db.get_value(
        "Opportunity",
        {
            "party_name": customer_id,
            "status": ["in", ["Open", "Quotation"]]
        },
        "name"
    )

    if existing:
        # Update existing opportunity
        doc = frappe.get_doc("Opportunity", existing)

        # If outcome is "order", mark as converted/won
        if outcome == "order":
            doc.status = "Converted"
            doc.sales_stage = "Negotiation/Review"  # Use valid stage
            action_label = "won"
        else:
            doc.sales_stage = stages.get(interest_level, "Qualification")
            action_label = "updated"

        # Add note to the notes child table
        if notes:
            doc.append("notes", {
                "note": f"[{nowdate()}] {notes}"
            })

        # SECURITY: Safe - internal service operation for automated opportunity update
        doc.save(ignore_permissions=True)

        return {"opportunity_id": doc.name, "action": action_label, "stage": doc.sales_stage}
    else:
        # Create new opportunity
        doc = frappe.new_doc("Opportunity")
        doc.opportunity_from = "Customer"
        doc.party_name = customer_id
        doc.opportunity_type = "Sales"
        doc.source = "Direct"

        # If outcome is "order", create as converted
        if outcome == "order":
            doc.status = "Converted"
            doc.sales_stage = "Negotiation/Review"
            action_label = "won"
        else:
            doc.sales_stage = stages.get(interest_level, "Qualification")
            action_label = "created"

        # Add note to the notes child table
        if notes:
            doc.append("notes", {
                "note": notes
            })

        # SECURITY: Safe - internal service operation for automated opportunity creation
        doc.insert(ignore_permissions=True)

        return {"opportunity_id": doc.name, "action": action_label, "stage": doc.sales_stage}


def close_opportunity(customer_id: str, reason: str = "Lost") -> dict:
    """
    Close/lose an opportunity for the customer.

    SECURITY: Internal service function called by execute_actions (background operation).
    Not exposed as API endpoint - runs in context of user who triggered the action.
    Uses ignore_permissions to allow automated opportunity closure from smart notepad,
    where regular users may lack direct Opportunity write permission.
    """
    # Find open opportunity
    existing = frappe.db.get_value(
        "Opportunity",
        {
            "party_name": customer_id,
            "status": ["in", ["Open", "Quotation"]]
        },
        "name"
    )

    if not existing:
        return {"opportunity_id": None, "message": "No open opportunity found"}

    doc = frappe.get_doc("Opportunity", existing)
    doc.status = "Lost"

    # Add note about why it was closed (notes is a child table)
    doc.append("notes", {
        "note": f"[{nowdate()}] Cerrado: {reason}"
    })

    # SECURITY: Safe - internal service operation for automated opportunity closure
    doc.save(ignore_permissions=True)

    return {"opportunity_id": doc.name, "action": "closed", "reason": reason}


def find_item_by_description(description: str) -> str:
    """
    Try to find an item code by description/name.
    Returns None if not found.
    """
    if not description:
        return None

    description = description.strip().lower()

    # Try exact match
    item = frappe.db.get_value(
        "Item",
        {"item_name": ["like", f"%{description}%"], "disabled": 0},
        "name"
    )

    if item:
        return item

    # Try with keywords
    keywords = description.split()
    for keyword in keywords:
        if len(keyword) < 3:
            continue
        item = frappe.db.get_value(
            "Item",
            {"item_name": ["like", f"%{keyword}%"], "disabled": 0},
            "name"
        )
        if item:
            return item

    return None


def suggest_actions(parsed: dict, customer_info: dict) -> list:
    """
    Generate suggested actions based on parsed note and customer info.

    Args:
        parsed: Parsed note from LLM
        customer_info: Customer match info

    Returns:
        List of suggested actions
    """
    actions = []
    activity_type = parsed.get("activity_type", "visit")
    outcome = parsed.get("outcome", "neutral")
    products = parsed.get("products", [])

    # Always add timeline entry
    actions.append({
        "type": "add_timeline",
        "label": "Agregar a timeline del cliente",
        "params": {},
        "enabled": True
    })

    # If there are products and outcome is order, suggest creating order and updating pipeline
    if products and outcome == "order":
        customer_data = customer_info.get("customer") if customer_info else None
        is_distributor = customer_data.get("is_distributor", False) if customer_data else False
        actions.append({
            "type": "create_order",
            "label": "Crear pedido" + (" (Sell-out)" if is_distributor else ""),
            "params": {"is_distributor": is_distributor},
            "enabled": True
        })
        # Also update/create pipeline for the order
        actions.append({
            "type": "update_pipeline",
            "label": "Registrar en pipeline (ganada)",
            "params": {},
            "enabled": True
        })

    # If outcome is positive, suggest pipeline update
    if outcome == "positive":
        actions.append({
            "type": "update_pipeline",
            "label": "Actualizar oportunidad en pipeline",
            "params": {},
            "enabled": True
        })
        actions.append({
            "type": "create_task",
            "label": "Crear tarea de seguimiento",
            "params": {"due_date": str(add_days(today(), 3))},
            "enabled": True
        })

    # If outcome is neutral, suggest follow-up task
    if outcome == "neutral":
        actions.append({
            "type": "update_pipeline",
            "label": "Actualizar oportunidad en pipeline",
            "params": {},
            "enabled": True
        })
        actions.append({
            "type": "create_task",
            "label": "Crear tarea de seguimiento",
            "params": {"due_date": str(add_days(today(), 7))},
            "enabled": False  # Optional by default
        })

    # If outcome is negative, suggest closing opportunity
    if outcome == "negative":
        actions.append({
            "type": "close_opportunity",
            "label": "Cerrar oportunidad como perdida",
            "params": {"reason": "Sin interes"},
            "enabled": True
        })

    # If quote, suggest follow-up
    if activity_type == "quote":
        actions.append({
            "type": "create_task",
            "label": "Seguimiento de cotizacion",
            "params": {"due_date": str(add_days(today(), 5))},
            "enabled": True
        })

    return actions
