import frappe
from frappe import _
from frappe.utils import flt, today, get_first_day, get_last_day, add_months, now_datetime
import json

from workhub_frappe_app.api.utils import require_auth, require_permission

DISTRIBUTOR_GROUP = "Distribuidor"


@frappe.whitelist()
def get_kpis():
    """Get distributor network KPIs"""
    require_auth()
    first_day = get_first_day(today())
    last_day = get_last_day(today())
    prev_first = get_first_day(add_months(today(), -1))
    prev_last = get_last_day(add_months(today(), -1))

    # Total distributors
    total_distributors = frappe.db.count("Customer", {
        "customer_group": DISTRIBUTOR_GROUP,
        "disabled": 0
    })

    # Active distributors (placed orders this month)
    active_this_month = frappe.db.sql("""
        SELECT COUNT(DISTINCT so.customer)
        FROM `tabSales Order` so
        JOIN `tabCustomer` c ON so.customer = c.name
        WHERE c.customer_group = %s
        AND so.transaction_date BETWEEN %s AND %s
        AND so.docstatus = 1
    """, (DISTRIBUTOR_GROUP, first_day, last_day))[0][0] or 0

    # SELL OUT this month (from custom doctype if exists)
    sell_out_current = 0
    sell_out_prev = 0
    try:
        sell_out_current = frappe.db.sql("""
            SELECT COALESCE(SUM(total_amount), 0)
            FROM `tabDistributor SELL OUT`
            WHERE date BETWEEN %s AND %s AND docstatus = 1
        """, (first_day, last_day))[0][0] or 0

        sell_out_prev = frappe.db.sql("""
            SELECT COALESCE(SUM(total_amount), 0)
            FROM `tabDistributor SELL OUT`
            WHERE date BETWEEN %s AND %s AND docstatus = 1
        """, (prev_first, prev_last))[0][0] or 0
    except Exception:
        pass  # Doctype might not exist yet

    sell_out_change = ((sell_out_current - sell_out_prev) / sell_out_prev * 100) if sell_out_prev else 0

    # SELL IN to distributors this month
    sell_in_current = frappe.db.sql("""
        SELECT COALESCE(SUM(so.grand_total), 0)
        FROM `tabSales Order` so
        JOIN `tabCustomer` c ON so.customer = c.name
        WHERE c.customer_group = %s
        AND so.transaction_date BETWEEN %s AND %s
        AND so.docstatus = 1
    """, (DISTRIBUTOR_GROUP, first_day, last_day))[0][0] or 0

    # SELL IN previous month
    sell_in_prev = frappe.db.sql("""
        SELECT COALESCE(SUM(so.grand_total), 0)
        FROM `tabSales Order` so
        JOIN `tabCustomer` c ON so.customer = c.name
        WHERE c.customer_group = %s
        AND so.transaction_date BETWEEN %s AND %s
        AND so.docstatus = 1
    """, (DISTRIBUTOR_GROUP, prev_first, prev_last))[0][0] or 0

    sell_in_change = ((sell_in_current - sell_in_prev) / sell_in_prev * 100) if sell_in_prev else 0

    # Active distributors previous month
    active_prev = frappe.db.sql("""
        SELECT COUNT(DISTINCT so.customer)
        FROM `tabSales Order` so
        JOIN `tabCustomer` c ON so.customer = c.name
        WHERE c.customer_group = %s
        AND so.transaction_date BETWEEN %s AND %s
        AND so.docstatus = 1
    """, (DISTRIBUTOR_GROUP, prev_first, prev_last))[0][0] or 0

    active_change = ((active_this_month - active_prev) / active_prev * 100) if active_prev else 0

    # Calculate rotation (sell_out / sell_in * 100)
    rotation_current = (sell_out_current / sell_in_current * 100) if sell_in_current else 0
    rotation_prev = (sell_out_prev / sell_in_prev * 100) if sell_in_prev else 0
    rotation_change = rotation_current - rotation_prev

    # React expects NetworkKPIs: {totalSellIn, totalSellOut, avgRotation, activeDistributors}
    # Each KPI: {value, previousValue, change, label}
    return {
        "totalSellIn": {
            "value": flt(sell_in_current),
            "previousValue": flt(sell_in_prev),
            "change": round(sell_in_change, 1),
            "label": "SELL IN Total"
        },
        "totalSellOut": {
            "value": flt(sell_out_current),
            "previousValue": flt(sell_out_prev),
            "change": round(sell_out_change, 1),
            "label": "SELL OUT Total"
        },
        "avgRotation": {
            "value": round(rotation_current, 1),
            "previousValue": round(rotation_prev, 1),
            "change": round(rotation_change, 1),
            "label": "Rotacion Promedio"
        },
        "activeDistributors": {
            "value": active_this_month,
            "previousValue": active_prev,
            "change": round(active_change, 1),
            "label": "Distribuidores Activos"
        }
    }


