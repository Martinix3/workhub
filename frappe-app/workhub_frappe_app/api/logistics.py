"""
Logistics API — Operations Module
==================================
Backend endpoints for the Operations section: Dashboard KPIs, Delivery Notes, Inventory.
Follows the same patterns as sales.py.
"""

import frappe
from frappe import _


# =============================================================================
# DASHBOARD
# =============================================================================

@frappe.whitelist()
def get_operations_kpis():
    """Get KPIs for the Operations dashboard."""
    # Pending deliveries (Delivery Notes not completed)
    pending_deliveries = frappe.db.count(
        "Delivery Note",
        filters={"docstatus": 1, "status": ["not in", ["Completed", "Cancelled"]]}
    )

    # Receipts this month
    from frappe.utils import getdate, get_first_day
    today = getdate()
    first_day = get_first_day(today)
    receipts_this_month = frappe.db.count(
        "Purchase Receipt",
        filters={"docstatus": 1, "posting_date": [">=", first_day]}
    )

    # Previous month for comparison
    from frappe.utils import add_months
    prev_first = get_first_day(add_months(today, -1))
    prev_last = add_months(first_day, 0)  # first day of current month
    receipts_prev_month = frappe.db.count(
        "Purchase Receipt",
        filters={"docstatus": 1, "posting_date": ["between", [prev_first, prev_last]]}
    )

    # Inventory value
    inventory_value = frappe.db.sql("""
        SELECT COALESCE(SUM(bin.actual_qty * item.valuation_rate), 0) as total_value
        FROM `tabBin` bin
        JOIN `tabItem` item ON item.name = bin.item_code
        WHERE item.disabled = 0 AND item.is_stock_item = 1 AND bin.actual_qty > 0
    """, as_dict=True)[0].get("total_value", 0)

    # Low stock alerts
    low_stock_count = frappe.db.sql("""
        SELECT COUNT(DISTINCT bin.item_code) as cnt
        FROM `tabBin` bin
        JOIN `tabItem` item ON item.name = bin.item_code
        WHERE item.disabled = 0
          AND item.is_stock_item = 1
          AND bin.actual_qty > 0
          AND bin.actual_qty < COALESCE(item.safety_stock, 10)
    """, as_dict=True)[0].get("cnt", 0)

    return {
        "pendingDeliveries": {
            "value": pending_deliveries,
            "previousValue": 0,
            "change": 0,
            "label": "Entregas pendientes"
        },
        "receiptsThisMonth": {
            "value": receipts_this_month,
            "previousValue": receipts_prev_month,
            "change": (
                ((receipts_this_month - receipts_prev_month) / max(receipts_prev_month, 1)) * 100
            ),
            "label": "Recepciones este mes"
        },
        "inventoryValue": {
            "value": float(inventory_value),
            "previousValue": 0,
            "change": 0,
            "label": "Valor inventario"
        },
        "lowStockAlerts": {
            "value": low_stock_count,
            "previousValue": 0,
            "change": 0,
            "label": "Alertas de stock"
        }
    }


@frappe.whitelist()
def get_recent_operations(limit=10):
    """Get recent operations activity for the dashboard feed."""
    activities = []

    # Recent Delivery Notes
    delivery_notes = frappe.get_list(
        "Delivery Note",
        filters={"docstatus": ["!=", 2]},
        fields=["name", "customer_name", "posting_date", "status", "grand_total"],
        order_by="posting_date desc, creation desc",
        limit=5
    )
    for dn in delivery_notes:
        activities.append({
            "id": dn.name,
            "type": "delivery",
            "description": f"Albaran {dn.name} - {dn.customer_name}",
            "status": dn.status,
            "amount": float(dn.grand_total or 0),
            "timestamp": str(dn.posting_date),
        })

    # Recent Purchase Receipts
    receipts = frappe.get_list(
        "Purchase Receipt",
        filters={"docstatus": ["!=", 2]},
        fields=["name", "supplier_name", "posting_date", "status", "grand_total"],
        order_by="posting_date desc, creation desc",
        limit=5
    )
    for pr in receipts:
        activities.append({
            "id": pr.name,
            "type": "receipt",
            "description": f"Recepcion {pr.name} - {pr.supplier_name}",
            "status": pr.status,
            "amount": float(pr.grand_total or 0),
            "timestamp": str(pr.posting_date),
        })

    # Sort by timestamp desc
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return activities[:int(limit)]


# =============================================================================
# ENTREGAS (Delivery Notes)
# =============================================================================

