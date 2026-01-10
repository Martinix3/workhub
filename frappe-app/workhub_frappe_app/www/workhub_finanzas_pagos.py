# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt, today, add_days

def get_context(context):
	"""Controller para la página de Pagos (Cuentas por Pagar)"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()
	if not frappe.has_permission("Purchase Invoice", "read"):
		frappe.throw(_("No tienes permisos para ver facturas de compra"), frappe.PermissionError)

	# Filtros
	status_filter = frappe.form_dict.get("status", "")
	filters = {"docstatus": 1}

	if status_filter == "unpaid":
		filters["outstanding_amount"] = [">", 0]
	elif status_filter == "paid":
		filters["outstanding_amount"] = 0

	# Obtener facturas de compra
	invoices = frappe.get_list(
		"Purchase Invoice",
		filters=filters,
		fields=[
			"name", "supplier", "supplier_name", "posting_date",
			"due_date", "grand_total", "outstanding_amount",
			"status", "currency", "bill_no"
		],
		order_by="posting_date desc",
		limit=100
	)

	# Estadísticas
	total_payable = frappe.db.sql("SELECT SUM(outstanding_amount) FROM `tabPurchase Invoice` WHERE docstatus=1 AND outstanding_amount>0")[0][0] or 0
	overdue = frappe.db.sql("SELECT SUM(outstanding_amount) FROM `tabPurchase Invoice` WHERE docstatus=1 AND outstanding_amount>0 AND due_date<%s", (today(),))[0][0] or 0

	context.invoices = invoices
	context.stats = {
		"total_payable": flt(total_payable),
		"overdue": flt(overdue),
		"total_invoices": len([i for i in invoices if i.outstanding_amount > 0])
	}
	context.current_status = status_filter

	return context
