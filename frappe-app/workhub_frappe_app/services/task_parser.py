# Task Parser Service for Natural Language Task Creation
# Uses GPT-4o-mini to extract task fields from natural language

import frappe
from frappe import _
from frappe.utils import (
    today,
    add_days,
    add_weeks,
    add_months,
    get_last_day,
    getdate,
    now_datetime
)
import json
import re
from datetime import datetime, timedelta
from typing import Optional
from difflib import SequenceMatcher


# Date parsing utilities for natural language dates


def parse_relative_date(date_str: str) -> Optional[str]:
    """
    Parse relative date expressions from natural language in English and Spanish.

    Args:
        date_str: Natural language date string (e.g., "tomorrow", "mañana", "next Friday",
                 "in 2 days", "by end of week", "próximo viernes")

    Returns:
        Date string in YYYY-MM-DD format, or None if cannot be parsed

    Examples:
        >>> parse_relative_date("tomorrow")
        "2026-01-11"
        >>> parse_relative_date("mañana")
        "2026-01-11"
        >>> parse_relative_date("in 3 days")
        "2026-01-13"
        >>> parse_relative_date("next Monday")
        "2026-01-13"
    """
    if not date_str or not isinstance(date_str, str):
        return None

    date_str = date_str.strip().lower()

    # If empty after strip, return None
    if not date_str:
        return None

    # Try to parse as actual date first (YYYY-MM-DD, DD/MM/YYYY, etc.)
    parsed_date = _try_parse_absolute_date(date_str)
    if parsed_date:
        return parsed_date

    # Get today's date
    base_date = getdate(today())

    # === Today / Hoy ===
    if date_str in ["today", "hoy", "today's", "de hoy"]:
        return str(base_date)

    # === Tomorrow / Mañana ===
    if date_str in ["tomorrow", "mañana", "tmrw", "mañana", "manana"]:
        return str(add_days(base_date, 1))

    # === Yesterday / Ayer ===
    if date_str in ["yesterday", "ayer"]:
        return str(add_days(base_date, -1))

    # === Next week / Próxima semana ===
    if re.search(r'(next week|próxima semana|proxima semana|la próxima semana|la proxima semana)', date_str):
        return str(add_weeks(base_date, 1))

    # === This week / Esta semana ===
    if re.search(r'(this week|esta semana)', date_str):
        return str(base_date)

    # === End of week / Fin de semana (Friday) ===
    if re.search(r'(end of week|fin de semana|final de semana|end of the week)', date_str):
        # Find next Friday
        days_until_friday = (4 - base_date.weekday()) % 7
        if days_until_friday == 0:
            days_until_friday = 7  # If today is Friday, go to next Friday
        return str(add_days(base_date, days_until_friday))

    # === In N days / En N días ===
    match = re.search(r'in (\d+) days?|en (\d+) d[ií]as?', date_str)
    if match:
        days = int(match.group(1) or match.group(2))
        return str(add_days(base_date, days))

    # === In N weeks / En N semanas ===
    match = re.search(r'in (\d+) weeks?|en (\d+) semanas?', date_str)
    if match:
        weeks = int(match.group(1) or match.group(2))
        return str(add_weeks(base_date, weeks))

    # === In N months / En N meses ===
    match = re.search(r'in (\d+) months?|en (\d+) meses?', date_str)
    if match:
        months = int(match.group(1) or match.group(2))
        return str(add_months(base_date, months))

    # === Next/This <day of week> / Próximo/Este <día> ===
    weekday_result = _parse_weekday_reference(date_str, base_date)
    if weekday_result:
        return weekday_result

    # === End of month / Fin de mes ===
    if re.search(r'(end of month|fin de mes|final de mes|end of the month)', date_str):
        return str(get_last_day(base_date))

    # === Next month / Próximo mes ===
    if re.search(r'(next month|próximo mes|proximo mes)', date_str):
        return str(add_months(base_date, 1))

    # If we can't parse it, return None
    return None


