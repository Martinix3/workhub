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

def get_user_notification_preferences(user=None):
    """
    Get notification preferences for a user. Creates default preferences if they don't exist.
    Results are cached for performance.

    Args:
        user: User email/name. If None, uses current session user.

    Returns:
        dict: Notification preferences with keys:
            - frequency: 'realtime' | 'daily' | 'weekly' | 'off'
            - quiet_hours_enabled: bool
            - quiet_hours_start: time string (HH:MM:SS)
            - quiet_hours_end: time string (HH:MM:SS)
            - priority_bypass_enabled: bool
            - email_enabled: bool
    """
    if not user:
        user = frappe.session.user

    # Check cache first
    cache_key = f"notification_preferences:{user}"
    cached = frappe.cache().get_value(cache_key)
    if cached:
        return cached

    # Try to get existing preferences
    prefs_name = user  # autoname is by user field

    try:
        prefs = frappe.get_doc("WH Notification Preferences", prefs_name)
    except frappe.DoesNotExistError:
        # Create default preferences
        prefs = frappe.new_doc("WH Notification Preferences")
        prefs.user = user
        prefs.frequency = "daily"
        prefs.email_enabled = 1
        prefs.priority_bypass_enabled = 1
        prefs.quiet_hours_enabled = 0
        prefs.insert(ignore_permissions=True)
        frappe.db.commit()

    # Build response dict
    result = {
        "frequency": prefs.frequency,
        "quiet_hours_enabled": bool(prefs.quiet_hours_enabled),
        "quiet_hours_start": prefs.quiet_hours_start,
        "quiet_hours_end": prefs.quiet_hours_end,
        "priority_bypass_enabled": bool(prefs.priority_bypass_enabled),
        "email_enabled": bool(prefs.email_enabled)
    }

    # Cache for 5 minutes
    frappe.cache().set_value(cache_key, result, expires_in_sec=300)

    return result


def should_notify_immediately(user, task_priority=None):
    """
    Determine if a notification should be sent immediately or queued for digest.

    Decision logic:
    1. If task is P0/P1 and priority_bypass_enabled -> True (bypasses all other settings)
    2. If frequency is 'off' -> False
    3. If frequency is 'realtime':
       - Check quiet hours if enabled
       - Return True if outside quiet hours, False if within
    4. If frequency is 'daily' or 'weekly' -> False (queue for digest)

    Args:
        user: User email/name. If None, uses current session user.
        task_priority: Task priority ('P0', 'P1', 'P2', etc.). If None, priority bypass is not considered.

    Returns:
        bool: True if notification should be sent immediately, False if queued for digest or skipped.
    """
    if not user:
        user = frappe.session.user

    # Get user preferences
    prefs = get_user_notification_preferences(user)

    # Priority bypass: P0/P1 always notify immediately if enabled
    if task_priority in ['P0', 'P1'] and prefs.get('priority_bypass_enabled'):
        return True

    # If frequency is 'off', never notify
    frequency = prefs.get('frequency', 'daily')
    if frequency == 'off':
        return False

    # If frequency is 'daily' or 'weekly', queue for digest
    if frequency in ['daily', 'weekly']:
        return False

    # If frequency is 'realtime', check quiet hours
    if frequency == 'realtime':
        # If quiet hours not enabled, notify immediately
        if not prefs.get('quiet_hours_enabled'):
            return True

        # Check if current time is within quiet hours
        quiet_start = prefs.get('quiet_hours_start')
        quiet_end = prefs.get('quiet_hours_end')

        if not quiet_start or not quiet_end:
            # If quiet hours not properly configured, notify immediately
            return True

        # Get current time in user's timezone
        # TODO: Consider user timezone from User doctype or locale settings
        # For now, use system time
        from datetime import datetime, time
        current_time = datetime.now().time()

        # Parse quiet hours times
        if isinstance(quiet_start, str):
            quiet_start_time = datetime.strptime(quiet_start, '%H:%M:%S').time()
        else:
            quiet_start_time = quiet_start

        if isinstance(quiet_end, str):
            quiet_end_time = datetime.strptime(quiet_end, '%H:%M:%S').time()
        else:
            quiet_end_time = quiet_end

        # Check if current time is within quiet hours
        # Handle case where quiet hours span midnight (e.g., 22:00 to 06:00)
        if quiet_start_time <= quiet_end_time:
            # Normal case: quiet hours within same day (e.g., 09:00 to 17:00)
            is_quiet_time = quiet_start_time <= current_time <= quiet_end_time
        else:
            # Quiet hours span midnight (e.g., 22:00 to 06:00)
            is_quiet_time = current_time >= quiet_start_time or current_time <= quiet_end_time

        # If within quiet hours, don't notify
        if is_quiet_time:
            return False

        # Outside quiet hours, notify immediately
        return True

    # Default: don't notify immediately
    return False


