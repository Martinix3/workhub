# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe import _
import json

def get_context(context):
	"""Controller para Report Builder - Crear/editar reportes con drag-and-drop"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()

	# Verificar permisos
	if not frappe.has_permission("WH Report Definition", "read"):
		frappe.throw(_("No tienes permisos"), frappe.PermissionError)

	# Determinar si es nuevo o editar
	report_id = frappe.form_dict.get("report")
	is_new = frappe.form_dict.get("new") == "1"

	context.is_new = is_new
	context.report_id = report_id

	# Si es edición, cargar datos del reporte
	if report_id and not is_new:
		try:
			report = frappe.get_doc("WH Report Definition", report_id)

			# Verificar permiso de escritura para editar
			if not frappe.has_permission("WH Report Definition", "write", report):
				frappe.throw(_("No tienes permisos para editar este reporte"), frappe.PermissionError)

			# Obtener secciones ordenadas
			sections = []
			for section in report.sections:
				config = section.config
				# Parse config if string
				if isinstance(config, str):
					try:
						config = json.loads(config)
					except:
						config = {}

				sections.append({
					"name": section.name,
					"section_type": section.section_type,
					"title": section.title,
					"data_source": section.data_source,
					"display_order": section.display_order,
					"is_visible": section.is_visible,
					"config": config
				})

			# Ordenar por display_order
			sections = sorted(sections, key=lambda x: x["display_order"])

			context.report = {
				"name": report.name,
				"title": report.title,
				"description": report.description,
				"report_type": report.report_type,
				"category": report.category,
				"is_active": report.is_active,
				"sections": sections
			}
		except frappe.DoesNotExistError:
			frappe.throw(_("Reporte no encontrado"))
	else:
		# Nuevo reporte - valores por defecto
		context.report = {
			"name": None,
			"title": "",
			"description": "",
			"report_type": "Custom",
			"category": "Custom",
			"is_active": 1,
			"sections": []
		}

	# Tipos de sección disponibles
	context.section_types = [
		{
			"id": "Header",
			"label": "Encabezado",
			"icon": "📋",
			"description": "Título de sección",
			"color": "#6c757d"
		},
		{
			"id": "Text",
			"label": "Texto",
			"icon": "📝",
			"description": "Contenido de texto / comentarios",
			"color": "#17a2b8"
		},
		{
			"id": "KPI",
			"label": "KPI",
			"icon": "📊",
			"description": "Tarjetas de métricas clave",
			"color": "#28a745"
		},
		{
			"id": "Chart",
			"label": "Gráfico",
			"icon": "📈",
			"description": "Gráficos de barras, líneas, circular",
			"color": "#007bff"
		},
		{
			"id": "Table",
			"label": "Tabla",
			"icon": "📑",
			"description": "Tabla de datos detallados",
			"color": "#ffc107"
		}
	]

	# Tipos de gráficos disponibles
	context.chart_types = [
		{"id": "bar", "label": "Barras"},
		{"id": "line", "label": "Líneas"},
		{"id": "pie", "label": "Circular"},
		{"id": "doughnut", "label": "Dona"},
		{"id": "stacked_bar", "label": "Barras Apiladas"}
	]

	# Obtener data sources disponibles
	# (Se cargarán vía API en el cliente para ser más dinámicos)
	context.data_sources = [
		{"id": "tasks", "label": "Tareas"},
		{"id": "projects", "label": "Proyectos"},
		{"id": "team_metrics", "label": "Métricas de Equipo"},
		{"id": "haccp_inspections", "label": "Inspecciones HACCP"},
		{"id": "quality_metrics", "label": "Métricas de Calidad"}
	]

	# Opciones para filtros
	context.report_types = ["Standard", "Custom"]
	context.categories = ["Team", "Project", "HACCP", "Custom"]

	return context
