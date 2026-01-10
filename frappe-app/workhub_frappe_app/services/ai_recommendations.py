# AI Recommendations Service
# Core recommendation engine for task prioritization, duration estimation,
# at-risk detection, and workload balancing

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, add_days, now_datetime, get_datetime
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import re


# Priority weights for scoring algorithm
PRIORITY_WEIGHTS = {
    "P0": 100,  # Critical
    "P1": 50,   # High
    "P2": 20    # Normal
}

# Scoring weights
SCORING_WEIGHTS = {
    "priority": 0.4,
    "urgency": 0.3,
    "dependency": 0.2,
    "workload": 0.1
}

# At-risk thresholds
AT_RISK_THRESHOLDS = {
    "critical": 0.8,  # 80%+ risk score
    "high": 0.6,      # 60%+ risk score
    "medium": 0.4     # 40%+ risk score
}


def calculate_task_score(task: Dict, user_workload: int = 0) -> float:
    """
    Calculate recommendation score for a task.

    Score = (priority_weight * priority) + (urgency_weight * urgency) +
            (dependency_weight * dependency_score) - (workload_penalty)

    Args:
        task: Task dict with status, priority, due_date, etc.
        user_workload: Number of active tasks for the user

    Returns:
        float: Score (higher = more recommended)
    """
    score = 0.0

    # Priority component (0-100)
    priority_score = PRIORITY_WEIGHTS.get(task.get("priority", "P1"), 50)
    score += SCORING_WEIGHTS["priority"] * priority_score

    # Urgency component based on deadline (0-100)
    urgency_score = calculate_urgency_score(task.get("due_date"))
    score += SCORING_WEIGHTS["urgency"] * urgency_score

    # Dependency component (0-100)
    dependency_score = calculate_dependency_score(task.get("name"))
    score += SCORING_WEIGHTS["dependency"] * dependency_score

    # Workload penalty (reduces score if user is overloaded)
    workload_penalty = min(user_workload * 2, 50)  # Cap at 50
    score -= SCORING_WEIGHTS["workload"] * workload_penalty

    return max(score, 0)  # Ensure non-negative


def calculate_urgency_score(due_date: Optional[str]) -> float:
    """
    Calculate urgency score based on days until deadline.

    Returns:
        float: 0-100, where 100 is most urgent
    """
    if not due_date:
        return 20  # Low urgency if no deadline

    today = getdate(nowdate())
    deadline = getdate(due_date)
    days_until = (deadline - today).days

    # Overdue = 100
    if days_until < 0:
        return 100

    # Today = 90
    if days_until == 0:
        return 90

    # Tomorrow = 80
    if days_until == 1:
        return 80

    # This week = 60-70
    if days_until <= 7:
        return 70 - (days_until - 2) * 2

    # This month = 30-50
    if days_until <= 30:
        return 50 - (days_until - 7) * 0.5

    # Future = 10-30
    return max(10, 30 - (days_until - 30) * 0.1)


def calculate_dependency_score(task_id: str) -> float:
    """
    Calculate dependency score - tasks that unblock others score higher.

    Returns:
        float: 0-100
    """
    if not task_id:
        return 50

    # Check if this task blocks others
    blocking_count = frappe.db.count("WH Task Dependency", {
        "predecessor": task_id,
        "is_active": 1
    })

    # Check if this task is blocked
    blocked_by_count = frappe.db.count("WH Task Dependency", {
        "successor": task_id,
        "is_active": 1
    })

    # Higher score if blocking others and not blocked
    score = 50
    score += blocking_count * 15  # +15 per task we're blocking
    score -= blocked_by_count * 10  # -10 if we're blocked

    return min(max(score, 0), 100)


