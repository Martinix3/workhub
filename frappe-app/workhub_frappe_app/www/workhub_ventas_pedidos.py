import frappe
from frappe import _

def get_context(context):
	"""
	Controller para la página de Pedidos de Ventas
	Conecta con Sales Orders de ERPNext
	"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()

	# Verificar permisos
	if not frappe.has_permission("Sales Order", "read"):
		frappe.throw(_("No tienes permisos para ver pedidos"), frappe.PermissionError)

	# Obtener filtros de la URL
	filters = {}
	status = frappe.form_dict.get("status")
	customer = frappe.form_dict.get("customer")

	if status:
		filters["status"] = status
	if customer:
		filters["customer"] = customer

	# Obtener pedidos de venta
	sales_orders = frappe.get_list(
		"Sales Order",
		filters=filters,
		fields=[
			"name",
			"customer",
			"customer_name",
			"transaction_date",
			"delivery_date",
			"status",
			"grand_total",
			"currency",
			"per_delivered",
			"per_billed"
		],
		order_by="transaction_date desc",
		limit=50
	)

	# Obtener estadísticas
	stats = get_sales_order_stats()

	# Obtener lista de clientes para filtro
	customers = frappe.get_list(
		"Customer",
		fields=["name", "customer_name"],
		order_by="customer_name"
	)

	# Obtener lista de estados posibles
	statuses = [
		"Draft",
		"To Deliver and Bill",
		"To Bill",
		"To Deliver",
		"Completed",
		"Cancelled"
	]

	# Pasar datos al contexto
	context.sales_orders = sales_orders
	context.stats = stats
	context.customers = customers
	context.statuses = statuses
	context.current_status = status or ""
	context.current_customer = customer or ""

	# Metadata de la página
	context.title = _("Ventas - Pedidos")
	context.no_cache = 1

	return context

def get_sales_order_stats():
	"""
	Obtiene estadísticas de pedidos de venta
	"""
	stats = {
		"total": 0,
		"draft": 0,
		"confirmed": 0,
		"completed": 0,
		"total_amount": 0
	}

	# Total de pedidos
	stats["total"] = frappe.db.count("Sales Order")

	# Por estado
	stats["draft"] = frappe.db.count("Sales Order", {"status": "Draft"})
	stats["confirmed"] = frappe.db.count("Sales Order", {"status": ["in", ["To Deliver and Bill", "To Bill", "To Deliver"]]})
	stats["completed"] = frappe.db.count("Sales Order", {"status": "Completed"})

	# Total amount (pedidos activos)
	total_amount = frappe.db.sql("""
		SELECT SUM(grand_total)
		FROM `tabSales Order`
		WHERE status NOT IN ('Cancelled', 'Completed')
		AND docstatus = 1
	""")

	stats["total_amount"] = total_amount[0][0] if total_amount and total_amount[0][0] else 0

	return stats

@frappe.whitelist()
def get_sales_order_details(sales_order):
	"""
	API endpoint para obtener detalles de un pedido
	"""
	if not frappe.has_permission("Sales Order", "read"):
		frappe.throw(_("No permission"), frappe.PermissionError)

	doc = frappe.get_doc("Sales Order", sales_order)

	return {
		"name": doc.name,
		"customer": doc.customer,
		"customer_name": doc.customer_name,
		"transaction_date": doc.transaction_date,
		"delivery_date": doc.delivery_date,
		"status": doc.status,
		"grand_total": doc.grand_total,
		"currency": doc.currency,
		"items": [
			{
				"item_code": item.item_code,
				"item_name": item.item_name,
				"qty": item.qty,
				"rate": item.rate,
				"amount": item.amount,
				"delivered_qty": item.delivered_qty
			}
			for item in doc.items
		]
	}