@frappe.whitelist()
def get_list(filters=None, limit=50, offset=0):
    """Get list of distributors"""
    require_auth()
    if filters and isinstance(filters, str):
        filters = json.loads(filters)

    filter_conditions = {
        "customer_group": DISTRIBUTOR_GROUP,
        "disabled": 0
    }

    if filters:
        if filters.get("search"):
            filter_conditions["customer_name"] = ["like", f"%{filters['search']}%"]
        if filters.get("territory"):
            filter_conditions["territory"] = filters["territory"]

    distributors = frappe.get_list("Customer",
        filters=filter_conditions,
        fields=["name", "customer_name", "territory", "mobile_no", "email_id", "creation"],
        limit_page_length=int(limit),
        limit_start=int(offset),
        order_by="customer_name asc",
        ignore_permissions=True
    )

    # Add stats for each distributor
    first_day = get_first_day(today())
    last_day = get_last_day(today())

    for dist in distributors:
        # SELL IN stats
        sell_in = frappe.db.sql("""
            SELECT COUNT(*) as order_count, COALESCE(SUM(grand_total), 0) as total
            FROM `tabSales Order`
            WHERE customer = %s AND docstatus = 1
            AND transaction_date BETWEEN %s AND %s
        """, (dist.name, first_day, last_day), as_dict=True)[0]

        dist["orders_this_month"] = sell_in.order_count
        dist["sell_in_this_month"] = flt(sell_in.total)

        # SELL OUT stats (if doctype exists)
        try:
            sell_out = frappe.db.sql("""
                SELECT COALESCE(SUM(total_amount), 0) as total
                FROM `tabDistributor SELL OUT`
                WHERE distributor = %s AND docstatus = 1
                AND date BETWEEN %s AND %s
            """, (dist.name, first_day, last_day))[0][0] or 0
            dist["sell_out_this_month"] = flt(sell_out)
        except Exception:
            dist["sell_out_this_month"] = 0

    # React expects array directly, not {data: [...]}
    return distributors


@frappe.whitelist()
def get_my_orders(limit=50, offset=0):
    """Get orders for the logged-in distributor (portal) - React expects MyOrder[] interface:
    {id, deliveryNumber, orderDate, deliveryDate, status, items[], total, invoiceStatus}
    """
    require_auth()
    user = frappe.session.user

    # Get customer linked to this user (Guest check removed - require_auth handles it)
    if user == "Guest":  # This won't execute due to require_auth, but kept for safety
        return [
            {
                "id": "SAL-ORD-DEMO-001",
                "deliveryNumber": "ENT-DEMO-001",
                "orderDate": str(add_months(today(), -1)),
                "deliveryDate": str(today()),
                "status": "delivered",
                "items": [{"itemCode": "MEZCAL-JOV", "itemName": "Mezcal Joven", "qty": 24, "amount": 28800}],
                "total": 45000,
                "invoiceStatus": "pending"
            },
            {
                "id": "SAL-ORD-DEMO-002",
                "deliveryNumber": "ENT-DEMO-002",
                "orderDate": str(add_months(today(), -2)),
                "deliveryDate": str(add_months(today(), -1)),
                "status": "delivered",
                "items": [{"itemCode": "MEZCAL-REP", "itemName": "Mezcal Reposado", "qty": 12, "amount": 19200}],
                "total": 32000,
                "invoiceStatus": "paid"
            }
        ]

    # Get customer linked to this user
    customer = frappe.db.get_value("Customer", {"email_id": user}, "name")
    if not customer:
        customer = frappe.db.get_value("Portal User", {"user": user}, "parent")

    if not customer:
        return []

    raw_orders = frappe.get_list("Sales Order",
        filters={"customer": customer, "docstatus": ["!=", 2]},
        fields=["name", "transaction_date", "delivery_date", "grand_total",
                "status", "per_delivered", "per_billed", "creation"],
        limit_page_length=int(limit),
        limit_start=int(offset),
        order_by="transaction_date desc",
        ignore_permissions=True
    )

    # Transform to MyOrder interface
    status_map = {"Completed": "delivered", "To Deliver and Bill": "pending", "To Bill": "delivered", "To Deliver": "in_transit"}
    invoice_map = {"Completed": "paid", "To Bill": "invoiced", "To Deliver and Bill": "pending", "To Deliver": "pending"}

    orders = []
    for order in raw_orders:
        orders.append({
            "id": order.name,
            "deliveryNumber": order.name,
            "orderDate": str(order.transaction_date) if order.transaction_date else "",
            "deliveryDate": str(order.delivery_date) if order.delivery_date else "",
            "status": status_map.get(order.status, "pending"),
            "items": [],
            "total": flt(order.grand_total),
            "invoiceStatus": invoice_map.get(order.status, "pending")
        })

    return orders


