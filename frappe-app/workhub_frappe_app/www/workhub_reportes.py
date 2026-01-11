# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe import _
import json

def get_context(context):
	"""Controller para Reportes - Lista todos los reportes con filtrado"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()

	# Verificar permisos
	if not frappe.has_permission("WH Report Definition", "read"):
		frappe.throw(_("No tienes permisos"), frappe.PermissionError)

	# Obtener parámetros de filtrado desde query string
	search = frappe.form_dict.get("search", "")
	report_type = frappe.form_dict.get("report_type", "")
	category = frappe.form_dict.get("category", "")
	is_active = frappe.form_dict.get("is_active", "")

	# Construir filtros
	filters = {}
	if report_type:
		filters["report_type"] = report_type
	if category:
		filters["category"] = category
	if is_active:
		filters["is_active"] = int(is_active)
	if search:
		filters["title"] = ["like", f"%{search}%"]

	# KPIs básicos
	total_reports = frappe.db.count("WH Report Definition")
	active_reports = frappe.db.count("WH Report Definition", filters={"is_active": 1})
	standard_reports = frappe.db.count("WH Report Definition", filters={"report_type": "Standard"})
	custom_reports = frappe.db.count("WH Report Definition", filters={"report_type": "Custom"})

	context.kpis = {
		"total": total_reports,
		"active": active_reports,
		"standard": standard_reports,
		"custom": custom_reports
	}

	# Obtener reportes recientes del usuario actual
	recent_reports = frappe.get_list(
		"WH Generated Report",
		filters={"generated_by": frappe.session.user},
		fields=["report_definition", "generated_at", "export_format"],
		order_by="generated_at desc",
		limit=5,
		ignore_permissions=True
	)

	# Enriquecer reportes recientes con títulos
	recent_report_ids = list(set([r.report_definition for r in recent_reports if r.report_definition]))
	recent_report_titles = {}
	if recent_report_ids:
		for report_id in recent_report_ids:
			try:
				title = frappe.db.get_value("WH Report Definition", report_id, "title")
				recent_report_titles[report_id] = title
			except:
				recent_report_titles[report_id] = report_id

	for report in recent_reports:
		if report.report_definition:
			report["title"] = recent_report_titles.get(report.report_definition, report.report_definition)

	context.recent_reports = recent_reports

	# Obtener todos los reportes con filtros aplicados
	reports = frappe.get_list(
		"WH Report Definition",
		filters=filters,
		fields=[
			"name", "title", "description", "report_type", "category",
			"is_active", "created_by", "creation", "modified"
		],
		order_by="modified desc",
		limit=50,
		ignore_permissions=True
	)

	# Enriquecer con información del creador y conteo de secciones
	for report in reports:
		if report.get("created_by"):
			user_data = frappe.db.get_value("User", report["created_by"],
				["full_name", "user_image"], as_dict=True)
			if user_data:
				report["created_by_name"] = user_data.full_name or report["created_by"]
				report["created_by_image"] = user_data.user_image
			else:
				report["created_by_name"] = report["created_by"]

		# Contar secciones
		section_count = frappe.db.count("WH Report Section",
			filters={"parent": report["name"]})
		report["section_count"] = section_count

	context.reports = reports

	# Pasar filtros actuales al template para mantener estado
	context.current_filters = {
		"search": search,
		"report_type": report_type,
		"category": category,
		"is_active": is_active
	}

	# Opciones para filtros
	context.report_types = ["Standard", "Custom"]
	context.categories = ["Team", "Project", "HACCP", "Custom"]

	return context
