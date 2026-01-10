# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt

def get_context(context):
	"""Controller para la página de Clientes"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()
	if not frappe.has_permission("Customer", "read"):
		frappe.throw(_("No tienes permisos para ver clientes"), frappe.PermissionError)

	# Obtener filtros
	customer_group = frappe.form_dict.get("customer_group", "")
	territory = frappe.form_dict.get("territory", "")
	search = frappe.form_dict.get("search", "")

	# Construir filtros
	filters = {"disabled": 0}
	if customer_group:
		filters["customer_group"] = customer_group
	if territory:
		filters["territory"] = territory

	# Obtener clientes
	customers = frappe.get_list(
		"Customer",
		filters=filters,
		fields=[
			"name", "customer_name", "customer_type", "customer_group",
			"territory", "email_id", "mobile_no", "credit_limit",
			"payment_terms", "customer_primary_contact"
		],
		order_by="customer_name",
		limit=100
	)

	# Filtrar por búsqueda si existe
	if search:
		customers = [c for c in customers if search.lower() in c.customer_name.lower() or search.lower() in c.name.lower()]

	# Enriquecer con estadísticas de cada cliente
	for customer in customers:
		customer.stats = get_customer_stats(customer.name)

	# Obtener estadísticas globales
	context.customers = customers
	context.stats = get_global_stats()
	context.customer_groups = get_customer_groups()
	context.territories = get_territories()
	context.current_group = customer_group
	context.current_territory = territory
	context.current_search = search

	return context

def get_customer_stats(customer):
	"""Obtiene estadísticas de un cliente específico"""

	# Total de ventas (Sales Orders)
	total_sales = frappe.db.sql("""
		SELECT
			COUNT(*) as total_orders,
			SUM(grand_total) as total_amount
		FROM `tabSales Order`
		WHERE customer = %s
			AND docstatus = 1
	""", (customer,), as_dict=True)

	# Facturas pendientes de pago
	outstanding = frappe.db.sql("""
		SELECT
			SUM(outstanding_amount) as outstanding
		FROM `tabSales Invoice`
		WHERE customer = %s
			AND docstatus = 1
			AND outstanding_amount > 0
	""", (customer,), as_dict=True)

	# Última orden
	last_order = frappe.db.sql("""
		SELECT
			name,
			transaction_date
		FROM `tabSales Order`
		WHERE customer = %s
			AND docstatus = 1
		ORDER BY transaction_date DESC
		LIMIT 1
	""", (customer,), as_dict=True)

	return {
		"total_orders": int(total_sales[0].total_orders or 0) if total_sales else 0,
		"total_amount": flt(total_sales[0].total_amount or 0) if total_sales else 0,
		"outstanding": flt(outstanding[0].outstanding or 0) if outstanding else 0,
		"last_order_date": last_order[0].transaction_date if last_order else None,
		"last_order_name": last_order[0].name if last_order else None
	}

def get_global_stats():
	"""Obtiene estadísticas globales de clientes"""

	# Total de clientes activos
	total_customers = frappe.db.count("Customer", {"disabled": 0})

	# Clientes con ventas este mes
	from frappe.utils import get_first_day, get_last_day, today
	first_day = get_first_day(today())
	last_day = get_last_day(today())

	active_customers = frappe.db.sql("""
		SELECT COUNT(DISTINCT customer) as count
		FROM `tabSales Order`
		WHERE transaction_date BETWEEN %s AND %s
			AND docstatus = 1
	""", (first_day, last_day))

	# Total pendiente de cobro
	total_outstanding = frappe.db.sql("""
		SELECT SUM(outstanding_amount) as total
		FROM `tabSales Invoice`
		WHERE docstatus = 1
			AND outstanding_amount > 0
	""")

	# Distribuidores vs Clientes Directos
	distributors = frappe.db.count("Customer", {
		"disabled": 0,
		"customer_group": ["like", "%Distribuidor%"]
	})

	return {
		"total_customers": total_customers,
		"active_this_month": int(active_customers[0][0] or 0) if active_customers else 0,
		"total_outstanding": flt(total_outstanding[0][0] or 0) if total_outstanding else 0,
		"distributors": distributors,
		"direct_customers": total_customers - distributors
	}

def get_customer_groups():
	"""Obtiene lista de grupos de clientes"""
	groups = frappe.get_list(
		"Customer Group",
		fields=["name"],
		order_by="name"
	)
	return [g.name for g in groups]

def get_territories():
	"""Obtiene lista de territorios"""
	territories = frappe.get_list(
		"Territory",
		fields=["name"],
		order_by="name"
	)
	return [t.name for t in territories]
