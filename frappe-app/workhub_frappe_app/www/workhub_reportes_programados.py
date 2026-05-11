# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import now_datetime
import json

def get_context(context):
	"""Controller para Reportes Programados - Lista todos los reportes programados con filtrado"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()

	# Verificar permisos
	if not frappe.has_permission("WH Scheduled Report", "read"):
		frappe.throw(_("No tienes permisos"), frappe.PermissionError)

	# Obtener parámetros de filtrado desde query string
	search = frappe.form_dict.get("search", "")
	schedule_type = frappe.form_dict.get("schedule_type", "")
	export_format = frappe.form_dict.get("export_format", "")
	is_active = frappe.form_dict.get("is_active", "")

	# Construir filtros
	filters = {}
	if schedule_type:
		filters["schedule_type"] = schedule_type
	if export_format:
		filters["export_format"] = export_format
	if is_active:
		filters["is_active"] = int(is_active)
	if search:
		filters["schedule_name"] = ["like", f"%{search}%"]

	# KPIs básicos
	total_schedules = frappe.db.count("WH Scheduled Report")
	active_schedules = frappe.db.count("WH Scheduled Report", filters={"is_active": 1})
	paused_schedules = frappe.db.count("WH Scheduled Report", filters={"is_active": 0})

	# Contar programaciones con última ejecución exitosa
	successful_schedules = frappe.db.count("WH Scheduled Report",
		filters={"last_status": "Success", "is_active": 1})

	context.kpis = {
		"total": total_schedules,
		"active": active_schedules,
		"paused": paused_schedules,
		"successful": successful_schedules
	}

	# Obtener todas las programaciones con filtros aplicados
	schedules = frappe.get_list(
		"WH Scheduled Report",
		filters=filters,
		fields=[
			"name", "schedule_name", "report_definition", "schedule_type",
			"schedule_time", "day_of_week", "day_of_month", "export_format",
			"is_active", "last_run", "next_run", "last_status", "error_log",
			"created_by", "creation", "modified"
		],
		order_by="next_run asc, modified desc",
		limit=100,
		ignore_permissions=True
	)

	# Enriquecer con información adicional
	now = now_datetime()
	for schedule in schedules:
		# Obtener info del reporte
		if schedule.get("report_definition"):
			report_data = frappe.db.get_value("WH Report Definition",
				schedule["report_definition"],
				["title", "category", "is_active"], as_dict=True)
			if report_data:
				schedule["report_title"] = report_data.title
				schedule["report_category"] = report_data.category
				schedule["report_is_active"] = report_data.is_active

		# Obtener info del creador
		if schedule.get("created_by"):
			user_data = frappe.db.get_value("User", schedule["created_by"],
				["full_name", "user_image"], as_dict=True)
			if user_data:
				schedule["created_by_name"] = user_data.full_name
				schedule["created_by_image"] = user_data.user_image

		# Contar destinatarios
		recipient_count = frappe.db.count("WH Scheduled Report Recipient",
			filters={"parent": schedule["name"]})
		schedule["recipient_count"] = recipient_count

		# Contar ejecuciones totales
		execution_count = frappe.db.count("WH Generated Report",
			filters={"scheduled_report": schedule["name"]})
		schedule["execution_count"] = execution_count

		# Contar ejecuciones exitosas y fallidas
		successful_count = frappe.db.count("WH Generated Report",
			filters={"scheduled_report": schedule["name"], "status": "Completed"})
		failed_count = frappe.db.count("WH Generated Report",
			filters={"scheduled_report": schedule["name"], "status": "Failed"})
		schedule["successful_count"] = successful_count
		schedule["failed_count"] = failed_count

		# Formatear descripción del cronograma
		schedule["schedule_description"] = _format_schedule_description(schedule)

		# Calcular si está vencido (next_run pasó y está activo)
		if schedule.get("next_run") and schedule.get("is_active"):
			schedule["is_overdue"] = schedule["next_run"] < now
		else:
			schedule["is_overdue"] = False

	context.schedules = schedules

	# Pasar filtros actuales al template para mantener estado
	context.current_filters = {
		"search": search,
		"schedule_type": schedule_type,
		"export_format": export_format,
		"is_active": is_active
	}

	# Opciones para filtros
	context.schedule_types = ["Daily", "Weekly", "Monthly"]
	context.export_formats = ["PDF", "Excel", "CSV"]

	return context


def _format_schedule_description(schedule):
	"""Formatear descripción legible del cronograma"""
	schedule_type = schedule.get("schedule_type")
	schedule_time = schedule.get("schedule_time", "09:00:00")

	# Extraer hora del schedule_time (puede ser "09:00:00" o solo "09:00")
	if schedule_time:
		time_parts = str(schedule_time).split(":")
		hour = time_parts[0]
		minute = time_parts[1] if len(time_parts) > 1 else "00"
		time_str = f"{hour}:{minute}"
	else:
		time_str = "09:00"

	if schedule_type == "Daily":
		return f"Diario a las {time_str}"
	elif schedule_type == "Weekly":
		day = schedule.get("day_of_week", "Monday")
		day_es = {
			"Monday": "Lunes",
			"Tuesday": "Martes",
			"Wednesday": "Miércoles",
			"Thursday": "Jueves",
			"Friday": "Viernes",
			"Saturday": "Sábado",
			"Sunday": "Domingo"
		}.get(day, day)
		return f"Semanal los {day_es} a las {time_str}"
	elif schedule_type == "Monthly":
		day_num = schedule.get("day_of_month", 1)
		return f"Mensual el día {day_num} a las {time_str}"

	return schedule_type or "No configurado"
