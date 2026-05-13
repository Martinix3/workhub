"""
Gmail API Endpoints
===================
API para interactuar con Gmail desde el frontend.
"""

import frappe
from frappe import _
from workhub_frappe_app.services.google_auth import get_google_auth_service
from workhub_frappe_app.services.email_classifier import classify_email
import requests
import base64
from email.mime.text import MIMEText
import json

@frappe.whitelist()
def get_inbox(page_token=None, max_results=10, query=None):
    """
    Obtener lista de emails del inbox.
    """
    user = frappe.session.user
    service = get_google_auth_service()
    access_token = service.get_valid_access_token(user)
    
    if not access_token:
        frappe.throw(_("Google account not connected or token expired"), exc=frappe.AuthenticationError)
    
    url = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    params = {
        "maxResults": max_results,
        "q": query or "in:inbox",
    }
    if page_token:
        params["pageToken"] = page_token
        
    response = requests.get(
        url,
        headers={"Authorization": f"Bearer {access_token}"},
        params=params,
        timeout=10
    )
    
    if response.status_code != 200:
        frappe.throw(f"Error fetching Gmail: {response.text}")
        
    data = response.json()
    messages = data.get("messages", [])
    result_messages = []
    
    # Obtener detalles básicos de cada mensaje (batch request sería mejor, pero por ahora loop simple)
    # TODO: Implementar batch request para performance
    for msg in messages:
        details = get_message_details_internal(msg["id"], access_token, format="metadata")
        if details:
            result_messages.append(details)
            
    return {
        "messages": result_messages,
        "nextPageToken": data.get("nextPageToken"),
        "resultSizeEstimate": data.get("resultSizeEstimate")
    }

def get_message_details_internal(message_id, access_token, format="full"):
    """Helper interno para obtener detalles."""
    url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}"
    try:
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {access_token}"},
            params={"format": format},
            timeout=5
        )
        
        if response.status_code != 200:
            return None
            
        data = response.json()
        
        headers = {h["name"].lower(): h["value"] for h in data.get("payload", {}).get("headers", [])}
        
        snippet = data.get("snippet", "")
        
        return {
            "id": data["id"],
            "threadId": data["threadId"],
            "snippet": snippet,
            "subject": headers.get("subject", "(No Subject)"),
            "from": headers.get("from", ""),
            "date": headers.get("date", ""),
            "isUnread": "UNREAD" in data.get("labelIds", []),
            "internalDate": data.get("internalDate")
        }
    except Exception:
        return None

@frappe.whitelist()
def get_message_attachments(message_id):
    """
    Obtener lista de adjuntos de un email y descargar su contenido.

    Returns:
        {
            "attachments": [
                {
                    "id": "attachment_id",
                    "filename": "pedido.pdf",
                    "mimeType": "application/pdf",
                    "size": 12345,
                    "data": "base64_encoded_content"
                }
            ]
        }
    """
    user = frappe.session.user
    service = get_google_auth_service()
    access_token = service.get_valid_access_token(user)

    if not access_token:
        frappe.throw(_("Not connected"))

    # Get message with full payload to find attachments
    url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}"
    response = requests.get(
        url,
        headers={"Authorization": f"Bearer {access_token}"},
        params={"format": "full"},
        timeout=15
    )

    if response.status_code != 200:
        frappe.throw("Error fetching message")

    data = response.json()
    payload = data.get("payload", {})

    attachments = []

    def find_attachments(parts, parent_id=None):
        """Recursively find attachments in message parts."""
        for part in parts:
            filename = part.get("filename", "")
            mime_type = part.get("mimeType", "")
            body = part.get("body", {})
            attachment_id = body.get("attachmentId")

            # Check if this part is an attachment
            if filename and attachment_id:
                attachments.append({
                    "id": attachment_id,
                    "filename": filename,
                    "mimeType": mime_type,
                    "size": body.get("size", 0)
                })

            # Recurse into nested parts
            if "parts" in part:
                find_attachments(part["parts"], part.get("partId"))

    # Find all attachments
    if "parts" in payload:
        find_attachments(payload["parts"])

    # Download each attachment's content
    for att in attachments:
        try:
            att_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/attachments/{att['id']}"
            att_response = requests.get(
                att_url,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30
            )

            if att_response.status_code == 200:
                att_data = att_response.json()
                # Gmail returns base64url encoded data, convert to standard base64
                raw_data = att_data.get("data", "")
                # Replace URL-safe characters
                att["data"] = raw_data.replace("-", "+").replace("_", "/")
            else:
                att["data"] = None
                att["error"] = "Failed to download"
        except Exception as e:
            att["data"] = None
            att["error"] = str(e)

    return {"attachments": attachments}


