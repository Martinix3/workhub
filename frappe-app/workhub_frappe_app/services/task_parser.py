# Task Parser Service for Natural Language Task Creation
# Uses GPT-4o-mini to extract task fields from natural language

import frappe
from frappe import _
import json
import re


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

    # Normalize due_date - keep as string for now (will be parsed in subtask 1.2)
    due_date = parsed.get("due_date")
    if due_date and not isinstance(due_date, str):
        due_date = str(due_date).strip()
    if due_date and due_date.lower() in ["null", "none", "n/a", ""]:
        due_date = None

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
