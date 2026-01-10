# WH AI Recommendations API
# Endpoints for AI-powered task recommendations, duration estimation,
# at-risk detection, and workload balancing

import frappe
from frappe import _
from frappe.utils import nowdate, getdate
import json

from workhub_frappe_app.api.utils import require_auth, require_permission
from workhub_frappe_app.services.ai_recommendations import (
    get_next_task_recommendations as get_recommendations_service,
    detect_at_risk_tasks as detect_at_risk_service,
    estimate_task_duration,
    analyze_workload_balance,
    create_recommendation_record,
    update_task_ai_fields
)


@frappe.whitelist()
def get_next_task_recommendations(user=None, limit=5):
    """
    Get AI-recommended next tasks for a user.

    Args:
        user: User email (defaults to current user)
        limit: Max number of recommendations (default 5)

    Returns:
        List of recommended tasks with scores and reasons
    """
    require_auth()

    # Default to current user
    if not user:
        user = frappe.session.user

    # Check permission - users can only see their own recommendations
    # unless they have manager role
    if user != frappe.session.user:
        user_roles = frappe.get_roles(frappe.session.user)
        if "WH Manager" not in user_roles and "System Manager" not in user_roles:
            frappe.throw(_("You can only view your own recommendations"))

    try:
        limit = int(limit)
        if limit < 1 or limit > 20:
            limit = 5
    except (ValueError, TypeError):
        limit = 5

    # Get recommendations from service
    recommendations = get_recommendations_service(user, limit)

    # Format response
    result = []
    for rec in recommendations:
        task = rec["task"]

        # Calculate if overdue
        is_overdue = False
        if task.get("due_date") and task.get("status") != "DONE":
            is_overdue = getdate(task["due_date"]) < getdate(nowdate())

        result.append({
            "task_id": task["name"],
            "title": task["title"],
            "description": task.get("description"),
            "status": task["status"],
            "priority": task["priority"],
            "project": task.get("project"),
            "department": task.get("department"),
            "due_date": task.get("due_date"),
            "estimated_hours": task.get("estimated_hours"),
            "estimated_duration_ai": task.get("estimated_duration_ai"),
            "duration_confidence": task.get("duration_confidence"),
            "score": round(rec["score"], 2),
            "confidence": round(rec["confidence"], 2),
            "reason": rec["reason"],
            "is_overdue": is_overdue
        })

    return {
        "success": True,
        "user": user,
        "recommendations": result,
        "count": len(result)
    }


@frappe.whitelist()
def get_at_risk_tasks(user=None, limit=10):
    """
    Get tasks at risk of becoming overdue.

    Args:
        user: User email (defaults to current user, None = all users for managers)
        limit: Max number of results (default 10)

    Returns:
        List of at-risk tasks with risk scores and reasons
    """
    require_auth()

    # Check if user is a manager (can see all at-risk tasks)
    user_roles = frappe.get_roles(frappe.session.user)
    is_manager = "WH Manager" in user_roles or "System Manager" in user_roles

    # If user param is None and user is not a manager, default to current user
    if user is None and not is_manager:
        user = frappe.session.user

    # If user is specified and different from current user, check permission
    if user and user != frappe.session.user and not is_manager:
        frappe.throw(_("You can only view your own at-risk tasks"))

    try:
        limit = int(limit)
        if limit < 1 or limit > 50:
            limit = 10
    except (ValueError, TypeError):
        limit = 10

    # Get at-risk tasks from service
    at_risk = detect_at_risk_service(user, limit)

    # Format response
    result = []
    for item in at_risk:
        task = item["task"]

        # Calculate days until deadline
        days_remaining = None
        if task.get("due_date"):
            today = getdate(nowdate())
            deadline = getdate(task["due_date"])
            days_remaining = (deadline - today).days

        result.append({
            "task_id": task["name"],
            "title": task["title"],
            "status": task["status"],
            "priority": task["priority"],
            "assigned_to": task["assigned_to"],
            "project": task.get("project"),
            "department": task.get("department"),
            "due_date": task.get("due_date"),
            "days_remaining": days_remaining,
            "estimated_hours": task.get("estimated_hours"),
            "estimated_duration_ai": task.get("estimated_duration_ai"),
            "risk_score": round(item["risk_score"], 2),
            "risk_level": item["risk_level"],
            "reason": item["reason"]
        })

    return {
        "success": True,
        "user": user,
        "at_risk_tasks": result,
        "count": len(result)
    }