@frappe.whitelist()
def get_message(message_id):
    """
    Obtener contenido completo de un email.
    """
    user = frappe.session.user
    service = get_google_auth_service()
    access_token = service.get_valid_access_token(user)
    
    if not access_token:
        frappe.throw(_("Not connected"))
        
    url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}"
    response = requests.get(
        url,
        headers={"Authorization": f"Bearer {access_token}"},
        params={"format": "full"},
        timeout=10
    )
    
    if response.status_code != 200:
        frappe.throw("Error fetching message")
        
    data = response.json()
    payload = data.get("payload", {})
    headers = {h["name"].lower(): h["value"] for h in payload.get("headers", [])}
    
    # Decodificar body
    body_content = ""
    if "parts" in payload:
        for part in payload["parts"]:
            if part["mimeType"] == "text/plain" and "data" in part["body"]:
                body_content = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8")
                break
            elif part["mimeType"] == "text/html" and "data" in part["body"]:
                # Preferimos HTML si hay, pero por simplicidad de classifier a veces plain es mejor
                # Para visualizar, HTML. Para AI, Plain.
                pass
    elif "body" in payload and "data" in payload["body"]:
        body_content = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8")
        
    return {
        "id": data["id"],
        "threadId": data["threadId"],
        "subject": headers.get("subject"),
        "from": headers.get("from"),
        "to": headers.get("to"),
        "cc": headers.get("cc"),
        "date": headers.get("date"),
        "body": body_content,
        "snippet": data.get("snippet")
    }

@frappe.whitelist()
def send_email(to, subject, body, cc=None, bcc=None, in_reply_to=None):
    """
    Enviar email usando Gmail API.
    """
    user = frappe.session.user
    service = get_google_auth_service()
    access_token = service.get_valid_access_token(user)
    
    if not access_token:
        frappe.throw(_("Not connected"))
        
    message = MIMEText(body)
    message['to'] = to
    if cc: message['cc'] = cc
    if bcc: message['bcc'] = bcc
    message['subject'] = subject
    
    if in_reply_to:
        message['In-Reply-To'] = in_reply_to
        message['References'] = in_reply_to
        
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
    
    url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
    response = requests.post(
        url,
        headers={"Authorization": f"Bearer {access_token}"},
        json={"raw": raw_message}
    )
    
    if response.status_code != 200:
        frappe.throw(f"Error sending email: {response.text}")
        
    return response.json()

@frappe.whitelist()
def classify_message(message_id):
    """
    Clasificar un mensaje existente usando Gemini.
    """
    msg_data = get_message(message_id)

    classification = classify_email(
        subject=msg_data["subject"],
        body=msg_data["body"] or msg_data["snippet"], # Fallback a snippet si body es complejo parsear
        sender=msg_data["from"],
        date=msg_data["date"]
    )

    return classification


# =============================================================================
# ACTIONABLE EMAILS FOR "MI DÍA" (TDAH-FRIENDLY)
# =============================================================================

def extract_sender_name(from_header):
    """Extrae el nombre del remitente del header From."""
    if not from_header:
        return "Desconocido"
    # "Juan Pérez <juan@example.com>" -> "Juan Pérez"
    if "<" in from_header:
        return from_header.split("<")[0].strip().strip('"')
    return from_header.split("@")[0]