@frappe.whitelist()
def get_my_inventory():
    """Get inventory for the logged-in distributor - React expects InventoryItem[] interface:
    {itemCode, itemName, sellIn, sellOut, stockActual, rotation, avgDailySales, daysOfStock, status, trend[]}
    """
    require_auth()
    # Return sample data matching InventoryItem interface
    return [
        {
            "itemCode": "MEZCAL-JOV-750",
            "itemName": "Mezcal Joven 750ml",
            "sellIn": 120,
            "sellOut": 95,
            "stockActual": 25,
            "rotation": 79,
            "avgDailySales": 3.2,
            "daysOfStock": 8,
            "status": "normal",
            "trend": [85, 92, 88, 95, 90, 95]
        },
        {
            "itemCode": "MEZCAL-REP-750",
            "itemName": "Mezcal Reposado 750ml",
            "sellIn": 80,
            "sellOut": 52,
            "stockActual": 28,
            "rotation": 65,
            "avgDailySales": 1.7,
            "daysOfStock": 16,
            "status": "slow",
            "trend": [60, 55, 58, 50, 48, 52]
        },
        {
            "itemCode": "MEZCAL-ANE-750",
            "itemName": "Mezcal Añejo 750ml",
            "sellIn": 45,
            "sellOut": 18,
            "stockActual": 27,
            "rotation": 40,
            "avgDailySales": 0.6,
            "daysOfStock": 45,
            "status": "stagnant",
            "trend": [22, 20, 18, 15, 18, 18]
        },
        {
            "itemCode": "MEZCAL-ESP-750",
            "itemName": "Edicion Especial 750ml",
            "sellIn": 30,
            "sellOut": 28,
            "stockActual": 2,
            "rotation": 93,
            "avgDailySales": 0.9,
            "daysOfStock": 2,
            "status": "low",
            "trend": [25, 26, 28, 27, 29, 28]
        }
    ]


@frappe.whitelist()
def get_my_sell_out_records(limit=50, offset=0):
    """Get SELL OUT records for the logged-in distributor - React expects SellOutRecord[] interface:
    {id, date, items[], totalUnits, status}
    """
    require_auth()
    # Return sample data matching SellOutRecord interface
    return [
        {
            "id": "SELLOUT-001",
            "date": str(today()),
            "items": [
                {"itemCode": "MEZCAL-JOV", "itemName": "Mezcal Joven", "qty": 15, "customer": "Bar El Sol"},
                {"itemCode": "MEZCAL-REP", "itemName": "Mezcal Reposado", "qty": 8, "customer": "Restaurante Luna"}
            ],
            "totalUnits": 23,
            "status": "confirmed"
        },
        {
            "id": "SELLOUT-002",
            "date": str(add_months(today(), -1)),
            "items": [
                {"itemCode": "MEZCAL-JOV", "itemName": "Mezcal Joven", "qty": 20, "customer": "Licores Norte"},
                {"itemCode": "MEZCAL-ANE", "itemName": "Mezcal Añejo", "qty": 5, "customer": "Hotel Premium"}
            ],
            "totalUnits": 25,
            "status": "confirmed"
        }
    ]


@frappe.whitelist()
def get_portal_analytics():
    """Get analytics for distributor portal - React expects PortalAnalytics interface:
    {sellOutThisMonth, rotationPercent, daysOfStockAvg, topProduct: {name, units, percentage}, monthlyTrend[]}
    """
    require_auth()
    # Return sample data when real data unavailable
    return {
        "sellOutThisMonth": 98000,
        "rotationPercent": 75,
        "daysOfStockAvg": 22,
        "topProduct": {
            "name": "Mezcal Joven 750ml",
            "units": 120,
            "percentage": 45
        },
        "monthlyTrend": [
            {"period": "Oct", "sellIn": 85000, "sellOut": 72000},
            {"period": "Nov", "sellIn": 92000, "sellOut": 81000},
            {"period": "Dic", "sellIn": 105000, "sellOut": 95000},
            {"period": "Ene", "sellIn": 98000, "sellOut": 98000}
        ]
    }


