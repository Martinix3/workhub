# WorkLink Suggestions API
# Endpoints for getting and accepting WorkLink auto-suggestions

import frappe
from frappe import _
import json

from workhub_frappe_app.api.utils import require_auth, require_permission
from workhub_frappe_app.services.document_matcher import match_documents


@frappe.whitelist()
def get_suggestions(title, description="", department=None, project_id=None, limit=5):
    """
    Get WorkLink suggestions based on task text.

    Args:
        title: Task title (required)
        description: Task description (optional)
        department: Task department (SALES, OPS, MKT) for context filtering
        project_id: Project ID for additional context
        limit: Maximum number of suggestions to return (default: 5)

    Returns:
        List of document suggestions with confidence scores

    Example response:
        [
            {
                "doctype": "Sales Order",
                "doc_id": "SO-12345",
                "doc_name": "SO-12345",
                "confidence": 0.95,
                "match_type": "document_number",
                "boosted": false
            }
        ]
    """
    require_auth()

    if not title or not title.strip():
        frappe.throw(_("Title is required"))

    # Parse limit to integer, ensure reasonable bounds
    try:
        limit = int(limit)
        if limit < 1:
            limit = 5
        if limit > 10:
            limit = 10
    except (ValueError, TypeError):
        limit = 5

    # Validate department if provided
    valid_departments = ["SALES", "OPS", "MKT"]
    if department and department not in valid_departments:
        frappe.throw(_("Invalid department. Must be one of: {0}").format(", ".join(valid_departments)))

    # Get current user for context
    user = frappe.session.user

    try:
        # Call document_matcher service
        suggestions = match_documents(
            task_title=title,
            task_description=description or "",
            department=department,
            project_id=project_id,
            user=user,
            threshold=0.6,
            limit=limit
        )

        # Enrich suggestions with additional document details
        enriched_suggestions = []
        for suggestion in suggestions:
            # Get additional document info if available
            try:
                doc_info = _get_document_display_info(suggestion["doctype"], suggestion["doc_id"])
                suggestion.update(doc_info)
            except Exception:
                # If we can't get extra info, just use what we have
                pass

            enriched_suggestions.append(suggestion)

        return {
            "success": True,
            "suggestions": enriched_suggestions,
            "count": len(enriched_suggestions)
        }

    except Exception as e:
        frappe.log_error(f"Error getting WorkLink suggestions: {str(e)}", "WorkLink Suggestions API")
        frappe.throw(_("Error getting suggestions. Please try again."))


