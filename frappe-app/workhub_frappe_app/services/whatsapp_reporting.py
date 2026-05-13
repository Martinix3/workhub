"""Pure parsing helpers for Santa Brisa WhatsApp reporting events.

The Frappe API layer uses these helpers to convert raw WhatsApp collector rows
into Momentum CRM payloads. Keep this module framework-free so it can be tested
without a running bench.
"""

from __future__ import annotations

import re
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Any

TZ = ZoneInfo("Europe/Madrid")
GENERIC_ACCOUNT = "WhatsApp Reporting Santa Brisa"


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").replace("\n", " ").split()).strip()


def source_marker(message_id: str) -> str:
    return f"WhatsApp message ID: {message_id}"


def title_client(value: str) -> str:
    value = clean_text(value)
    value = re.sub(r"^(la|el|los|las)\s+", "", value, flags=re.I)
    value = re.sub(r"[\.,;:!¡¿?]+$", "", value).strip()
    if not value:
        return GENERIC_ACCOUNT
    words = []
    for word in value.split():
        words.append(word.capitalize())
    return " ".join(words)


FIELD_ALIASES = {
    "tipo": "type",
    "cliente": "client",
    "nombre cuenta": "client",
    "cuenta": "client",
    "distribuidor": "distributor",
    "zona": "zone",
    "comercial": "sales_rep",
    "fecha": "date",
    "estado cliente": "account_status",
    "stock": "stock",
    "plv": "plv",
    "activación": "activation",
    "activacion": "activation",
    "producto / cantidad": "products",
    "pedido producto / cantidad": "products",
    "producto": "products",
    "qué pasó": "what_happened",
    "que pasó": "what_happened",
    "que paso": "what_happened",
    "próxima acción": "next_action",
    "proxima acción": "next_action",
    "proxima accion": "next_action",
    "responsable": "responsible",
    "prioridad": "priority",
    "notas adicionales/ contacto": "notes",
    "notas adicionales": "notes",
}

COMMERCIAL_KEYWORDS = [
    "reporte comercial",
    "visita",
    "pedido",
    "reposición",
    "reposicion",
    "activación",
    "activacion",
    "incidencia",
    "seguimiento",
    "llamada",
    "cliente:",
    "nombre cuenta:",
]