def _try_parse_absolute_date(date_str: str) -> Optional[str]:
    """
    Try to parse absolute date formats.

    Supports:
    - YYYY-MM-DD
    - DD/MM/YYYY
    - DD-MM-YYYY
    - DD.MM.YYYY

    Returns:
        Date string in YYYY-MM-DD format, or None
    """
    # Try ISO format first (YYYY-MM-DD)
    try:
        parsed = datetime.strptime(date_str, "%Y-%m-%d")
        return parsed.strftime("%Y-%m-%d")
    except ValueError:
        pass

    # Try DD/MM/YYYY
    try:
        parsed = datetime.strptime(date_str, "%d/%m/%Y")
        return parsed.strftime("%Y-%m-%d")
    except ValueError:
        pass

    # Try DD-MM-YYYY
    try:
        parsed = datetime.strptime(date_str, "%d-%m-%Y")
        return parsed.strftime("%Y-%m-%d")
    except ValueError:
        pass

    # Try DD.MM.YYYY
    try:
        parsed = datetime.strptime(date_str, "%d.%m.%Y")
        return parsed.strftime("%Y-%m-%d")
    except ValueError:
        pass

    # Try D/M/YYYY (single digit day/month)
    match = re.match(r'^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$', date_str)
    if match:
        try:
            day, month, year = match.groups()
            parsed = datetime(int(year), int(month), int(day))
            return parsed.strftime("%Y-%m-%d")
        except ValueError:
            pass

    return None


def _parse_weekday_reference(date_str: str, base_date) -> Optional[str]:
    """
    Parse references to specific weekdays (e.g., "next Monday", "próximo viernes").

    Returns:
        Date string in YYYY-MM-DD format, or None
    """
    # Weekday mappings (English and Spanish)
    weekdays = {
        # English
        "monday": 0, "mon": 0,
        "tuesday": 1, "tue": 1, "tues": 1,
        "wednesday": 2, "wed": 2,
        "thursday": 3, "thu": 3, "thur": 3, "thurs": 3,
        "friday": 4, "fri": 4,
        "saturday": 5, "sat": 5,
        "sunday": 6, "sun": 6,
        # Spanish
        "lunes": 0,
        "martes": 1,
        "miércoles": 2, "miercoles": 2,
        "jueves": 3,
        "viernes": 4,
        "sábado": 5, "sabado": 5,
        "domingo": 6
    }

    # Check for "next/this/próximo/este <weekday>"
    for day_name, day_num in weekdays.items():
        # Patterns: "next friday", "próximo viernes", "this monday", "este lunes"
        patterns = [
            rf'(next|próximo|proximo)\s+{day_name}',
            rf'(this|este|esta)\s+{day_name}',
            rf'{day_name}\s+(next|próximo|proximo)',
            # Just the day name alone
            rf'\b{day_name}\b'
        ]

        for pattern in patterns:
            if re.search(pattern, date_str):
                # Determine if we want "next" occurrence or "this week" occurrence
                is_next = bool(re.search(r'(next|próximo|proximo)', date_str))

                current_weekday = base_date.weekday()
                days_ahead = day_num - current_weekday

                if is_next:
                    # "Next Monday" means the Monday of next week
                    if days_ahead <= 0:
                        days_ahead += 7
                else:
                    # "This Monday" or just "Monday" means next occurrence
                    if days_ahead <= 0:
                        days_ahead += 7

                return str(add_days(base_date, days_ahead))

    return None


# Entity matching utilities for user and project resolution