@frappe.whitelist()
def accept_suggestion(task_id, doctype, doc_id, notes=""):
    """
    Accept a suggestion and create the WorkLink connection.
    Updates the task with the WorkLink reference.
    Records acceptance for pattern learning.

    Args:
        task_id: WH Task ID
        doctype: Document type (Sales Order, Batch, etc.)
        doc_id: Document ID
        notes: Optional notes about the link (default: "")

    Returns:
        Success response with worklink_id
    """
    require_permission("WH Task", "write")

    if not task_id or not doctype or not doc_id:
        frappe.throw(_("task_id, doctype, and doc_id are required"))

    # Validate that the task exists
    if not frappe.db.exists("WH Task", task_id):
        frappe.throw(_("Task {0} not found").format(task_id))

    # Validate that the document exists
    if not frappe.db.exists(doctype, doc_id):
        frappe.throw(_("{0} {1} not found").format(doctype, doc_id))

    try:
        # Check if WorkLink already exists for this ERP doc
        existing = frappe.db.get_value("WorkLink",
            {"source_doctype": doctype, "source_id": doc_id},
            "name")

        if existing:
            # Update existing WorkLink
            frappe.db.set_value("WorkLink", existing, "wh_task", task_id)
            worklink_id = existing
        else:
            # Create new WorkLink
            worklink = frappe.new_doc("WorkLink")
            worklink.source_doctype = doctype
            worklink.source_id = doc_id
            worklink.department = frappe.db.get_value("WH Task", task_id, "department") or "OPS"
            worklink.wh_task = task_id
            worklink.insert()
            worklink_id = worklink.name

        # Update task with WorkLink reference
        frappe.db.set_value("WH Task", task_id, {
            "worklink": worklink_id,
            "source_doctype": doctype,
            "source_name": doc_id
        })

        # Record acceptance for pattern learning (Phase 3)
        # This will be used by the WorkLink Suggestion Log DocType when implemented
        _record_suggestion_action(
            task_id=task_id,
            doctype=doctype,
            doc_id=doc_id,
            action="accepted",
            notes=notes
        )

        frappe.db.commit()

        return {
            "success": True,
            "worklink_id": worklink_id,
            "task_id": task_id,
            "message": _("WorkLink created successfully")
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(f"Error accepting suggestion for task {task_id}: {str(e)}", "WorkLink Suggestions API")
        frappe.throw(_("Error creating WorkLink. Please try again."))


@frappe.whitelist()
def dismiss_suggestion(task_id, doctype, doc_id, reason=""):
    """
    Record when user dismisses a suggestion.
    This is used for pattern learning to improve future suggestions.

    Args:
        task_id: WH Task ID
        doctype: Document type that was suggested
        doc_id: Document ID that was suggested
        reason: Optional reason for dismissal

    Returns:
        Success response
    """
    require_auth()

    if not task_id or not doctype or not doc_id:
        frappe.throw(_("task_id, doctype, and doc_id are required"))

    # Validate that the task exists
    if not frappe.db.exists("WH Task", task_id):
        frappe.throw(_("Task {0} not found").format(task_id))

    try:
        # Record dismissal for pattern learning (Phase 3)
        # This will be used by the WorkLink Suggestion Log DocType when implemented
        _record_suggestion_action(
            task_id=task_id,
            doctype=doctype,
            doc_id=doc_id,
            action="dismissed",
            notes=reason
        )

        frappe.db.commit()

        return {
            "success": True,
            "message": _("Suggestion dismissed")
        }

    except Exception as e:
        frappe.log_error(f"Error dismissing suggestion for task {task_id}: {str(e)}", "WorkLink Suggestions API")
        # Don't throw error here - dismissal is non-critical
        return {
            "success": False,
            "message": _("Error recording dismissal")
        }


def _get_document_display_info(doctype, doc_id):
    """
    Get additional display information for a document.
    Returns common fields for UI display.

    Args:
        doctype: Document type
        doc_id: Document ID

    Returns:
        Dict with display fields (customer, status, total, etc.)
    """
    try:
        doc = frappe.get_doc(doctype, doc_id)

        info = {}

        # Add customer info if available
        if hasattr(doc, 'customer'):
            info["customer"] = doc.customer
            info["customer_name"] = getattr(doc, 'customer_name', doc.customer)

        # Add status if available
        if hasattr(doc, 'status'):
            info["status"] = doc.status

        # Add financial info if available
        if hasattr(doc, 'grand_total'):
            info["grand_total"] = doc.grand_total
            info["currency"] = getattr(doc, 'currency', 'USD')

        # Add item info for manufacturing docs
        if hasattr(doc, 'production_item'):
            info["production_item"] = doc.production_item
            info["item_name"] = getattr(doc, 'item_name', '')

        if hasattr(doc, 'item'):
            info["item"] = doc.item
            info["item_name"] = getattr(doc, 'item_name', '')

        # Add dates
        if hasattr(doc, 'transaction_date'):
            info["date"] = str(doc.transaction_date)
        elif hasattr(doc, 'posting_date'):
            info["date"] = str(doc.posting_date)

        return info

    except Exception as e:
        frappe.log_error(f"Error getting display info for {doctype} {doc_id}: {str(e)}")
        return {}


def _record_suggestion_action(task_id, doctype, doc_id, action, notes="", confidence_score=None):
    """
    Record suggestion acceptance or dismissal for pattern learning.
    Logs to WorkLink Suggestion Log DocType for analysis.

    Args:
        task_id: WH Task ID
        doctype: Suggested document type
        doc_id: Suggested document ID
        action: "accepted" or "dismissed"
        notes: Additional notes
        confidence_score: Optional confidence score of the suggestion
    """
    try:
        # Get task details for logging
        task = frappe.get_doc("WH Task", task_id)

        # Extract keywords from task title and description for pattern learning
        task_text = f"{task.title} {task.description or ''}"
        # Simple keyword extraction - get words longer than 3 chars, uppercase, or contain numbers
        keywords = []
        for word in task_text.split():
            word_clean = word.strip('.,;:!?()[]{}')
            if len(word_clean) > 3 or word_clean.isupper() or any(c.isdigit() for c in word_clean):
                keywords.append(word_clean)
        task_keywords = " ".join(set(keywords))

        # Create WorkLink Suggestion Log entry
        log = frappe.new_doc("WorkLink Suggestion Log")
        log.user = frappe.session.user
        log.department = task.department
        log.task_id = task_id
        log.task_title = task.title
        log.task_keywords = task_keywords
        log.suggested_doctype = doctype
        log.suggested_id = doc_id
        log.action = action
        log.confidence_score = confidence_score
        log.notes = notes
        log.insert(ignore_permissions=True)

    except Exception as e:
        # Don't fail the main operation if logging fails
        frappe.log_error(f"Error recording suggestion action: {str(e)}", "WorkLink Suggestion Log Error")