@frappe.whitelist()
def get_actionable_emails(max_results=5):
    """
    Obtener emails accionables para Mi Día.
    Solo devuelve emails que:
    1. No han sido descartados
    2. No han sido convertidos a tarea
    3. Son clasificados como HIGH o MEDIUM urgency

    Máximo 5 emails para no abrumar (TDAH-friendly).
    """
    try:
        max_results = int(max_results or 5)
    except (TypeError, ValueError):
        max_results = 5
    max_results = max(1, min(max_results, 10))

    user = frappe.session.user
    service = get_google_auth_service()
    access_token = service.get_valid_access_token(user)

    if not access_token:
        return {"emails": [], "error": "not_connected"}

    # 1. Obtener emails recientes no leídos (últimos 3 días)
    url = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    params = {
        "maxResults": 20,  # Traer más para filtrar
        "q": "in:inbox is:unread newer_than:3d -category:promotions -category:social -category:forums",
    }

    try:
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
            timeout=10
        )

        if response.status_code != 200:
            return {"emails": [], "error": "gmail_error"}

        data = response.json()
        messages = data.get("messages", [])

        if not messages:
            return {"emails": []}

        # 2. Obtener IDs descartados/convertidos
        dismissed_ids = get_dismissed_email_ids(user)
        converted_ids = get_converted_email_ids(user)
        excluded_ids = set(dismissed_ids + converted_ids)

        # 3. Filtrar y obtener detalles
        actionable_emails = []

        for msg in messages:
            if msg["id"] in excluded_ids:
                continue

            if len(actionable_emails) >= max_results:
                break

            # Obtener detalles
            details = get_message_details_internal(msg["id"], access_token, format="metadata")
            if not details:
                continue

            # Clasificar con Gemini
            try:
                # Para Mi Día solo necesitamos snippet, no body completo
                classification = classify_email(
                    subject=details.get("subject", ""),
                    body=details.get("snippet", ""),
                    sender=details.get("from", ""),
                    date=details.get("date", "")
                )

                # Solo incluir HIGH y MEDIUM urgency
                if classification.get("urgency") not in ["HIGH", "MEDIUM"]:
                    continue

                # Solo incluir si es accionable
                suggested = classification.get("suggested_task", {})
                if not suggested.get("is_actionable", False):
                    continue

                actionable_emails.append({
                    "id": details["id"],
                    "threadId": details["threadId"],
                    "from": details["from"],
                    "fromName": extract_sender_name(details["from"]),
                    "subject": details["subject"],
                    "snippet": details["snippet"],
                    "date": details["date"],
                    "classification": classification
                })

            except Exception as e:
                frappe.log_error(
                    message=f"Email ID: {msg['id']}\n{frappe.get_traceback()}",
                    title="Error classifying actionable email",
                )
                continue

        return {"emails": actionable_emails}

    except Exception as e:
        frappe.log_error(
            message=frappe.get_traceback(),
            title="Error in get_actionable_emails",
        )
        return {"emails": [], "error": str(e)}


def get_dismissed_email_ids(user):
    """Obtener IDs de emails descartados por el usuario."""
    try:
        records = frappe.get_all(
            "Email Interaction",
            filters={"user": user, "status": "dismissed"},
            fields=["email_id"]
        )
        return [r.email_id for r in records]
    except Exception:
        # Si la tabla no existe todavía, retornar vacío
        return []


def get_converted_email_ids(user):
    """Obtener IDs de emails ya convertidos a tarea."""
    try:
        records = frappe.get_all(
            "Email Interaction",
            filters={"user": user, "status": "converted"},
            fields=["email_id"]
        )
        return [r.email_id for r in records]
    except Exception:
        return []


@frappe.whitelist()
def dismiss_email(message_id):
    """
    Marcar un email como descartado.
    No volverá a aparecer en Mi Día.
    """
    user = frappe.session.user

    try:
        # Verificar si ya existe
        existing = frappe.get_all(
            "Email Interaction",
            filters={"user": user, "email_id": message_id},
            limit=1
        )

        if existing:
            # Actualizar a dismissed
            frappe.db.set_value("Email Interaction", existing[0].name, "status", "dismissed")
        else:
            # Crear nuevo registro
            doc = frappe.get_doc({
                "doctype": "Email Interaction",
                "user": user,
                "email_id": message_id,
                "status": "dismissed"
            })
            doc.insert(ignore_permissions=True)

        frappe.db.commit()
        return {"success": True}

    except Exception as e:
        frappe.log_error(f"Error dismissing email: {str(e)}")
        return {"success": False, "error": str(e)}


