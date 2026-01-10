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