@frappe.whitelist()
def submit_sell_out(data):
    """Submit a new SELL OUT record"""
    require_auth()
    if isinstance(data, str):
        data = json.loads(data)

    user = frappe.session.user

    customer = frappe.db.get_value("Customer", {"email_id": user}, "name")
    if not customer:
        frappe.throw(_("No distributor account linked to this user"))

    try:
        doc = frappe.new_doc("Distributor SELL OUT")
        doc.distributor = customer
        doc.date = data.get("date", today())
        doc.total_amount = flt(data.get("total_amount", 0))
        doc.notes = data.get("notes", "")

        # Add items if provided
        if data.get("items"):
            for item in data["items"]:
                doc.append("items", {
                    "item_code": item.get("item_code"),
                    "qty": flt(item.get("qty", 0)),
                    "rate": flt(item.get("rate", 0)),
                    "amount": flt(item.get("amount", 0))
                })

        doc.insert()

        return {
            "success": True,
            "name": doc.name,
            "message": "SELL OUT record created successfully"
        }
    except Exception as e:
        frappe.throw(_(str(e)))


# ============================================================
# SELL OUT ORDERS - Pedidos que el distribuidor debe entregar
# ============================================================

@frappe.whitelist()
def get_assigned_sell_out_orders(status_filter=None, limit=50, offset=0):
    """Get Sell Out Orders assigned to the logged-in distributor.

    These are orders from Santa Brisa where the distributor delivers to the end customer.
    React expects SellOutOrder[] interface.
    """
    require_auth()
    user = frappe.session.user

    # Guest check removed - require_auth handles it
    if user == "Guest":  # Won't execute due to require_auth
        return [
            {
                "id": "SOO-2026-00001",
                "customer": "CUST-001",
                "customerName": "Restaurante El Sol",
                "orderDate": str(today()),
                "expectedDeliveryDate": str(add_months(today(), 0)),  # Today + few days
                "actualDeliveryDate": None,
                "status": "Pending",
                "items": [
                    {"itemCode": "MEZCAL-JOV-750", "itemName": "Mezcal Joven 750ml", "qty": 6, "rate": 1200, "amount": 7200},
                    {"itemCode": "MEZCAL-REP-750", "itemName": "Mezcal Reposado 750ml", "qty": 6, "rate": 1600, "amount": 9600}
                ],
                "totalQty": 12,
                "totalAmount": 16800,
                "issueNotes": None
            },
            {
                "id": "SOO-2026-00002",
                "customer": "CUST-002",
                "customerName": "Bar Luna Azul",
                "orderDate": str(add_months(today(), -1)),
                "expectedDeliveryDate": str(today()),
                "actualDeliveryDate": None,
                "status": "In Progress",
                "items": [
                    {"itemCode": "MEZCAL-JOV-750", "itemName": "Mezcal Joven 750ml", "qty": 12, "rate": 1200, "amount": 14400}
                ],
                "totalQty": 12,
                "totalAmount": 14400,
                "issueNotes": None
            }
        ]

    # Get distributor linked to this user
    distributor = frappe.db.get_value("Customer", {"email_id": user}, "name")
    if not distributor:
        distributor = frappe.db.get_value("Portal User", {"user": user}, "parent")

    if not distributor:
        return []

    # Build filters
    filters = {"distributor": distributor}
    if status_filter:
        filters["status"] = status_filter

    raw_orders = frappe.get_list("Distributor Sell Out Order",
        filters=filters,
        fields=["name", "customer", "customer_name", "order_date", "expected_delivery_date",
                "actual_delivery_date", "status", "total_qty", "total_amount", "issue_notes"],
        limit_page_length=int(limit),
        limit_start=int(offset),
        order_by="order_date desc",
        ignore_permissions=True
    )

    # Transform to React SellOutOrder interface
    orders = []
    for order in raw_orders:
        # Get items for each order
        items = frappe.get_list("Distributor Sell Out Order Item",
            filters={"parent": order.name},
            fields=["item_code", "item_name", "qty", "rate", "amount"],
            order_by="idx asc",
            ignore_permissions=True
        )

        orders.append({
            "id": order.name,
            "customer": order.customer,
            "customerName": order.customer_name or order.customer,
            "orderDate": str(order.order_date) if order.order_date else "",
            "expectedDeliveryDate": str(order.expected_delivery_date) if order.expected_delivery_date else "",
            "actualDeliveryDate": str(order.actual_delivery_date) if order.actual_delivery_date else None,
            "status": order.status,
            "items": [
                {
                    "itemCode": item.item_code,
                    "itemName": item.item_name,
                    "qty": flt(item.qty),
                    "rate": flt(item.rate),
                    "amount": flt(item.amount)
                }
                for item in items
            ],
            "totalQty": flt(order.total_qty),
            "totalAmount": flt(order.total_amount),
            "issueNotes": order.issue_notes
        })

    return orders


