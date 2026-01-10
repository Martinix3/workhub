# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class DistributorSELLOUT(Document):
	def validate(self):
		"""Validación antes de guardar"""
		self.calculate_totals()

	def calculate_totals(self):
		"""Calcula el total del SELL OUT"""
		total = 0
		for item in self.items:
			# Calcular amount = qty * rate
			if item.qty and item.rate:
				item.amount = item.qty * item.rate
			total += item.amount or 0

		self.total_amount = total

	def on_submit(self):
		"""Acciones al enviar el documento"""
		self.status = "Submitted"
		# Aquí se podrían actualizar inventarios en distribuidor, etc.

	def on_cancel(self):
		"""Acciones al cancelar el documento"""
		self.status = "Cancelled"

@frappe.whitelist()
def get_distributor_inventory(distributor):
	"""
	Calcula el inventario actual del distribuidor
	Formula: SELL IN - SELL OUT = Inventario en Distribuidor
	"""
	if not frappe.has_permission("Customer", "read"):
		frappe.throw("No permission")

	# SELL IN: Cantidad entregada al distribuidor (Delivery Notes)
	sell_in_data = frappe.db.sql("""
		SELECT
			dni.item_code,
			dni.item_name,
			SUM(dni.qty) as sell_in_qty
		FROM
			`tabDelivery Note Item` dni
		INNER JOIN
			`tabDelivery Note` dn ON dni.parent = dn.name
		WHERE
			dn.customer = %s
			AND dn.docstatus = 1
		GROUP BY
			dni.item_code
	""", (distributor,), as_dict=True)

	# SELL OUT: Cantidad vendida por el distribuidor
	sell_out_data = frappe.db.sql("""
		SELECT
			dsi.item_code,
			SUM(dsi.qty) as sell_out_qty
		FROM
			`tabDistributor SELL OUT Item` dsi
		INNER JOIN
			`tabDistributor SELL OUT` ds ON dsi.parent = ds.name
		WHERE
			ds.distributor = %s
			AND ds.docstatus = 1
		GROUP BY
			dsi.item_code
	""", (distributor,), as_dict=True)

	# Crear diccionario de SELL OUT
	sell_out_dict = {item.item_code: item.sell_out_qty for item in sell_out_data}

	# Calcular inventario
	inventory = []
	for item in sell_in_data:
		sell_out_qty = sell_out_dict.get(item.item_code, 0)
		current_stock = item.sell_in_qty - sell_out_qty

		inventory.append({
			"item_code": item.item_code,
			"item_name": item.item_name,
			"sell_in_qty": item.sell_in_qty,
			"sell_out_qty": sell_out_qty,
			"current_stock": current_stock
		})

	return inventory

@frappe.whitelist()
def import_sell_out_csv(distributor, csv_data):
	"""
	Importa datos de SELL OUT desde CSV
	Formato esperado: item_code, qty, rate, customer, sale_date
	"""
	if not frappe.has_permission("Distributor SELL OUT", "create"):
		frappe.throw("No permission")

	import csv
	from io import StringIO

	# Parsear CSV
	csv_file = StringIO(csv_data)
	reader = csv.DictReader(csv_file)

	items = []
	for row in reader:
		items.append({
			"item_code": row.get("item_code"),
			"qty": float(row.get("qty", 0)),
			"rate": float(row.get("rate", 0)),
			"customer": row.get("customer", ""),
			"customer_name": row.get("customer_name", "")
		})

	# Crear documento de SELL OUT
	doc = frappe.get_doc({
		"doctype": "Distributor SELL OUT",
		"distributor": distributor,
		"sale_date": frappe.utils.today(),
		"items": items
	})

	doc.insert()

	return {
		"success": True,
		"document": doc.name,
		"total_items": len(items)
	}