def get_next_task_recommendations(user: str, limit: int = 5) -> List[Dict]:
    """
    Get recommended next tasks for a user.

    Args:
        user: User email
        limit: Max number of recommendations

    Returns:
        List of task dicts with scores and reasons
    """
    # Get candidate tasks (NEXT or BACKLOG status)
    tasks = frappe.get_all("WH Task",
        filters={
            "assigned_to": user,
            "status": ["in", ["NEXT", "BACKLOG"]],
        },
        fields=[
            "name", "title", "description", "status", "priority",
            "project", "department", "due_date", "estimated_hours",
            "estimated_duration_ai", "duration_confidence"
        ],
        order_by="priority asc"
    )

    if not tasks:
        return []

    # Get user workload
    active_count = frappe.db.count("WH Task", {
        "assigned_to": user,
        "status": ["in", ["DOING", "NEXT"]]
    })

    # Calculate scores
    scored_tasks = []
    for task in tasks:
        score = calculate_task_score(task, active_count)

        # Generate reason
        reason = generate_recommendation_reason(task, score)

        scored_tasks.append({
            "task": task,
            "score": score,
            "reason": reason,
            "confidence": calculate_recommendation_confidence(task, score)
        })

    # Sort by score (descending) and return top N
    scored_tasks.sort(key=lambda x: x["score"], reverse=True)
    return scored_tasks[:limit]


def generate_recommendation_reason(task: Dict, score: float) -> str:
    """
    Generate natural language explanation for recommendation.

    Args:
        task: Task dict
        score: Calculated score

    Returns:
        str: Explanation in Spanish
    """
    reasons = []

    # Priority factor
    if task.get("priority") == "P0":
        reasons.append("prioridad crítica")
    elif task.get("priority") == "P1":
        reasons.append("prioridad alta")

    # Urgency factor
    if task.get("due_date"):
        today = getdate(nowdate())
        deadline = getdate(task["due_date"])
        days_until = (deadline - today).days

        if days_until < 0:
            reasons.append("vencida")
        elif days_until == 0:
            reasons.append("vence hoy")
        elif days_until == 1:
            reasons.append("vence mañana")
        elif days_until <= 3:
            reasons.append(f"vence en {days_until} días")

    # Dependency factor
    blocking_count = frappe.db.count("WH Task Dependency", {
        "predecessor": task.get("name"),
        "is_active": 1
    })
    if blocking_count > 0:
        reasons.append(f"desbloquea {blocking_count} tarea{'s' if blocking_count > 1 else ''}")

    # Combine reasons
    if not reasons:
        return "Siguiente en tu lista según prioridad y fecha límite"

    return "Recomendada por: " + ", ".join(reasons)


def calculate_recommendation_confidence(task: Dict, score: float) -> float:
    """
    Calculate confidence score for recommendation (0-1).

    Args:
        task: Task dict
        score: Calculated score

    Returns:
        float: Confidence 0.0-1.0
    """
    confidence = 0.5  # Base confidence

    # Higher confidence if has deadline
    if task.get("due_date"):
        confidence += 0.2

    # Higher confidence if has AI duration estimate
    if task.get("estimated_duration_ai") and task.get("duration_confidence"):
        confidence += task.get("duration_confidence", 0) * 0.2

    # Higher confidence for high scores
    if score > 80:
        confidence += 0.1

    return min(confidence, 1.0)


def estimate_task_duration(task: Dict) -> Tuple[Optional[float], float]:
    """
    Estimate task duration based on historical data.

    Args:
        task: Task dict with title, department, etc.

    Returns:
        Tuple of (estimated_hours, confidence_score)
    """
    title = task.get("title", "").lower()
    department = task.get("department")

    # Try to find similar completed tasks
    similar_stats = find_similar_task_stats(title, department)

    if similar_stats:
        # Use historical average
        avg_duration = similar_stats.get("avg_duration_hours", 0)
        completion_count = similar_stats.get("completion_count", 0)

        # Confidence based on sample size
        confidence = min(completion_count / 10, 1.0)  # Max confidence at 10+ samples

        return (avg_duration, confidence)

    # Fallback: use manual estimate if available
    if task.get("estimated_hours"):
        return (task["estimated_hours"], 0.3)  # Low confidence for manual estimates

    # No data available
    return (None, 0.0)


