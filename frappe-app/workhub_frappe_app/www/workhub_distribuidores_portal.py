# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt, today, get_first_day, get_last_day, add_days
import json

def get_context(context):
	"""Controller para el Portal de Distribuidores"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()

	# Verificar que el usuario esté autenticado
	if frappe.session.user == "Guest":
		frappe.local.flags.redirect_location = "/login"
		raise frappe.Redirect

	# Obtener el distribuidor asociado al usuario actual
	distributor = get_current_distributor()

	if not distributor:
		frappe.throw(_("No se encontró un distribuidor asociado a tu usuario. Contacta al administrador."))

	# Verificar permisos
	if not frappe.has_permission("Customer", "read"):
		frappe.throw(_("No tienes permisos para acceder a este portal"), frappe.PermissionError)

	# Obtener datos del distributor
	context.distributor = distributor
	context.distributor_name = frappe.db.get_value("Customer", distributor, "customer_name")

	# Tab 1: Mis Pedidos (Delivery Notes)
	context.delivery_notes = get_delivery_notes(distributor)

	# Tab 2: SELL OUT - Obtener items disponibles para el formulario
	context.items = get_available_items()

	# Tab 3: Inventario
	context.inventory = get_distributor_inventory_data(distributor)
	context.inventory_summary = calculate_inventory_summary(context.inventory)

	# Tab 4: Analytics
	context.analytics = get_distributor_analytics(distributor)

	return context

def get_current_distributor():
	"""
	Obtiene el distribuidor asociado al usuario actual
	Busca un Customer vinculado al email del usuario
	"""
	user_email = frappe.session.user

	# Buscar Customer por email o por usuario de contacto
	distributor = frappe.db.sql("""
		SELECT name
		FROM `tabCustomer`
		WHERE email_id = %s
		   OR name IN (
			   SELECT parent
			   FROM `tabDynamic Link`
			   WHERE link_doctype = 'Customer'
				 AND link_name IN (
					 SELECT name
					 FROM `tabContact`
					 WHERE email_id = %s
				 )
		   )
		LIMIT 1
	""", (user_email, user_email))

	if distributor:
		return distributor[0][0]

	# Si no se encuentra, retornar None (se mostrará error)
	return None

def get_delivery_notes(distributor):
	"""Obtiene las notas de entrega (SELL IN) del distributor"""
	delivery_notes = frappe.get_list(
		"Delivery Note",
		filters={
			"customer": distributor,
			"docstatus": ["in", [0, 1]]  # Draft y Submitted
		},
		fields=[
			"name", "posting_date", "status", "grand_total",
			"currency", "per_billed", "per_installed"
		],
		order_by="posting_date desc",
		limit=20
	)

	# Agregar items a cada delivery note
	for dn in delivery_notes:
		dn.items = frappe.get_list(
			"Delivery Note Item",
			filters={"parent": dn.name},
			fields=["item_code", "item_name", "qty", "uom", "rate", "amount"],
			limit=100
		)

	return delivery_notes

def get_available_items():
	"""Obtiene la lista de productos disponibles para el formulario"""
	items = frappe.get_list(
		"Item",
		filters={
			"disabled": 0,
			"is_sales_item": 1
		},
		fields=["name", "item_name", "item_group", "standard_rate"],
		order_by="item_name",
		limit=500
	)
	return items

def get_distributor_inventory_data(distributor):
	"""
	Obtiene el inventario del distribuidor calculado
	Formula: SELL IN (Delivery Notes) - SELL OUT = Stock Actual
	"""
	# Importar la función del DocType
	from workhub_frappe_app.doctype.distributor_sell_out.distributor_sell_out import get_distributor_inventory

	try:
		inventory = get_distributor_inventory(distributor)
		return inventory
	except Exception as e:
		frappe.log_error(f"Error al calcular inventario: {str(e)}")
		return []

def calculate_inventory_summary(inventory):
	"""Calcula el resumen del inventario"""
	total_sell_in = 0
	total_sell_out = 0
	total_stock = 0

	for item in inventory:
		total_sell_in += flt(item.get("sell_in_qty", 0))
		total_sell_out += flt(item.get("sell_out_qty", 0))
		total_stock += flt(item.get("current_stock", 0))

	return {
		"total_sell_in": total_sell_in,
		"total_sell_out": total_sell_out,
		"total_stock": total_stock
	}

def get_distributor_analytics(distributor):
	"""Obtiene analytics del distribuidor"""

	# SELL OUT del mes actual
	first_day = get_first_day(today())
	last_day = get_last_day(today())

	sell_out_month = frappe.db.sql("""
		SELECT
			COUNT(DISTINCT ds.name) as total_documents,
			SUM(dsi.qty) as total_qty,
			SUM(dsi.amount) as total_amount
		FROM
			`tabDistributor SELL OUT` ds
		INNER JOIN
			`tabDistributor SELL OUT Item` dsi ON ds.name = dsi.parent
		WHERE
			ds.distributor = %s
			AND ds.docstatus = 1
			AND ds.sale_date BETWEEN %s AND %s
	""", (distributor, first_day, last_day), as_dict=True)

	# Producto más vendido (top seller)
	top_product = frappe.db.sql("""
		SELECT
			dsi.item_code,
			dsi.item_name,
			SUM(dsi.qty) as total_qty
		FROM
			`tabDistributor SELL OUT` ds
		INNER JOIN
			`tabDistributor SELL OUT Item` dsi ON ds.name = dsi.parent
		WHERE
			ds.distributor = %s
			AND ds.docstatus = 1
			AND ds.sale_date BETWEEN %s AND %s
		GROUP BY
			dsi.item_code
		ORDER BY
			total_qty DESC
		LIMIT 1
	""", (distributor, first_day, last_day), as_dict=True)

	# Calcular rotación (SELL OUT / SELL IN * 100)
	total_sell_in = frappe.db.sql("""
		SELECT SUM(dni.qty) as total
		FROM `tabDelivery Note Item` dni
		INNER JOIN `tabDelivery Note` dn ON dni.parent = dn.name
		WHERE dn.customer = %s AND dn.docstatus = 1
	""", (distributor,))

	total_sell_out = frappe.db.sql("""
		SELECT SUM(dsi.qty) as total
		FROM `tabDistributor SELL OUT Item` dsi
		INNER JOIN `tabDistributor SELL OUT` ds ON dsi.parent = ds.name
		WHERE ds.distributor = %s AND ds.docstatus = 1
	""", (distributor,))

	sell_in_total = flt(total_sell_in[0][0] if total_sell_in and total_sell_in[0][0] else 0)
	sell_out_total = flt(total_sell_out[0][0] if total_sell_out and total_sell_out[0][0] else 0)

	rotation = 0
	if sell_in_total > 0:
		rotation = (sell_out_total / sell_in_total) * 100

	# Días de stock (Stock Actual / Promedio Venta Diaria)
	days_of_stock = 0
	avg_daily_sales = sell_out_total / 30 if sell_out_total > 0 else 0
	current_stock = sell_in_total - sell_out_total

	if avg_daily_sales > 0:
		days_of_stock = current_stock / avg_daily_sales

	return {
		"sell_out_month_qty": flt(sell_out_month[0].get("total_qty", 0) if sell_out_month else 0),
		"sell_out_month_amount": flt(sell_out_month[0].get("total_amount", 0) if sell_out_month else 0),
		"sell_out_month_docs": flt(sell_out_month[0].get("total_documents", 0) if sell_out_month else 0),
		"rotation": rotation,
		"days_of_stock": days_of_stock,
		"top_product": top_product[0] if top_product else None
	}

@frappe.whitelist()
def create_sell_out(distributor, sale_date, items_json):
	"""
	API endpoint para crear un SELL OUT desde el formulario
	items_json: JSON string con array de items
	"""
	if not frappe.has_permission("Distributor SELL OUT", "create"):
		frappe.throw(_("No tienes permisos para crear SELL OUT"))

	# Parsear items
	try:
		items = json.loads(items_json)
	except:
		frappe.throw(_("Error al parsear items"))

	# Crear documento
	doc = frappe.get_doc({
		"doctype": "Distributor SELL OUT",
		"distributor": distributor,
		"sale_date": sale_date,
		"items": items
	})

	doc.insert()

	return {
		"success": True,
		"document": doc.name,
		"message": _("SELL OUT creado exitosamente")
	}

@frappe.whitelist()
def upload_sell_out_csv(distributor, csv_content):
	"""
	API endpoint para subir CSV de SELL OUT
	"""
	from workhub_frappe_app.doctype.distributor_sell_out.distributor_sell_out import import_sell_out_csv

	try:
		result = import_sell_out_csv(distributor, csv_content)
		return result
	except Exception as e:
		frappe.log_error(f"Error al importar CSV: {str(e)}")
		frappe.throw(_("Error al importar CSV: {0}").format(str(e)))