@frappe.whitelist()
def get_duration_estimate(task_id):
    """
    Get AI duration estimate for a task.

    Args:
        task_id: Task ID

    Returns:
        Duration estimate and confidence score
    """
    require_auth()

    if not task_id:
        frappe.throw(_("Task ID is required"))

    # Get task
    task = frappe.get_doc("WH Task", task_id)

    # Check if user has access to this task
    if task.assigned_to != frappe.session.user:
        user_roles = frappe.get_roles(frappe.session.user)
        if "WH Manager" not in user_roles and "System Manager" not in user_roles:
            frappe.throw(_("You don't have permission to access this task"))

    # Get duration estimate
    estimated_hours, confidence = estimate_task_duration(task.as_dict())

    # Update task if we have an estimate
    if estimated_hours:
        task.estimated_duration_ai = estimated_hours
        task.duration_confidence = confidence
        task.save(ignore_permissions=True)

    return {
        "success": True,
        "task_id": task_id,
        "estimated_hours": estimated_hours,
        "confidence": round(confidence, 2) if confidence else 0,
        "has_estimate": estimated_hours is not None,
        "source": "ai" if estimated_hours and confidence > 0.5 else "fallback"
    }


@frappe.whitelist()
def get_workload_suggestions(department=None):
    """
    Get workload balance suggestions for managers.

    Args:
        department: Department filter (optional)

    Returns:
        Workload analysis with rebalancing suggestions
    """
    require_auth()

    # Only managers can access workload suggestions
    user_roles = frappe.get_roles(frappe.session.user)
    if "WH Manager" not in user_roles and "System Manager" not in user_roles:
        frappe.throw(_("This endpoint is only available to managers"))

    # Validate department if provided
    if department:
        valid_departments = ["SALES", "OPS", "MKT"]
        if department not in valid_departments:
            frappe.throw(_("Invalid department. Must be one of: {0}").format(", ".join(valid_departments)))

    # Get workload analysis
    analysis = analyze_workload_balance(department)

    # Format user workload data
    users = []
    for user_data in analysis.get("users", []):
        users.append({
            "user": user_data["user"],
            "task_count": user_data["task_count"],
            "total_hours": round(user_data["total_hours"], 1),
            "p0_count": user_data.get("p0_count", 0),
            "p1_count": user_data.get("p1_count", 0),
            "p2_count": user_data.get("p2_count", 0)
        })

    # Sort users by task count (descending)
    users.sort(key=lambda x: x["task_count"], reverse=True)

    return {
        "success": True,
        "department": department,
        "users": users,
        "avg_tasks": round(analysis.get("avg_tasks", 0), 1),
        "avg_hours": round(analysis.get("avg_hours", 0), 1),
        "overloaded_users": analysis.get("overloaded", []),
        "underloaded_users": analysis.get("underloaded", []),
        "suggestions": analysis.get("suggestions", []),
        "has_imbalance": len(analysis.get("suggestions", [])) > 0
    }


@frappe.whitelist()
def submit_feedback(recommendation_id, feedback_type, comment=""):
    """
    Submit feedback on a recommendation.

    Args:
        recommendation_id: WH AI Recommendation ID
        feedback_type: helpful/not_helpful/wrong
        comment: Optional comment text

    Returns:
        Success status
    """
    require_auth()

    if not recommendation_id:
        frappe.throw(_("Recommendation ID is required"))

    # Validate feedback type
    valid_types = ["helpful", "not_helpful", "wrong"]
    if feedback_type not in valid_types:
        frappe.throw(_("Invalid feedback type. Must be one of: {0}").format(", ".join(valid_types)))

    # Get recommendation
    recommendation = frappe.get_doc("WH AI Recommendation", recommendation_id)

    # Check if user owns this recommendation
    if recommendation.user != frappe.session.user:
        frappe.throw(_("You can only provide feedback on your own recommendations"))

    # Create feedback record
    feedback = frappe.new_doc("WH Recommendation Feedback")
    feedback.recommendation = recommendation_id
    feedback.user = frappe.session.user
    feedback.feedback_type = feedback_type
    feedback.comment = comment
    feedback.insert(ignore_permissions=True)

    # Update recommendation status based on feedback
    if feedback_type == "helpful":
        recommendation.status = "accepted"
    elif feedback_type in ["not_helpful", "wrong"]:
        recommendation.status = "dismissed"

    recommendation.save(ignore_permissions=True)

    return {
        "success": True,
        "feedback_id": feedback.name,
        "recommendation_status": recommendation.status
    }