def find_similar_task_stats(title: str, department: Optional[str]) -> Optional[Dict]:
    """
    Find historical statistics for similar tasks.

    Args:
        title: Task title to match
        department: Department filter

    Returns:
        Dict with avg_duration_hours, median_duration_hours, completion_count
    """
    # Extract keywords from title (simple approach)
    keywords = extract_keywords(title)

    if not keywords:
        return None

    # Search for matching stats
    filters = {}
    if department:
        filters["department"] = department

    stats = frappe.get_all("WH Task Completion Stats",
        filters=filters,
        fields=["task_type", "avg_duration_hours", "median_duration_hours",
                "completion_count", "similar_task_title_pattern"]
    )

    # Find best match using fuzzy matching
    best_match = None
    best_score = 0

    for stat in stats:
        pattern = stat.get("similar_task_title_pattern", "").lower()
        score = calculate_title_similarity(title, pattern)

        if score > best_score and score > 0.3:  # Minimum 30% similarity
            best_score = score
            best_match = stat

    return best_match


def extract_keywords(title: str) -> List[str]:
    """Extract meaningful keywords from task title."""
    # Remove common words
    stop_words = {"el", "la", "los", "las", "un", "una", "de", "del", "a", "en",
                  "para", "por", "con", "sin", "sobre", "entre"}

    # Split and filter
    words = re.findall(r'\w+', title.lower())
    keywords = [w for w in words if w not in stop_words and len(w) > 2]

    return keywords[:5]  # Top 5 keywords


def calculate_title_similarity(title1: str, title2: str) -> float:
    """
    Calculate similarity between two titles (simple word overlap).

    Returns:
        float: 0.0-1.0 similarity score
    """
    words1 = set(extract_keywords(title1))
    words2 = set(extract_keywords(title2))

    if not words1 or not words2:
        return 0.0

    # Jaccard similarity
    intersection = len(words1 & words2)
    union = len(words1 | words2)

    return intersection / union if union > 0 else 0.0


def detect_at_risk_tasks(user: Optional[str] = None, limit: int = 10) -> List[Dict]:
    """
    Detect tasks at risk of becoming overdue.

    Args:
        user: Filter by user (None = all users)
        limit: Max results

    Returns:
        List of at-risk tasks with risk scores and reasons
    """
    filters = {
        "status": ["not in", ["DONE"]],
        "due_date": ["is", "set"]
    }

    if user:
        filters["assigned_to"] = user

    tasks = frappe.get_all("WH Task",
        filters=filters,
        fields=[
            "name", "title", "status", "priority", "assigned_to",
            "due_date", "estimated_hours", "estimated_duration_ai",
            "project", "department"
        ]
    )

    at_risk = []
    today = getdate(nowdate())

    for task in tasks:
        risk_score = calculate_risk_score(task)

        if risk_score >= AT_RISK_THRESHOLDS["medium"]:
            reason = generate_risk_reason(task, risk_score)

            at_risk.append({
                "task": task,
                "risk_score": risk_score,
                "risk_level": get_risk_level(risk_score),
                "reason": reason
            })

    # Sort by risk score (descending)
    at_risk.sort(key=lambda x: x["risk_score"], reverse=True)
    return at_risk[:limit]


def calculate_risk_score(task: Dict) -> float:
    """
    Calculate risk score for a task (0.0-1.0).

    Factors:
    - Time until deadline
    - Estimated duration vs time remaining
    - Current workload of assignee
    - Priority
    - Dependencies

    Returns:
        float: 0.0 (no risk) to 1.0 (critical risk)
    """
    risk = 0.0

    # Time factor
    today = getdate(nowdate())
    deadline = getdate(task.get("due_date"))
    days_remaining = (deadline - today).days

    if days_remaining < 0:
        risk += 0.5  # Already overdue = high base risk
    elif days_remaining == 0:
        risk += 0.4
    elif days_remaining <= 2:
        risk += 0.3
    elif days_remaining <= 7:
        risk += 0.2
    else:
        risk += max(0, 0.1 - days_remaining * 0.002)

    # Duration vs time remaining
    estimated_hours = task.get("estimated_duration_ai") or task.get("estimated_hours")
    if estimated_hours and days_remaining > 0:
        # Assume 6 productive hours per day
        hours_available = days_remaining * 6

        if estimated_hours > hours_available:
            risk += 0.3  # Not enough time
        elif estimated_hours > hours_available * 0.7:
            risk += 0.2  # Tight schedule

    # Priority factor
    if task.get("priority") == "P0":
        risk += 0.1

    # Status factor
    if task.get("status") == "BACKLOG":
        risk += 0.1  # Not even started
    elif task.get("status") == "BLOCKED":
        risk += 0.2  # Blocked

    # Workload factor (simplified - could query actual workload)
    user_active_tasks = frappe.db.count("WH Task", {
        "assigned_to": task.get("assigned_to"),
        "status": ["in", ["DOING", "NEXT"]]
    })
    if user_active_tasks > 10:
        risk += 0.1

    return min(risk, 1.0)


