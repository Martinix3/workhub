# Notifications API
# Sistema de notificaciones y emails

import frappe
from frappe import _
from frappe.utils import nowdate, now_datetime, add_days, getdate
import json

from workhub_frappe_app.api.utils import require_auth


@frappe.whitelist()
def get_notifications(unread_only=False, limit=50):
    """Obtener notificaciones del usuario actual"""
    require_auth()
    user = frappe.session.user

    filters = {"user": user}
    if unread_only:
        filters["read"] = 0

    notifications = frappe.get_all("WH Notification",
        filters=filters,
        fields=["name", "type", "priority", "title", "message",
                "reference_doctype", "reference_name", "action_url",
                "read", "created_at"],
        order_by="created_at desc",
        limit_page_length=int(limit))

    unread_count = frappe.db.count("WH Notification",
        {"user": user, "read": 0})

    return {
        "notifications": notifications,
        "unread_count": unread_count
    }


@frappe.whitelist()
def mark_read(notification_id):
    """Marcar notificacion como leida"""
    require_auth()
    frappe.db.set_value("WH Notification", notification_id, "read", 1)
    return {"success": True}


@frappe.whitelist()
def mark_all_read():
    """Marcar todas las notificaciones como leidas"""
    require_auth()
    user = frappe.session.user

    frappe.db.sql("""
        UPDATE `tabWH Notification`
        SET `read` = 1
        WHERE user = %s AND `read` = 0
    """, (user,))

    return {"success": True}


@frappe.whitelist()
def delete_notification(notification_id):
    """Eliminar una notificacion"""
    require_auth()
    frappe.delete_doc("WH Notification", notification_id, ignore_permissions=True)
    return {"success": True}


@frappe.whitelist()
def clear_old_notifications(days=30):
    """Limpiar notificaciones viejas (leidas)"""
    require_auth()
    user = frappe.session.user
    cutoff = add_days(nowdate(), -days)

    deleted = frappe.db.sql("""
        DELETE FROM `tabWH Notification`
        WHERE user = %s AND `read` = 1 AND created_at < %s
    """, (user, cutoff))

    return {"success": True}


# ========== SCHEDULER FUNCTIONS ==========

def send_daily_emails():
    """Scheduler: Enviar email diario a las 8am"""
    # Obtener usuarios con email diario activado
    # Por ahora, todos los usuarios con tareas asignadas
    users = frappe.db.sql("""
        SELECT DISTINCT assigned_to as user
        FROM `tabWH Task`
        WHERE status NOT IN ('DONE')
    """, as_dict=True)

    for user_row in users:
        user = user_row.get("user")
        if not user or user == "Administrator":
            continue

        user_email = frappe.db.get_value("User", user, "email")
        if not user_email:
            continue

        try:
            _send_daily_digest(user, user_email)
        except Exception as e:
            frappe.log_error(f"Error sending daily email to {user}: {e}")


def _send_daily_digest(user, email):
    """Enviar digest diario a un usuario"""
    today = nowdate()

    # Tareas para hoy
    today_tasks = frappe.get_all("WH Task",
        filters={
            "assigned_to": user,
            "status": ["in", ["DOING", "NEXT"]],
            "due_date": today
        },
        fields=["title", "priority", "project"],
        limit=10)

    # Vencidas
    overdue = frappe.get_all("WH Task",
        filters={
            "assigned_to": user,
            "status": ["not in", ["DONE"]],
            "due_date": ["<", today]
        },
        fields=["title", "priority", "due_date"],
        limit=5)

    # Bloqueadas
    blocked = frappe.get_all("WH Task",
        filters={"assigned_to": user, "status": "BLOCKED"},
        fields=["title", "blocked_reason"],
        limit=5)

    # Si no hay nada relevante, no enviar
    if not today_tasks and not overdue and not blocked:
        return

    # Construir mensaje
    subject = f"Tu dia: {len(today_tasks)} tareas"
    if overdue:
        subject += f" ({len(overdue)} vencidas)"

    message = f"""
    <h2>Buenos dias!</h2>
    <p>Aqui esta tu resumen para hoy:</p>

    <h3>Para Hoy ({len(today_tasks)})</h3>
    <ul>
    {"".join([f"<li><strong>[{t['priority']}]</strong> {t['title']}</li>" for t in today_tasks]) or "<li>No hay tareas para hoy</li>"}
    </ul>
    """

    if overdue:
        message += f"""
        <h3 style="color: red;">Vencidas ({len(overdue)})</h3>
        <ul>
        {"".join([f"<li><strong>{t['title']}</strong> (vencio {t['due_date']})</li>" for t in overdue])}
        </ul>
        """

    if blocked:
        message += f"""
        <h3 style="color: orange;">Bloqueadas ({len(blocked)})</h3>
        <ul>
        {"".join([f"<li>{t['title']} - {t.get('blocked_reason', 'Sin razon')}</li>" for t in blocked])}
        </ul>
        """

    message += """
    <p><a href="/app/wh-task">Ver todas mis tareas</a></p>
    """

    frappe.sendmail(
        recipients=[email],
        subject=subject,
        message=message
    )