def match_user(name: str, threshold: float = 0.6) -> dict:
    """
    Match user mentions to actual User records using fuzzy matching.

    Args:
        name: User mention extracted from text (e.g., "@Juan", "Juan Lopez", "Maria")
        threshold: Minimum similarity score (0-1) to consider a match

    Returns:
        dict with matched user info or suggestions:
        {
            "matched": bool,
            "user": {"id": str, "full_name": str, "email": str} or None,
            "suggestions": [list of potential matches with scores]
        }

    Examples:
        >>> match_user("Juan")
        {"matched": True, "user": {"id": "juan@example.com", "full_name": "Juan Perez", ...}, ...}
        >>> match_user("Maria Lopez")
        {"matched": True, "user": {"id": "maria.lopez@example.com", "full_name": "Maria Lopez", ...}, ...}
    """
    if not name or not isinstance(name, str) or not name.strip():
        return {
            "matched": False,
            "user": None,
            "suggestions": []
        }

    # Clean the name (remove @ prefix if present)
    name = name.strip()
    if name.startswith("@"):
        name = name[1:].strip()

    if not name:
        return {
            "matched": False,
            "user": None,
            "suggestions": []
        }

    name_lower = name.lower()

    # First try exact match on full_name (case insensitive)
    exact = frappe.db.get_value(
        "User",
        {"full_name": ["like", name]},
        ["name", "full_name", "email", "user_image"],
        as_dict=True
    )

    if exact:
        return {
            "matched": True,
            "user": {
                "id": exact.name,
                "full_name": exact.full_name,
                "email": exact.email or exact.name,
                "user_image": exact.user_image
            },
            "suggestions": []
        }

    # Get active users for fuzzy matching
    # Filter out system users (Administrator, Guest, etc.)
    users = frappe.get_all(
        "User",
        filters={
            "enabled": 1,
            "name": ["not in", ["Administrator", "Guest"]]
        },
        fields=["name", "full_name", "email", "user_image"],
        limit=200,
        order_by="modified desc"
    )

    # Calculate similarity scores
    matches = []
    for user in users:
        if not user.full_name:
            continue

        # Calculate similarity score
        score = _calculate_similarity(name_lower, user.full_name.lower())

        # Also check email prefix (before @)
        if user.email:
            email_prefix = user.email.split("@")[0].lower()
            email_score = _calculate_similarity(name_lower, email_prefix)
            score = max(score, email_score)

        if score >= threshold:
            matches.append({
                "id": user.name,
                "full_name": user.full_name,
                "email": user.email or user.name,
                "user_image": user.user_image,
                "score": score
            })

    # Sort by score descending
    matches.sort(key=lambda x: x["score"], reverse=True)

    if matches:
        # Best match
        best = matches[0]
        return {
            "matched": True,
            "user": {
                "id": best["id"],
                "full_name": best["full_name"],
                "email": best["email"],
                "user_image": best["user_image"]
            },
            "suggestions": matches[:5]  # Top 5 suggestions
        }

    # No match found
    return {
        "matched": False,
        "user": None,
        "suggestions": []
    }


def match_project(hint: str, threshold: float = 0.6) -> dict:
    """
    Match project hints to actual WH Project records using fuzzy matching.

    Args:
        hint: Project hint extracted from text (e.g., "website project", "Marketing campaign", "for client X")
        threshold: Minimum similarity score (0-1) to consider a match

    Returns:
        dict with matched project info or suggestions:
        {
            "matched": bool,
            "project": {"id": str, "title": str, "department": str, "status": str} or None,
            "suggestions": [list of potential matches with scores]
        }

    Examples:
        >>> match_project("website project")
        {"matched": True, "project": {"id": "PROJ-001", "title": "Website Redesign", ...}, ...}
        >>> match_project("marketing campaign")
        {"matched": True, "project": {"id": "PROJ-002", "title": "Q1 Marketing Campaign", ...}, ...}
    """
    if not hint or not isinstance(hint, str) or not hint.strip():
        return {
            "matched": False,
            "project": None,
            "suggestions": []
        }

    hint = hint.strip()
    hint_lower = hint.lower()

    # First try exact match on title (case insensitive)
    exact = frappe.db.get_value(
        "WH Project",
        {"title": ["like", hint]},
        ["name", "title", "description", "department", "status"],
        as_dict=True
    )

    if exact:
        return {
            "matched": True,
            "project": {
                "id": exact.name,
                "title": exact.title,
                "description": exact.description,
                "department": exact.department,
                "status": exact.status
            },
            "suggestions": []
        }

    # Get active projects for fuzzy matching
    # Prioritize ACTIVE projects
    projects = frappe.get_all(
        "WH Project",
        filters={"status": ["in", ["ACTIVE", "PLANNING"]]},
        fields=["name", "title", "description", "department", "status"],
        limit=200,
        order_by="status asc, modified desc"  # ACTIVE first
    )

    # Calculate similarity scores
    matches = []
    for project in projects:
        if not project.title:
            continue

        # Calculate similarity score against title
        title_score = _calculate_similarity(hint_lower, project.title.lower())

        # Also check description if available
        desc_score = 0
        if project.description:
            desc_score = _calculate_similarity(hint_lower, project.description.lower())

        # Use the better of title or description match
        score = max(title_score, desc_score * 0.8)  # Weight description slightly lower

        if score >= threshold:
            matches.append({
                "id": project.name,
                "title": project.title,
                "description": project.description,
                "department": project.department,
                "status": project.status,
                "score": score
            })

    # Sort by score descending
    matches.sort(key=lambda x: x["score"], reverse=True)

    if matches:
        # Best match
        best = matches[0]
        return {
            "matched": True,
            "project": {
                "id": best["id"],
                "title": best["title"],
                "description": best["description"],
                "department": best["department"],
                "status": best["status"]
            },
            "suggestions": matches[:5]  # Top 5 suggestions
        }

    # No match found
    return {
        "matched": False,
        "project": None,
        "suggestions": []
    }