def get_risk_level(score: float) -> str:
    """Convert risk score to level."""
    if score >= AT_RISK_THRESHOLDS["critical"]:
        return "critical"
    elif score >= AT_RISK_THRESHOLDS["high"]:
        return "high"
    elif score >= AT_RISK_THRESHOLDS["medium"]:
        return "medium"
    return "low"


def generate_risk_reason(task: Dict, risk_score: float) -> str:
    """Generate explanation for at-risk status."""
    reasons = []

    today = getdate(nowdate())
    deadline = getdate(task.get("due_date"))
    days_remaining = (deadline - today).days

    if days_remaining < 0:
        reasons.append(f"vencida hace {abs(days_remaining)} día{'s' if abs(days_remaining) > 1 else ''}")
    elif days_remaining == 0:
        reasons.append("vence hoy")
    elif days_remaining <= 2:
        reasons.append(f"vence en {days_remaining} día{'s' if days_remaining > 1 else ''}")

    if task.get("status") == "BACKLOG":
        reasons.append("aún no iniciada")
    elif task.get("status") == "BLOCKED":
        reasons.append("bloqueada")

    estimated_hours = task.get("estimated_duration_ai") or task.get("estimated_hours")
    if estimated_hours and days_remaining > 0:
        hours_available = days_remaining * 6
        if estimated_hours > hours_available:
            reasons.append(f"requiere {estimated_hours}h pero solo hay {hours_available}h disponibles")

    if task.get("priority") == "P0":
        reasons.append("prioridad crítica")

    return "En riesgo: " + ", ".join(reasons) if reasons else "En riesgo de no completarse a tiempo"


def analyze_workload_balance(department: Optional[str] = None) -> Dict:
    """
    Analyze workload distribution across users.

    Args:
        department: Filter by department

    Returns:
        Dict with workload stats and rebalancing suggestions
    """
    filters = {
        "status": ["in", ["DOING", "NEXT", "BACKLOG"]],
    }

    if department:
        filters["department"] = department

    tasks = frappe.get_all("WH Task",
        filters=filters,
        fields=["assigned_to", "priority", "estimated_hours", "estimated_duration_ai"]
    )

    # Group by user
    user_workload = {}
    for task in tasks:
        user = task["assigned_to"]
        if user not in user_workload:
            user_workload[user] = {
                "task_count": 0,
                "total_hours": 0.0,
                "p0_count": 0,
                "p1_count": 0,
                "p2_count": 0
            }

        user_workload[user]["task_count"] += 1

        hours = task.get("estimated_duration_ai") or task.get("estimated_hours") or 4
        user_workload[user]["total_hours"] += hours

        priority = task.get("priority", "P1")
        user_workload[user][f"{priority.lower()}_count"] += 1

    # Calculate statistics
    if not user_workload:
        return {
            "users": [],
            "avg_tasks": 0,
            "avg_hours": 0,
            "suggestions": []
        }

    total_tasks = sum(u["task_count"] for u in user_workload.values())
    total_hours = sum(u["total_hours"] for u in user_workload.values())
    avg_tasks = total_tasks / len(user_workload)
    avg_hours = total_hours / len(user_workload)

    # Find overloaded and underloaded users
    overloaded = []
    underloaded = []

    for user, stats in user_workload.items():
        stats["user"] = user

        if stats["task_count"] > avg_tasks * 1.5:
            overloaded.append(user)
        elif stats["task_count"] < avg_tasks * 0.5:
            underloaded.append(user)

    # Generate suggestions
    suggestions = []
    if overloaded and underloaded:
        for over_user in overloaded:
            for under_user in underloaded:
                suggestions.append({
                    "type": "workload_balance",
                    "from_user": over_user,
                    "to_user": under_user,
                    "reason": f"{over_user} tiene {user_workload[over_user]['task_count']} tareas ({user_workload[over_user]['total_hours']:.1f}h), mientras {under_user} tiene {user_workload[under_user]['task_count']} tareas ({user_workload[under_user]['total_hours']:.1f}h). Considera reasignar algunas tareas.",
                    "from_workload": user_workload[over_user],
                    "to_workload": user_workload[under_user]
                })

    return {
        "users": list(user_workload.values()),
        "avg_tasks": avg_tasks,
        "avg_hours": avg_hours,
        "overloaded": overloaded,
        "underloaded": underloaded,
        "suggestions": suggestions[:5]  # Top 5 suggestions
    }