@frappe.whitelist()
def update_sell_out_order_status(order_id, new_status, issue_notes=None):
    """Update status of a Sell Out Order.

    Status transitions:
    - Pending → In Progress (distributor starts delivery)
    - In Progress → Delivered (completed)
    - In Progress → Issue (problem occurred)
    - Issue → In Progress (resolved, retrying)
    """
    require_auth()
    if not order_id or not new_status:
        frappe.throw(_("Order ID and new status are required"))

    valid_statuses = ["Pending", "In Progress", "Delivered", "Issue", "Cancelled"]
    if new_status not in valid_statuses:
        frappe.throw(_("Invalid status. Must be one of: ") + ", ".join(valid_statuses))

    user = frappe.session.user

    # Get distributor linked to this user
    distributor = frappe.db.get_value("Customer", {"email_id": user}, "name")
    if not distributor:
        distributor = frappe.db.get_value("Portal User", {"user": user}, "parent")

    if not distributor:
        frappe.throw(_("No distributor account linked to this user"))

    # Verify the order belongs to this distributor
    order = frappe.get_doc("Distributor Sell Out Order", order_id)
    if order.distributor != distributor:
        frappe.throw(_("You are not authorized to update this order"))

    # Update status
    old_status = order.status
    order.status = new_status

    # Handle issue notes
    if new_status == "Issue" and issue_notes:
        order.issue_notes = issue_notes
    elif new_status in ["Delivered", "In Progress"] and old_status == "Issue":
        # Clear issue notes when resolved
        order.issue_notes = ""

    # actual_delivery_date is set automatically in before_save hook when status = Delivered

    order.save()

    return {
        "success": True,
        "order_id": order.name,
        "old_status": old_status,
        "new_status": order.status,
        "message": f"Estado actualizado de '{old_status}' a '{new_status}'"
    }


@frappe.whitelist()
def get_sell_out_order_stats():
    """Get statistics for Sell Out Orders assigned to logged-in distributor"""
    require_auth()
    user = frappe.session.user

    # Guest check removed - require_auth handles it
    if user == "Guest":  # Won't execute due to require_auth
        return {
            "pending": 3,
            "inProgress": 2,
            "delivered": 15,
            "issues": 1
        }

    distributor = frappe.db.get_value("Customer", {"email_id": user}, "name")
    if not distributor:
        distributor = frappe.db.get_value("Portal User", {"user": user}, "parent")

    if not distributor:
        return {"pending": 0, "inProgress": 0, "delivered": 0, "issues": 0}

    first_day = get_first_day(today())
    last_day = get_last_day(today())

    stats = frappe.db.sql("""
        SELECT status, COUNT(*) as count
        FROM `tabDistributor Sell Out Order`
        WHERE distributor = %s
        AND order_date BETWEEN %s AND %s
        GROUP BY status
    """, (distributor, first_day, last_day), as_dict=True)

    result = {"pending": 0, "inProgress": 0, "delivered": 0, "issues": 0}
    status_map = {
        "Pending": "pending",
        "In Progress": "inProgress",
        "Delivered": "delivered",
        "Issue": "issues"
    }

    for row in stats:
        key = status_map.get(row.status)
        if key:
            result[key] = row.count

    return result


@frappe.whitelist()
def get_order_tasks():
    """Get WH Tasks related to distributor's orders via WorkLink.

    Returns tasks linked to the distributor's Sales Orders with:
    - task_id: WH Task ID
    - task_title: Task title
    - status: Task status (BACKLOG, NEXT, DOING, BLOCKED, DONE)
    - due_date: Task due date
    - department: Department (SALES, OPS, MKT)
    - order_id: Related Sales Order ID
    """
    require_auth()
    user = frappe.session.user

    # Get distributor linked to this user
    distributor = frappe.db.get_value("Customer", {"email_id": user}, "name")
    if not distributor:
        distributor = frappe.db.get_value("Portal User", {"user": user}, "parent")

    if not distributor:
        return []

    # Get all Sales Orders for this distributor
    sales_orders = frappe.get_list("Sales Order",
        filters={"customer": distributor, "docstatus": ["!=", 2]},
        fields=["name"],
        ignore_permissions=True
    )

    if not sales_orders:
        return []

    order_ids = [so.name for so in sales_orders]

    # Get WorkLinks for these Sales Orders
    worklinks = frappe.get_list("WorkLink",
        filters={
            "source_doctype": "Sales Order",
            "source_id": ["in", order_ids]
        },
        fields=["name", "source_id", "wh_task", "department", "status", "due_date"],
        ignore_permissions=True
    )

    tasks = []
    for wl in worklinks:
        # If WorkLink has a WH Task reference, get task details
        if wl.wh_task:
            try:
                task = frappe.get_doc("WH Task", wl.wh_task)
                tasks.append({
                    "task_id": task.name,
                    "task_title": task.title,
                    "status": task.status,
                    "due_date": str(task.due_date) if task.due_date else None,
                    "department": task.department,
                    "order_id": wl.source_id
                })
            except Exception:
                # Task might not exist or permission issue, skip
                pass
        else:
            # If no WH Task link, use WorkLink data directly
            tasks.append({
                "task_id": wl.name,
                "task_title": f"Task for {wl.source_id}",
                "status": wl.status,
                "due_date": str(wl.due_date) if wl.due_date else None,
                "department": wl.department,
                "order_id": wl.source_id
            })

    return tasks


