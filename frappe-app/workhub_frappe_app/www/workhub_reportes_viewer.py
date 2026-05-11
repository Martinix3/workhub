# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe import _
import json

def get_context(context):
	"""Controller para Report Viewer - Visualiza reportes con datos reales"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()

	# Verificar permisos
	if not frappe.has_permission("WH Report Definition", "read"):
		frappe.throw(_("No tienes permisos"), frappe.PermissionError)

	# Obtener report_id desde query string
	report_id = frappe.form_dict.get("report")

	if not report_id:
		frappe.throw(_("Report ID is required"))

	try:
		# Cargar definición del reporte
		report_doc = frappe.get_doc("WH Report Definition", report_id)

		# Verificar permiso de lectura
		if not frappe.has_permission("WH Report Definition", "read", report_doc):
			frappe.throw(_("No tienes permisos para ver este reporte"), frappe.PermissionError)

		# Obtener filtros opcionales desde query string (JSON)
		filters = frappe.form_dict.get("filters")
		if filters:
			try:
				filters = json.loads(filters)
			except:
				filters = {}
		else:
			filters = {}

		# Información básica del reporte
		context.report = {
			"id": report_doc.name,
			"title": report_doc.title,
			"description": report_doc.description,
			"report_type": report_doc.report_type,
			"category": report_doc.category,
			"is_active": report_doc.is_active,
		}

		# Obtener creador info
		if report_doc.created_by:
			user_data = frappe.db.get_value("User", report_doc.created_by,
				["full_name", "user_image"], as_dict=True)
			if user_data:
				context.report["created_by"] = report_doc.created_by
				context.report["created_by_name"] = user_data.full_name or report_doc.created_by
				context.report["created_by_image"] = user_data.user_image

		# Contar secciones
		section_count = frappe.db.count("WH Report Section",
			filters={"parent": report_doc.name, "is_visible": 1})
		context.report["section_count"] = section_count

		# Pasar filtros al contexto
		context.filters = json.dumps(filters)

		# Obtener historial reciente de este reporte
		recent_exports = frappe.get_list(
			"WH Generated Report",
			filters={"report_definition": report_id},
			fields=["name", "generated_at", "export_format", "file_url", "generated_by"],
			order_by="generated_at desc",
			limit=5,
			ignore_permissions=True
		)

		# Enriquecer con nombres de usuario
		for export in recent_exports:
			if export.get("generated_by"):
				user_data = frappe.db.get_value("User", export["generated_by"],
					["full_name"], as_dict=True)
				if user_data:
					export["generated_by_name"] = user_data.full_name
				else:
					export["generated_by_name"] = export["generated_by"]

		context.recent_exports = recent_exports

		# Formatos de exportación disponibles
		context.export_formats = [
			{"id": "PDF", "label": "PDF", "description": "Formato ejecutivo para presentaciones"},
			{"id": "Excel", "label": "Excel", "description": "Hoja de cálculo con datos estructurados"},
			{"id": "CSV", "label": "CSV", "description": "Datos en formato de texto plano"}
		]

	except frappe.DoesNotExistError:
		frappe.throw(_("Reporte no encontrado"))

	return context