# =============================================================================
# CRM EMAIL HISTORY - Historial de comunicaciones por cliente
# =============================================================================

@frappe.whitelist()
def get_emails_by_customer(customer_email, max_results=50, page_token=None):
    """
    Obtener historial de emails con un cliente específico.

    Busca emails donde el cliente es remitente o destinatario.

    Args:
        customer_email: Email del cliente
        max_results: Máximo de resultados (default 50)
        page_token: Token para paginación

    Returns:
        {
            "emails": [
                {
                    "id": "gmail_message_id",
                    "threadId": "thread_id",
                    "date": "fecha",
                    "from": "remitente",
                    "to": "destinatario",
                    "subject": "asunto",
                    "snippet": "preview",
                    "direction": "inbound" | "outbound",
                    "classification": {...} | null,
                    "linkedTask": "task_id" | null
                }
            ],
            "nextPageToken": "token" | null,
            "totalEstimate": number
        }
    """
    user = frappe.session.user
    service = get_google_auth_service()
    access_token = service.get_valid_access_token(user)

    if not access_token:
        frappe.throw(_("Google account not connected or token expired"), exc=frappe.AuthenticationError)

    if not customer_email:
        frappe.throw(_("Customer email is required"))

    # Limpiar email (quitar espacios, etc)
    customer_email = customer_email.strip().lower()

    # Query para buscar emails del cliente (enviados o recibidos)
    query = f"from:{customer_email} OR to:{customer_email}"

    url = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    params = {
        "maxResults": min(int(max_results), 100),  # Cap en 100
        "q": query,
    }
    if page_token:
        params["pageToken"] = page_token

    try:
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
            timeout=15
        )

        if response.status_code != 200:
            frappe.throw(f"Error fetching Gmail: {response.text}")

        data = response.json()
        messages = data.get("messages", [])

        if not messages:
            return {
                "emails": [],
                "nextPageToken": None,
                "totalEstimate": 0
            }

        # Obtener IDs de emails convertidos a tarea
        converted_map = get_converted_emails_task_map(user)

        # Obtener detalles de cada mensaje
        result_emails = []

        for msg in messages:
            details = get_message_details_internal(msg["id"], access_token, format="metadata")
            if not details:
                continue

            # Determinar dirección (inbound/outbound)
            from_email = extract_email_address(details.get("from", ""))
            direction = "inbound" if from_email.lower() == customer_email else "outbound"

            # Verificar si tiene tarea vinculada
            linked_task = converted_map.get(msg["id"])

            result_emails.append({
                "id": details["id"],
                "threadId": details["threadId"],
                "date": details["date"],
                "from": details["from"],
                "to": details.get("to", ""),
                "subject": details["subject"],
                "snippet": details["snippet"],
                "direction": direction,
                "isUnread": details.get("isUnread", False),
                "linkedTask": linked_task,
                "classification": None  # Se puede clasificar on-demand
            })

        return {
            "emails": result_emails,
            "nextPageToken": data.get("nextPageToken"),
            "totalEstimate": data.get("resultSizeEstimate", len(result_emails))
        }

    except Exception as e:
        frappe.log_error(f"Error in get_emails_by_customer: {str(e)}")
        frappe.throw(f"Error fetching customer emails: {str(e)}")


def extract_email_address(from_header):
    """Extrae solo el email del header From."""
    if not from_header:
        return ""
    # "Juan Pérez <juan@example.com>" -> "juan@example.com"
    if "<" in from_header and ">" in from_header:
        start = from_header.index("<") + 1
        end = from_header.index(">")
        return from_header[start:end].strip()
    return from_header.strip()