def generate_llm_explanation(task: Dict, recommendation_type: str, context: Dict) -> str:
    """
    Use LLM to generate natural language explanation for recommendation.

    Args:
        task: Task dict
        recommendation_type: Type of recommendation
        context: Additional context (score, risk_score, etc.)

    Returns:
        str: Natural language explanation in Spanish
    """
    import openai

    # Get API key
    api_key = frappe.conf.get("openai_api_key") or frappe.utils.get_site_config().get("openai_api_key")

    if not api_key:
        import os
        api_key = os.environ.get("OPENAI_API_KEY")

    if not api_key:
        # Fallback to template-based explanation
        return generate_recommendation_reason(task, context.get("score", 0))

    # Build prompt based on type
    if recommendation_type == "next_task":
        prompt = f"""Explica brevemente (1-2 oraciones) por qué esta tarea es recomendada para trabajar ahora:

Título: {task.get('title')}
Prioridad: {task.get('priority')}
Fecha límite: {task.get('due_date') or 'Sin fecha'}
Score de recomendación: {context.get('score', 0):.1f}/100

Responde en español, de forma concisa y práctica."""

    elif recommendation_type == "at_risk_alert":
        prompt = f"""Explica brevemente (1-2 oraciones) por qué esta tarea está en riesgo:

Título: {task.get('title')}
Fecha límite: {task.get('due_date')}
Estado: {task.get('status')}
Score de riesgo: {context.get('risk_score', 0):.0%}

Responde en español, de forma concisa y práctica."""

    else:
        return generate_recommendation_reason(task, context.get("score", 0))

    try:
        client = openai.OpenAI(api_key=api_key)

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Eres un asistente de productividad que explica recomendaciones de tareas de forma clara y concisa."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=150
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        frappe.log_error(f"LLM explanation error: {str(e)}", "AI Recommendations")
        # Fallback to template
        return generate_recommendation_reason(task, context.get("score", 0))


def create_recommendation_record(
    user: str,
    recommendation_type: str,
    task_id: Optional[str],
    reason: str,
    confidence_score: float,
    expires_hours: int = 24
) -> str:
    """
    Create a WH AI Recommendation record.

    Args:
        user: User email
        recommendation_type: Type (next_task/priority_change/at_risk_alert/workload_balance)
        task_id: Related task ID (optional)
        reason: Explanation text
        confidence_score: 0.0-1.0
        expires_hours: Hours until expiration

    Returns:
        str: Created recommendation ID
    """
    doc = frappe.new_doc("WH AI Recommendation")
    doc.user = user
    doc.recommendation_type = recommendation_type
    doc.task = task_id
    doc.reason = reason
    doc.confidence_score = confidence_score
    doc.status = "pending"
    doc.expires_at = add_hours_to_now(expires_hours)
    doc.insert(ignore_permissions=True)

    return doc.name


def add_hours_to_now(hours: int) -> datetime:
    """Add hours to current datetime."""
    return get_datetime(now_datetime()) + timedelta(hours=hours)


def update_task_ai_fields(task_id: str):
    """
    Update AI-related fields on a task (duration estimate, risk score).

    Args:
        task_id: Task ID
    """
    task = frappe.get_doc("WH Task", task_id)

    # Update duration estimate
    estimated_duration, confidence = estimate_task_duration(task.as_dict())
    if estimated_duration:
        task.estimated_duration_ai = estimated_duration
        task.duration_confidence = confidence

    # Update risk score
    risk_score = calculate_risk_score(task.as_dict())
    task.risk_score = risk_score

    task.save(ignore_permissions=True)


