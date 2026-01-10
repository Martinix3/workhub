# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt

def get_context(context):
	"""Controller para la página de Recepciones"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()
	if not frappe.has_permission("Purchase Receipt", "read") and not frappe.has_permission("Delivery Note", "read"):
		frappe.throw(_("No tienes permisos"), frappe.PermissionError)

	# Toggle entre Purchase Receipts (RECEPCIONES de compras) y Delivery Notes (ENVÍOS a clientes)
	view_type = frappe.form_dict.get("view", "receipts")

	if view_type == "receipts":
		context.receipts = frappe.get_list(
			"Purchase Receipt",
			filters={"docstatus": ["in", [0, 1]]},
			fields=[
				"name", "supplier", "supplier_name", "posting_date",
				"status", "grand_total", "currency", "per_billed"
			],
			order_by="posting_date desc",
			limit=50
		)
		context.deliveries = []
	else:
		context.deliveries = frappe.get_list(
			"Delivery Note",
			filters={"docstatus": ["in", [0, 1]]},
			fields=[
				"name", "customer", "customer_name", "posting_date",
				"status", "grand_total", "currency", "per_billed"
			],
			order_by="posting_date desc",
			limit=50
		)
		context.receipts = []

	# Estadísticas
	total_receipts = frappe.db.count("Purchase Receipt", {"docstatus": 1})
	total_deliveries = frappe.db.count("Delivery Note", {"docstatus": 1})

	context.stats = {
		"total_receipts": total_receipts,
		"total_deliveries": total_deliveries
	}
	context.view_type = view_type

	return context