def get_converted_emails_task_map(user):
    """Obtener mapa de email_id -> task_id para emails convertidos."""
    try:
        records = frappe.get_all(
            "Email Interaction",
            filters={"user": user, "status": "converted"},
            fields=["email_id", "task_created"]
        )
        return {r.email_id: r.task_created for r in records if r.task_created}
    except Exception:
        return {}


@frappe.whitelist()
def classify_customer_email(message_id):
    """
    Clasificar un email específico del historial de cliente.
    Útil para clasificación on-demand cuando se expande un email.
    """
    return classify_message(message_id)


@frappe.whitelist()
def convert_email_to_task(message_id, task_overrides=None):
    """
    Crear una tarea desde un email clasificado.

    Args:
        message_id: ID del email en Gmail
        task_overrides: dict opcional con overrides para la tarea
            - title: string
            - priority: P0/P1/P2
            - description: string
            - due_date: string
    """
    from workhub_frappe_app.api.tasks import create_task

    user = frappe.session.user

    if isinstance(task_overrides, str):
        task_overrides = json.loads(task_overrides) if task_overrides else {}

    try:
        # 1. Obtener el email y su clasificación
        msg_data = get_message(message_id)
        classification = classify_email(
            subject=msg_data["subject"],
            body=msg_data["body"] or msg_data["snippet"],
            sender=msg_data["from"],
            date=msg_data["date"]
        )

        suggested = classification.get("suggested_task", {})

        # 2. Construir datos de la tarea
        urgency_to_priority = {"HIGH": "P0", "MEDIUM": "P1", "LOW": "P2"}

        task_data = {
            "title": task_overrides.get("title") or suggested.get("title") or msg_data["subject"],
            "priority": task_overrides.get("priority") or urgency_to_priority.get(classification.get("urgency"), "P2"),
            "description": task_overrides.get("description") or f"Re: {msg_data['subject']}\n\n{suggested.get('description', msg_data['snippet'])}",
            "due_date": task_overrides.get("due_date") or suggested.get("due_date"),
            "status": "NEXT",
            # Vincular al email
            "source_type": "Email",
            "source_id": message_id,
        }

        # 3. Crear la tarea
        task = create_task(**task_data)

        # 4. Marcar email como convertido
        existing = frappe.get_all(
            "Email Interaction",
            filters={"user": user, "email_id": message_id},
            limit=1
        )

        if existing:
            frappe.db.set_value("Email Interaction", existing[0].name, {
                "status": "converted",
                "task_created": task.get("name")
            })
        else:
            doc = frappe.get_doc({
                "doctype": "Email Interaction",
                "user": user,
                "email_id": message_id,
                "status": "converted",
                "task_created": task.get("name")
            })
            doc.insert(ignore_permissions=True)

        frappe.db.commit()

        return {
            "success": True,
            "task": task
        }

    except Exception as e:
        frappe.log_error(f"Error converting email to task: {str(e)}")
        return {"success": False, "error": str(e)}


# =============================================================================
# MOMENTUM CRM - Email Integration for Timeline & Actions
# =============================================================================