def send_overdue_alerts():
    """Scheduler: Alertas de tareas vencidas (cada hora)"""
    today = nowdate()

    # Tareas que acaban de vencer (due_date = ayer y no notificadas)
    newly_overdue = frappe.db.sql("""
        SELECT t.name, t.title, t.assigned_to, t.due_date, t.project
        FROM `tabWH Task` t
        WHERE t.status NOT IN ('DONE')
        AND t.due_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        AND NOT EXISTS (
            SELECT 1 FROM `tabWH Notification` n
            WHERE n.reference_name = t.name
            AND n.type = 'OVERDUE'
            AND DATE(n.created_at) = CURDATE()
        )
    """, as_dict=True)

    for task in newly_overdue:
        create_notification(
            user=task["assigned_to"],
            notification_type="OVERDUE",
            title=f"Tarea vencida: {task['title']}",
            message=f"La tarea '{task['title']}' vencio el {task['due_date']}",
            reference_doctype="WH Task",
            reference_name=task["name"],
            priority="HIGH"
        )


def check_project_health():
    """Scheduler: Verificar salud de proyectos (cada hora)"""
    # Proyectos que cambiaron a RED
    at_risk = frappe.db.sql("""
        SELECT p.name, p.title, p.owner_user, p.health_reason
        FROM `tabWH Project` p
        WHERE p.status = 'ACTIVE' AND p.health = 'RED'
        AND NOT EXISTS (
            SELECT 1 FROM `tabWH Notification` n
            WHERE n.reference_name = p.name
            AND n.type = 'PROJECT_RISK'
            AND DATE(n.created_at) = CURDATE()
        )
    """, as_dict=True)

    for project in at_risk:
        if project.get("owner_user"):
            create_notification(
                user=project["owner_user"],
                notification_type="PROJECT_RISK",
                title=f"Proyecto en riesgo: {project['title']}",
                message=f"El proyecto '{project['title']}' esta en riesgo. Razon: {project.get('health_reason', 'Ver detalles')}",
                reference_doctype="WH Project",
                reference_name=project["name"],
                priority="HIGH"
            )


def notify_blocked_dependencies():
    """Scheduler: Notificar cuando una tarea bloquea a otras (cada hora)"""
    # Tareas que bloquean a otras y llevan mas de 2 dias sin moverse
    blocking_tasks = frappe.db.sql("""
        SELECT DISTINCT
            t.name, t.title, t.assigned_to, t.status,
            COUNT(d.successor) as blocking_count
        FROM `tabWH Task` t
        JOIN `tabWH Task Dependency` d ON d.predecessor = t.name AND d.is_active = 1
        WHERE t.status NOT IN ('DONE')
        AND t.modified < DATE_SUB(NOW(), INTERVAL 2 DAY)
        GROUP BY t.name
        HAVING blocking_count > 0
    """, as_dict=True)

    for task in blocking_tasks:
        # Verificar si ya notificamos esta semana
        existing = frappe.db.exists("WH Notification", {
            "reference_name": task["name"],
            "type": "DEPENDENCY",
            "created_at": [">=", add_days(nowdate(), -7)]
        })

        if not existing:
            create_notification(
                user=task["assigned_to"],
                notification_type="DEPENDENCY",
                title=f"Tarea bloqueando a {task['blocking_count']} otras",
                message=f"Tu tarea '{task['title']}' esta bloqueando a {task['blocking_count']} tareas de otros. Considera priorizarla.",
                reference_doctype="WH Task",
                reference_name=task["name"],
                priority="MEDIUM"
            )