def extract_structured_fields(raw_text: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    current_key: str | None = None
    for raw_line in str(raw_text or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if ":" in line:
            label, value = line.split(":", 1)
            normalized = clean_text(label).lower()
            key = FIELD_ALIASES.get(normalized)
            if key:
                fields[key] = clean_text(value)
                current_key = key
                continue
        if current_key and fields.get(current_key):
            fields[current_key] = clean_text(f"{fields[current_key]} {line}")
    return fields


def has_commercial_signal(text: str, has_audio: bool = False) -> bool:
    if has_audio:
        return True
    lower = text.lower()
    return any(keyword in lower for keyword in COMMERCIAL_KEYWORDS)


def is_empty_structured_report(fields: dict[str, str]) -> bool:
    meaningful = [
        fields.get("client"),
        fields.get("what_happened"),
        fields.get("next_action"),
        fields.get("products"),
        fields.get("distributor"),
    ]
    return not any(clean_text(value) for value in meaningful)


def detect_client(text: str, fields: dict[str, str] | None = None) -> str:
    if fields and fields.get("client"):
        return title_client(fields["client"])
    patterns = [
        r"\bvisita\s+a\s+(.+?)(?:\.|,|;|$|\s+todav[ií]a|\s+quieren|\s+pero)",
        r"\bpedido\s+de\s+(.+?)(?:\.|,|;|$|\s+quieren|\s+y\s+que|\s+para)",
        r"\bcliente\s+(.+?)(?:\.|,|;|$|\s+quiere|\s+pide)",
        r"\bpara\s+(.+?)(?:\.|,|;|$|\s+quieren|\s+pide)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.I)
        if match:
            return title_client(match.group(1))
    return GENERIC_ACCOUNT


def detect_kind(text: str, has_audio: bool = False, fields: dict[str, str] | None = None) -> str:
    structured_type = clean_text((fields or {}).get("type")).lower()
    if structured_type:
        if "visita" in structured_type:
            return "Visita"
        if "pedido" in structured_type or "repos" in structured_type:
            return "Pedido"
        if "activ" in structured_type:
            return "Activación"
        if "llamada" in structured_type:
            return "Llamada"
        if "incidencia" in structured_type:
            return "Incidencia"
    lower = text.lower()
    if any(word in lower for word in ["pedido", "piden", "encargo", "cajas", "mandemos", "enviar"]):
        return "Pedido"
    if any(word in lower for word in ["visita", "visitamos"]):
        return "Visita"
    if "llamada" in lower:
        return "Llamada"
    if any(word in lower for word in ["taller", "cóctel", "coctel", "cata", "activación", "activacion"]):
        return "Activación"
    if has_audio:
        return "Audio"
    return "Nota"


def interaction_type_for(kind: str) -> str:
    if kind == "Visita":
        return "Visita"
    if kind == "Llamada":
        return "Llamada"
    if kind in {"Pedido", "Activación", "Audio", "Incidencia"}:
        return "Reunión"
    return "Email"


def detect_sales_channel(text: str, fields: dict[str, str] | None = None) -> str:
    lower = text.lower()
    if clean_text((fields or {}).get("distributor")):
        return "Distribuidor"
    if "catering" in lower:
        return "Catering"
    if any(word in lower for word in ["hotel", "rooftop"]):
        return "Hotel"
    if any(word in lower for word in ["distribuidor", "distribución", "distribucion"]):
        return "Distribuidor"
    return "Horeca"


def detect_products(text: str, fields: dict[str, str] | None = None) -> str:
    field_value = clean_text((fields or {}).get("products"))
    lower = " ".join([text, field_value]).lower()
    products: list[str] = []
    if "santa brisa" in lower:
        products.append("Santa Brisa")
    if "caja" in lower:
        products.append("Cajas")
    if "cubitera" in lower:
        products.append("Cubiteras")
    if "coctel" in lower or "cóctel" in lower:
        products.append("Taller de cócteles")
    if "taller" in lower and "Taller de cócteles" not in products:
        products.append("Taller")
    return ", ".join(products)


def detect_next_action(text: str, has_untranscribed_audio: bool = False, fields: dict[str, str] | None = None) -> str:
    field_action = clean_text((fields or {}).get("next_action"))
    if field_action:
        return field_action[:1].upper() + field_action[1:]
    if has_untranscribed_audio:
        return "Revisar audio de WhatsApp"
    lower = text.lower()
    if "mandemos" in lower or "enviemos" in lower:
        return "Mandar lo solicitado"
    match = re.search(r"quieren que les hagamos\s+(.+?)(?:\.|,|;|$)", text, flags=re.I)
    if match:
        action = re.sub(r"^(un|una)\s+", "", match.group(1).strip(), flags=re.I)
        return "Preparar " + action
    if "taller" in lower:
        return "Proponer fecha y condiciones del taller"
    if "pedido" in lower:
        return "Confirmar pedido y entrega"
    if "todavía tienen producto" in lower or "todavia tienen producto" in lower:
        return "Hacer seguimiento de reposición"
    return "Revisar y decidir siguiente paso"


def detect_priority(text: str, has_untranscribed_audio: bool = False, fields: dict[str, str] | None = None) -> str:
    field_priority = clean_text((fields or {}).get("priority")).lower()
    if field_priority:
        if "alta" in field_priority:
            return "Alta"
        if "media" in field_priority:
            return "Media"
        if "baja" in field_priority:
            return "Baja"
    lower = text.lower()
    if any(word in lower for word in ["urgente", "hoy", "mañana", "pedido", "mandemos", "embajada"]):
        return "Alta"
    if has_untranscribed_audio or any(word in lower for word in ["quieren", "taller", "visita"]):
        return "Media"
    return "Baja"


def datetime_from_event(event: dict[str, Any]) -> str:
    ts = event.get("whatsapp_ts") or event.get("timestamp")
    if ts:
        try:
            return datetime.fromtimestamp(int(ts), TZ).strftime("%Y-%m-%d %H:%M:%S")
        except (TypeError, ValueError, OSError):
            pass
    return datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S")


def parse_reporting_event(event: dict[str, Any]) -> dict[str, Any]:
    message_id = clean_text(event.get("message_id") or event.get("messageId") or event.get("id"))
    raw_body = str(event.get("body") or "")
    body = clean_text(raw_body)
    transcript = clean_text(event.get("transcription_text"))
    text = transcript or body
    fields = extract_structured_fields(raw_body if raw_body else transcript)
    has_audio = bool(event.get("has_media") or event.get("hasMedia")) and (event.get("media_type") or event.get("mediaType")) in {"audio", "ptt"}
    has_untranscribed_audio = has_audio and (not transcript) and text in {"[audio received]", "[ptt received]", ""}

    if fields and is_empty_structured_report(fields):
        return {
            "skip": True,
            "skip_reason": "empty_template",
            "source_message_id": message_id,
            "description": text,
        }
    if not has_commercial_signal(text, has_audio=has_audio):
        return {
            "skip": True,
            "skip_reason": "not_commercial_report",
            "source_message_id": message_id,
            "description": text,
        }

    if has_untranscribed_audio:
        text_for_detection = "Audio pendiente de revisar/transcribir"
        account_name = GENERIC_ACCOUNT
    else:
        structured_bits = " ".join(
            clean_text(fields.get(key))
            for key in ["type", "client", "distributor", "zone", "what_happened", "products", "next_action", "priority"]
            if clean_text(fields.get(key))
        )
        text_for_detection = clean_text(structured_bits or text or "[sin texto]")
        account_name = detect_client(text_for_detection, fields)

    kind = detect_kind(text_for_detection, has_audio=has_audio, fields=fields)
    interaction_type = interaction_type_for(kind)
    products = detect_products(text_for_detection, fields)
    next_action = detect_next_action(text_for_detection, has_untranscribed_audio, fields)
    priority = detect_priority(text_for_detection, has_untranscribed_audio, fields)
    subject_parts = [kind]
    if products:
        subject_parts.append("Activación" if "Taller" in products else products)
    subject = " / ".join(subject_parts) + f" - {account_name}"

    description_lines = [
        text_for_detection,
        "",
        "Origen: WhatsApp Reporting Santa Brisa",
    ]
    if event.get("sender_name") or event.get("senderName"):
        description_lines.append(f"Remitente: {clean_text(event.get('sender_name') or event.get('senderName'))}")
    if message_id:
        description_lines.append(source_marker(message_id))
    if has_audio:
        description_lines.append("Audio: sí")
    if transcript:
        description_lines.append("Transcripción local incluida")

    return {
        "source_message_id": message_id,
        "account_name": account_name,
        "account_type": "Lead",
        "sale_type": "Sell Out",
        "sales_channel": detect_sales_channel(text_for_detection, fields),
        "level": "2" if priority == "Alta" else "1",
        "column": "Pipeline" if next_action and next_action != "Revisar y decidir siguiente paso" else "Backlog",
        "interaction_type": interaction_type,
        "interaction_date": datetime_from_event(event),
        "subject": subject[:140],
        "outcome": "Pendiente",
        "description": "\n".join(description_lines),
        "contact_name": clean_text(event.get("sender_name") or event.get("senderName")),
        "products_or_service": products,
        "next_action": next_action,
        "next_action_date": None,
        "priority": priority,
    }
