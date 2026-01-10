# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt, today, add_days, getdate

def get_context(context):
	"""Controller para la página de Cobros (Cuentas por Cobrar)"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()
	if not frappe.has_permission("Sales Invoice", "read"):
		frappe.throw(_("No tienes permisos para ver facturas"), frappe.PermissionError)

	# Obtener filtros
	status_filter = frappe.form_dict.get("status", "")
	customer_filter = frappe.form_dict.get("customer", "")

	# Construir filtros
	filters = {"docstatus": 1}  # Solo submitted invoices
	if status_filter:
		if status_filter == "overdue":
			filters["due_date"] = ["<", today()]
			filters["outstanding_amount"] = [">", 0]
		elif status_filter == "unpaid":
			filters["outstanding_amount"] = [">", 0]
		elif status_filter == "paid":
			filters["outstanding_amount"] = 0
	if customer_filter:
		filters["customer"] = customer_filter

	# Obtener facturas
	invoices = frappe.get_list(
		"Sales Invoice",
		filters=filters,
		fields=[
			"name", "customer", "customer_name", "posting_date",
			"due_date", "grand_total", "outstanding_amount",
			"status", "currency", "payment_terms_template"
		],
		order_by="posting_date desc",
		limit=100
	)

	# Calcular días de vencimiento
	for invoice in invoices:
		if invoice.outstanding_amount > 0 and invoice.due_date:
			days_overdue = (getdate(today()) - getdate(invoice.due_date)).days
			invoice.days_overdue = days_overdue if days_overdue > 0 else 0
		else:
			invoice.days_overdue = 0

	# Obtener estadísticas
	context.invoices = invoices
	context.stats = get_cobros_stats()
	context.aging = get_aging_analysis()
	context.customers = get_customers_with_outstanding()
	context.current_status = status_filter
	context.current_customer = customer_filter

	return context

def get_cobros_stats():
	"""Obtiene estadísticas de cobros"""

	# Total por cobrar
	total_outstanding = frappe.db.sql("""
		SELECT SUM(outstanding_amount) as total
		FROM `tabSales Invoice`
		WHERE docstatus = 1
			AND outstanding_amount > 0
	""")

	# Vencido
	overdue = frappe.db.sql("""
		SELECT SUM(outstanding_amount) as total
		FROM `tabSales Invoice`
		WHERE docstatus = 1
			AND outstanding_amount > 0
			AND due_date < %s
	""", (today(),))

	# Próximo a vencer (7 días)
	upcoming = frappe.db.sql("""
		SELECT SUM(outstanding_amount) as total
		FROM `tabSales Invoice`
		WHERE docstatus = 1
			AND outstanding_amount > 0
			AND due_date BETWEEN %s AND %s
	""", (today(), add_days(today(), 7)))

	# Cobrado este mes
	from frappe.utils import get_first_day, get_last_day
	first_day = get_first_day(today())
	last_day = get_last_day(today())

	collected_this_month = frappe.db.sql("""
		SELECT SUM(paid_amount) as total
		FROM `tabPayment Entry`
		WHERE docstatus = 1
			AND payment_type = 'Receive'
			AND posting_date BETWEEN %s AND %s
	""", (first_day, last_day))

	# Total de facturas
	total_invoices = frappe.db.count("Sales Invoice", {
		"docstatus": 1,
		"outstanding_amount": [">", 0]
	})

	return {
		"total_outstanding": flt(total_outstanding[0][0] or 0) if total_outstanding else 0,
		"overdue": flt(overdue[0][0] or 0) if overdue else 0,
		"upcoming": flt(upcoming[0][0] or 0) if upcoming else 0,
		"collected_this_month": flt(collected_this_month[0][0] or 0) if collected_this_month else 0,
		"total_invoices": total_invoices
	}

def get_aging_analysis():
	"""Análisis de antigüedad de cuentas por cobrar"""

	aging = {
		"0-30": 0,
		"31-60": 0,
		"61-90": 0,
		"90+": 0
	}

	invoices = frappe.db.sql("""
		SELECT
			name,
			due_date,
			outstanding_amount
		FROM `tabSales Invoice`
		WHERE docstatus = 1
			AND outstanding_amount > 0
	""", as_dict=True)

	for inv in invoices:
		if inv.due_date:
			days_overdue = (getdate(today()) - getdate(inv.due_date)).days
			if days_overdue < 0:
				days_overdue = 0

			if days_overdue <= 30:
				aging["0-30"] += flt(inv.outstanding_amount)
			elif days_overdue <= 60:
				aging["31-60"] += flt(inv.outstanding_amount)
			elif days_overdue <= 90:
				aging["61-90"] += flt(inv.outstanding_amount)
			else:
				aging["90+"] += flt(inv.outstanding_amount)

	return aging

def get_customers_with_outstanding():
	"""Obtiene clientes con saldo pendiente"""
	customers = frappe.db.sql("""
		SELECT DISTINCT customer
		FROM `tabSales Invoice`
		WHERE docstatus = 1
			AND outstanding_amount > 0
		ORDER BY customer
	""")

	return [c[0] for c in customers] if customers else []
