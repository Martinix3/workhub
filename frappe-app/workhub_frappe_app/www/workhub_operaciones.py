# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import flt

def get_context(context):
	"""Controller para Dashboard de Operaciones"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()

	# KPIs de inventario
	total_items = frappe.db.sql("SELECT COUNT(DISTINCT item_code) FROM `tabBin` WHERE actual_qty > 0")[0][0] or 0
	total_value = frappe.db.sql("SELECT SUM(bin.actual_qty * item.valuation_rate) FROM `tabBin` bin INNER JOIN `tabItem` item ON bin.item_code = item.name WHERE bin.actual_qty > 0")[0][0] or 0
	low_stock = frappe.db.sql("SELECT COUNT(DISTINCT item_code) FROM `tabBin` WHERE actual_qty > 0 AND actual_qty < 10")[0][0] or 0

	# Recepciones y entregas
	receipts_pending = frappe.db.count("Purchase Receipt", {"docstatus": 0})
	deliveries_pending = frappe.db.count("Delivery Note", {"docstatus": 0})

	# Viajes en tránsito
	trips_transit = frappe.db.count("Delivery Trip", {"status": "In Transit"})

	context.kpis = {
		"total_items": total_items,
		"total_value": flt(total_value),
		"low_stock": low_stock,
		"receipts_pending": receipts_pending,
		"deliveries_pending": deliveries_pending,
		"trips_transit": trips_transit
	}

	# Items con stock bajo
	context.low_stock_items = frappe.db.sql("""
		SELECT item.name, item.item_name, SUM(bin.actual_qty) as qty
		FROM `tabBin` bin
		INNER JOIN `tabItem` item ON bin.item_code = item.name
		WHERE bin.actual_qty > 0 AND bin.actual_qty < 10
		GROUP BY item.name
		ORDER BY qty
		LIMIT 10
	""", as_dict=True)

	return context