# ========== HELPER FUNCTIONS ==========

def create_notification(user, notification_type, title, message, reference_doctype=None, reference_name=None, priority="MEDIUM", action_url=None):
    """Crear una notificacion"""
    doc = frappe.new_doc("WH Notification")
    doc.user = user
    doc.type = notification_type
    doc.title = title
    doc.message = message
    doc.reference_doctype = reference_doctype
    doc.reference_name = reference_name
    doc.priority = priority
    doc.action_url = action_url
    doc.created_at = now_datetime()
    doc.insert(ignore_permissions=True)
    return doc.name


def notify_task_assigned(task_id, assigned_to, assigned_by=None):
    """Notificar cuando se asigna una tarea"""
    task = frappe.get_doc("WH Task", task_id)

    create_notification(
        user=assigned_to,
        notification_type="TASK_ASSIGNED",
        title=f"Nueva tarea: {task.title}",
        message=f"Te han asignado la tarea '{task.title}'" + (f" por {assigned_by}" if assigned_by else ""),
        reference_doctype="WH Task",
        reference_name=task_id,
        priority="MEDIUM" if task.priority != "P0" else "HIGH"
    )


def notify_task_completed(task_id):
    """Notificar cuando se completa una tarea que bloqueaba otras"""
    task = frappe.get_doc("WH Task", task_id)

    # Encontrar tareas que estaban esperando
    waiting_tasks = frappe.get_all("WH Task Dependency",
        filters={"predecessor": task_id, "is_active": 1},
        fields=["successor"])

    for dep in waiting_tasks:
        successor = frappe.get_doc("WH Task", dep["successor"])
        create_notification(
            user=successor.assigned_to,
            notification_type="COMPLETED",
            title=f"Tarea desbloqueada: {successor.title}",
            message=f"La tarea '{task.title}' se completo. Tu tarea '{successor.title}' ya puede avanzar.",
            reference_doctype="WH Task",
            reference_name=dep["successor"],
            priority="LOW"
        )


def notify_new_message(message_id):
    """Notificar cuando se recibe un nuevo mensaje"""
    message = frappe.get_doc("Distributor Message", message_id)

    # Obtener nombre del remitente
    sender_name = frappe.db.get_value("User", message.sender, "full_name") or message.sender

    # Crear notificación para el receptor
    create_notification(
        user=message.receiver,
        notification_type="NEW_MESSAGE",
        title=f"Nuevo mensaje de {sender_name}",
        message=f"{sender_name}: {message.subject}",
        reference_doctype="Distributor Message",
        reference_name=message_id,
        action_url="/workhub_distribuidores_portal" if is_distributor(message.receiver) else "/workhub_ventas",
        priority="MEDIUM"
    )


