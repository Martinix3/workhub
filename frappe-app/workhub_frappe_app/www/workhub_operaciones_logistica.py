# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def get_context(context):
	"""Controller para la página de Logística"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()
	if not frappe.has_permission("Delivery Trip", "read"):
		frappe.throw(_("No tienes permisos"), frappe.PermissionError)

	# Obtener Delivery Trips
	trips = frappe.get_list(
		"Delivery Trip",
		filters={},
		fields=[
			"name", "date", "driver", "vehicle", "status",
			"total_distance", "uom"
		],
		order_by="date desc",
		limit=50
	)

	# Estadísticas
	context.trips = trips
	context.stats = {
		"total_trips": len(trips),
		"in_transit": len([t for t in trips if t.status == "In Transit"]),
		"completed": len([t for t in trips if t.status == "Completed"])
	}

	return context