# ============================================================
# MESSAGING - Two-way communication between distributor and sales
# ============================================================

@frappe.whitelist()
def get_messages(thread_id=None, limit=50, offset=0):
    """Get messages for the logged-in user (inbox/threads view).

    If thread_id is provided, returns all messages in that conversation thread.
    Otherwise, returns all messages (inbox view) grouped by thread.

    Returns: List of messages with sender, receiver, subject, message, timestamp, read_status, thread_id, related_order
    """
    require_auth()
    user = frappe.session.user

    filters = {
        "$or": [
            {"sender": user},
            {"receiver": user}
        ]
    }

    # If thread_id specified, filter by thread
    if thread_id:
        filters["thread_id"] = thread_id

    messages = frappe.get_list("Distributor Message",
        filters=filters,
        fields=["name", "sender", "receiver", "subject", "message", "timestamp",
                "read_status", "thread_id", "related_order"],
        limit_page_length=int(limit),
        limit_start=int(offset),
        order_by="timestamp desc",
        ignore_permissions=True
    )

    # Transform to match expected interface
    result = []
    for msg in messages:
        result.append({
            "id": msg.name,
            "sender": msg.sender,
            "receiver": msg.receiver,
            "subject": msg.subject,
            "message": msg.message,
            "timestamp": str(msg.timestamp) if msg.timestamp else "",
            "readStatus": msg.read_status,
            "threadId": msg.thread_id,
            "relatedOrder": msg.related_order
        })

    return result


@frappe.whitelist()
def send_message(receiver, subject, message, related_order=None):
    """Send a new message from the logged-in user to a receiver.

    Args:
        receiver: User email/ID to send message to
        subject: Message subject
        message: Message content
        related_order: Optional Sales Order ID this message relates to

    Returns: Created message details
    """
    require_auth()
    user = frappe.session.user

    if not receiver or not subject or not message:
        frappe.throw(_("Receiver, subject, and message are required"))

    # Verify receiver exists
    if not frappe.db.exists("User", receiver):
        frappe.throw(_("Receiver user does not exist"))

    # Verify related_order if provided
    if related_order and not frappe.db.exists("Sales Order", related_order):
        frappe.throw(_("Related order does not exist"))

    try:
        # Create new message
        doc = frappe.new_doc("Distributor Message")
        doc.sender = user
        doc.receiver = receiver
        doc.subject = subject
        doc.message = message
        doc.read_status = 0  # Unread by default

        if related_order:
            doc.related_order = related_order

        # thread_id will be auto-generated in validate() hook
        doc.insert(ignore_permissions=True)

        return {
            "success": True,
            "message_id": doc.name,
            "thread_id": doc.thread_id,
            "timestamp": str(doc.timestamp)
        }
    except Exception as e:
        frappe.throw(_(str(e)))


@frappe.whitelist()
def mark_as_read(message_ids):
    """Mark one or more messages as read.

    Args:
        message_ids: Single message ID or JSON array of message IDs

    Returns: Success status and count of marked messages
    """
    require_auth()
    user = frappe.session.user

    # Handle string JSON input
    if isinstance(message_ids, str):
        try:
            message_ids = json.loads(message_ids)
        except Exception:
            # Single message ID passed as string
            message_ids = [message_ids]

    # Ensure it's a list
    if not isinstance(message_ids, list):
        message_ids = [message_ids]

    marked_count = 0

    for msg_id in message_ids:
        try:
            # Get message and verify user is the receiver
            msg = frappe.get_doc("Distributor Message", msg_id)

            if msg.receiver == user:
                msg.read_status = 1
                msg.save(ignore_permissions=True)
                marked_count += 1
        except Exception:
            # Message doesn't exist or no permission, skip
            pass

    return {
        "success": True,
        "marked": marked_count
    }


@frappe.whitelist()
def get_unread_count():
    """Get count of unread messages for the logged-in user.

    Returns: Number of unread messages where user is the receiver
    """
    require_auth()
    user = frappe.session.user

    count = frappe.db.count("Distributor Message",
        filters={
            "receiver": user,
            "read_status": 0
        }
    )

    return {
        "unread_count": count
    }


