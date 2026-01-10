import frappe
from frappe import _

def get_context(context):
	"""
	Controller para la página de Inventario
	Conecta con Stock Balance de ERPNext
	"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()

	# Verificar permisos
	if not frappe.has_permission("Stock Entry", "read"):
		frappe.throw(_("No tienes permisos para ver inventario"), frappe.PermissionError)

	# Obtener filtros
	warehouse = frappe.form_dict.get("warehouse")
	item_group = frappe.form_dict.get("item_group")

	# Obtener stock balance usando el reporte de Frappe
	filters = {}
	if warehouse:
		filters["warehouse"] = warehouse
	if item_group:
		filters["item_group"] = item_group

	# Obtener datos de stock
	stock_data = get_stock_balance(filters)

	# Obtener lista de almacenes
	warehouses = frappe.get_list(
		"Warehouse",
		fields=["name", "warehouse_name"],
		order_by="warehouse_name"
	)

	# Obtener grupos de items
	item_groups = frappe.get_list(
		"Item Group",
		fields=["name"],
		order_by="name"
	)

	# Estadísticas
	stats = get_inventory_stats(warehouse)

	# Pasar datos al contexto
	context.stock_data = stock_data
	context.warehouses = warehouses
	context.item_groups = item_groups
	context.stats = stats
	context.current_warehouse = warehouse or ""
	context.current_item_group = item_group or ""

	# Metadata
	context.title = _("Operaciones - Inventario")
	context.no_cache = 1

	return context

def get_stock_balance(filters=None):
	"""
	Obtiene el balance de stock
	"""
	if filters is None:
		filters = {}

	conditions = []
	params = {}

	if filters.get("warehouse"):
		conditions.append("AND bin.warehouse = %(warehouse)s")
		params["warehouse"] = filters["warehouse"]

	if filters.get("item_group"):
		conditions.append("AND item.item_group = %(item_group)s")
		params["item_group"] = filters["item_group"]

	sql = """
		SELECT
			item.name as item_code,
			item.item_name,
			item.item_group,
			bin.warehouse,
			bin.actual_qty,
			bin.reserved_qty,
			bin.projected_qty,
			item.stock_uom,
			item.valuation_rate
		FROM
			`tabItem` item
		LEFT JOIN
			`tabBin` bin ON item.name = bin.item_code
		WHERE
			item.disabled = 0
			AND item.is_stock_item = 1
			{conditions}
			AND (bin.actual_qty > 0 OR bin.reserved_qty > 0)
		ORDER BY
			item.item_name
		LIMIT 100
	""".format(conditions=" ".join(conditions))

	data = frappe.db.sql(sql, params, as_dict=True)

	return data

def get_inventory_stats(warehouse=None):
	"""
	Obtiene estadísticas de inventario
	"""
	stats = {
		"total_items": 0,
		"total_value": 0,
		"low_stock_items": 0,
		"warehouses": 0
	}

	params = {"warehouse": warehouse} if warehouse else {}
	warehouse_condition = "AND warehouse = %(warehouse)s" if warehouse else ""
	warehouse_condition_bin = "AND bin.warehouse = %(warehouse)s" if warehouse else ""

	# Total de items con stock
	stats["total_items"] = frappe.db.sql("""
		SELECT COUNT(DISTINCT item_code)
		FROM `tabBin`
		WHERE actual_qty > 0
		{condition}
	""".format(condition=warehouse_condition), params)[0][0]

	# Valor total de inventario
	stats["total_value"] = frappe.db.sql("""
		SELECT SUM(bin.actual_qty * item.valuation_rate)
		FROM `tabBin` bin
		INNER JOIN `tabItem` item ON bin.item_code = item.name
		WHERE bin.actual_qty > 0
		{condition}
	""".format(condition=warehouse_condition_bin), params)[0][0] or 0

	# Items con stock bajo (actual_qty < 10 como ejemplo)
	stats["low_stock_items"] = frappe.db.sql("""
		SELECT COUNT(*)
		FROM `tabBin`
		WHERE actual_qty > 0 AND actual_qty < 10
		{condition}
	""".format(condition=warehouse_condition), params)[0][0]

	# Total de almacenes
	stats["warehouses"] = frappe.db.count("Warehouse")

	return stats

@frappe.whitelist()
def get_item_stock_details(item_code):
	"""
	API endpoint para obtener detalles de stock de un item
	"""
	if not frappe.has_permission("Stock Entry", "read"):
		frappe.throw(_("No permission"), frappe.PermissionError)

	# Stock por almacén
	stock_by_warehouse = frappe.db.sql("""
		SELECT
			warehouse,
			actual_qty,
			reserved_qty,
			projected_qty
		FROM
			`tabBin`
		WHERE
			item_code = %s
			AND (actual_qty > 0 OR reserved_qty > 0)
	""", (item_code,), as_dict=True)

	# Info del item
	item = frappe.get_doc("Item", item_code)

	return {
		"item_code": item.name,
		"item_name": item.item_name,
		"item_group": item.item_group,
		"stock_uom": item.stock_uom,
		"valuation_rate": item.valuation_rate,
		"stock_by_warehouse": stock_by_warehouse
	}