@frappe.whitelist()
def get_delivery_notes(filters=None):
    """Get list of delivery notes with optional filters."""
    if isinstance(filters, str):
        import json
        filters = json.loads(filters)

    db_filters = {"docstatus": ["!=", 2]}

    if filters:
        if filters.get("status"):
            db_filters["status"] = filters["status"]
        if filters.get("customer"):
            db_filters["customer_name"] = ["like", f"%{filters['customer']}%"]
        if filters.get("search"):
            search = filters["search"]
            # Search by name, customer, or linked sales order
            return frappe.db.sql("""
                SELECT
                    dn.name as id,
                    dn.name as deliveryNumber,
                    dn.customer as customerId,
                    dn.customer_name as customerName,
                    dn.posting_date as date,
                    dn.status,
                    dn.grand_total as total,
                    dn.currency,
                    dn.transporter_name as transporterName,
                    dn.lr_no as trackingNumber,
                    dn.docstatus
                FROM `tabDelivery Note` dn
                WHERE dn.docstatus != 2
                  AND (dn.name LIKE %(search)s
                       OR dn.customer_name LIKE %(search)s)
                ORDER BY dn.posting_date DESC
                LIMIT 50
            """, {"search": f"%{search}%"}, as_dict=True)

    delivery_notes = frappe.get_list(
        "Delivery Note",
        filters=db_filters,
        fields=[
            "name", "customer", "customer_name",
            "posting_date", "status", "grand_total",
            "currency", "transporter_name", "lr_no", "docstatus"
        ],
        order_by="posting_date desc",
        limit=50
    )

    return [
        {
            "id": dn.name,
            "deliveryNumber": dn.name,
            "customerId": dn.customer,
            "customerName": dn.customer_name,
            "date": str(dn.posting_date),
            "status": dn.status,
            "total": float(dn.grand_total or 0),
            "currency": dn.currency or "EUR",
            "transporterName": dn.transporter_name or "",
            "trackingNumber": dn.lr_no or "",
            "docstatus": dn.docstatus
        }
        for dn in delivery_notes
    ]


@frappe.whitelist()
def get_delivery_detail(delivery_note_id):
    """Get full detail of a delivery note including items, batches, and linked sales order."""
    if not delivery_note_id:
        frappe.throw(_("Delivery Note ID is required"))

    dn = frappe.get_doc("Delivery Note", delivery_note_id)
    frappe.has_permission("Delivery Note", "read", doc=dn, throw=True)

    # Get items with batch info
    items = []
    for item in dn.items:
        items.append({
            "itemCode": item.item_code,
            "itemName": item.item_name,
            "qty": float(item.qty),
            "rate": float(item.rate),
            "amount": float(item.amount),
            "batchNo": item.batch_no or "",
            "salesOrder": item.against_sales_order or "",
            "uom": item.uom or item.stock_uom or "",
        })

    # Get batch details for items that have batches
    batch_details = {}
    batch_nos = [i["batchNo"] for i in items if i["batchNo"]]
    for batch_no in set(batch_nos):
        batch = frappe.db.get_value(
            "Batch", batch_no,
            ["name", "expiry_date", "manufacturing_date", "supplier"],
            as_dict=True
        )
        if batch:
            batch_details[batch_no] = {
                "batchId": batch.name,
                "expiryDate": str(batch.expiry_date) if batch.expiry_date else "",
                "manufacturingDate": str(batch.manufacturing_date) if batch.manufacturing_date else "",
                "supplier": batch.supplier or ""
            }

    # Enrich items with batch details
    for item in items:
        if item["batchNo"] and item["batchNo"] in batch_details:
            item["batch"] = batch_details[item["batchNo"]]

    # Customer fiscal data
    customer_tax_id = frappe.db.get_value("Customer", dn.customer, "tax_id") or ""
    customer_address = dn.address_display or ""
    if not customer_address and dn.shipping_address_name:
        customer_address = frappe.db.get_value(
            "Address", dn.shipping_address_name, "address_display"
        ) or ""

    # Linked sales orders
    linked_orders = list(set(
        item.against_sales_order for item in dn.items
        if item.against_sales_order
    ))

    # Linked invoices
    linked_invoices = []
    inv_names = frappe.get_all(
        "Sales Invoice Item",
        filters={"delivery_note": dn.name, "docstatus": ["!=", 2]},
        fields=["distinct parent as name"],
        pluck="name"
    )
    for inv_name in inv_names:
        inv = frappe.db.get_value(
            "Sales Invoice", inv_name,
            ["name", "posting_date", "status", "grand_total"],
            as_dict=True
        )
        if inv:
            linked_invoices.append({
                "id": inv.name,
                "date": str(inv.posting_date),
                "status": inv.status,
                "total": float(inv.grand_total or 0)
            })

    return {
        "id": dn.name,
        "deliveryNumber": dn.name,
        "customerId": dn.customer,
        "customerName": dn.customer_name,
        "customerTaxId": customer_tax_id,
        "customerAddress": customer_address,
        "date": str(dn.posting_date),
        "status": dn.status,
        "docstatus": dn.docstatus,
        "total": float(dn.grand_total or 0),
        "subtotal": float(dn.net_total or 0),
        "tax": float(dn.total_taxes_and_charges or 0),
        "currency": dn.currency or "EUR",
        "transporterName": dn.transporter_name or "",
        "transportMethod": dn.lr_no or "",
        "driverName": dn.driver_name or "",
        "vehicleNo": dn.vehicle_no or "",
        "items": items,
        "linkedOrders": linked_orders,
        "linkedInvoices": linked_invoices,
    }
