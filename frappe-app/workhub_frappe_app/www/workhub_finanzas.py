# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import flt, today

def get_context(context):
	"""Controller para Dashboard de Finanzas"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()

	# Cuentas por cobrar
	total_receivable = frappe.db.sql("SELECT SUM(outstanding_amount) FROM `tabSales Invoice` WHERE docstatus=1 AND outstanding_amount>0")[0][0] or 0
	overdue_receivable = frappe.db.sql("SELECT SUM(outstanding_amount) FROM `tabSales Invoice` WHERE docstatus=1 AND outstanding_amount>0 AND due_date<%s", (today(),))[0][0] or 0

	# Cuentas por pagar
	total_payable = frappe.db.sql("SELECT SUM(outstanding_amount) FROM `tabPurchase Invoice` WHERE docstatus=1 AND outstanding_amount>0")[0][0] or 0
	overdue_payable = frappe.db.sql("SELECT SUM(outstanding_amount) FROM `tabPurchase Invoice` WHERE docstatus=1 AND outstanding_amount>0 AND due_date<%s", (today(),))[0][0] or 0

	# Cash position
	cash_position = flt(total_receivable) - flt(total_payable)

	context.kpis = {
		"total_receivable": flt(total_receivable),
		"overdue_receivable": flt(overdue_receivable),
		"total_payable": flt(total_payable),
		"overdue_payable": flt(overdue_payable),
		"cash_position": cash_position
	}

	# Facturas vencidas (AR)
	context.overdue_invoices = frappe.db.sql("""
		SELECT name, customer_name, due_date, outstanding_amount
		FROM `tabSales Invoice`
		WHERE docstatus=1 AND outstanding_amount>0 AND due_date<%s
		ORDER BY due_date
		LIMIT 10
	""", (today(),), as_dict=True)

	return context
