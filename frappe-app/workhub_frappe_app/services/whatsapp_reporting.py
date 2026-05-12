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


def detect_client(text: str) -> str:
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


def detect_kind(text: str, has_audio: bool = False) -> str:
    lower = text.lower()
    if any(word in lower for word in ["pedido", "piden", "encargo", "cajas", "mandemos", "enviar"]):
        return "Pedido"
    if any(word in lower for word in ["visita", "visitamos"]):
        return "Visita"
    if any(word in lower for word in ["taller", "cóctel", "coctel", "cata", "activación", "activacion"]):
        return "Activación"
    if has_audio:
        return "Audio"
    return "Nota"


def interaction_type_for(kind: str) -> str:
    if kind == "Visita":
        return "Visita"
    if kind in {"Pedido", "Activación", "Audio"}:
        return "Reunión"
    return "Email"


def detect_sales_channel(text: str) -> str:
    lower = text.lower()
    if "catering" in lower:
        return "Catering"
    if any(word in lower for word in ["hotel", "rooftop"]):
        return "Hotel"
    if any(word in lower for word in ["distribuidor", "distribución", "distribucion"]):
        return "Distribuidor"
    return "Horeca"


def detect_products(text: str) -> str:
    lower = text.lower()
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


def detect_next_action(text: str, has_untranscribed_audio: bool = False) -> str:
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


def detect_priority(text: str, has_untranscribed_audio: bool = False) -> str:
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
    body = clean_text(event.get("body"))
    transcript = clean_text(event.get("transcription_text"))
    text = transcript or body
    has_audio = bool(event.get("has_media") or event.get("hasMedia")) and (event.get("media_type") or event.get("mediaType")) in {"audio", "ptt"}
    has_untranscribed_audio = has_audio and (not transcript) and text in {"[audio received]", "[ptt received]", ""}

    if has_untranscribed_audio:
        text_for_detection = "Audio pendiente de revisar/transcribir"
        account_name = GENERIC_ACCOUNT
    else:
        text_for_detection = text or "[sin texto]"
        account_name = detect_client(text_for_detection)

    kind = detect_kind(text_for_detection, has_audio=has_audio)
    interaction_type = interaction_type_for(kind)
    products = detect_products(text_for_detection)
    next_action = detect_next_action(text_for_detection, has_untranscribed_audio)
    priority = detect_priority(text_for_detection, has_untranscribed_audio)
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
        "sales_channel": detect_sales_channel(text_for_detection),
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
