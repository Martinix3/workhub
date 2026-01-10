# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import flt

def get_context(context):
	"""Controller para Dashboard de Distribuidores"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()

	# Total distribuidores
	total_distributors = frappe.db.count("Customer", {
		"disabled": 0,
		"customer_group": ["like", "%Distribuidor%"]
	})

	# SELL IN total
	total_sell_in = frappe.db.sql("""
		SELECT SUM(dni.qty) as qty, SUM(dni.amount) as amount
		FROM `tabDelivery Note Item` dni
		INNER JOIN `tabDelivery Note` dn ON dni.parent = dn.name
		INNER JOIN `tabCustomer` c ON dn.customer = c.name
		WHERE dn.docstatus = 1 AND c.customer_group LIKE '%Distribuidor%'
	""", as_dict=True)[0]

	# SELL OUT total
	total_sell_out = frappe.db.sql("""
		SELECT SUM(qty) as qty, SUM(amount) as amount
		FROM `tabDistributor SELL OUT Item` dsi
		INNER JOIN `tabDistributor SELL OUT` ds ON dsi.parent = ds.name
		WHERE ds.docstatus = 1
	""", as_dict=True)[0]

	# Rotación promedio
	rotation = 0
	if total_sell_in.qty and total_sell_in.qty > 0:
		rotation = (flt(total_sell_out.qty or 0) / flt(total_sell_in.qty)) * 100

	context.kpis = {
		"total_distributors": total_distributors,
		"sell_in_qty": flt(total_sell_in.qty or 0),
		"sell_in_amount": flt(total_sell_in.amount or 0),
		"sell_out_qty": flt(total_sell_out.qty or 0),
		"sell_out_amount": flt(total_sell_out.amount or 0),
		"rotation": rotation,
		"current_stock": flt(total_sell_in.qty or 0) - flt(total_sell_out.qty or 0)
	}

	# Top distribuidores
	context.top_distributors = frappe.db.sql("""
		SELECT
			ds.distributor,
			c.customer_name,
			SUM(dsi.qty) as sell_out_qty,
			SUM(dsi.amount) as sell_out_amount
		FROM `tabDistributor SELL OUT` ds
		INNER JOIN `tabDistributor SELL OUT Item` dsi ON ds.name = dsi.parent
		INNER JOIN `tabCustomer` c ON ds.distributor = c.name
		WHERE ds.docstatus = 1
		GROUP BY ds.distributor
		ORDER BY sell_out_amount DESC
		LIMIT 10
	""", as_dict=True)

	return context