@frappe.whitelist()
def get_customer_emails_for_timeline(customer_email, customer_name=None, max_results=10):
    """
    Obtener emails de un cliente con resúmenes para el Timeline de Momentum.

    Devuelve emails resumidos por Gemini, listos para mostrar en timeline.

    Args:
        customer_email: Email del cliente
        customer_name: Nombre del cliente (para contexto de Gemini)
        max_results: Máximo de emails (default 10)

    Returns:
        {
            "emails": [
                {
                    "id": "gmail_id",
                    "date": "2026-01-28",
                    "direction": "inbound" | "outbound",
                    "subject": "Asunto",
                    "summary": "Resumen breve de Gemini",
                    "sentiment": "positive" | "neutral" | "negative",
                    "hasActionItem": true/false
                }
            ],
            "stats": {
                "total": 25,
                "lastContact": "2026-01-25",
                "responseRate": 0.85
            }
        }
    """
    from workhub_frappe_app.services.gemini import GeminiService

    user = frappe.session.user
    service = get_google_auth_service()
    access_token = service.get_valid_access_token(user)

    if not access_token:
        return {"emails": [], "stats": None, "error": "not_connected"}

    if not customer_email:
        return {"emails": [], "stats": None, "error": "no_email"}

    customer_email = customer_email.strip().lower()

    # Query Gmail
    query = f"from:{customer_email} OR to:{customer_email}"
    url = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    params = {
        "maxResults": min(int(max_results), 20),
        "q": query,
    }

    try:
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
            timeout=15
        )

        if response.status_code != 200:
            return {"emails": [], "stats": None, "error": "gmail_error"}

        data = response.json()
        messages = data.get("messages", [])

        if not messages:
            return {"emails": [], "stats": {"total": 0, "lastContact": None}}

        # Obtener detalles y crear batch de textos para Gemini
        email_details = []
        for msg in messages[:max_results]:
            details = get_message_details_internal(msg["id"], access_token, format="metadata")
            if details:
                from_email = extract_email_address(details.get("from", ""))
                direction = "inbound" if from_email.lower() == customer_email else "outbound"
                email_details.append({
                    "id": details["id"],
                    "threadId": details["threadId"],
                    "date": details["date"],
                    "subject": details["subject"],
                    "snippet": details["snippet"],
                    "direction": direction
                })

        # Resumir con Gemini (batch)
        if email_details:
            gemini = GeminiService()
            summarized = _summarize_emails_batch(gemini, email_details, customer_name)
        else:
            summarized = []

        # Stats
        total_estimate = data.get("resultSizeEstimate", len(email_details))
        last_contact = email_details[0]["date"] if email_details else None

        # Calcular response rate aproximado
        inbound = sum(1 for e in email_details if e["direction"] == "inbound")
        outbound = sum(1 for e in email_details if e["direction"] == "outbound")
        response_rate = outbound / inbound if inbound > 0 else 0

        return {
            "emails": summarized,
            "stats": {
                "total": total_estimate,
                "lastContact": last_contact,
                "responseRate": round(response_rate, 2),
                "inbound": inbound,
                "outbound": outbound
            }
        }

    except Exception as e:
        frappe.log_error(f"Error in get_customer_emails_for_timeline: {str(e)}")
        return {"emails": [], "stats": None, "error": str(e)}


def _summarize_emails_batch(gemini, emails, customer_name=None):
    """
    Resumir múltiples emails en una sola llamada a Gemini.
    """
    if not emails:
        return []

    # Preparar contexto para Gemini
    emails_text = ""
    for i, email in enumerate(emails):
        direction_label = "📥 Recibido" if email["direction"] == "inbound" else "📤 Enviado"
        emails_text += f"""
---
Email {i+1}:
{direction_label}
Fecha: {email['date']}
Asunto: {email['subject']}
Preview: {email['snippet']}
---
"""

    prompt = f"""
ACT AS: CRM Email Analyst for Santa Brisa.
CUSTOMER: {customer_name or 'Cliente'}

TASK: Analyze these emails and provide a brief summary for each one.
The summaries will appear in a CRM timeline, so they should be:
- Very brief (max 15 words)
- Action-oriented
- In Spanish

OUTPUT: JSON array only, one object per email in same order.

JSON SCHEMA for each email:
{{
    "summary": "Brief action-oriented summary in Spanish",
    "sentiment": "positive" | "neutral" | "negative",
    "hasActionItem": true if requires follow-up action
}}

EMAILS:
{emails_text}
"""

    try:
        response_text = gemini.generate(prompt)
        # Limpiar markdown
        cleaned = response_text.replace("```json", "").replace("```", "").strip()

        # Parse JSON
        summaries = json.loads(cleaned)

        # Merge con datos originales
        result = []
        for i, email in enumerate(emails):
            summary_data = summaries[i] if i < len(summaries) else {}
            result.append({
                "id": email["id"],
                "threadId": email["threadId"],
                "date": email["date"],
                "direction": email["direction"],
                "subject": email["subject"],
                "summary": summary_data.get("summary", email["snippet"][:50]),
                "sentiment": summary_data.get("sentiment", "neutral"),
                "hasActionItem": summary_data.get("hasActionItem", False)
            })

        return result

    except Exception as e:
        frappe.log_error(f"Error summarizing emails: {str(e)}")
        # Fallback: devolver sin resumen AI
        return [{
            "id": email["id"],
            "threadId": email["threadId"],
            "date": email["date"],
            "direction": email["direction"],
            "subject": email["subject"],
            "summary": email["snippet"][:60] + "...",
            "sentiment": "neutral",
            "hasActionItem": False
        } for email in emails]


