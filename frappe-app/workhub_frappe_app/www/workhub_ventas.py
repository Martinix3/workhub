# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import flt, today, get_first_day, get_last_day, add_months

def get_context(context):
	"""Controller para Dashboard de Ventas"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()

	# KPIs principales
	context.kpis = get_sales_kpis()

	# Top clientes del mes
	context.top_customers = get_top_customers()

	# Órdenes recientes
	context.recent_orders = get_recent_orders()

	# Pipeline summary
	context.pipeline = get_pipeline_summary()

	# Tendencia mensual (últimos 6 meses)
	context.monthly_trend = get_monthly_trend()

	return context

def get_sales_kpis():
	"""KPIs principales de ventas"""
	first_day = get_first_day(today())
	last_day = get_last_day(today())

	# Ventas del mes (Sales Orders submitted)
	sales_this_month = frappe.db.sql("""
		SELECT
			COUNT(*) as total_orders,
			SUM(grand_total) as total_amount
		FROM `tabSales Order`
		WHERE transaction_date BETWEEN %s AND %s
			AND docstatus = 1
	""", (first_day, last_day), as_dict=True)[0]

	# Ventas del mes anterior para comparación
	prev_first = get_first_day(add_months(today(), -1))
	prev_last = get_last_day(add_months(today(), -1))

	prev_sales = frappe.db.sql("""
		SELECT SUM(grand_total) as total
		FROM `tabSales Order`
		WHERE transaction_date BETWEEN %s AND %s
			AND docstatus = 1
	""", (prev_first, prev_last))[0][0] or 0

	# Clientes activos este mes
	active_customers = frappe.db.sql("""
		SELECT COUNT(DISTINCT customer) as count
		FROM `tabSales Order`
		WHERE transaction_date BETWEEN %s AND %s
			AND docstatus = 1
	""", (first_day, last_day))[0][0] or 0

	# Pedidos pendientes
	pending_orders = frappe.db.count("Sales Order", {
		"docstatus": 1,
		"status": ["not in", ["Completed", "Cancelled"]]
	})

	# Pipeline value
	pipeline_value = frappe.db.sql("""
		SELECT SUM(opportunity_amount) as total
		FROM `tabOpportunity`
		WHERE status NOT IN ('Lost', 'Closed')
	""")[0][0] or 0

	# Calcular crecimiento
	current = flt(sales_this_month.total_amount or 0)
	growth = 0
	if prev_sales > 0:
		growth = ((current - prev_sales) / prev_sales) * 100

	return {
		"sales_this_month": current,
		"total_orders": sales_this_month.total_orders or 0,
		"growth_percent": growth,
		"active_customers": active_customers,
		"pending_orders": pending_orders,
		"pipeline_value": flt(pipeline_value)
	}

def get_top_customers():
	"""Top 5 clientes del mes por volumen"""
	first_day = get_first_day(today())
	last_day = get_last_day(today())

	customers = frappe.db.sql("""
		SELECT
			customer,
			customer_name,
			COUNT(*) as orders,
			SUM(grand_total) as total
		FROM `tabSales Order`
		WHERE transaction_date BETWEEN %s AND %s
			AND docstatus = 1
		GROUP BY customer
		ORDER BY total DESC
		LIMIT 5
	""", (first_day, last_day), as_dict=True)

	return customers

def get_recent_orders():
	"""Últimas 10 órdenes"""
	orders = frappe.get_list(
		"Sales Order",
		filters={"docstatus": 1},
		fields=["name", "customer_name", "transaction_date", "grand_total", "status"],
		order_by="transaction_date desc",
		limit=10
	)
	return orders

def get_pipeline_summary():
	"""Resumen del pipeline"""
	total_opps = frappe.db.count("Opportunity", {"status": ["not in", ["Lost", "Closed"]]})
	total_leads = frappe.db.count("Lead", {"status": ["!=", "Converted"]})

	return {
		"opportunities": total_opps,
		"leads": total_leads
	}

def get_monthly_trend():
	"""Tendencia de ventas últimos 6 meses"""
	months = []
	for i in range(5, -1, -1):
		month_date = add_months(today(), -i)
		first = get_first_day(month_date)
		last = get_last_day(month_date)

		total = frappe.db.sql("""
			SELECT SUM(grand_total) as total
			FROM `tabSales Order`
			WHERE transaction_date BETWEEN %s AND %s
				AND docstatus = 1
		""", (first, last))[0][0] or 0

		months.append({
			"month": first.strftime("%b %Y"),
			"total": flt(total)
		})

	return months