def _calculate_similarity(a: str, b: str) -> float:
    """
    Calculate string similarity using SequenceMatcher.
    Also considers partial matches and word overlap for better matching.

    Args:
        a: First string (normalized to lowercase)
        b: Second string (normalized to lowercase)

    Returns:
        Similarity score between 0 and 1
    """
    # Direct ratio using SequenceMatcher
    ratio = SequenceMatcher(None, a, b).ratio()

    # Check if one string contains the other (substring match)
    if a in b or b in a:
        ratio = max(ratio, 0.8)

    # Check word overlap for multi-word strings
    words_a = set(a.split())
    words_b = set(b.split())

    if words_a and words_b:
        # Calculate Jaccard similarity (intersection over union)
        overlap = len(words_a & words_b) / max(len(words_a), len(words_b))
        # Weight word overlap slightly lower than sequence matching
        ratio = max(ratio, overlap * 0.85)

    return ratio


# Prompt template for task extraction
EXTRACTION_PROMPT = """Eres un asistente que extrae información de tareas descritas en lenguaje natural.

Del siguiente texto, extrae:
1. Título de la tarea (acción principal, breve y clara)
2. Fecha de vencimiento (expresiones relativas como "mañana", "próximo viernes", "en 2 días", "para el viernes", etc. o fechas específicas)
3. Prioridad:
   - "P0" = crítica, urgente, bloqueador
   - "P1" = alta prioridad, importante
   - "P2" = normal, puede esperar
4. Persona asignada (menciones como "@Juan", "Juan Lopez", "para Maria", etc.)
5. Proyecto relacionado (menciones como "proyecto web", "campaña de marketing", "para el cliente X", etc.)
6. Descripción/notas adicionales (contexto, detalles relevantes)

Responde SOLO en JSON válido con este formato exacto:
{
  "title": "título breve de la tarea",
  "due_date": "expresión de fecha relativa o específica",
  "priority": "P0|P1|P2",
  "assignee": "nombre de la persona",
  "project": "nombre o hint del proyecto",
  "description": "descripción o notas adicionales"
}

Si no se menciona algo, usa null para ese campo.
Si no puedes determinar la prioridad, usa "P2" (normal).
Mantén el título breve y accionable (ej: "Llamar a Juan", no "Necesito llamar a Juan").
"""