# Background job functions (called by scheduler)

def aggregate_task_completion_stats():
    """
    Background job to aggregate task completion statistics.
    Run daily to update WH Task Completion Stats.
    """
    # Get all completed tasks from last 90 days
    ninety_days_ago = add_days(nowdate(), -90)

    completed_tasks = frappe.get_all("WH Task",
        filters={
            "status": "DONE",
            "actual_start": ["is", "set"],
            "actual_end": ["is", "set"],
            "modified": [">=", ninety_days_ago]
        },
        fields=[
            "name", "title", "department", "actual_start", "actual_end"
        ]
    )

    # Group by department and task type
    stats_map = {}

    for task in completed_tasks:
        # Calculate duration
        start = get_datetime(task["actual_start"])
        end = get_datetime(task["actual_end"])
        duration_hours = (end - start).total_seconds() / 3600

        # Extract task type from title (simplified)
        keywords = extract_keywords(task["title"])
        task_type = " ".join(keywords[:2]) if len(keywords) >= 2 else task["title"][:30]

        department = task.get("department") or "OPS"
        key = f"{department}:{task_type}"

        if key not in stats_map:
            stats_map[key] = {
                "department": department,
                "task_type": task_type,
                "durations": []
            }

        stats_map[key]["durations"].append(duration_hours)

    # Create or update stats records
    for key, data in stats_map.items():
        durations = data["durations"]

        if len(durations) < 2:  # Need at least 2 samples
            continue

        avg_duration = sum(durations) / len(durations)
        median_duration = sorted(durations)[len(durations) // 2]

        # Check if stats record exists
        existing = frappe.db.get_value("WH Task Completion Stats",
            {
                "department": data["department"],
                "task_type": data["task_type"]
            },
            "name"
        )

        if existing:
            # Update existing
            frappe.db.set_value("WH Task Completion Stats", existing, {
                "avg_duration_hours": avg_duration,
                "median_duration_hours": median_duration,
                "completion_count": len(durations),
                "similar_task_title_pattern": data["task_type"]
            })
        else:
            # Create new
            doc = frappe.new_doc("WH Task Completion Stats")
            doc.department = data["department"]
            doc.task_type = data["task_type"]
            doc.avg_duration_hours = avg_duration
            doc.median_duration_hours = median_duration
            doc.completion_count = len(durations)
            doc.similar_task_title_pattern = data["task_type"]
            doc.insert(ignore_permissions=True)

    frappe.db.commit()


def generate_at_risk_alerts():
    """
    Hourly job to detect at-risk tasks and create alert recommendations.
    Creates both WH AI Recommendation records and WH Notification records.
    """
    # Import notification function
    from workhub_frappe_app.api.notifications import create_notification

    at_risk_tasks = detect_at_risk_tasks(user=None, limit=50)

    for item in at_risk_tasks:
        task = item["task"]

        # Check if alert already exists and is still pending
        existing = frappe.db.exists("WH AI Recommendation", {
            "user": task["assigned_to"],
            "recommendation_type": "at_risk_alert",
            "task": task["name"],
            "status": "pending",
            "expires_at": [">", now_datetime()]
        })

        if existing:
            continue  # Don't create duplicate alerts

        # Create AI recommendation record
        recommendation_id = create_recommendation_record(
            user=task["assigned_to"],
            recommendation_type="at_risk_alert",
            task_id=task["name"],
            reason=item["reason"],
            confidence_score=item["risk_score"],
            expires_hours=48  # Alerts expire in 48 hours
        )

        # Also create a notification for the user
        risk_level = item["risk_level"].upper()
        priority_map = {
            "CRITICAL": "HIGH",
            "HIGH": "HIGH",
            "MEDIUM": "MEDIUM"
        }

        create_notification(
            user=task["assigned_to"],
            notification_type="AI_ALERT",
            title=f"⚠️ Tarea en riesgo [{risk_level}]: {task['title']}",
            message=item["reason"],
            reference_doctype="WH Task",
            reference_name=task["name"],
            priority=priority_map.get(risk_level, "MEDIUM")
        )

    frappe.db.commit()
