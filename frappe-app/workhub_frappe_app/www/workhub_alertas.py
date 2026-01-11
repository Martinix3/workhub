# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import now_datetime, getdate, add_days, formatdate, get_datetime

def get_context(context):
	"""Controller para la página de Alertas"""

	# Verificar autenticación
	if frappe.session.user == "Guest":
		frappe.throw(_("No tienes permisos"), frappe.PermissionError)

	# Pasar roles al template
	context.user_roles = frappe.get_roles()

	# Obtener parámetros de paginación
	page = int(frappe.form_dict.get("page", 1))
	limit = int(frappe.form_dict.get("limit", 50))
	offset = (page - 1) * limit

	# Obtener notificaciones del usuario actual
	user = frappe.session.user

	# Obtener todas las notificaciones (últimos 30 días para limitar volumen)
	cutoff_date = add_days(frappe.utils.nowdate(), -30)

	notifications_raw = frappe.db.sql("""
		SELECT
			name, type, priority, title, message,
			reference_doctype, reference_name, action_url,
			`read` as is_read, created_at, creation
		FROM `tabWH Notification`
		WHERE user = %(user)s
		AND DATE(created_at) >= %(cutoff_date)s
		ORDER BY
			CASE priority
				WHEN 'HIGH' THEN 1
				WHEN 'MEDIUM' THEN 2
				WHEN 'LOW' THEN 3
				ELSE 4
			END,
			created_at DESC
		LIMIT %(limit)s OFFSET %(offset)s
	""", {
		"user": user,
		"cutoff_date": cutoff_date,
		"limit": limit,
		"offset": offset
	}, as_dict=True)

	# Procesar notificaciones y agregar información de agrupación por fecha
	today = getdate()
	yesterday = add_days(today, -1)

	notifications = []
	for notif in notifications_raw:
		# Determinar el grupo de fecha
		notif_date = getdate(notif.created_at)

		if notif_date == today:
			notif['date_group'] = 'today'
			notif['date_label'] = 'Hoy'
		elif notif_date == yesterday:
			notif['date_group'] = 'yesterday'
			notif['date_label'] = 'Ayer'
		else:
			notif['date_group'] = 'earlier'
			notif['date_label'] = 'Anterior'

		# Formatear la hora de creación de manera legible
		if notif.created_at:
			dt = get_datetime(notif.created_at)
			notif['formatted_time'] = dt.strftime('%d/%m/%Y %H:%M')
		else:
			notif['formatted_time'] = '-'

		notifications.append(notif)

	# Agrupar notificaciones por fecha (opcional, para uso futuro)
	grouped_notifications = {
		'today': [],
		'yesterday': [],
		'earlier': []
	}

	for notif in notifications:
		group = notif.get('date_group', 'earlier')
		grouped_notifications[group].append(notif)

	# Obtener estadísticas
	total_count = frappe.db.count("WH Notification", {
		"user": user,
		"created_at": [">=", cutoff_date]
	})

	unread_count = frappe.db.count("WH Notification", {
		"user": user,
		"read": 0
	})

	high_priority_count = frappe.db.count("WH Notification", {
		"user": user,
		"read": 0,
		"priority": "HIGH"
	})

	# Pasar datos al template
	context.notifications = notifications
	context.grouped_notifications = grouped_notifications
	context.total_count = total_count
	context.unread_count = unread_count
	context.high_priority_count = high_priority_count

	# Información de paginación
	context.page = page
	context.limit = limit
	context.has_more = total_count > (offset + limit)

	return context