def parse_task_with_llm(text: str) -> dict:
    """
    Parse natural language task description using GPT-4o-mini.

    Args:
        text: Natural language task input (e.g., "Call Juan about Santiago order by Friday, high priority")

    Returns:
        dict with extracted task fields: title, due_date, priority, assignee, project, description
    """
    import openai

    # Get API key from site config or environment
    api_key = frappe.conf.get("openai_api_key") or frappe.utils.get_site_config().get("openai_api_key")

    if not api_key:
        # Try environment variable
        import os
        api_key = os.environ.get("OPENAI_API_KEY")

    if not api_key:
        frappe.throw(_("OpenAI API key not configured. Set openai_api_key in site_config.json"))

    client = openai.OpenAI(api_key=api_key)

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": EXTRACTION_PROMPT},
                {"role": "user", "content": text}
            ],
            temperature=0.3,  # Lower temperature for more consistent extraction
            max_tokens=500
        )

        content = response.choices[0].message.content.strip()

        # Try to extract JSON from response (in case there's extra text)
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            content = json_match.group()

        parsed = json.loads(content)

        # Validate and normalize response
        return normalize_llm_response(parsed, text)

    except json.JSONDecodeError as e:
        frappe.log_error(f"LLM returned invalid JSON: {content}", "Task Parser")
        # Return a basic structure for manual completion
        return {
            "title": text[:100],  # Use first 100 chars as title fallback
            "due_date": None,
            "priority": "P2",
            "assignee": None,
            "project": None,
            "description": text if len(text) > 100 else None
        }
    except Exception as e:
        frappe.log_error(f"LLM parsing error: {str(e)}", "Task Parser")
        raise


def normalize_llm_response(parsed: dict, original_text: str = "") -> dict:
    """
    Normalize and validate LLM response to ensure consistent structure.

    Args:
        parsed: Raw LLM response dict
        original_text: Original input text for fallback

    Returns:
        Normalized dict with validated task fields
    """
    # Valid priority values
    valid_priorities = ["P0", "P1", "P2"]

    # Normalize priority
    priority = str(parsed.get("priority", "P2")).upper()
    if priority not in valid_priorities:
        # Try to map common variations
        priority_map = {
            "CRITICAL": "P0",
            "CRITICA": "P0",
            "CRÍTICA": "P0",
            "URGENT": "P0",
            "URGENTE": "P0",
            "HIGH": "P1",
            "ALTA": "P1",
            "IMPORTANT": "P1",
            "IMPORTANTE": "P1",
            "NORMAL": "P2",
            "LOW": "P2",
            "BAJA": "P2",
            "0": "P0",
            "1": "P1",
            "2": "P2"
        }
        priority = priority_map.get(priority, "P2")

    # Normalize title - ensure it's not empty
    title = str(parsed.get("title", "")).strip()
    if not title:
        # Use first part of original text as fallback
        title = original_text[:100].strip() or "New Task"

    # Normalize due_date - parse relative dates to actual dates
    due_date = parsed.get("due_date")
    if due_date and not isinstance(due_date, str):
        due_date = str(due_date).strip()
    if due_date and due_date.lower() in ["null", "none", "n/a", ""]:
        due_date = None
    if due_date:
        # Try to parse relative date expression
        parsed_date = parse_relative_date(due_date)
        due_date = parsed_date  # Will be None if parsing failed, which is fine

    # Normalize assignee
    assignee = parsed.get("assignee")
    if assignee and not isinstance(assignee, str):
        assignee = str(assignee).strip()
    if assignee and assignee.lower() in ["null", "none", "n/a", ""]:
        assignee = None
    if assignee:
        assignee = assignee.strip()
        # Remove @ prefix if present
        if assignee.startswith("@"):
            assignee = assignee[1:].strip()

    # Normalize project
    project = parsed.get("project")
    if project and not isinstance(project, str):
        project = str(project).strip()
    if project and project.lower() in ["null", "none", "n/a", ""]:
        project = None
    if project:
        project = project.strip()

    # Normalize description
    description = parsed.get("description")
    if description and not isinstance(description, str):
        description = str(description).strip()
    if description and description.lower() in ["null", "none", "n/a", ""]:
        description = None
    if description:
        description = description.strip()

    return {
        "title": title,
        "due_date": due_date,
        "priority": priority,
        "assignee": assignee,
        "project": project,
        "description": description
    }
