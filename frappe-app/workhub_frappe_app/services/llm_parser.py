# LLM Parser Service for Smart Notepad
# Uses GPT-4o-mini to extract entities from natural language

import frappe
from frappe import _
import json
import re


# Prompt template for entity extraction
EXTRACTION_PROMPT = """Eres un asistente que extrae informacion de notas de comerciales de una empresa de vinos y bebidas.

Del siguiente texto, extrae:
1. Nombre del cliente mencionado (bar, restaurante, hotel, distribuidor, etc.)
2. Tipo de actividad (visit/call/email/order/quote)
3. Resultado/sentimiento:
   - "positive" = interesado, quiere informacion, buena recepcion
   - "neutral" = sin decision clara, pendiente
   - "negative" = no interesa, rechazo, ya tiene proveedor
   - "order" = quiere hacer pedido
4. Nivel de interes (1-5, donde 5 es muy interesado)
5. Productos mencionados (si hay)
6. Notas adicionales relevantes

Responde SOLO en JSON valido con este formato exacto:
{
  "customer_name": "nombre del cliente",
  "activity_type": "visit|call|email|order|quote",
  "outcome": "positive|neutral|negative|order",
  "interest_level": 1-5,
  "products": [{"description": "descripcion del producto", "qty": cantidad_numerica}],
  "notes": "notas adicionales"
}

Si no hay productos mencionados, usa "products": []
Si no puedes determinar algo, usa valores por defecto razonables.
"""


def parse_note_with_llm(text: str) -> dict:
    """
    Parse natural language note using GPT-4o-mini.

    Args:
        text: Natural language input from salesperson

    Returns:
        dict with extracted entities
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
        return normalize_llm_response(parsed)

    except json.JSONDecodeError as e:
        frappe.log_error(f"LLM returned invalid JSON: {content}", "Smart Notepad")
        # Return a basic structure for manual completion
        return {
            "customer_name": "",
            "activity_type": "visit",
            "outcome": "neutral",
            "interest_level": 3,
            "products": [],
            "notes": text
        }
    except Exception as e:
        frappe.log_error(f"LLM parsing error: {str(e)}", "Smart Notepad")
        raise


def normalize_llm_response(parsed: dict) -> dict:
    """
    Normalize and validate LLM response to ensure consistent structure.
    """
    # Valid values
    valid_activity_types = ["visit", "call", "email", "order", "quote"]
    valid_outcomes = ["positive", "neutral", "negative", "order"]

    # Normalize activity_type
    activity_type = str(parsed.get("activity_type", "visit")).lower()
    if activity_type not in valid_activity_types:
        # Try to map Spanish to English
        spanish_map = {
            "visita": "visit",
            "llamada": "call",
            "correo": "email",
            "pedido": "order",
            "cotizacion": "quote",
            "cotización": "quote"
        }
        activity_type = spanish_map.get(activity_type, "visit")

    # Normalize outcome
    outcome = str(parsed.get("outcome", "neutral")).lower()
    if outcome not in valid_outcomes:
        outcome = "neutral"

    # Normalize interest level
    try:
        interest_level = int(parsed.get("interest_level", 3))
        interest_level = max(1, min(5, interest_level))  # Clamp to 1-5
    except (ValueError, TypeError):
        interest_level = 3

    # Normalize products
    products = []
    raw_products = parsed.get("products", [])
    if isinstance(raw_products, list):
        for p in raw_products:
            if isinstance(p, dict):
                products.append({
                    "description": str(p.get("description", "")),
                    "qty": float(p.get("qty", 1)) if p.get("qty") else None
                })

    return {
        "customer_name": str(parsed.get("customer_name", "")).strip(),
        "activity_type": activity_type,
        "outcome": outcome,
        "interest_level": interest_level,
        "products": products,
        "notes": str(parsed.get("notes", "")).strip()
    }