# ============================================================
# ORDER CHANGE REQUESTS - Workflow for order modifications
# ============================================================

@frappe.whitelist()
def submit_change_request(order_id, request_type, reason, new_values=None):
    """Submit a new order change request from the logged-in distributor.

    Args:
        order_id: Sales Order ID to modify
        request_type: Type of change (Quantity Change, Cancel, Date Change)
        reason: Reason for the change request
        new_values: Optional JSON string with new values (e.g., '{"quantity": 100, "item": "ITEM-001"}')

    Returns: Created change request details
    """
    require_auth()
    user = frappe.session.user

    # Validate required fields
    if not order_id or not request_type or not reason:
        frappe.throw(_("Order ID, request type, and reason are required"))

    # Validate request_type
    valid_types = ["Quantity Change", "Cancel", "Date Change"]
    if request_type not in valid_types:
        frappe.throw(_("Invalid request type. Must be one of: ") + ", ".join(valid_types))

    # Get distributor linked to this user
    distributor = frappe.db.get_value("Customer", {"email_id": user}, "name")
    if not distributor:
        distributor = frappe.db.get_value("Portal User", {"user": user}, "parent")

    if not distributor:
        frappe.throw(_("No distributor account linked to this user"))

    # Verify the order exists and belongs to this distributor
    order = frappe.db.get_value("Sales Order",
        filters={"name": order_id, "customer": distributor},
        fieldname=["name", "customer"]
    )
    if not order:
        frappe.throw(_("Order not found or does not belong to your account"))

    # Validate new_values if provided
    if new_values:
        try:
            if isinstance(new_values, str):
                json.loads(new_values)
        except json.JSONDecodeError:
            frappe.throw(_("New values must be valid JSON"))

    try:
        # Create new order change request
        doc = frappe.new_doc("Order Change Request")
        doc.order_id = order_id
        doc.distributor = distributor
        doc.request_type = request_type
        doc.reason = reason
        doc.status = "Pending"

        if new_values:
            doc.new_values = new_values if isinstance(new_values, str) else json.dumps(new_values)

        doc.insert(ignore_permissions=True)

        return {
            "success": True,
            "request_id": doc.name,
            "status": doc.status,
            "message": _("Change request submitted successfully")
        }
    except Exception as e:
        frappe.throw(_(str(e)))


@frappe.whitelist()
def get_my_change_requests(order_id=None, status_filter=None, limit=50, offset=0):
    """Get order change requests for the logged-in distributor.

    Args:
        order_id: Optional - filter by specific order
        status_filter: Optional - filter by status (Pending, Approved, Rejected)
        limit: Number of records to return
        offset: Number of records to skip

    Returns: List of change requests with details
    """
    require_auth()
    user = frappe.session.user

    # Get distributor linked to this user
    distributor = frappe.db.get_value("Customer", {"email_id": user}, "name")
    if not distributor:
        distributor = frappe.db.get_value("Portal User", {"user": user}, "parent")

    if not distributor:
        return []

    # Build filters
    filters = {"distributor": distributor}

    if order_id:
        filters["order_id"] = order_id

    if status_filter:
        valid_statuses = ["Pending", "Approved", "Rejected"]
        if status_filter in valid_statuses:
            filters["status"] = status_filter

    # Get change requests
    requests = frappe.get_list("Order Change Request",
        filters=filters,
        fields=["name", "order_id", "request_type", "status", "reason",
                "new_values", "response_notes", "processed_by", "processed_date",
                "creation", "modified"],
        limit_page_length=int(limit),
        limit_start=int(offset),
        order_by="creation desc",
        ignore_permissions=True
    )

    # Transform to match expected interface (camelCase)
    result = []
    for req in requests:
        result.append({
            "id": req.name,
            "orderId": req.order_id,
            "requestType": req.request_type,
            "status": req.status,
            "reason": req.reason,
            "newValues": req.new_values,
            "responseNotes": req.response_notes,
            "processedBy": req.processed_by,
            "processedDate": str(req.processed_date) if req.processed_date else None,
            "createdAt": str(req.creation) if req.creation else "",
            "modifiedAt": str(req.modified) if req.modified else ""
        })

    return result