def notify_change_request_status(request_id):
    """Notificar cuando cambia el estado de una solicitud de cambio"""
    request = frappe.get_doc("Order Change Request", request_id)

    # Obtener el usuario del distribuidor
    distributor_user = frappe.db.get_value("Customer", request.distributor, "email_id")

    if not distributor_user:
        # Intentar obtener via Portal User
        portal_users = frappe.get_all("Portal User",
            filters={"parent": request.distributor, "parenttype": "Customer"},
            fields=["user"],
            limit=1)
        if portal_users:
            distributor_user = portal_users[0].user

    if not distributor_user:
        return  # No podemos notificar si no hay usuario

    # Mapear estados a mensajes en español
    status_labels = {
        "Pending": "Pendiente",
        "Approved": "Aprobada",
        "Rejected": "Rechazada"
    }

    status_label = status_labels.get(request.status, request.status)

    # Determinar prioridad y mensaje según el estado
    if request.status == "Approved":
        priority = "HIGH"
        title = f"Solicitud aprobada: {request.order_id}"
        message = f"Tu solicitud de cambio para el pedido {request.order_id} ha sido aprobada."
    elif request.status == "Rejected":
        priority = "MEDIUM"
        title = f"Solicitud rechazada: {request.order_id}"
        message = f"Tu solicitud de cambio para el pedido {request.order_id} ha sido rechazada."
    else:
        priority = "LOW"
        title = f"Solicitud actualizada: {request.order_id}"
        message = f"El estado de tu solicitud para {request.order_id} es ahora: {status_label}"

    # Agregar notas de respuesta si existen
    if request.response_notes:
        message += f" Comentario: {request.response_notes}"

    create_notification(
        user=distributor_user,
        notification_type="CHANGE_REQUEST_STATUS",
        title=title,
        message=message,
        reference_doctype="Order Change Request",
        reference_name=request_id,
        action_url="/workhub_distribuidores_portal",
        priority=priority
    )


def on_sales_order_change(doc, method=None):
    """
    Hook para doc_events de Sales Order
    Se ejecuta en on_submit, on_cancel, on_update_after_submit
    """
    try:
        notify_order_status_change(doc.name)
    except Exception as e:
        frappe.log_error(f"Error notificando cambio de estado de pedido {doc.name}: {str(e)}")


def notify_order_status_change(order_id, old_status=None, new_status=None):
    """Notificar cuando cambia el estado de un pedido"""
    order = frappe.get_doc("Sales Order", order_id)

    # Obtener el usuario del distribuidor/cliente
    customer_user = frappe.db.get_value("Customer", order.customer, "email_id")

    if not customer_user:
        # Intentar obtener via Portal User
        portal_users = frappe.get_all("Portal User",
            filters={"parent": order.customer, "parenttype": "Customer"},
            fields=["user"],
            limit=1)
        if portal_users:
            customer_user = portal_users[0].user

    if not customer_user:
        return  # No podemos notificar si no hay usuario

    # Mapear estados a mensajes en español
    status_messages = {
        0: "Borrador",  # Draft
        1: "Confirmado",  # Submitted
        2: "Cancelado"  # Cancelled
    }

    # Determinar el mensaje según el estado del documento
    if order.docstatus == 1:  # Submitted
        if order.status == "Completed":
            title = f"Pedido completado: {order_id}"
            message = f"Tu pedido {order_id} ha sido completado y entregado."
            priority = "LOW"
        elif order.status == "On Hold":
            title = f"Pedido en espera: {order_id}"
            message = f"Tu pedido {order_id} está temporalmente en espera."
            priority = "MEDIUM"
        else:
            title = f"Pedido confirmado: {order_id}"
            message = f"Tu pedido {order_id} ha sido confirmado y está en proceso."
            priority = "MEDIUM"
    elif order.docstatus == 2:  # Cancelled
        title = f"Pedido cancelado: {order_id}"
        message = f"Tu pedido {order_id} ha sido cancelado."
        priority = "HIGH"
    else:  # Draft
        # No notificar borradores
        return

    create_notification(
        user=customer_user,
        notification_type="ORDER_STATUS",
        title=title,
        message=message,
        reference_doctype="Sales Order",
        reference_name=order_id,
        action_url="/workhub_distribuidores_portal",
        priority=priority
    )


def is_distributor(user):
    """Verificar si un usuario es distribuidor"""
    # Buscar si el usuario está vinculado a un Customer del tipo Distribuidor
    customer = frappe.db.exists("Customer", {"email_id": user, "customer_group": "Distribuidor"})
    if customer:
        return True

    # También verificar via Portal User
    portal_user = frappe.get_all("Portal User",
        filters={"user": user, "parenttype": "Customer"},
        fields=["parent"],
        limit=1)

    if portal_user:
        customer_group = frappe.db.get_value("Customer", portal_user[0].parent, "customer_group")
        return customer_group == "Distribuidor"

    return False