@frappe.whitelist()
def suggest_next_email(customer_email, customer_name=None, account_stage=None, last_interaction=None):
    """
    Generar sugerencia de próximo email para un cliente usando Gemini.

    Args:
        customer_email: Email del cliente
        customer_name: Nombre del cliente
        account_stage: Etapa en Momentum (Cold, Warm, Hot, Won, Lost)
        last_interaction: Descripción de última interacción

    Returns:
        {
            "subject": "Asunto sugerido",
            "body": "Cuerpo del email sugerido",
            "tone": "formal" | "friendly" | "urgent",
            "callToAction": "Próximo paso sugerido"
        }
    """
    from workhub_frappe_app.services.gemini import GeminiService

    user = frappe.session.user
    service = get_google_auth_service()
    access_token = service.get_valid_access_token(user)

    # Obtener contexto de emails anteriores
    recent_context = ""
    if access_token and customer_email:
        try:
            query = f"from:{customer_email} OR to:{customer_email}"
            url = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
            response = requests.get(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                params={"maxResults": 3, "q": query},
                timeout=10
            )
            if response.status_code == 200:
                messages = response.json().get("messages", [])
                for msg in messages[:2]:
                    details = get_message_details_internal(msg["id"], access_token, format="metadata")
                    if details:
                        direction = "Recibido" if customer_email in details.get("from", "").lower() else "Enviado"
                        recent_context += f"- {direction}: {details['subject']} ({details['snippet'][:80]}...)\n"
        except Exception:
            pass

    # Generar sugerencia con Gemini
    gemini = GeminiService()

    stage_context = {
        "Cold": "Primera toma de contacto, presentar propuesta de valor",
        "Warm": "Ya hay interés, profundizar en necesidades",
        "Hot": "Negociación activa, cerrar detalles",
        "Won": "Post-venta, agradecer y fidelizar",
        "Lost": "Recuperación, ofrecer nueva propuesta"
    }

    prompt = f"""
ACT AS: Sales Email Writer for Santa Brisa (premium gourmet products company).

CUSTOMER: {customer_name or 'Cliente'}
EMAIL: {customer_email}
STAGE: {account_stage or 'Unknown'} - {stage_context.get(account_stage, '')}
LAST INTERACTION: {last_interaction or 'No registrada'}

RECENT EMAIL HISTORY:
{recent_context or 'Sin historial previo'}

TASK: Generate a follow-up email suggestion in Spanish.
The email should be professional but warm, aligned with Santa Brisa's premium brand.

OUTPUT: JSON only.

JSON SCHEMA:
{{
    "subject": "Email subject line",
    "body": "Email body with proper greeting and sign-off placeholder",
    "tone": "formal" | "friendly" | "urgent",
    "callToAction": "Specific next step you're asking for"
}}
"""

    try:
        response_text = gemini.generate(prompt)
        cleaned = response_text.replace("```json", "").replace("```", "").strip()
        suggestion = json.loads(cleaned)

        return {
            "success": True,
            "suggestion": suggestion
        }

    except Exception as e:
        frappe.log_error(f"Error suggesting email: {str(e)}")
        # Fallback genérico
        return {
            "success": True,
            "suggestion": {
                "subject": f"Seguimiento - Santa Brisa",
                "body": f"Hola {customer_name or ''},\n\nEspero que estés muy bien. Quería dar seguimiento a nuestra última conversación.\n\n¿Tienes unos minutos esta semana para hablar?\n\nSaludos cordiales,\n[Tu nombre]",
                "tone": "friendly",
                "callToAction": "Agendar llamada"
            }
        }