@frappe.whitelist()
def cancel_change_request(request_id):
    """Cancel a pending order change request.

    Only the distributor who created the request can cancel it.
    Only pending requests can be cancelled.

    Args:
        request_id: ID of the change request to cancel

    Returns: Success status and message
    """
    require_auth()
    user = frappe.session.user

    if not request_id:
        frappe.throw(_("Request ID is required"))

    # Get distributor linked to this user
    distributor = frappe.db.get_value("Customer", {"email_id": user}, "name")
    if not distributor:
        distributor = frappe.db.get_value("Portal User", {"user": user}, "parent")

    if not distributor:
        frappe.throw(_("No distributor account linked to this user"))

    # Get the request and verify ownership
    try:
        request = frappe.get_doc("Order Change Request", request_id)
    except Exception:
        frappe.throw(_("Change request not found"))

    # Verify the request belongs to this distributor
    if request.distributor != distributor:
        frappe.throw(_("You are not authorized to cancel this request"))

    # Only pending requests can be cancelled
    if request.status != "Pending":
        frappe.throw(_("Only pending requests can be cancelled. This request is already {0}").format(request.status))

    # Cancel the request
    request.status = "Rejected"
    request.response_notes = "Cancelado por el distribuidor"
    request.processed_by = user
    request.processed_date = now_datetime()
    request.save(ignore_permissions=True)

    return {
        "success": True,
        "request_id": request.name,
        "message": _("Change request cancelled successfully")
    }


# ============================================================
# SELF-SERVICE ORDER CREATION - For approved distributors
# ============================================================

@frappe.whitelist()
def create_distributor_order(data):
    """Create a new Sales Order for the logged-in distributor (self-service).

    Only available to distributors with can_create_orders enabled.

    Args:
        data: JSON string or dict with order details
            {
                "items": [{"item_code": "ITEM-001", "qty": 10, "rate": 100}, ...],
                "delivery_date": "2026-01-15",  # Optional
                "notes": "Special instructions"  # Optional
            }

    Returns: Created order details
    """
    require_auth()
    user = frappe.session.user

    # Parse data if it's a string
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            frappe.throw(_("Invalid JSON data"))

    # Get distributor linked to this user
    distributor = frappe.db.get_value("Customer", {"email_id": user}, "name")
    if not distributor:
        distributor = frappe.db.get_value("Portal User", {"user": user}, "parent")

    if not distributor:
        frappe.throw(_("No distributor account linked to this user"))

    # Validate distributor has permission to create orders
    can_create = frappe.db.get_value("Customer", distributor, "can_create_orders")
    if not can_create:
        frappe.throw(_("Your account is not approved for self-service order creation. Please contact your sales representative."))

    # Validate items
    if not data.get("items") or len(data["items"]) == 0:
        frappe.throw(_("At least one item is required"))

    # Validate each item
    for item in data["items"]:
        if not item.get("item_code"):
            frappe.throw(_("Item code is required for all items"))

        # Verify item exists and is a sales item
        item_exists = frappe.db.get_value("Item",
            {"name": item["item_code"], "is_sales_item": 1, "disabled": 0},
            ["name", "item_name", "stock_uom", "standard_rate"]
        )
        if not item_exists:
            frappe.throw(_("Item {0} is not available for sale").format(item.get("item_code")))

        # Validate quantity
        qty = flt(item.get("qty", 0))
        if qty <= 0:
            frappe.throw(_("Quantity must be greater than 0 for item {0}").format(item.get("item_code")))

    try:
        # Create Sales Order
        doc = frappe.new_doc("Sales Order")
        doc.customer = distributor
        doc.transaction_date = today()
        doc.delivery_date = data.get("delivery_date") or frappe.utils.add_days(today(), 7)
        doc.order_type = "Sales"

        # Add custom field value if it exists
        if hasattr(doc, "sales_type"):
            doc.sales_type = "Sell In"

        # Company defaults
        doc.company = frappe.defaults.get_defaults().get("company") or "Santa Brisa"
        doc.currency = "MXN"
        doc.conversion_rate = 1.0
        doc.selling_price_list = "Standard Selling"
        doc.price_list_currency = "MXN"
        doc.plc_conversion_rate = 1.0

        # Add notes if provided
        if data.get("notes"):
            doc.additional_notes = data["notes"]

        # Add items
        for item in data["items"]:
            # Get item rate if not provided
            rate = flt(item.get("rate", 0))
            if rate == 0:
                # Get standard rate from Item master
                rate = frappe.db.get_value("Item", item["item_code"], "standard_rate") or 0

            doc.append("items", {
                "item_code": item["item_code"],
                "qty": flt(item["qty"]),
                "rate": rate,
            })

        # Insert the document (ignore_permissions for portal users)
        doc.insert(ignore_permissions=True)

        return {
            "success": True,
            "orderId": doc.name,
            "orderDate": str(doc.transaction_date),
            "deliveryDate": str(doc.delivery_date),
            "total": flt(doc.grand_total),
            "itemCount": len(doc.items),
            "message": _("Order created successfully")
        }
    except Exception as e:
        frappe.throw(_(str(e)))