@frappe.whitelist()
def dismiss_recommendation(recommendation_id):
    """
    Dismiss a recommendation without feedback.

    Args:
        recommendation_id: WH AI Recommendation ID

    Returns:
        Success status
    """
    require_auth()

    if not recommendation_id:
        frappe.throw(_("Recommendation ID is required"))

    # Get recommendation
    recommendation = frappe.get_doc("WH AI Recommendation", recommendation_id)

    # Check if user owns this recommendation
    if recommendation.user != frappe.session.user:
        frappe.throw(_("You can only dismiss your own recommendations"))

    # Update status
    recommendation.status = "dismissed"
    recommendation.save(ignore_permissions=True)

    return {
        "success": True,
        "recommendation_id": recommendation_id,
        "status": "dismissed"
    }


@frappe.whitelist()
def accept_recommendation(recommendation_id):
    """
    Accept a recommendation.

    Args:
        recommendation_id: WH AI Recommendation ID

    Returns:
        Success status
    """
    require_auth()

    if not recommendation_id:
        frappe.throw(_("Recommendation ID is required"))

    # Get recommendation
    recommendation = frappe.get_doc("WH AI Recommendation", recommendation_id)

    # Check if user owns this recommendation
    if recommendation.user != frappe.session.user:
        frappe.throw(_("You can only accept your own recommendations"))

    # Update status
    recommendation.status = "accepted"
    recommendation.save(ignore_permissions=True)

    return {
        "success": True,
        "recommendation_id": recommendation_id,
        "status": "accepted"
    }


@frappe.whitelist()
def get_user_recommendations(user=None, status=None, limit=20):
    """
    Get all recommendations for a user with optional status filter.

    Args:
        user: User email (defaults to current user)
        status: Filter by status (pending/accepted/dismissed)
        limit: Max number of results (default 20)

    Returns:
        List of recommendations
    """
    require_auth()

    # Default to current user
    if not user:
        user = frappe.session.user

    # Check permission
    if user != frappe.session.user:
        user_roles = frappe.get_roles(frappe.session.user)
        if "WH Manager" not in user_roles and "System Manager" not in user_roles:
            frappe.throw(_("You can only view your own recommendations"))

    # Build filters
    filters = {"user": user}

    if status:
        valid_statuses = ["pending", "accepted", "dismissed"]
        if status not in valid_statuses:
            frappe.throw(_("Invalid status. Must be one of: {0}").format(", ".join(valid_statuses)))
        filters["status"] = status

    try:
        limit = int(limit)
        if limit < 1 or limit > 100:
            limit = 20
    except (ValueError, TypeError):
        limit = 20

    # Get recommendations
    recommendations = frappe.get_all("WH AI Recommendation",
        filters=filters,
        fields=[
            "name", "recommendation_type", "task", "reason",
            "confidence_score", "status", "expires_at",
            "creation", "modified"
        ],
        limit_page_length=limit,
        order_by="creation desc"
    )

    # Enrich with task details
    for rec in recommendations:
        if rec.get("task"):
            task_data = frappe.db.get_value("WH Task", rec["task"],
                ["title", "status", "priority", "due_date"], as_dict=True)
            if task_data:
                rec["task_title"] = task_data.title
                rec["task_status"] = task_data.status
                rec["task_priority"] = task_data.priority
                rec["task_due_date"] = task_data.due_date

    return {
        "success": True,
        "user": user,
        "recommendations": recommendations,
        "count": len(recommendations)
    }


@frappe.whitelist()
def update_task_ai_data(task_id):
    """
    Manually trigger AI data update for a task (duration estimate, risk score).

    Args:
        task_id: Task ID

    Returns:
        Updated AI data
    """
    require_permission("WH Task", "write")

    if not task_id:
        frappe.throw(_("Task ID is required"))

    # Update AI fields
    update_task_ai_fields(task_id)

    # Get updated task
    task = frappe.get_doc("WH Task", task_id)

    return {
        "success": True,
        "task_id": task_id,
        "estimated_duration_ai": task.estimated_duration_ai,
        "duration_confidence": task.duration_confidence,
        "risk_score": task.risk_score
    }