def create_notification(user, notification_type, title, message, reference_doctype=None, reference_name=None, priority="MEDIUM", action_url=None, task_priority=None):
    """
    Create a notification and route it based on user preferences.

    Routing logic:
    - If should_notify_immediately() returns True: creates notification + sends immediate email
    - If should_notify_immediately() returns False: creates notification with queued_for_digest=1
    - If frequency is 'off': creates notification only (in-app)

    Args:
        user: User email/name to notify
        notification_type: Type of notification (TASK_ASSIGNED, OVERDUE, etc.)
        title: Notification title
        message: Notification message
        reference_doctype: Optional reference doctype
        reference_name: Optional reference name
        priority: Notification priority (LOW, MEDIUM, HIGH)
        action_url: Optional URL for action button
        task_priority: Optional task priority (P0, P1, P2) for routing decisions

    Returns:
        str: Name of created notification document
    """
    # Get user preferences to determine routing
    prefs = get_user_notification_preferences(user)

    # Determine if notification should be sent immediately
    notify_now = should_notify_immediately(user, task_priority)

    # Create the notification document
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

    # Set queued_for_digest based on routing decision
    # If notify_now is True, notification is sent immediately (not queued)
    # If notify_now is False, notification is queued for digest
    doc.queued_for_digest = 0 if notify_now else 1

    doc.insert(ignore_permissions=True)

    # Send immediate email if:
    # 1. Routing decision says to notify immediately
    # 2. Email is enabled in user preferences
    if notify_now and prefs.get('email_enabled'):
        try:
            send_immediate_email(user, title, message, action_url, reference_doctype, reference_name)
        except Exception as e:
            # Log error but don't fail notification creation
            frappe.log_error(f"Error sending immediate notification email to {user}: {e}", "Notification Email Error")

    return doc.name


def send_immediate_email(user, title, message, action_url=None, reference_doctype=None, reference_name=None):
    """
    Send an immediate notification email to a user.
    Includes unsubscribe link and notification preferences link.

    Args:
        user: User email/name
        title: Notification title
        message: Notification message
        action_url: Optional URL for action
        reference_doctype: Optional reference doctype
        reference_name: Optional reference name
    """
    # Get user email
    user_email = frappe.db.get_value("User", user, "email")
    if not user_email:
        return

    # Get site URL for absolute links
    site_url = frappe.utils.get_url()

    # Build email content with enhanced styling and required links
    email_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Main Content -->
        <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #1a1a1a; margin-top: 0; margin-bottom: 16px; font-size: 24px; font-weight: 600;">{title}</h2>
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">{message}</p>

            {f'<p style="margin-top: 24px;"><a href="{site_url}{action_url}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">Ver detalles</a></p>' if action_url else ''}
        </div>

        <!-- Footer -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #718096; font-size: 13px; margin: 0 0 12px 0;">
                <a href="{site_url}/app/user-settings/notifications" style="color: #007bff; text-decoration: none;">⚙️ Configurar preferencias de notificaciones</a>
            </p>
            <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                ¿No quieres recibir estos emails?
                <a href="{site_url}/app/user-settings/notifications?tab=notifications" style="color: #007bff; text-decoration: none;">Cancelar suscripción</a>
            </p>
        </div>

        <!-- Branding -->
        <div style="margin-top: 20px; text-align: center;">
            <p style="color: #cbd5e0; font-size: 11px; margin: 0;">
                Enviado por <strong>WorkHub</strong>
            </p>
        </div>
    </div>
    """

    # Send email
    frappe.sendmail(
        recipients=[user_email],
        subject=f"WorkHub: {title}",
        message=email_body
    )


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
