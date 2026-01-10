# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def get_context(context):
	"""Controller para Admin - Reportes"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()
	
	# Verificar permisos
	if not frappe.has_permission("Report", "read"):
		frappe.throw(_("No tienes permisos"), frappe.PermissionError)
	
	# KPIs básicos
	total = frappe.db.count("Report")
	
	context.kpis = {
		"total": total,
		"active": total
	}
	
	# Obtener items
	context.items = frappe.get_list(
		"Report",
		fields=["name", "creation"],
		order_by="creation desc",
		limit=50
	)
	
	return context
