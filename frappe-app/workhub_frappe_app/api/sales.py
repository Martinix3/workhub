import frappe
from frappe import _
from frappe.utils import flt, today, get_first_day, get_last_day, add_months, add_days, now_datetime, get_datetime, getdate
import json

from workhub_frappe_app.api.utils import require_auth, require_permission
from workhub_frappe_app.workhub_frappe_app.utils.pricing import (
    get_price_list_currency,
    get_price_list_rates,
    normalize_sales_type,
    resolve_selling_price_list,
)
from erpnext.selling.doctype.sales_order.sales_order import make_delivery_note, make_sales_invoice
from erpnext.stock.doctype.delivery_note.delivery_note import make_sales_invoice as make_sales_invoice_from_dn
from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry


@frappe.whitelist()
def get_kpis():
    """Get sales dashboard KPIs - format matches KPIs interface"""
    require_auth()
    first_day = get_first_day(today())
    last_day = get_last_day(today())
    prev_first = get_first_day(add_months(today(), -1))
    prev_last = get_last_day(add_months(today(), -1))

    # Sales this month
    sales_data = frappe.db.sql("""
        SELECT COUNT(*) as total_orders, COALESCE(SUM(grand_total), 0) as total_amount
        FROM `tabSales Order`
        WHERE transaction_date BETWEEN %s AND %s AND docstatus = 1
    """, (first_day, last_day), as_dict=True)[0]

    # Previous month sales
    prev_sales_data = frappe.db.sql("""
        SELECT COUNT(*) as total_orders, COALESCE(SUM(grand_total), 0) as total_amount
        FROM `tabSales Order`
        WHERE transaction_date BETWEEN %s AND %s AND docstatus = 1
    """, (prev_first, prev_last), as_dict=True)[0]

    prev_sales = flt(prev_sales_data.total_amount) or 1  # Avoid division by zero
    prev_orders = prev_sales_data.total_orders or 1

    # Active orders (not completed)
    active_orders = frappe.db.count("Sales Order", {
        "docstatus": 1,
        "status": ["not in", ["Completed", "Cancelled", "Closed"]]
    })
    prev_active_orders = frappe.db.sql("""
        SELECT COUNT(*) as cnt FROM `tabSales Order`
        WHERE docstatus = 1 AND status NOT IN ('Completed', 'Cancelled', 'Closed')
        AND transaction_date BETWEEN %s AND %s
    """, (prev_first, prev_last), as_dict=True)[0].cnt or 1

    # New accounts this month (SSOT: Momentum Account)
    new_customers = frappe.db.count("Momentum Account", {
        "creation": [">=", first_day],
        "column": ["not in", ["Lost"]]  # Exclude lost accounts
    })
    prev_new_customers = frappe.db.count("Momentum Account", {
        "creation": ["between", [prev_first, prev_last]],
        "column": ["not in", ["Lost"]]
    }) or 1

    # Average order value
    current_sales = flt(sales_data.total_amount)
    current_orders = sales_data.total_orders or 1
    avg_order_value = current_sales / current_orders if current_orders else 0
    prev_avg_value = prev_sales / prev_orders if prev_orders else 0

    # Calculate changes
    sales_change = ((current_sales - prev_sales) / prev_sales * 100) if prev_sales else 0
    orders_change = ((active_orders - prev_active_orders) / prev_active_orders * 100) if prev_active_orders else 0
    customers_change = ((new_customers - prev_new_customers) / prev_new_customers * 100) if prev_new_customers else 0
    avg_change = ((avg_order_value - prev_avg_value) / prev_avg_value * 100) if prev_avg_value else 0

    # Return flat format expected by React service (sales.ts)
    return {
        "sales_this_month": current_sales,
        "sales_prev_month": flt(prev_sales_data.total_amount),
        "active_orders": active_orders,
        "prev_active_orders": prev_active_orders,
        "new_customers": new_customers,
        "prev_new_customers": flt(prev_new_customers),
        "avg_order_value": avg_order_value,
        "prev_avg_order_value": prev_avg_value
    }


@frappe.whitelist()
def get_customers(filters=None, limit=50, offset=0):
    """
    Get customer list from Momentum Account (SSOT).

    ARQUITECTURA UNIFICADA: Momentum Account es la fuente de verdad.
    ERPNext Customer solo se usa para compatibilidad con facturas.
    """
    require_auth()
    if filters and isinstance(filters, str):
        filters = json.loads(filters)

    # Build filter conditions for Momentum Account
    filter_conditions = {}

    if filters:
        if filters.get("search"):
            filter_conditions["account_name"] = ["like", f"%{filters['search']}%"]
        if filters.get("type"):
            type_filter = filters["type"].lower()
            if type_filter == "prospect":
                filter_conditions["account_type"] = "Lead"
            elif type_filter == "customer":
                filter_conditions["account_type"] = "Customer"
            elif type_filter == "distributor":
                filter_conditions["sale_type"] = "Sell In"  # Distributors do Sell In
            # "todos" = no filter
        if filters.get("territory") or filters.get("zone"):
            city = filters.get("territory") or filters.get("zone")
            if city and city.lower() not in ["todas", "all", "sin zona"]:
                filter_conditions["city"] = city
        if filters.get("column"):
            filter_conditions["column"] = filters["column"]
        if filters.get("sale_type"):
            filter_conditions["sale_type"] = filters["sale_type"]

    # Query Momentum Account (SSOT)
    accounts = frappe.get_all(
        "Momentum Account",
        filters=filter_conditions,
        fields=[
            "name", "account_name", "account_type", "sale_type", "sales_channel",
            "level", "column", "is_target", "assigned_to",
            "contact_name", "email", "phone", "mobile",
            "address", "city", "postal_code",
            "distributor", "linked_customer",
            "creation", "modified"
        ],
        limit_page_length=int(limit),
        limit_start=int(offset),
        order_by="modified desc"
    )

    # Get distributor names for mapping
    distributor_ids = list({a.distributor for a in accounts if a.get("distributor")})
    distributor_map = {}
    if distributor_ids:
        distributor_map = {
            row["name"]: row["customer_name"]
            for row in frappe.get_list(
                "Customer",
                filters={"name": ["in", distributor_ids]},
                fields=["name", "customer_name"]
            )
        }

    # Get sales stats for accounts with linked_customer
    linked_customer_ids = [a.linked_customer for a in accounts if a.get("linked_customer")]
    stats_map = {}
    if linked_customer_ids:
        stats_data = frappe.db.sql("""
            SELECT customer, COUNT(*) as order_count, COALESCE(SUM(grand_total), 0) as total_spent
            FROM `tabSales Order`
            WHERE customer IN %s AND docstatus = 1
            GROUP BY customer
        """, (linked_customer_ids,), as_dict=True)
        stats_map = {s["customer"]: s for s in stats_data}

    # Transform to React Customer interface
    result = []
    for acc in accounts:
        # Determine type based on account_type and column
        if acc.account_type == "Lead":
            customer_type = "prospect"
        elif acc.column in ["Won", "Loyalty"]:
            customer_type = "customer"
        else:
            customer_type = "prospect"  # In pipeline = still prospect

        # Get stats from linked customer if exists
        stats = stats_map.get(acc.linked_customer, {"order_count": 0, "total_spent": 0})

        # Build distributor info
        assigned_distributor = None
        if acc.distributor:
            assigned_distributor = {
                "id": acc.distributor,
                "name": distributor_map.get(acc.distributor, acc.distributor)
            }

        # Determine status based on column
        status_map = {
            "Backlog": "inactive",
            "Pipeline": "prospect",
            "Hot": "hot",
            "Won": "active",
            "Lost": "lost",
            "Loyalty": "active"
        }

        result.append({
            "id": acc.name,  # Momentum Account ID
            "name": acc.account_name,
            "type": customer_type,
            "zone": acc.city or "Sin zona",
            "status": status_map.get(acc.column, "prospect"),
            "column": acc.column,  # Pipeline column for UI
            "saleType": acc.sale_type,
            "salesChannel": acc.sales_channel,
            "level": acc.level,
            "isTarget": acc.is_target,
            "contactName": acc.contact_name or acc.account_name,
            "contactEmail": acc.email or "",
            "contactPhone": acc.phone or acc.mobile or "",
            "totalOrders": stats.get("order_count", 0),
            "totalRevenue": flt(stats.get("total_spent", 0)),
            "lastOrderDate": None,
            "createdAt": str(acc.creation).split(' ')[0] if acc.creation else None,
            "assignedDistributor": assigned_distributor,
            "linkedCustomer": acc.linked_customer  # ERPNext Customer ID for invoices
        })

    return result


@frappe.whitelist()
def get_orders(filters=None, limit=50, offset=0):
    """Get sales orders - React expects SalesOrder[] interface"""
    require_auth()
    if filters and isinstance(filters, str):
        filters = json.loads(filters)

    limit = int(limit) if limit else 50
    offset = int(offset) if offset else 0
    fetch_limit = limit + offset if limit else 50

    filter_conditions = {"docstatus": ["!=", 2]}  # Exclude cancelled
    sell_out_filter_conditions = {}

    # Map React status values back to Frappe status values
    # NOTE: "invoiced" now includes Completed (billed but not necessarily paid)
    # "paid" = Closed (manually marked) or Completed with zero outstanding
    react_to_frappe_status = {
        "draft": "Draft",
        "confirmed": ["To Deliver and Bill", "On Hold"],
        "delivered": "To Bill",
        "invoiced": ["To Deliver", "Completed"],
        "paid": ["Completed", "Closed"],
        "cancelled": "Cancelled",
        "in_transit": ["To Deliver and Bill", "To Deliver"]  # Orders being delivered
    }
    react_to_sell_out_status = {
        "draft": ["Pending"],
        "confirmed": ["Pending", "Issue"],
        "in_transit": ["In Progress"],
        "delivered": ["Delivered"],
        "paid": [],
        "cancelled": ["Cancelled"]
    }

    or_filters = []
    sell_out_or_filters = []
    if filters:
        if filters.get("status"):
            frappe_status = react_to_frappe_status.get(filters["status"])
            if frappe_status:
                if isinstance(frappe_status, list):
                    filter_conditions["status"] = ["in", frappe_status]
                else:
                    filter_conditions["status"] = frappe_status
            sell_out_status = react_to_sell_out_status.get(filters["status"])
            if sell_out_status is not None:
                if len(sell_out_status) == 0:
                    sell_out_filter_conditions["status"] = "__none__"
                elif len(sell_out_status) == 1:
                    sell_out_filter_conditions["status"] = sell_out_status[0]
                else:
                    sell_out_filter_conditions["status"] = ["in", sell_out_status]
        if filters.get("customer") or filters.get("customerId"):
            customer_id = filters.get("customer") or filters.get("customerId")
            filter_conditions["customer"] = customer_id
            sell_out_filter_conditions["customer"] = customer_id
        if filters.get("from_date"):
            filter_conditions["transaction_date"] = [">=", filters["from_date"]]
            sell_out_filter_conditions["order_date"] = [">=", filters["from_date"]]
        if filters.get("to_date"):
            if "transaction_date" in filter_conditions:
                filter_conditions["transaction_date"] = ["between", [filters.get("from_date", "2000-01-01"), filters["to_date"]]]
            else:
                filter_conditions["transaction_date"] = ["<=", filters["to_date"]]
            if "order_date" in sell_out_filter_conditions:
                sell_out_filter_conditions["order_date"] = ["between", [filters.get("from_date", "2000-01-01"), filters["to_date"]]]
            else:
                sell_out_filter_conditions["order_date"] = ["<=", filters["to_date"]]
        if filters.get("search"):
            search = filters["search"].strip()
            if search:
                or_filters = [
                    {"name": ["like", f"%{search}%"]},
                    {"customer_name": ["like", f"%{search}%"]}
                ]
                sell_out_or_filters = [
                    {"name": ["like", f"%{search}%"]},
                    {"customer_name": ["like", f"%{search}%"]}
                ]

    raw_orders = frappe.get_list("Sales Order",
        filters=filter_conditions,
        or_filters=or_filters if or_filters else None,
        fields=["name", "customer", "customer_name", "transaction_date", "delivery_date",
                "grand_total", "net_total", "total_taxes_and_charges", "status", "per_delivered", "per_billed", "creation"],
        limit_page_length=int(fetch_limit),
        limit_start=0,
        order_by="transaction_date desc"
    )

    # Transform to React SalesOrder interface:
    # {id, orderNumber, customerId, customerName, orderDate, deliveryDate, status, items, subtotal, tax, total, deliveryProgress, invoiceProgress}
    # NOTE: ERPNext "Completed" = delivered + invoiced, NOT paid.
    # We need to check outstanding_amount on linked invoices to determine if truly paid.
    status_map = {
        "Draft": "draft",
        "To Deliver and Bill": "confirmed",
        "To Bill": "delivered",
        "To Deliver": "invoiced",
        "Completed": "invoiced",  # Completed = billed, not necessarily paid
        "Cancelled": "cancelled",
        "Closed": "paid",  # Closed = manually marked as done
        "On Hold": "confirmed"
    }

    # For "Completed" orders, check if linked invoices are fully paid
    completed_order_names = [o.name for o in raw_orders if o.status == "Completed"]
    paid_orders = set()
    if completed_order_names:
        # Check if all linked invoices have outstanding_amount = 0
        for so_name in completed_order_names:
            invoices = frappe.get_all("Sales Invoice Item",
                filters={"sales_order": so_name, "docstatus": 1},
                fields=["parent"],
                group_by="parent"
            )
            if not invoices:
                # No invoices linked yet (edge case)
                continue
            all_paid = True
            for inv_item in invoices:
                outstanding = frappe.db.get_value("Sales Invoice", inv_item.parent, "outstanding_amount")
                if flt(outstanding) > 0:
                    all_paid = False
                    break
            if all_paid:
                paid_orders.add(so_name)

    orders = []
    for order in raw_orders:
        # Determine status: if Completed and all invoices paid, mark as "paid"
        react_status = status_map.get(order.status, "draft")
        if order.status == "Completed" and order.name in paid_orders:
            react_status = "paid"

        orders.append({
            "id": order.name,
            "orderNumber": order.name,
            "customerId": order.customer or "",
            "customerName": order.customer_name or order.customer or "",
            "orderDate": str(order.transaction_date) if order.transaction_date else "",
            "deliveryDate": str(order.delivery_date) if order.delivery_date else "",
            "status": react_status,
            "items": [],  # Would need to fetch child table for full data
            "subtotal": flt(order.net_total or order.grand_total),
            "tax": flt(order.total_taxes_and_charges or 0),
            "total": flt(order.grand_total),
            "deliveryProgress": flt(order.per_delivered or 0),
            "invoiceProgress": flt(order.per_billed or 0),
            "sort_key": get_datetime(order.transaction_date or order.creation or now_datetime())
        })

    sell_out_orders = []
    # TEMPORALMENTE DESHABILITADO: La tabla Distributor Sell Out Order tiene datos de otra DB
    # TODO: Agregar filtro de company antes de reactivar
    has_sell_out_doctype = False  # frappe.db.exists("DocType", "Distributor Sell Out Order")

    if has_sell_out_doctype and sell_out_filter_conditions.get("status") != "__none__":
        raw_sell_out = frappe.get_list(
            "Distributor Sell Out Order",
            filters=sell_out_filter_conditions,
            or_filters=sell_out_or_filters if sell_out_or_filters else None,
            fields=[
                "name", "customer", "customer_name", "order_date", "expected_delivery_date",
                "total_amount", "status", "creation"
            ],
            limit_page_length=int(fetch_limit),
            limit_start=0,
            order_by="order_date desc"
        )

        sell_out_status_map = {
            "Pending": "confirmed",
            "In Progress": "in_transit",
            "Delivered": "delivered",
            "Issue": "confirmed",
            "Cancelled": "cancelled"
        }
        sell_out_delivery_progress = {
            "Pending": 0,
            "In Progress": 50,
            "Delivered": 100,
            "Issue": 50,
            "Cancelled": 0
        }

        for order in raw_sell_out:
            sell_out_orders.append({
                "id": order.name,
                "orderNumber": order.name,
                "customerId": order.customer or "",
                "customerName": order.customer_name or order.customer or "",
                "orderDate": str(order.order_date) if order.order_date else "",
                "deliveryDate": str(order.expected_delivery_date) if order.expected_delivery_date else "",
                "status": sell_out_status_map.get(order.status, "confirmed"),
                "items": [],
                "subtotal": flt(order.total_amount or 0),
                "tax": 0,
                "total": flt(order.total_amount or 0),
                "deliveryProgress": sell_out_delivery_progress.get(order.status, 0),
                "invoiceProgress": 0,
                "sort_key": get_datetime(order.order_date or order.creation or now_datetime())
            })

    merged = orders + sell_out_orders
    merged.sort(key=lambda row: row.get("sort_key") or now_datetime(), reverse=True)
    for row in merged:
        row.pop("sort_key", None)

    return merged[offset:offset + limit]


@frappe.whitelist()
def get_opportunities(filters=None, limit=50, offset=0):
    """Get sales pipeline opportunities"""
    require_auth()
    if filters and isinstance(filters, str):
        filters = json.loads(filters)

    filter_conditions = {"status": ["not in", ["Lost", "Closed"]]}

    if filters:
        if filters.get("sales_stage"):
            filter_conditions["sales_stage"] = filters["sales_stage"]

    opportunities = frappe.get_list("Opportunity",
        filters=filter_conditions,
        fields=["name", "party_name", "opportunity_type", "sales_stage", "status",
                "opportunity_amount", "probability", "expected_closing", "contact_person",
                "creation"],
        limit_page_length=int(limit),
        limit_start=int(offset),
        order_by="expected_closing asc"
    )

    # Get stage summary for pipeline view
    stages = frappe.db.sql("""
        SELECT sales_stage, COUNT(*) as count, COALESCE(SUM(opportunity_amount), 0) as total
        FROM `tabOpportunity`
        WHERE status NOT IN ('Lost', 'Closed')
        GROUP BY sales_stage
        ORDER BY sales_stage
    """, as_dict=True)

    # React expects array directly, not {data: [...]}
    return opportunities


@frappe.whitelist()
def update_opportunity_stage(opportunity_id, new_stage):
    """Update opportunity sales stage"""
    require_permission("Opportunity", "write")
    if not opportunity_id or not new_stage:
        frappe.throw(_("Opportunity ID and new stage are required"))

    doc = frappe.get_doc("Opportunity", opportunity_id)
    doc.sales_stage = new_stage
    doc.save()

    return {"success": True, "name": doc.name, "sales_stage": doc.sales_stage}


@frappe.whitelist()
def get_recent_activity(limit=20):
    """Get recent sales-related activity"""
    require_auth()
    activities = []

    # Recent Sales Orders
    recent_orders = frappe.get_list("Sales Order",
        filters={"docstatus": 1},
        fields=["name", "customer_name", "grand_total", "creation", "owner"],
        limit_page_length=10,
        order_by="creation desc"
    )

    for order in recent_orders:
        activities.append({
            "id": f"so-{order.name}",
            "type": "order",
            "title": f"Nuevo pedido: {order.name}",
            "description": f"Cliente: {order.customer_name} - ${flt(order.grand_total):,.0f}",
            "timestamp": str(order.creation),
            "user": order.owner
        })

    # Recent Opportunities
    recent_opps = frappe.get_list("Opportunity",
        fields=["name", "party_name", "sales_stage", "creation", "owner"],
        limit_page_length=10,
        order_by="creation desc"
    )

    for opp in recent_opps:
        activities.append({
            "id": f"opp-{opp.name}",
            "type": "opportunity",
            "title": f"Oportunidad: {opp.party_name}",
            "description": f"Etapa: {opp.sales_stage}",
            "timestamp": str(opp.creation),
            "user": opp.owner
        })

    # Sort by timestamp and limit
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return activities[:int(limit)]


@frappe.whitelist()
def get_sales_trends(period="monthly"):
    """Get sales trends - returns SalesTrends interface format"""
    require_auth()
    # Monthly trend (last 12 months)
    start_date = add_days(today(), -365)

    monthly_data = frappe.db.sql("""
        SELECT
            DATE_FORMAT(transaction_date, '%%Y-%%m') as period,
            COALESCE(SUM(grand_total), 0) as value
        FROM `tabSales Order`
        WHERE transaction_date >= %s AND docstatus = 1
        GROUP BY DATE_FORMAT(transaction_date, '%%Y-%%m')
        ORDER BY period
    """, (start_date,), as_dict=True)

    # Sales by product (top 5 items)
    by_product = frappe.db.sql("""
        SELECT
            soi.item_name as product,
            COALESCE(SUM(soi.amount), 0) as value
        FROM `tabSales Order Item` soi
        JOIN `tabSales Order` so ON soi.parent = so.name
        WHERE so.docstatus = 1
        GROUP BY soi.item_code
        ORDER BY value DESC
        LIMIT 5
    """, as_dict=True)

    # Calculate percentages for products
    total_product_value = sum(p.get("value", 0) for p in by_product) or 1
    for p in by_product:
        p["percentage"] = round((p.get("value", 0) / total_product_value) * 100, 1)

    # Sales by customer type
    by_customer_type = frappe.db.sql("""
        SELECT
            c.customer_group as type,
            COALESCE(SUM(so.grand_total), 0) as value
        FROM `tabSales Order` so
        JOIN `tabCustomer` c ON so.customer = c.name
        WHERE so.docstatus = 1
        GROUP BY c.customer_group
        ORDER BY value DESC
    """, as_dict=True)

    # Calculate percentages for customer types
    total_type_value = sum(t.get("value", 0) for t in by_customer_type) or 1
    for t in by_customer_type:
        t["percentage"] = round((t.get("value", 0) / total_type_value) * 100, 1)

    # Return format matching SalesTrends interface
    return {
        "monthly": monthly_data,
        "byProduct": by_product,
        "byCustomerType": by_customer_type
    }


@frappe.whitelist()
def get_customer_details(customer_id):
    """Get detailed customer information"""
    require_auth()
    if not customer_id:
        frappe.throw(_("Customer ID is required"))

    # SSOT: Momentum Account - Try to get from Momentum Account first
    momentum_account = None
    erp_customer_id = customer_id
    if frappe.db.exists("DocType", "Momentum Account"):
        # Check if customer_id is a Momentum Account
        if frappe.db.exists("Momentum Account", customer_id):
            momentum_account = frappe.get_doc("Momentum Account", customer_id)
            erp_customer_id = momentum_account.linked_customer
        else:
            # Check if customer_id is linked to a Momentum Account
            ma_name = frappe.db.get_value("Momentum Account", {"linked_customer": customer_id}, "name")
            if ma_name:
                momentum_account = frappe.get_doc("Momentum Account", ma_name)

    # Fallback: Get ERPNext Customer for billing compatibility
    customer = None
    if erp_customer_id and frappe.db.exists("Customer", erp_customer_id):
        customer = frappe.get_doc("Customer", erp_customer_id)

    # SSOT: Momentum Account - Use erp_customer_id for order queries (billing link)
    order_customer_id = erp_customer_id if erp_customer_id else customer_id

    # Get recent orders
    recent_orders = frappe.get_list("Sales Order",
        filters={"customer": order_customer_id, "docstatus": 1},
        fields=["name", "transaction_date", "grand_total", "status"],
        limit_page_length=10,
        order_by="transaction_date desc"
    )

    # Get total stats
    stats = frappe.db.sql("""
        SELECT
            COUNT(*) as total_orders,
            COALESCE(SUM(grand_total), 0) as total_spent,
            MAX(transaction_date) as last_order_date
        FROM `tabSales Order`
        WHERE customer = %s AND docstatus = 1
    """, (order_customer_id,), as_dict=True)[0]

    # SSOT: Momentum Account - Get customer name from Momentum Account first
    customer_name = ""
    if momentum_account:
        customer_name = momentum_account.account_name
    elif customer:
        customer_name = customer.customer_name

    # Get active CRM deals
    active_deals = []
    if frappe.db.exists("DocType", "CRM Deal") and customer_name:
        active_deals = frappe.get_list("CRM Deal",
            filters={"organization": customer_name, "status": ["not in", ["Won", "Lost"]]},
            fields=["name", "status", "deal_value", "expected_closure_date"],
            order_by="creation desc"
        )

    # Get activities (Comments linked to Customer/Momentum Account and CRM Activities linked to Deals)
    activities = []

    # SSOT: Momentum Account - Get activities from Momentum Account first
    if momentum_account and frappe.db.exists("DocType", "Momentum Activity"):
        ma_activities = frappe.get_list("Momentum Activity",
            filters={"momentum_account": momentum_account.name},
            fields=["name", "activity_type", "notes", "creation", "performed_by"],
            order_by="creation desc",
            limit_page_length=5
        )
        for a in ma_activities:
            activities.append({
                "id": a.name,
                "type": a.activity_type or "note",
                "title": f"Actividad en Cuenta",
                "description": a.notes,
                "timestamp": str(a.creation),
                "user": a.performed_by
            })

    # 1. Comments/Notes on Customer (fallback)
    if erp_customer_id:
        notes = frappe.get_list("Comment",
            filters={"reference_doctype": "Customer", "reference_name": erp_customer_id},
            fields=["name", "content", "creation", "owner", "comment_type"],
            order_by="creation desc",
            limit_page_length=5
        )
        for n in notes:
            activities.append({
                "id": n.name,
                "type": "note",
                "title": "Nota en Cliente",
                "description": n.content,
                "timestamp": str(n.creation),
                "user": n.owner
            })

    # 2. CRM Activities from active deals
    if active_deals and frappe.db.exists("DocType", "CRM Activity"):
        deal_names = [d.name for d in active_deals]
        crm_acts = frappe.get_list("CRM Activity",
            filters={"reference_doctype": "CRM Deal", "reference_name": ["in", deal_names]},
            fields=["name", "activity_type", "notes", "creation", "owner"],
            order_by="creation desc",
            limit_page_length=5
        )
        for a in crm_acts:
             activities.append({
                "id": a.name,
                "type": a.activity_type or "note",
                "title": f"Actividad en Deal",
                "description": a.notes,
                "timestamp": str(a.creation),
                "user": a.owner
            })

    # Sort merged activities
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    activities = activities[:10]

    # SSOT: Momentum Account - Build customer response from Momentum Account first, then fallback
    customer_data = {}
    if momentum_account:
        customer_data = {
            "name": momentum_account.name,
            "customer_name": momentum_account.account_name,
            "customer_group": momentum_account.sale_type or "Individual",
            "territory": momentum_account.city or "Sin zona",
            "mobile_no": momentum_account.mobile or momentum_account.phone,
            "email_id": momentum_account.email,
            "primary_address": momentum_account.address,
            "creation": str(momentum_account.creation),
            "linked_customer": erp_customer_id  # Include for billing reference
        }
    elif customer:
        customer_data = {
            "name": customer.name,
            "customer_name": customer.customer_name,
            "customer_group": customer.customer_group,
            "territory": customer.territory,
            "mobile_no": customer.mobile_no,
            "email_id": customer.email_id,
            "primary_address": customer.primary_address,
            "creation": str(customer.creation)
        }
    else:
        frappe.throw(_("Cliente no encontrado: {0}").format(customer_id))

    return {
        "customer": customer_data,
        "stats": stats,
        "recent_orders": recent_orders,
        "active_deals": active_deals,
        "activities": activities
    }


@frappe.whitelist()
def get_products(search=None, limit=20, sales_type=None, price_list=None):
    """Get products for order creation dropdown"""
    require_auth()
    filters = {"is_sales_item": 1, "disabled": 0}

    if search:
        filters["item_name"] = ["like", f"%{search}%"]

    items = frappe.get_list(
        "Item",
        filters=filters,
        fields=["name", "item_name", "item_code", "stock_uom", "standard_rate", "image"],
        limit_page_length=int(limit),
        order_by="item_name asc",
    )

    sales_type = normalize_sales_type(sales_type)
    resolved_price_list = resolve_selling_price_list(sales_type, price_list)
    item_codes = [item.item_code or item.name for item in items if item.item_code or item.name]
    price_map = get_price_list_rates(item_codes, resolved_price_list)

    # Add available stock and resolved pricing for each item
    for item in items:
        stock = frappe.db.sql(
            """
            SELECT COALESCE(SUM(actual_qty), 0) as qty
            FROM `tabBin` WHERE item_code = %s
        """,
            (item.name,),
        )[0][0]
        item["available_stock"] = flt(stock)
        item_code = item.item_code or item.name
        item["price_list"] = resolved_price_list
        if item_code in price_map:
            item["standard_rate"] = flt(price_map[item_code])
            item["price_source"] = "price_list"
        else:
            item["price_source"] = "standard_rate"

    return items


@frappe.whitelist()
def get_customer_distributor(customer_id):
    """Get the assigned distributor for a customer"""
    require_auth()
    if not customer_id:
        return None

    # SSOT: Momentum Account - Try Momentum Account first
    distributor = None
    if frappe.db.exists("DocType", "Momentum Account"):
        # Check if customer_id is a Momentum Account
        if frappe.db.exists("Momentum Account", customer_id):
            distributor = frappe.db.get_value("Momentum Account", customer_id, "distributor")
        else:
            # Check if customer_id is linked to a Momentum Account
            distributor = frappe.db.get_value("Momentum Account", {"linked_customer": customer_id}, "distributor")

    # Fallback: Check Customer.assigned_distributor
    if not distributor:
        distributor = frappe.db.get_value("Customer", customer_id, "assigned_distributor")

    if distributor:
        # SSOT: Momentum Account - Get distributor name from Momentum Account or Customer
        distributor_name = None
        if frappe.db.exists("DocType", "Momentum Account"):
            distributor_name = frappe.db.get_value("Momentum Account", {"linked_customer": distributor}, "account_name")
        if not distributor_name:
            distributor_name = frappe.db.get_value("Customer", distributor, "customer_name")  # Fallback
        return {
            "id": distributor,
            "name": distributor_name
        }
    return None


@frappe.whitelist()
def get_order_detail(order_id):
    """Get full order detail including items, customer, distributor info, and sales_type"""
    require_auth()
    if not order_id:
        frappe.throw(_("Order ID is required"))

    is_sales_order = frappe.db.exists("Sales Order", order_id)

    # TEMPORALMENTE DESHABILITADO: Distributor Sell Out Order tiene datos de otra DB
    has_sell_out_doctype = False  # frappe.db.exists("DocType", "Distributor Sell Out Order")
    is_sell_out_order = False
    # if has_sell_out_doctype:
    #     is_sell_out_order = frappe.db.exists("Distributor Sell Out Order", order_id)

    if not is_sales_order and not is_sell_out_order:
        frappe.throw(_("Order {0} not found").format(order_id))

    if is_sales_order:
        # Get order header
        order = frappe.get_doc("Sales Order", order_id, ignore_permissions=True)

        # Map Frappe status to React status
        # NOTE: ERPNext "Completed" = delivered + invoiced, NOT paid.
        # Must check outstanding_amount on linked invoices to determine if truly paid.
        status_map = {
            "Draft": "draft",
            "To Deliver and Bill": "confirmed",
            "To Bill": "delivered",
            "To Deliver": "invoiced",
            "Completed": "invoiced",  # Default = invoiced, override to "paid" below if zero outstanding
            "Cancelled": "cancelled",
            "Closed": "closed",
            "On Hold": "confirmed"
        }

        react_status = status_map.get(order.status, "draft")

        # For Completed/Closed orders, check if all linked invoices are fully paid
        if order.status in ("Completed", "Closed"):
            invoices = frappe.get_all("Sales Invoice Item",
                filters={"sales_order": order.name, "docstatus": 1},
                fields=["parent"],
                group_by="parent"
            )
            if invoices:
                all_paid = True
                for inv_item in invoices:
                    outstanding = frappe.db.get_value("Sales Invoice", inv_item.parent, "outstanding_amount")
                    if flt(outstanding) > 0:
                        all_paid = False
                        break
                if all_paid:
                    react_status = "paid"

        # Get order items
        items = []
        for item in order.items:
            items.append({
                "itemCode": item.item_code,
                "itemName": item.item_name,
                "qty": flt(item.qty),
                "rate": flt(item.rate),
                "amount": flt(item.amount)
            })

        # Determine sales_type (sell_in by default, check for custom field)
        sales_type = "sell_in"
        if hasattr(order, "sales_type") and order.sales_type:
            # Map Frappe field to React format
            if order.sales_type in ["Sell In", "sell_in"]:
                sales_type = "sell_in"
            elif order.sales_type in ["Sell Out", "sell_out"]:
                sales_type = "sell_out"

        # SSOT: Momentum Account - Get assigned distributor
        assigned_distributor = None
        if order.customer:
            distributor_id = None
            # SSOT: Momentum Account - Try Momentum Account first
            if frappe.db.exists("DocType", "Momentum Account"):
                distributor_id = frappe.db.get_value("Momentum Account", {"linked_customer": order.customer}, "distributor")
            if not distributor_id:
                distributor_id = frappe.db.get_value("Customer", order.customer, "assigned_distributor")  # Fallback

            if distributor_id:
                # SSOT: Momentum Account - Get distributor name
                distributor_name = None
                if frappe.db.exists("DocType", "Momentum Account"):
                    distributor_name = frappe.db.get_value("Momentum Account", {"linked_customer": distributor_id}, "account_name")
                if not distributor_name:
                    distributor_name = frappe.db.get_value("Customer", distributor_id, "customer_name")  # Fallback
                assigned_distributor = {
                    "id": distributor_id,
                    "name": distributor_name
                }

        # Return format matching OrderDetail interface
        return {
            "id": order.name,
            "orderNumber": order.name,
            "customerId": order.customer or "",
            "customerName": order.customer_name or order.customer or "",
            "orderDate": str(order.transaction_date) if order.transaction_date else "",
            "deliveryDate": str(order.delivery_date) if order.delivery_date else "",
            "status": react_status,
            "items": items,
            "subtotal": flt(order.net_total or order.grand_total),
            "tax": flt(order.total_taxes_and_charges or 0),
            "total": flt(order.grand_total),
            "deliveryProgress": flt(order.per_delivered or 0),
            "invoiceProgress": flt(order.per_billed or 0),
            "salesType": sales_type,
            "priceList": order.selling_price_list or resolve_selling_price_list(sales_type),
            "priceListCurrency": order.price_list_currency or order.currency or "EUR",
            "assignedDistributor": assigned_distributor
        }

    # Distributor Sell Out Order detail
    order = frappe.get_doc("Distributor Sell Out Order", order_id, ignore_permissions=True)

    sell_out_status_map = {
        "Pending": "confirmed",
        "In Progress": "in_transit",
        "Delivered": "delivered",
        "Issue": "confirmed",
        "Cancelled": "cancelled"
    }
    sell_out_delivery_progress = {
        "Pending": 0,
        "In Progress": 50,
        "Delivered": 100,
        "Issue": 50,
        "Cancelled": 0
    }

    items = []
    for item in order.items:
        items.append({
            "itemCode": item.item_code,
            "itemName": item.item_name,
            "qty": flt(item.qty),
            "rate": flt(item.rate),
            "amount": flt(item.amount)
        })

    assigned_distributor = None
    if order.distributor:
        assigned_distributor = {
            "id": order.distributor,
            "name": order.distributor_name or order.distributor
        }

    resolved_price_list = getattr(order, "price_list", None) or resolve_selling_price_list("sell_out")
    return {
        "id": order.name,
        "orderNumber": order.name,
        "customerId": order.customer or "",
        "customerName": order.customer_name or order.customer or "",
        "orderDate": str(order.order_date) if order.order_date else "",
        "deliveryDate": str(order.expected_delivery_date) if order.expected_delivery_date else "",
        "status": sell_out_status_map.get(order.status, "confirmed"),
        "items": items,
        "subtotal": flt(order.total_amount or 0),
        "tax": 0,
        "total": flt(order.total_amount or 0),
        "deliveryProgress": sell_out_delivery_progress.get(order.status, 0),
        "invoiceProgress": 0,
        "salesType": "sell_out",
        "priceList": resolved_price_list,
        "priceListCurrency": get_price_list_currency(resolved_price_list, "EUR"),
        "assignedDistributor": assigned_distributor
    }


@frappe.whitelist()
def update_order(order_id, data):
    """Update an existing order - handles both Sales Order (Sell In) and Distributor Sell Out Order (Sell Out)"""
    require_auth()
    if isinstance(data, str):
        data = json.loads(data)

    if not order_id:
        frappe.throw(_("Order ID is required"))

    # Determine document type - check Sales Order first
    # TEMPORALMENTE DESHABILITADO: Distributor Sell Out Order tiene datos de otra DB
    doc = None
    doctype = None

    if frappe.db.exists("Sales Order", order_id):
        doctype = "Sales Order"
        doc = frappe.get_doc("Sales Order", order_id)
    # elif frappe.db.exists("Distributor Sell Out Order", order_id):
    #     doctype = "Distributor Sell Out Order"
    #     doc = frappe.get_doc("Distributor Sell Out Order", order_id)
    else:
        frappe.throw(_("Order {0} not found").format(order_id))

    # Check permission
    if not frappe.has_permission(doctype, "write", doc=doc):
        frappe.throw(_("No permission to update this order"))

    # Only allow updates for draft or confirmed orders
    if doctype == "Sales Order":
        # Draft = docstatus 0, Confirmed = docstatus 1 with certain statuses
        if doc.docstatus == 2:  # Cancelled
            frappe.throw(_("Cannot update a cancelled order"))
        if doc.docstatus == 1 and doc.status not in ["To Deliver and Bill", "On Hold", "To Deliver", "To Bill"]:
            frappe.throw(_("Cannot update order with status {0}").format(doc.status))
    else:  # Distributor Sell Out Order
        if doc.status in ["Cancelled", "Delivered", "Completed"]:
            frappe.throw(_("Cannot update order with status {0}").format(doc.status))

    # Update delivery_date if provided
    if data.get("deliveryDate"):
        if doctype == "Sales Order":
            doc.delivery_date = data["deliveryDate"]
        else:
            doc.expected_delivery_date = data["deliveryDate"]

    # Update sales_type/price list if provided (only for Sales Order)
    price_list_override = data.get("priceList")
    if doctype == "Sales Order":
        if data.get("salesType"):
            sales_type_map = {
                "sell_in": "Sell In",
                "sell_out": "Sell Out"
            }
            if hasattr(doc, "sales_type"):
                doc.sales_type = sales_type_map.get(data["salesType"], "Sell In")

        if data.get("salesType") or price_list_override:
            existing_sales_type = doc.sales_type if hasattr(doc, "sales_type") else None
            normalized_sales_type = normalize_sales_type(data.get("salesType") or existing_sales_type)
            resolved_price_list = resolve_selling_price_list(normalized_sales_type, price_list_override)
            doc.selling_price_list = resolved_price_list
            doc.price_list_currency = get_price_list_currency(
                resolved_price_list,
                doc.price_list_currency or doc.currency or "EUR"
            )
    elif doctype == "Distributor Sell Out Order" and price_list_override and hasattr(doc, "price_list"):
        doc.price_list = price_list_override

    # Update items if provided
    if data.get("items"):
        # Clear existing items
        doc.items = []

        # Add new items
        for item_data in data["items"]:
            doc.append("items", {
                "item_code": item_data.get("itemCode") or item_data.get("item_code"),
                "qty": flt(item_data.get("qty", 0)),
                "rate": flt(item_data.get("rate", 0)),
            })

    # Save the document
    doc.save()

    # Return updated order detail using get_order_detail
    return get_order_detail(order_id)


@frappe.whitelist()
def submit_order(order_id):
    """
    Submit (confirm) a draft Sales Order.
    Changes docstatus from 0 (Draft) to 1 (Submitted).

    Args:
        order_id: Sales Order ID

    Returns:
        dict with success status and updated order
    """
    require_auth()

    if not order_id:
        frappe.throw(_("Order ID is required"))

    if not frappe.db.exists("Sales Order", order_id):
        frappe.throw(_("Sales Order {0} not found").format(order_id))

    doc = frappe.get_doc("Sales Order", order_id)

    # Check if already submitted
    if doc.docstatus == 1:
        return {
            "success": True,
            "message": _("Pedido ya está confirmado"),
            "order_id": order_id,
            "status": doc.status
        }

    # Check if cancelled
    if doc.docstatus == 2:
        frappe.throw(_("No se puede confirmar un pedido cancelado"))

    # Validate order has items
    if not doc.items or len(doc.items) == 0:
        frappe.throw(_("El pedido debe tener al menos un producto para confirmar"))

    # Submit the order
    doc.submit()

    return {
        "success": True,
        "message": _("Pedido {0} confirmado exitosamente").format(order_id),
        "order_id": order_id,
        "status": doc.status
    }


@frappe.whitelist()
def create_order(data):
    """Create a new order - routes to Sales Order (Sell In) or Distributor Sell Out Order (Sell Out)"""
    if isinstance(data, str):
        data = json.loads(data)

    # Minimal validation
    if not data.get("customer"):
        frappe.throw(_("Customer is required"))
    if not data.get("items") or len(data["items"]) == 0:
        frappe.throw(_("At least one item is required"))

    sales_type = normalize_sales_type(data.get("sales_type"))
    resolved_price_list = resolve_selling_price_list(sales_type, data.get("price_list"))
    price_list_currency = get_price_list_currency(resolved_price_list, "EUR")

    # TEMPORALMENTE DESHABILITADO: Distributor Sell Out Order tiene datos de otra DB
    # BIFURCATION: Sell Out creates Distributor Sell Out Order (NOT Sales Order)
    # if sales_type == "sell_out":
    #     require_permission("Distributor Sell Out Order", "create")
    #     return _create_sell_out_order(data, resolved_price_list)
    # else:
    require_permission("Sales Order", "create")
    return _create_sell_in_order(data, resolved_price_list, price_list_currency)


def _create_sell_in_order(data, price_list, price_list_currency):
    """Create a standard Sales Order (Sell In - Santa Brisa delivers directly)"""
    customer_id = data["customer"]

    # SSOT: Resolve ERPNext Customer from Momentum Account
    erp_customer = None
    if frappe.db.exists("DocType", "Momentum Account") and frappe.db.exists("Momentum Account", customer_id):
        # customer_id is a Momentum Account - get its linked_customer
        erp_customer = frappe.db.get_value("Momentum Account", customer_id, "linked_customer")
        if not erp_customer:
            # Auto-create linked_customer if missing
            from workhub_frappe_app.api.momentum import ensure_customer_link
            result = ensure_customer_link(customer_id)
            if result.get("success"):
                erp_customer = result.get("customer_id")

    # Fallback: customer_id might already be an ERPNext Customer
    if not erp_customer and frappe.db.exists("Customer", customer_id):
        erp_customer = customer_id

    if not erp_customer:
        frappe.throw(_("No se pudo resolver el cliente para crear la orden. Verifique que el cliente tenga un linked_customer válido."))

    doc = frappe.new_doc("Sales Order")
    doc.customer = erp_customer
    doc.transaction_date = data.get("transaction_date", today())
    doc.delivery_date = data.get("delivery_date") or add_days(today(), 7)
    doc.order_type = "Sales"
    doc.sales_type = "Sell In"

    # Company defaults — resolve from ERPNext defaults or use registered company name
    doc.company = frappe.defaults.get_defaults().get("company") or "Santa Brisa Europe SL"
    doc.currency = "EUR"
    doc.conversion_rate = 1.0
    doc.selling_price_list = price_list
    doc.price_list_currency = price_list_currency
    doc.plc_conversion_rate = 1.0

    # Items
    item_codes = [item["item_code"] for item in data["items"] if item.get("item_code")]
    price_map = get_price_list_rates(item_codes, price_list)
    for item in data["items"]:
        rate = flt(item.get("rate", 0))
        if rate <= 0:
            rate = price_map.get(item["item_code"])
            if rate is None:
                rate = frappe.db.get_value("Item", item["item_code"], "standard_rate") or 0
        doc.append("items", {
            "item_code": item["item_code"],
            "qty": flt(item["qty"]),
            "rate": rate,
        })

    doc.insert()

    return {
        "success": True,
        "order_id": doc.name,
        "total": flt(doc.grand_total),
        "order_type": "sell_in",
        "message": "Pedido creado. Santa Brisa entregará directamente."
    }


def _create_sell_out_order(data, price_list):
    """Create a Distributor Sell Out Order (Sell Out - Distributor delivers from stock)"""
    customer_id = data["customer"]

    # SSOT: Resolve ERPNext Customer from Momentum Account
    erp_customer = None
    distributor = None
    if frappe.db.exists("DocType", "Momentum Account") and frappe.db.exists("Momentum Account", customer_id):
        # customer_id is a Momentum Account
        acc = frappe.db.get_value("Momentum Account", customer_id, ["linked_customer", "distributor"], as_dict=True)
        erp_customer = acc.get("linked_customer")
        distributor = acc.get("distributor")

        # Auto-create linked_customer if missing
        if not erp_customer:
            from workhub_frappe_app.api.momentum import ensure_customer_link
            result = ensure_customer_link(customer_id)
            if result.get("success"):
                erp_customer = result.get("customer_id")
    elif frappe.db.exists("Customer", customer_id):
        # Fallback: customer_id is already an ERPNext Customer
        erp_customer = customer_id
        distributor = frappe.db.get_value("Momentum Account", {"linked_customer": customer_id}, "distributor")

    # Final fallback for distributor
    if not distributor and erp_customer:
        distributor = frappe.db.get_value("Customer", erp_customer, "assigned_distributor")

    if not erp_customer:
        frappe.throw(_("No se pudo resolver el cliente para crear la orden Sell Out."))
    if not distributor:
        frappe.throw(_("Este cliente no tiene distribuidor asignado. Asigne un distribuidor antes de crear pedidos Sell Out."))

    doc = frappe.new_doc("Distributor Sell Out Order")
    doc.customer = erp_customer
    doc.distributor = distributor
    doc.order_date = data.get("transaction_date", today())
    doc.expected_delivery_date = data.get("delivery_date") or add_days(today(), 3)  # Shorter default for distributor
    doc.status = "Pending"
    if hasattr(doc, "price_list"):
        doc.price_list = price_list

    # Items
    item_codes = [item["item_code"] for item in data["items"] if item.get("item_code")]
    price_map = get_price_list_rates(item_codes, price_list)
    for item in data["items"]:
        rate = flt(item.get("rate", 0))
        if rate <= 0:
            rate = price_map.get(item["item_code"])
            if rate is None:
                rate = frappe.db.get_value("Item", item["item_code"], "standard_rate") or 0
        doc.append("items", {
            "item_code": item["item_code"],
            "qty": flt(item["qty"]),
            "rate": rate,
        })

    doc.insert()

    # SSOT: Momentum Account - Get distributor name for message
    distributor_name = None
    if frappe.db.exists("DocType", "Momentum Account"):
        distributor_name = frappe.db.get_value("Momentum Account", {"linked_customer": distributor}, "account_name")
    if not distributor_name:
        distributor_name = frappe.db.get_value("Customer", distributor, "customer_name")  # Fallback

    return {
        "success": True,
        "order_id": doc.name,
        "total": flt(doc.total_amount),
        "order_type": "sell_out",
        "distributor": distributor,
        "distributor_name": distributor_name,
        "message": f"Pedido asignado a {distributor_name}. El distribuidor entregará desde su stock."
    }


@frappe.whitelist()
def cancel_order(order_id):
    """Cancel an order - handles both Sales Order and Distributor Sell Out Order"""
    require_auth()
    if not order_id:
        frappe.throw(_("Order ID is required"))

    # Determine document type - check Sales Order first
    # TEMPORALMENTE DESHABILITADO: Distributor Sell Out Order tiene datos de otra DB
    doc = None
    doctype = None

    if frappe.db.exists("Sales Order", order_id):
        doctype = "Sales Order"
        doc = frappe.get_doc("Sales Order", order_id)
    # elif frappe.db.exists("Distributor Sell Out Order", order_id):
    #     doctype = "Distributor Sell Out Order"
    #     doc = frappe.get_doc("Distributor Sell Out Order", order_id)
    else:
        frappe.throw(_("Order {0} not found").format(order_id))

    # Check permission
    if not frappe.has_permission(doctype, "cancel", doc=doc):
        frappe.throw(_("No permission to cancel this order"))

    # Only allow cancellation for draft or confirmed orders
    if doctype == "Sales Order":
        # Check if already cancelled
        if doc.docstatus == 2:
            frappe.throw(_("Order is already cancelled"))

        # Check if order can be cancelled (must be draft or submitted)
        if doc.docstatus == 1 and doc.status in ["Completed", "Closed"]:
            frappe.throw(_("Cannot cancel order with status {0}").format(doc.status))

        # Cancel the order
        if doc.docstatus == 1:  # Submitted order
            doc.cancel()
        else:  # Draft order
            doc.docstatus = 2  # Set to cancelled
            doc.status = "Cancelled"
            doc.save()
    else:  # Distributor Sell Out Order
        # Check if already cancelled
        if doc.status == "Cancelled":
            frappe.throw(_("Order is already cancelled"))

        # Check if order can be cancelled
        if doc.status in ["Delivered", "Completed"]:
            frappe.throw(_("Cannot cancel order with status {0}").format(doc.status))

        # Cancel the order
        doc.status = "Cancelled"
        doc.save()

    return {
        "success": True,
        "order_id": order_id,
        "message": _("Order {0} has been cancelled").format(order_id)
    }


def _get_latest_delivery_note(order_id: str) -> str | None:
    rows = frappe.db.sql("""
        SELECT DISTINCT parent
        FROM `tabDelivery Note Item`
        WHERE against_sales_order = %s
    """, (order_id,), as_dict=True)
    if not rows:
        return None
    names = [row["parent"] for row in rows]
    latest = frappe.get_list(
        "Delivery Note",
        filters={"name": ["in", names], "docstatus": ["!=", 2]},
        fields=["name"],
        order_by="creation desc",
        limit_page_length=1
    )
    return latest[0].name if latest else None


def _get_latest_sales_invoice(order_id: str) -> str | None:
    rows = frappe.db.sql("""
        SELECT DISTINCT parent
        FROM `tabSales Invoice Item`
        WHERE sales_order = %s
    """, (order_id,), as_dict=True)
    if not rows:
        return None
    names = [row["parent"] for row in rows]
    latest = frappe.get_list(
        "Sales Invoice",
        filters={"name": ["in", names], "docstatus": ["!=", 2]},
        fields=["name"],
        order_by="creation desc",
        limit_page_length=1
    )
    return latest[0].name if latest else None


def _get_payment_entry_for_invoice(invoice_id: str) -> str | None:
    rows = frappe.db.sql("""
        SELECT DISTINCT parent
        FROM `tabPayment Entry Reference`
        WHERE reference_doctype = 'Sales Invoice' AND reference_name = %s
    """, (invoice_id,), as_dict=True)
    if not rows:
        return None
    names = [row["parent"] for row in rows]
    latest = frappe.get_list(
        "Payment Entry",
        filters={"name": ["in", names], "docstatus": ["!=", 2]},
        fields=["name"],
        order_by="creation desc",
        limit_page_length=1
    )
    return latest[0].name if latest else None


@frappe.whitelist()
def create_delivery_note(order_id, submit=1, transport_method=None):
    """Create Delivery Note from Sales Order (auto-submit Sales Order if needed)."""
    require_permission("Delivery Note", "create")
    if not order_id:
        frappe.throw(_("Order ID is required"))

    existing = _get_latest_delivery_note(order_id)
    if existing:
        if transport_method:
            delivery_note = frappe.get_doc("Delivery Note", existing)
            if hasattr(delivery_note, "workhub_transport_method"):
                delivery_note.workhub_transport_method = transport_method
                delivery_note.save()
        return {
            "success": True,
            "sales_order_id": order_id,
            "delivery_note_id": existing,
            "message": _("Delivery Note already exists")
        }

    sales_order = frappe.get_doc("Sales Order", order_id)
    if sales_order.docstatus == 0:
        sales_order.submit()

    delivery_note = make_delivery_note(order_id)
    if transport_method and hasattr(delivery_note, "workhub_transport_method"):
        delivery_note.workhub_transport_method = transport_method
    delivery_note.insert()
    if int(submit) == 1:
        delivery_note.submit()

    return {
        "success": True,
        "sales_order_id": order_id,
        "delivery_note_id": delivery_note.name,
        "message": _("Delivery Note {0} created").format(delivery_note.name)
    }


@frappe.whitelist()
def create_sales_invoice(order_id, delivery_note_id=None, submit=1):
    """Create Sales Invoice from Delivery Note (if provided) or Sales Order."""
    require_permission("Sales Invoice", "create")
    if not order_id:
        frappe.throw(_("Order ID is required"))

    existing = _get_latest_sales_invoice(order_id)
    if existing:
        return {
            "success": True,
            "sales_order_id": order_id,
            "sales_invoice_id": existing,
            "message": _("Sales Invoice already exists")
        }

    if not delivery_note_id:
        delivery_note_id = _get_latest_delivery_note(order_id)

    if delivery_note_id:
        sales_invoice = make_sales_invoice_from_dn(delivery_note_id)
    else:
        sales_order = frappe.get_doc("Sales Order", order_id)
        if sales_order.docstatus == 0:
            sales_order.submit()
        sales_invoice = make_sales_invoice(order_id)

    sales_invoice.insert()
    if int(submit) == 1:
        sales_invoice.submit()

    return {
        "success": True,
        "sales_order_id": order_id,
        "sales_invoice_id": sales_invoice.name,
        "message": _("Sales Invoice {0} created").format(sales_invoice.name)
    }


@frappe.whitelist()
def create_payment_entry(order_id=None, sales_invoice_id=None, submit=1):
    """Create Payment Entry for a Sales Invoice."""
    require_permission("Payment Entry", "create")
    if not sales_invoice_id:
        if not order_id:
            frappe.throw(_("Order ID or Sales Invoice ID is required"))
        sales_invoice_id = _get_latest_sales_invoice(order_id)
        if not sales_invoice_id:
            frappe.throw(_("No Sales Invoice found for this order"))

    existing = _get_payment_entry_for_invoice(sales_invoice_id)
    if existing:
        return {
            "success": True,
            "sales_invoice_id": sales_invoice_id,
            "payment_entry_id": existing,
            "message": _("Payment Entry already exists")
        }

    payment_entry = get_payment_entry("Sales Invoice", sales_invoice_id)
    payment_entry.insert()
    if int(submit) == 1:
        payment_entry.submit()

    return {
        "success": True,
        "sales_invoice_id": sales_invoice_id,
        "payment_entry_id": payment_entry.name,
        "message": _("Payment Entry {0} created").format(payment_entry.name)
    }


@frappe.whitelist()
def get_order_worklinks(order_id):
    """Get WorkLink associations for an order"""
    require_auth()
    if not order_id:
        frappe.throw(_("Order ID is required"))

    source_doctype = "Sales Order"
    # TEMPORALMENTE DESHABILITADO: Distributor Sell Out Order tiene datos de otra DB
    # if not frappe.db.exists("Sales Order", order_id) and frappe.db.exists("Distributor Sell Out Order", order_id):
    #     source_doctype = "Distributor Sell Out Order"

    # Get WorkLinks where source_doctype matches order type and source_id matches order_id
    worklinks = frappe.get_list("WorkLink",
        filters={
            "source_doctype": source_doctype,
            "source_id": order_id
        },
        fields=["name", "leantime_task_id", "status", "wh_task"],
        order_by="creation desc",
        ignore_permissions=True
    )

    # Transform to include task info
    result = []
    for wl in worklinks:
        task_title = ""
        task_status = wl.get("status", "BACKLOG")

        # Get task title from WH Task if linked
        if wl.get("wh_task"):
            wh_task = frappe.db.get_value("WH Task", wl["wh_task"], ["title", "status"], as_dict=True)
            if wh_task:
                task_title = wh_task.get("title", "")
                task_status = wh_task.get("status", task_status)

        # If no WH Task, use leantime_task_id as fallback title
        if not task_title and wl.get("leantime_task_id"):
            task_title = f"Task {wl['leantime_task_id']}"

        result.append({
            "id": wl["name"],
            "taskId": wl.get("wh_task") or wl.get("leantime_task_id") or "",
            "taskTitle": task_title,
            "taskStatus": task_status
        })

    return result

@frappe.whitelist()
def create_customer(data):
    """
    Create a new customer in Momentum Account (SSOT) and sync to ERPNext Customer.

    ARQUITECTURA UNIFICADA:
    1. Crear Momentum Account primero (fuente de verdad)
    2. Crear ERPNext Customer para compatibilidad con facturas
    3. Vincular ambos via linked_customer
    """
    require_auth()
    if isinstance(data, str):
        data = json.loads(data)

    account_name = data.get("name")
    email = data.get("contactEmail")
    phone = data.get("contactPhone")

    # Check for duplicate Momentum Account
    existing_account = frappe.db.exists("Momentum Account", {"account_name": account_name})
    if existing_account:
        frappe.throw(
            _("Ya existe una cuenta con el nombre '{0}' (ID: {1})").format(
                account_name, existing_account
            ),
            title=_("Cuenta Duplicada")
        )

    # Check for duplicate by email in Momentum Account
    if email:
        existing_by_email = frappe.db.exists("Momentum Account", {"email": email})
        if existing_by_email:
            existing_name = frappe.db.get_value("Momentum Account", existing_by_email, "account_name")
            frappe.throw(
                _("Ya existe una cuenta con el email '{0}' (Cuenta: {1})").format(
                    email, existing_name
                ),
                title=_("Email Duplicado")
            )

    # Determine account type and sale type
    account_type = "Lead"  # New accounts start as leads
    sale_type = "Sell Out"  # Default to Sell Out
    if data.get("type") == "distributor":
        sale_type = "Sell In"
        account_type = "Customer"  # Distributors are already customers

    # Determine starting column
    starting_column = data.get("column", "Backlog")
    if starting_column not in ["Backlog", "Pipeline", "Hot", "Won", "Lost", "Loyalty"]:
        starting_column = "Backlog"

    # 1. Create Momentum Account (SSOT)
    momentum_account = frappe.new_doc("Momentum Account")
    momentum_account.account_name = account_name
    momentum_account.account_type = account_type
    momentum_account.sale_type = sale_type
    momentum_account.sales_channel = data.get("salesChannel", "Horeca")
    momentum_account.level = data.get("level", "1")
    momentum_account.column = starting_column
    momentum_account.assigned_to = data.get("assignedTo") or frappe.session.user
    momentum_account.is_target = data.get("isTarget", 0)
    # Contact info
    momentum_account.contact_name = data.get("contactName") or account_name
    momentum_account.email = email
    momentum_account.phone = phone
    momentum_account.mobile = phone  # Use same for mobile
    # Location
    momentum_account.city = data.get("zone") or data.get("city")
    momentum_account.address = data.get("address")
    momentum_account.postal_code = data.get("postalCode")
    # Distributor (for Sell Out accounts)
    if data.get("assignedDistributor"):
        momentum_account.distributor = data.get("assignedDistributor")
    # Notes
    momentum_account.notes = data.get("notes")

    momentum_account.insert(ignore_permissions=True)

    # 2. Create ERPNext Customer for invoice compatibility
    erp_customer = None
    try:
        erp_customer = frappe.new_doc("Customer")
        erp_customer.customer_name = account_name
        erp_customer.customer_group = "Distributor" if data.get("type") == "distributor" else "Individual"
        erp_customer.territory = data.get("zone") or "All Territories"
        erp_customer.mobile_no = phone
        erp_customer.email_id = email
        if data.get("assignedDistributor"):
            erp_customer.assigned_distributor = data.get("assignedDistributor")
        erp_customer.insert(ignore_permissions=True)

        # 3. Link Momentum Account to ERPNext Customer
        momentum_account.linked_customer = erp_customer.name
        momentum_account.save(ignore_permissions=True)

    except Exception as e:
        frappe.log_error(
            f"Error creating ERPNext Customer for {account_name}: {str(e)}",
            "WorkHub Sales API - Customer Sync"
        )
        # Don't fail - Momentum Account is created, Customer can be synced later

    # 4. Create initial activity
    try:
        activity = frappe.new_doc("Momentum Activity")
        activity.momentum_account = momentum_account.name
        activity.activity_type = "Note"
        activity.outcome = "Neutral"
        activity.notes = f"Cuenta creada desde Panel de Ventas"
        activity.performed_by = frappe.session.user
        activity.insert(ignore_permissions=True)
    except Exception as e:
        frappe.log_error(f"Error creating activity: {str(e)}", "WorkHub Sales API")

    return {
        "id": momentum_account.name,  # Return Momentum Account ID
        "linkedCustomer": erp_customer.name if erp_customer else None,
        "column": momentum_account.column,
        "message": "Cuenta creada exitosamente"
    }

@frappe.whitelist()
def update_customer(customer_id, data):
    """
    Update a customer - works with Momentum Account (SSOT) and syncs to ERPNext Customer.

    ARQUITECTURA UNIFICADA:
    - customer_id puede ser Momentum Account ID o ERPNext Customer ID
    - Actualiza Momentum Account primero
    - Sincroniza cambios a ERPNext Customer si existe
    """
    require_auth()
    if isinstance(data, str):
        data = json.loads(data)

    # Determine if customer_id is Momentum Account or ERPNext Customer
    momentum_account = None
    erp_customer = None

    if frappe.db.exists("Momentum Account", customer_id):
        momentum_account = frappe.get_doc("Momentum Account", customer_id)
        if momentum_account.linked_customer:
            erp_customer = frappe.get_doc("Customer", momentum_account.linked_customer)
    elif frappe.db.exists("Customer", customer_id):
        erp_customer = frappe.get_doc("Customer", customer_id)
        # Find linked Momentum Account
        linked_account = frappe.db.get_value(
            "Momentum Account",
            {"linked_customer": customer_id},
            "name"
        )
        if linked_account:
            momentum_account = frappe.get_doc("Momentum Account", linked_account)
    else:
        frappe.throw(_("Cuenta no encontrada: {0}").format(customer_id))

    # Update Momentum Account (SSOT)
    if momentum_account:
        if data.get("name"):
            momentum_account.account_name = data.get("name")
        if data.get("contactName"):
            momentum_account.contact_name = data.get("contactName")
        if data.get("contactEmail"):
            momentum_account.email = data.get("contactEmail")
        if data.get("contactPhone"):
            momentum_account.phone = data.get("contactPhone")
            momentum_account.mobile = data.get("contactPhone")
        if data.get("zone") or data.get("city"):
            momentum_account.city = data.get("zone") or data.get("city")
        if data.get("address"):
            momentum_account.address = data.get("address")
        if data.get("postalCode"):
            momentum_account.postal_code = data.get("postalCode")
        if data.get("salesChannel"):
            momentum_account.sales_channel = data.get("salesChannel")
        if data.get("level"):
            momentum_account.level = data.get("level")
        if data.get("notes"):
            momentum_account.notes = data.get("notes")
        if "assignedDistributor" in data:
            momentum_account.distributor = data.get("assignedDistributor")
        if data.get("assignedTo"):
            momentum_account.assigned_to = data.get("assignedTo")

        momentum_account.save()

    # Sync to ERPNext Customer
    if erp_customer:
        if data.get("name"):
            erp_customer.customer_name = data.get("name")
        if data.get("type"):
            erp_customer.customer_group = "Distributor" if data.get("type") == "distributor" else "Individual"
        if data.get("zone"):
            erp_customer.territory = data.get("zone")
        if data.get("contactPhone"):
            erp_customer.mobile_no = data.get("contactPhone")
        if data.get("contactEmail"):
            erp_customer.email_id = data.get("contactEmail")
        if "assignedDistributor" in data:
            erp_customer.assigned_distributor = data.get("assignedDistributor")

        erp_customer.save()

    return {
        "id": momentum_account.name if momentum_account else erp_customer.name,
        "linkedCustomer": erp_customer.name if erp_customer else None
    }

@frappe.whitelist()
def delete_customer(customer_id):
    """Delete (or disable) a customer"""
    require_auth()

    # Check if customer has transactions
    if frappe.db.exists("Sales Order", {"customer": customer_id}):
         # If has transactions, just disable
         doc = frappe.get_doc("Customer", customer_id)
         doc.disabled = 1
         doc.save()
         return {"status": "disabled", "message": "Customer disabled due to existing transactions"}

    frappe.delete_doc("Customer", customer_id)
    return {"status": "deleted"}


# =============================================================================
# DUPLICATE CHECK API - Validacion de duplicados
# =============================================================================

@frappe.whitelist()
def check_customer_duplicates(name=None, email=None):
    """
    API para verificar duplicados antes de crear un cliente.
    Usado por el frontend para mostrar advertencias.

    Args:
        name: Nombre del cliente a verificar
        email: Email a verificar

    Returns:
        dict con duplicados encontrados por categoria
    """
    require_auth()

    from workhub_frappe_app.services.crm_sync import check_duplicate_customer

    if not name and not email:
        return {"error": "Se requiere nombre o email"}

    duplicates = check_duplicate_customer(name, email)

    # Formatear respuesta para frontend
    result = {
        "hasDuplicates": False,
        "duplicates": [],
        "warnings": []
    }

    # Duplicados exactos (bloquean creacion)
    if duplicates.get("by_name"):
        result["hasDuplicates"] = True
        for item in duplicates["by_name"]:
            result["duplicates"].append({
                "type": "exact_name",
                "id": item["id"],
                "name": item["name"],
                "message": f"Ya existe un cliente con el nombre '{item['name']}'"
            })

    if duplicates.get("by_email"):
        result["hasDuplicates"] = True
        for item in duplicates["by_email"]:
            result["duplicates"].append({
                "type": "exact_email",
                "id": item["id"],
                "name": item["name"],
                "message": f"Ya existe un cliente con el email"
            })

    # Advertencias (no bloquean pero informan)
    if duplicates.get("in_crm_org"):
        for item in duplicates["in_crm_org"]:
            result["warnings"].append({
                "type": "crm_organization",
                "id": item["id"],
                "name": item["name"],
                "message": f"Existe una organizacion CRM: {item['name']}"
            })

    if duplicates.get("in_crm_lead"):
        for item in duplicates["in_crm_lead"]:
            result["warnings"].append({
                "type": "crm_lead",
                "id": item["id"],
                "name": item["name"],
                "status": item.get("status"),
                "message": f"Existe un prospecto activo: {item['name']} ({item.get('status', '')})"
            })

    return result


@frappe.whitelist()
def get_prospects(filters=None, limit=20, offset=0):
    """
    Get CRM Leads (prospectos) separados de Customers.
    Endpoint dedicado para prospectos sin mezclar con clientes.

    Returns:
        Lista de prospectos activos
    """
    require_auth()

    if filters and isinstance(filters, str):
        filters = json.loads(filters)

    # Check if CRM Lead exists
    is_crm = frappe.db.exists("DocType", "CRM Lead")
    if not is_crm:
        # Fallback to standard Lead
        doctype = "Lead"
        filter_dict = {"status": ["not in", ["Converted", "Do Not Contact"]]}
        fields = ["name", "lead_name", "email_id", "mobile_no", "company_name", "status", "source", "creation"]
    else:
        doctype = "CRM Lead"
        filter_dict = {"status": ["not in", ["Converted", "Do Not Contact"]]}
        fields = ["name", "lead_name", "organization", "email", "mobile_no", "status", "source", "creation", "lead_owner"]

    if filters:
        if filters.get("search"):
            filter_dict["lead_name"] = ["like", f"%{filters['search']}%"]
        if filters.get("status"):
            filter_dict["status"] = filters["status"]

    leads = frappe.get_list(
        doctype,
        filters=filter_dict,
        fields=fields,
        order_by="creation desc",
        limit_page_length=int(limit),
        limit_start=int(offset)
    )

    # Transform to consistent format
    result = []
    for lead in leads:
        result.append({
            "id": lead.name,
            "name": lead.lead_name or (lead.get("company_name") if not is_crm else lead.get("organization")) or "Sin nombre",
            "organization": lead.get("organization") if is_crm else lead.get("company_name"),
            "email": lead.get("email") if is_crm else lead.get("email_id"),
            "phone": lead.mobile_no,
            "status": lead.status,
            "source": lead.source,
            "type": "prospect",
            "createdAt": str(lead.creation).split(' ')[0] if lead.creation else None,
            "owner": lead.get("lead_owner") if is_crm else None
        })

    return result


# =============================================================================
# INVOICES API - Facturación
# =============================================================================

@frappe.whitelist()
def get_invoices(filters=None, limit=50, offset=0):
    """
    Get Sales Invoices with filters for the Invoice List Page.

    Filters:
        - status: draft, unpaid, paid, overdue, cancelled
        - search: search by invoice name or customer name
        - customer: filter by customer ID
        - date_from, date_to: date range
    """
    require_auth()
    if filters and isinstance(filters, str):
        filters = json.loads(filters)

    limit = int(limit) if limit else 50
    offset = int(offset) if offset else 0

    # Base filters
    filter_conditions = {}
    or_filters = []

    if filters:
        # Status filter - map to Frappe statuses
        if filters.get("status"):
            status = filters["status"]
            if status == "draft":
                filter_conditions["docstatus"] = 0
            elif status == "unpaid":
                filter_conditions["docstatus"] = 1
                filter_conditions["outstanding_amount"] = [">", 0]
            elif status == "paid":
                filter_conditions["docstatus"] = 1
                filter_conditions["outstanding_amount"] = 0
            elif status == "overdue":
                filter_conditions["docstatus"] = 1
                filter_conditions["outstanding_amount"] = [">", 0]
                filter_conditions["due_date"] = ["<", today()]
            elif status == "cancelled":
                filter_conditions["docstatus"] = 2

        # Search filter
        if filters.get("search"):
            search = filters["search"]
            or_filters = [
                ["name", "like", f"%{search}%"],
                ["customer_name", "like", f"%{search}%"]
            ]

        # Customer filter
        if filters.get("customer"):
            filter_conditions["customer"] = filters["customer"]

        # Date range
        if filters.get("date_from"):
            filter_conditions["posting_date"] = [">=", filters["date_from"]]
        if filters.get("date_to"):
            if "posting_date" in filter_conditions:
                filter_conditions["posting_date"] = ["between", [filters.get("date_from"), filters["date_to"]]]
            else:
                filter_conditions["posting_date"] = ["<=", filters["date_to"]]

    # Query invoices
    invoices = frappe.get_list("Sales Invoice",
        filters=filter_conditions,
        or_filters=or_filters if or_filters else None,
        fields=[
            "name", "customer", "customer_name", "posting_date", "due_date",
            "grand_total", "outstanding_amount", "currency", "docstatus",
            "status", "territory", "sales_order", "creation"
        ],
        limit_page_length=limit,
        limit_start=offset,
        order_by="posting_date desc, creation desc"
    )

    # Transform to frontend format
    result = []
    for inv in invoices:
        # Determine UI status
        ui_status = "draft"
        if inv.docstatus == 2:
            ui_status = "cancelled"
        elif inv.docstatus == 1:
            if flt(inv.outstanding_amount) == 0:
                ui_status = "paid"
            elif inv.due_date and get_datetime(inv.due_date) < get_datetime(today()):
                ui_status = "overdue"
            else:
                ui_status = "unpaid"

        # Calculate days overdue
        days_overdue = 0
        if ui_status == "overdue" and inv.due_date:
            days_overdue = (get_datetime(today()) - get_datetime(inv.due_date)).days

        result.append({
            "id": inv.name,
            "invoiceNumber": inv.name,
            "customerId": inv.customer,
            "customerName": inv.customer_name,
            "invoiceDate": str(inv.posting_date) if inv.posting_date else None,
            "dueDate": str(inv.due_date) if inv.due_date else None,
            "total": flt(inv.grand_total),
            "outstanding": flt(inv.outstanding_amount),
            "paid": flt(inv.grand_total) - flt(inv.outstanding_amount),
            "currency": inv.currency or "EUR",
            "status": ui_status,
            "daysOverdue": days_overdue,
            "salesOrderId": inv.sales_order,
            "zone": inv.territory or "Sin zona"
        })

    return result


@frappe.whitelist()
def get_invoice_detail(invoice_id):
    """
    Get detailed invoice information including line items and payment history.
    """
    require_auth()
    if not invoice_id:
        frappe.throw(_("Invoice ID is required"))

    inv = frappe.get_doc("Sales Invoice", invoice_id)

    # Get line items
    items = []
    for item in inv.items:
        items.append({
            "id": item.name,
            "itemCode": item.item_code,
            "itemName": item.item_name,
            "description": item.description,
            "qty": flt(item.qty),
            "uom": item.uom,
            "rate": flt(item.rate),
            "amount": flt(item.amount),
            "warehouse": item.warehouse
        })

    # Get payment entries linked to this invoice
    payments = []
    payment_refs = frappe.get_all("Payment Entry Reference",
        filters={"reference_doctype": "Sales Invoice", "reference_name": invoice_id},
        fields=["parent", "allocated_amount"]
    )

    for ref in payment_refs:
        pe = frappe.db.get_value("Payment Entry", ref.parent,
            ["name", "posting_date", "mode_of_payment", "docstatus"], as_dict=True)
        if pe and pe.docstatus == 1:
            payments.append({
                "id": pe.name,
                "paymentNumber": pe.name,
                "date": str(pe.posting_date),
                "amount": flt(ref.allocated_amount),
                "method": pe.mode_of_payment or "Transferencia"
            })

    # Determine UI status
    ui_status = "draft"
    if inv.docstatus == 2:
        ui_status = "cancelled"
    elif inv.docstatus == 1:
        if flt(inv.outstanding_amount) == 0:
            ui_status = "paid"
        elif inv.due_date and get_datetime(inv.due_date) < get_datetime(today()):
            ui_status = "overdue"
        else:
            ui_status = "unpaid"

    days_overdue = 0
    if ui_status == "overdue" and inv.due_date:
        days_overdue = (get_datetime(today()) - get_datetime(inv.due_date)).days

    # Tax breakdown — individual tax rows from the invoice
    tax_breakdown = []
    for tax in inv.taxes:
        tax_breakdown.append({
            "description": tax.description,
            "rate": flt(tax.rate),
            "tax_amount": flt(tax.tax_amount),
            "total": flt(tax.total)
        })

    # Get linked Sales Order info — from ALL items (deduplicated)
    so_names = list(set(item.sales_order for item in inv.items if item.sales_order))
    sales_order_info = None
    sales_orders_list = []
    for so_name in so_names:
        so = frappe.db.get_value("Sales Order", so_name,
            ["name", "transaction_date", "status"], as_dict=True)
        if so:
            so_data = {
                "id": so.name,
                "date": str(so.transaction_date),
                "status": so.status
            }
            sales_orders_list.append(so_data)
            if not sales_order_info:
                sales_order_info = so_data  # Keep first for backward compat

    # Get linked Delivery Note info — from ALL items (deduplicated)
    dn_names = list(set(item.delivery_note for item in inv.items if item.delivery_note))
    delivery_note_info = None
    delivery_notes_list = []
    for dn_name in dn_names:
        dn = frappe.db.get_value("Delivery Note", dn_name,
            ["name", "posting_date", "status"], as_dict=True)
        if dn:
            dn_data = {
                "id": dn.name,
                "date": str(dn.posting_date),
                "status": dn.status
            }
            delivery_notes_list.append(dn_data)
            if not delivery_note_info:
                delivery_note_info = dn_data  # Keep first for backward compat

    return {
        "id": inv.name,
        "invoiceNumber": inv.name,
        "customerId": inv.customer,
        "customerName": inv.customer_name,
        "customerAddress": inv.address_display or "",
        "invoiceDate": str(inv.posting_date) if inv.posting_date else None,
        "dueDate": str(inv.due_date) if inv.due_date else None,
        "total": flt(inv.grand_total),
        "subtotal": flt(inv.net_total),
        "tax": flt(inv.total_taxes_and_charges),
        "outstanding": flt(inv.outstanding_amount),
        "paid": flt(inv.grand_total) - flt(inv.outstanding_amount),
        "currency": inv.currency or "EUR",
        "status": ui_status,
        "daysOverdue": days_overdue,
        "zone": inv.territory or "Sin zona",
        "items": items,
        "payments": payments,
        "taxBreakdown": tax_breakdown,
        "salesOrder": sales_order_info,
        "salesOrders": sales_orders_list,
        "deliveryNote": delivery_note_info,
        "deliveryNotes": delivery_notes_list,
        "notes": inv.remarks or "",
        "createdAt": str(inv.creation),
        "modifiedAt": str(inv.modified)
    }


@frappe.whitelist()
def get_invoice_kpis():
    """
    Get invoice dashboard KPIs - TDAH friendly: only 4 key metrics.
    """
    require_auth()

    first_day = get_first_day(today())
    last_day = get_last_day(today())

    # Total invoiced this month
    invoiced_this_month = frappe.db.sql("""
        SELECT COALESCE(SUM(grand_total), 0) as total
        FROM `tabSales Invoice`
        WHERE posting_date BETWEEN %s AND %s AND docstatus = 1
    """, (first_day, last_day), as_dict=True)[0].total

    # Total outstanding (unpaid)
    total_outstanding = frappe.db.sql("""
        SELECT COALESCE(SUM(outstanding_amount), 0) as total
        FROM `tabSales Invoice`
        WHERE docstatus = 1 AND outstanding_amount > 0
    """, as_dict=True)[0].total

    # Overdue invoices count and amount
    overdue_data = frappe.db.sql("""
        SELECT COUNT(*) as count, COALESCE(SUM(outstanding_amount), 0) as amount
        FROM `tabSales Invoice`
        WHERE docstatus = 1 AND outstanding_amount > 0 AND due_date < %s
    """, (today(),), as_dict=True)[0]

    # Collected this month (payments received)
    collected_this_month = frappe.db.sql("""
        SELECT COALESCE(SUM(paid_amount), 0) as total
        FROM `tabPayment Entry`
        WHERE posting_date BETWEEN %s AND %s
        AND docstatus = 1
        AND payment_type = 'Receive'
    """, (first_day, last_day), as_dict=True)[0].total

    return {
        "invoicedThisMonth": flt(invoiced_this_month),
        "totalOutstanding": flt(total_outstanding),
        "overdueCount": overdue_data.count or 0,
        "overdueAmount": flt(overdue_data.amount),
        "collectedThisMonth": flt(collected_this_month)
    }


@frappe.whitelist()
def get_invoice_pdf(invoice_id):
    """
    Generate PDF for an invoice.
    Returns the PDF as base64 or a download URL.
    """
    require_auth()
    if not invoice_id:
        frappe.throw(_("Invoice ID is required"))

    # Use Frappe's built-in PDF generation
    from frappe.utils.pdf import get_pdf

    # Get the print format HTML — use Santa Brisa custom format
    html = frappe.get_print("Sales Invoice", invoice_id, print_format="Santa Brisa - Factura", letterhead="Santa Brisa")
    pdf_content = get_pdf(html)

    # Return as base64 for frontend download
    import base64
    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')

    return {
        "success": True,
        "invoice_id": invoice_id,
        "pdf_base64": pdf_base64,
        "filename": f"{invoice_id}.pdf"
    }


@frappe.whitelist()
def get_delivery_note_pdf(delivery_note_id):
    """
    Generate PDF for a delivery note (albarán) with Santa Brisa format.
    Returns the PDF as base64 for frontend download.
    """
    require_auth()
    if not delivery_note_id:
        frappe.throw(_("Delivery Note ID is required"))

    if not frappe.db.exists("Delivery Note", delivery_note_id):
        frappe.throw(_("Delivery Note {0} not found").format(delivery_note_id), frappe.DoesNotExistError)

    from frappe.utils.pdf import get_pdf
    import base64

    html = frappe.get_print("Delivery Note", delivery_note_id, print_format="Santa Brisa - Albaran", letterhead="Santa Brisa")
    pdf_content = get_pdf(html)
    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')

    return {
        "success": True,
        "delivery_note_id": delivery_note_id,
        "pdf_base64": pdf_base64,
        "filename": f"{delivery_note_id}.pdf"
    }


# ============================================================
# Dashboard: Sales Alerts
# ============================================================

@frappe.whitelist()
def get_sales_alerts():
    """Return actionable sales alerts for the dashboard."""
    require_auth()
    alerts = []

    # 1. Overdue orders (delivery_date passed, not completed)
    overdue_orders = frappe.db.sql("""
        SELECT name, customer_name, delivery_date,
               DATEDIFF(CURDATE(), delivery_date) as days_overdue
        FROM `tabSales Order`
        WHERE docstatus = 1
          AND delivery_date < CURDATE()
          AND status NOT IN ('Completed', 'Cancelled', 'Closed')
        ORDER BY delivery_date ASC
        LIMIT 5
    """, as_dict=True)

    for o in overdue_orders:
        alerts.append({
            "id": f"overdue-{o.name}",
            "type": "overdue_order",
            "severity": "error",
            "title": f"Pedido vencido: {o.name}",
            "description": f"{o.customer_name} - entrega pendiente hace {o.days_overdue} dias",
            "relatedId": o.name,
            "timestamp": str(o.delivery_date)
        })

    # 2. Stagnant accounts (Pipeline/Hot not modified in 7+ days)
    stagnant_date = add_days(today(), -7)
    stagnant_accounts = frappe.get_list("Momentum Account",
        filters={
            "column": ["in", ["Pipeline", "Hot"]],
            "modified": ["<", stagnant_date]
        },
        fields=["name", "account_name", "column", "modified"],
        order_by="modified asc",
        limit_page_length=5
    )

    for acc in stagnant_accounts:
        days = (get_datetime(today()) - get_datetime(acc.modified)).days
        alerts.append({
            "id": f"stagnant-{acc.name}",
            "type": "stagnant_account",
            "severity": "warning",
            "title": f"Cuenta estancada: {acc.account_name}",
            "description": f"En {acc.column} sin actividad hace {days} dias",
            "relatedId": acc.name,
            "timestamp": str(acc.modified)
        })

    # 3. Delivered but not invoiced
    unbilled = frappe.db.sql("""
        SELECT name, customer_name, grand_total
        FROM `tabSales Order`
        WHERE docstatus = 1
          AND per_delivered >= 100
          AND per_billed < 100
          AND status NOT IN ('Cancelled', 'Closed')
        ORDER BY transaction_date ASC
        LIMIT 5
    """, as_dict=True)

    for o in unbilled:
        alerts.append({
            "id": f"unbilled-{o.name}",
            "type": "unbilled_order",
            "severity": "warning",
            "title": f"Sin facturar: {o.name}",
            "description": f"{o.customer_name} - ${flt(o.grand_total):,.0f} entregado sin factura",
            "relatedId": o.name,
            "timestamp": str(now_datetime())
        })

    # 4. Overdue invoices
    overdue_invoices = frappe.db.sql("""
        SELECT name, customer_name, outstanding_amount, due_date,
               DATEDIFF(CURDATE(), due_date) as days_overdue
        FROM `tabSales Invoice`
        WHERE docstatus = 1
          AND outstanding_amount > 0
          AND due_date < CURDATE()
        ORDER BY due_date ASC
        LIMIT 5
    """, as_dict=True)

    for inv in overdue_invoices:
        alerts.append({
            "id": f"overdue-inv-{inv.name}",
            "type": "overdue_invoice",
            "severity": "error",
            "title": f"Factura vencida: {inv.name}",
            "description": f"{inv.customer_name} - ${flt(inv.outstanding_amount):,.0f} pendiente hace {inv.days_overdue} dias",
            "relatedId": inv.name,
            "timestamp": str(inv.due_date)
        })

    # Sort: errors first, then by timestamp
    alerts.sort(key=lambda a: (0 if a["severity"] == "error" else 1, a["timestamp"]))
    return alerts[:10]


# ============================================================
# Dashboard: Visibility Stats
# ============================================================

@frappe.whitelist()
def get_visibility_stats():
    """Return aggregate visibility statistics from WH Account Visibility."""
    require_auth()

    has_visibility = frappe.db.exists("DocType", "WH Account Visibility")
    if not has_visibility:
        return {
            "accountsWithVisibility": 0,
            "totalActiveAccounts": 0,
            "byType": [],
            "distributorCount": 0
        }

    # Accounts with at least one active visibility
    accounts_with = frappe.db.sql("""
        SELECT COUNT(DISTINCT momentum_account) as cnt
        FROM `tabWH Account Visibility`
        WHERE is_active = 1
    """, as_dict=True)[0].cnt or 0

    # Total active accounts (in active pipeline columns)
    total_active = frappe.db.count("Momentum Account", {
        "column": ["in", ["Pipeline", "Hot", "Won", "Loyalty"]]
    })

    # Breakdown by visibility type
    by_type = frappe.db.sql("""
        SELECT visibility_type as type, COUNT(*) as count
        FROM `tabWH Account Visibility`
        WHERE is_active = 1
        GROUP BY visibility_type
        ORDER BY count DESC
    """, as_dict=True)

    # Active distributors
    distributor_count = frappe.db.count("Momentum Account", {
        "sales_channel": "Distribuidor",
        "column": ["not in", ["Lost", "Backlog"]]
    })

    return {
        "accountsWithVisibility": accounts_with,
        "totalActiveAccounts": total_active,
        "byType": by_type,
        "distributorCount": distributor_count
    }


# ============================================================
# Dashboard: Top Accounts
# ============================================================

@frappe.whitelist()
def get_top_accounts():
    """Return top-performing account and top distributor by sales volume (last 12 months)."""
    require_auth()
    start_date = add_days(today(), -365)

    # Top account by sales volume
    top_account_data = frappe.db.sql("""
        SELECT so.customer as id, so.customer_name as name,
               SUM(so.grand_total) as total_sales
        FROM `tabSales Order` so
        WHERE so.docstatus = 1
          AND so.transaction_date >= %s
        GROUP BY so.customer
        ORDER BY total_sales DESC
        LIMIT 1
    """, (start_date,), as_dict=True)

    top_account = {"name": "Sin datos", "total_sales": 0}
    if top_account_data:
        top_account = {
            "name": top_account_data[0].name,
            "total_sales": flt(top_account_data[0].total_sales)
        }

    # Top distributor: Momentum Account with sales_channel='Distribuidor'
    # joined via linked_customer to Sales Order
    top_dist_data = frappe.db.sql("""
        SELECT ma.account_name as name,
               COALESCE(SUM(so.grand_total), 0) as total_sales
        FROM `tabMomentum Account` ma
        LEFT JOIN `tabSales Order` so
            ON so.customer = ma.linked_customer AND so.docstatus = 1 AND so.transaction_date >= %s
        WHERE ma.sales_channel = 'Distribuidor'
          AND ma.column NOT IN ('Lost', 'Backlog')
        GROUP BY ma.name
        ORDER BY total_sales DESC
        LIMIT 1
    """, (start_date,), as_dict=True)

    top_distributor = {"name": "Sin distribuidores", "total_sales": 0}
    if top_dist_data:
        top_distributor = {
            "name": top_dist_data[0].name,
            "total_sales": flt(top_dist_data[0].total_sales)
        }

    return {
        "topAccount": top_account,
        "topDistributor": top_distributor
    }


# ============================================================
# Dashboard: Sales Tasks
# ============================================================

@frappe.whitelist()
def get_sales_tasks(limit=5):
    """Return most urgent SALES department tasks."""
    require_auth()

    has_wh_task = frappe.db.exists("DocType", "WH Task")
    if not has_wh_task:
        return []

    tasks = frappe.get_list("WH Task",
        filters={
            "department": "SALES",
            "status": ["not in", ["DONE"]]
        },
        fields=["name", "title", "status", "priority", "due_date", "assigned_to"],
        order_by="priority asc, due_date asc",
        limit_page_length=int(limit)
    )

    return [
        {
            "name": t.name,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "due_date": str(t.due_date) if t.due_date else None,
            "assigned_to": t.assigned_to or ""
        }
        for t in tasks
    ]


# ============================================================
# Dashboard Summary (Boxes-Centric)
# ============================================================

def _get_period_dates(period):
    """Return (current_start, current_end, prev_start, prev_end) for the given period."""
    now = getdate(today())

    if period == "quarter":
        quarter_month = ((now.month - 1) // 3) * 3 + 1
        current_start = getdate(f"{now.year}-{quarter_month:02d}-01")
        current_end = get_last_day(add_months(current_start, 2))
        prev_start = add_months(current_start, -3)
        prev_end = add_days(current_start, -1)
    elif period == "year":
        current_start = getdate(f"{now.year}-01-01")
        current_end = getdate(f"{now.year}-12-31")
        prev_start = getdate(f"{now.year - 1}-01-01")
        prev_end = getdate(f"{now.year - 1}-12-31")
    else:
        # Default to month
        current_start = get_first_day(now)
        current_end = get_last_day(now)
        prev_start = get_first_day(add_months(now, -1))
        prev_end = get_last_day(add_months(now, -1))

    return current_start, current_end, prev_start, prev_end


def _get_boxes_in_range(start, end):
    """Get total boxes (Sell In + Sell Out) in a date range."""
    sell_out_boxes = 0
    sell_in_boxes = 0

    # Sell Out boxes (Distributor Sell Out Order)
    try:
        result = frappe.db.sql("""
            SELECT COALESCE(SUM(soi.qty), 0) as boxes
            FROM `tabDistributor Sell Out Order Item` soi
            JOIN `tabDistributor Sell Out Order` so ON soi.parent = so.name
            WHERE so.order_date BETWEEN %s AND %s
        """, (start, end), as_dict=True)
        sell_out_boxes = flt(result[0].boxes) if result else 0
    except Exception:
        sell_out_boxes = 0

    # Sell In boxes (Sales Invoice Items, submitted only)
    try:
        result = frappe.db.sql("""
            SELECT COALESCE(SUM(sii.qty), 0) as boxes
            FROM `tabSales Invoice Item` sii
            JOIN `tabSales Invoice` si ON sii.parent = si.name
            WHERE si.posting_date BETWEEN %s AND %s AND si.docstatus = 1
        """, (start, end), as_dict=True)
        sell_in_boxes = flt(result[0].boxes) if result else 0
    except Exception:
        sell_in_boxes = 0

    return sell_in_boxes, sell_out_boxes


@frappe.whitelist()
def get_dashboard_summary(period="month"):
    """
    Aggregated dashboard data: boxes-centric KPIs, pipeline funnel,
    client fit distribution, boxes evolution, channel mix, top accounts.

    Args:
        period: "month" | "quarter" | "year"
    """
    require_auth()

    if period not in ("month", "quarter", "year"):
        period = "month"

    current_start, current_end, prev_start, prev_end = _get_period_dates(period)

    # ---- KPIs ----
    sell_in_curr, sell_out_curr = _get_boxes_in_range(current_start, current_end)
    sell_in_prev, sell_out_prev = _get_boxes_in_range(prev_start, prev_end)
    boxes_this_period = sell_in_curr + sell_out_curr
    boxes_prev_period = sell_in_prev + sell_out_prev

    # Active accounts
    active_columns = ["Pipeline", "Hot", "Won", "Loyalty"]
    active_accounts = frappe.db.count("Momentum Account", {"column": ["in", active_columns]})
    total_accounts = frappe.db.count("Momentum Account")

    # Conversion rate
    won_loyalty = frappe.db.count("Momentum Account", {"column": ["in", ["Won", "Loyalty"]]})
    pipeline_total = frappe.db.count("Momentum Account", {
        "column": ["in", ["Pipeline", "Hot", "Won", "Loyalty", "Lost"]]
    })
    conversion_rate = round((won_loyalty / max(pipeline_total, 1)) * 100, 1)

    # Avg Client Fit
    avg_fit_result = frappe.db.sql("""
        SELECT AVG(client_fit_score) as avg_score
        FROM `tabMomentum Account`
        WHERE client_fit_score > 0
          AND `column` NOT IN ('Lost', 'Backlog')
    """, as_dict=True)
    avg_client_fit = round(flt(avg_fit_result[0].avg_score if avg_fit_result else 0), 1)

    kpis = {
        "boxes_this_period": boxes_this_period,
        "boxes_prev_period": boxes_prev_period,
        "sell_in_boxes": sell_in_curr,
        "sell_out_boxes": sell_out_curr,
        "active_accounts": active_accounts,
        "total_accounts": total_accounts,
        "conversion_rate": conversion_rate,
        "avg_client_fit": avg_client_fit,
    }

    # ---- Pipeline Funnel ----
    pipeline_data = frappe.db.sql("""
        SELECT `column`, COUNT(*) as count
        FROM `tabMomentum Account`
        GROUP BY `column`
    """, as_dict=True)
    pipeline_funnel = {}
    for col in ["Backlog", "Pipeline", "Hot", "Won", "Lost", "Loyalty"]:
        pipeline_funnel[col] = 0
    for row in pipeline_data:
        if row["column"] in pipeline_funnel:
            pipeline_funnel[row["column"]] = row["count"]

    # ---- Client Fit Distribution ----
    tier_data = frappe.db.sql("""
        SELECT
            CASE WHEN client_fit_tier IS NULL OR client_fit_tier = '' THEN 'Sin clasificar'
                 ELSE client_fit_tier END as tier,
            COUNT(*) as count
        FROM `tabMomentum Account`
        GROUP BY tier
        ORDER BY FIELD(tier, 'A', 'B', 'C', 'D', 'Sin clasificar')
    """, as_dict=True)
    client_fit_distribution = [{"tier": r["tier"], "count": r["count"]} for r in tier_data]

    # ---- Boxes Evolution (last 12 months) ----
    start_12m = add_days(today(), -365)

    sell_out_monthly = []
    try:
        sell_out_monthly = frappe.db.sql("""
            SELECT DATE_FORMAT(so.order_date, '%%Y-%%m') as period,
                   COALESCE(SUM(soi.qty), 0) as boxes
            FROM `tabDistributor Sell Out Order` so
            JOIN `tabDistributor Sell Out Order Item` soi ON soi.parent = so.name
            WHERE so.order_date >= %s
            GROUP BY period
            ORDER BY period
        """, (start_12m,), as_dict=True)
    except Exception:
        pass

    sell_in_monthly = []
    try:
        sell_in_monthly = frappe.db.sql("""
            SELECT DATE_FORMAT(si.posting_date, '%%Y-%%m') as period,
                   COALESCE(SUM(sii.qty), 0) as boxes
            FROM `tabSales Invoice` si
            JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
            WHERE si.posting_date >= %s AND si.docstatus = 1
            GROUP BY period
            ORDER BY period
        """, (start_12m,), as_dict=True)
    except Exception:
        pass

    sell_out_map = {r["period"]: flt(r["boxes"]) for r in sell_out_monthly}
    sell_in_map = {r["period"]: flt(r["boxes"]) for r in sell_in_monthly}

    # Generate all months in range
    from datetime import datetime
    months = []
    current = datetime.strptime(str(start_12m), "%Y-%m-%d")
    end_dt = datetime.now()
    while current <= end_dt:
        p = current.strftime("%Y-%m")
        si = sell_in_map.get(p, 0)
        so = sell_out_map.get(p, 0)
        months.append({
            "period": p,
            "sell_in": si,
            "sell_out": so,
            "total": si + so,
        })
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)

    boxes_evolution = months

    # ---- Channel Mix (from Momentum Account sales_channel) ----
    channel_data = frappe.db.sql("""
        SELECT
            COALESCE(sales_channel, 'Sin canal') as channel,
            COALESCE(SUM(sales_total_boxes), 0) as total_boxes,
            COUNT(*) as account_count
        FROM `tabMomentum Account`
        WHERE sales_total_boxes > 0
        GROUP BY sales_channel
        ORDER BY total_boxes DESC
    """, as_dict=True)

    total_boxes_all = sum(flt(c["total_boxes"]) for c in channel_data) or 1
    channel_mix = [{
        "channel": c["channel"],
        "boxes": flt(c["total_boxes"]),
        "accounts": c["account_count"],
        "percentage": round((flt(c["total_boxes"]) / total_boxes_all) * 100, 1),
    } for c in channel_data]

    # ---- Top Sell Out (from Distributor Sell Out Orders, grouped by customer_name) ----
    top_sell_out = []
    try:
        top_sell_out_raw = frappe.db.sql("""
            SELECT
                so.customer_name as customer,
                COALESCE(SUM(soi.qty), 0) as boxes,
                COUNT(DISTINCT so.name) as order_count,
                MAX(so.order_date) as last_date
            FROM `tabDistributor Sell Out Order Item` soi
            JOIN `tabDistributor Sell Out Order` so ON soi.parent = so.name
            WHERE so.customer_name IS NOT NULL AND so.customer_name != ''
            GROUP BY so.customer_name
            ORDER BY boxes DESC
            LIMIT 10
        """, as_dict=True)
        top_sell_out = [{
            "customer": r["customer"],
            "boxes": flt(r["boxes"]),
            "order_count": r["order_count"],
            "last_date": str(r["last_date"]) if r.get("last_date") else None,
        } for r in top_sell_out_raw]
    except Exception:
        pass

    # ---- Top Sell In (from Sales Invoices, grouped by customer) ----
    # NOTE: Sales Invoices all have qty=1 per line (amount = total value of order).
    # So we use SUM(amount) as the meaningful metric, not SUM(qty).
    top_sell_in = []
    try:
        top_sell_in_raw = frappe.db.sql("""
            SELECT
                si.customer as customer_id,
                MAX(si.customer_name) as customer,
                COALESCE(SUM(sii.amount), 0) as total_amount,
                COUNT(DISTINCT si.name) as order_count,
                MAX(si.posting_date) as last_date
            FROM `tabSales Invoice Item` sii
            JOIN `tabSales Invoice` si ON sii.parent = si.name
            WHERE si.docstatus = 1
            GROUP BY si.customer
            ORDER BY total_amount DESC
            LIMIT 10
        """, as_dict=True)
        for r in top_sell_in_raw:
            # Use customer_name, fallback to customer_id
            display_name = r["customer"] or r["customer_id"]
            # Clean up ERPNext duplicate-wrapped names like "FOO (FOO)" or "FOO (''FOO'')"
            if display_name and "(" in display_name:
                base = display_name.split("(")[0].strip()
                if base:
                    display_name = base
            top_sell_in.append({
                "customer": display_name,
                "amount": flt(r["total_amount"]),
                "order_count": r["order_count"],
                "last_date": str(r["last_date"]) if r.get("last_date") else None,
            })
    except Exception:
        pass

    # ---- Products Top by Boxes (group by item_code, use Item master name or most-used) ----
    sell_out_products = []
    try:
        sell_out_products = frappe.db.sql("""
            SELECT soi.item_code as code,
                   COALESCE(SUM(soi.qty), 0) as boxes
            FROM `tabDistributor Sell Out Order Item` soi
            GROUP BY soi.item_code
        """, as_dict=True)
    except Exception:
        pass

    sell_in_products = []
    try:
        sell_in_products = frappe.db.sql("""
            SELECT sii.item_code as code,
                   COALESCE(SUM(sii.qty), 0) as boxes
            FROM `tabSales Invoice Item` sii
            JOIN `tabSales Invoice` si ON sii.parent = si.name
            WHERE si.docstatus = 1
            GROUP BY sii.item_code
        """, as_dict=True)
    except Exception:
        pass

    product_map = {}  # key=item_code, value=boxes
    for p in list(sell_out_products) + list(sell_in_products):
        code = p.get("code") or "unknown"
        product_map[code] = flt(product_map.get(code, 0)) + flt(p["boxes"])

    # Resolve nice display name from Item master, fallback to item_code
    def _get_item_display_name(item_code):
        try:
            item_name = frappe.db.get_value("Item", item_code, "item_name")
            return item_name or item_code
        except Exception:
            return item_code

    total_product_boxes = sum(product_map.values()) or 1
    products_top = sorted(
        [{"product": _get_item_display_name(code), "boxes": boxes,
          "percentage": round(boxes / total_product_boxes * 100, 1)}
         for code, boxes in product_map.items()],
        key=lambda x: x["boxes"], reverse=True,
    )[:5]

    return {
        "kpis": kpis,
        "pipeline_funnel": pipeline_funnel,
        "client_fit_distribution": client_fit_distribution,
        "boxes_evolution": boxes_evolution,
        "channel_mix": channel_mix,
        "top_sell_out": top_sell_out,
        "top_sell_in": top_sell_in,
        "products_top_boxes": products_top,
    }


# ============================================================
# Order Hub: Email Processing
# ============================================================

@frappe.whitelist()
def get_order_emails(limit: int = 20, label: str = None):
    """
    Busca emails que podrían ser pedidos.
    Uses only metadata from search (no N+1 calls to get_message).
    Full message is fetched when user processes the email.

    Args:
        limit: Máximo de emails a retornar (1-100)
        label: Label de Gmail para filtrar (ej: "Pedidos")

    Returns:
        {
            "emails": [
                {
                    "id": "message_id",
                    "subject": "Pedido Restaurante X",
                    "from": "cliente@email.com",
                    "date": "2026-02-03",
                    "snippet": "Adjunto pedido...",
                    "has_attachment": true,
                    "is_order": true,
                    "confidence": 0.85,
                    "status": "pending" | "processed" | "skipped"
                }
            ]
        }
    """
    import re
    from workhub_frappe_app.api.gmail import search_emails
    from workhub_frappe_app.services.order_email_parser import OrderEmailParser

    # Input validation
    if not isinstance(limit, int) or limit < 1:
        limit = 20
    if limit > 100:
        limit = 100

    # Sanitize label
    if label and not re.match(r'^[\w\-]+$', str(label)):
        frappe.throw("Invalid label format")

    parser = OrderEmailParser()

    # Search for potential order emails
    query = "subject:(pedido OR order OR solicito) newer_than:7d"
    if label:
        query = f'label:"{label}" {query}'

    # search_emails returns messages with metadata (no need for get_message)
    search_result = search_emails(query=query, max_results=limit)
    messages = search_result.get("messages", [])

    emails = []
    for msg in messages[:limit]:
        # Use data from search result directly (no additional API call)
        subject = msg.get("subject", "")
        sender = msg.get("from", "")
        snippet = msg.get("snippet", "")[:200]

        # Quick order detection from subject/snippet only
        detection = parser.is_order_email({
            "subject": subject,
            "body": snippet,
            "sender": sender
        })

        # Check if already processed
        processed = False
        try:
            if frappe.db.exists("DocType", "WH Processed Email"):
                processed = bool(frappe.db.exists("WH Processed Email", {"gmail_id": msg.get("id")}))
        except frappe.DoesNotExistError:
            pass
        except Exception as e:
            frappe.logger().warning(f"Error checking processed email: {e}")

        emails.append({
            "id": msg.get("id", ""),
            "subject": subject,
            "from": sender,
            "date": msg.get("date", ""),
            "snippet": snippet + ("..." if len(msg.get("snippet", "")) > 200 else ""),
            "has_attachment": "attachment" in snippet.lower() or "adjunto" in snippet.lower(),
            "is_order": detection.get("is_order", False),
            "confidence": detection.get("confidence", 0),
            "status": "processed" if processed else "pending"
        })

    # Sort by confidence (most likely orders first)
    emails.sort(key=lambda x: (x["is_order"], x["confidence"]), reverse=True)

    return {"emails": emails}


@frappe.whitelist()
def process_email_order(message_id: str):
    """
    Procesa un email de Gmail y extrae datos de pedido.

    Args:
        message_id: Gmail message ID

    Returns:
        {
            "success": true/false,
            "error": "error message if failed",
            "is_order": true/false,
            "extracted_data": {...},
            "matched_customer": {...},
            "draft_order": {...},
            "email_data": {...}
        }
    """
    from workhub_frappe_app.api.gmail import get_message, get_message_attachments
    from workhub_frappe_app.services.order_email_parser import OrderEmailParser

    # Validate input
    if not message_id or not isinstance(message_id, str):
        return {"success": False, "error": "message_id is required"}

    # Basic format validation (Gmail IDs are typically 16+ hex chars)
    message_id = message_id.strip()
    if len(message_id) < 10:
        return {"success": False, "error": "Invalid message_id format"}

    try:
        # Get email content
        email_result = get_message(message_id)
        if not email_result:
            return {"success": False, "error": "Failed to fetch email"}

        if email_result.get("error"):
            return {"success": False, "error": email_result.get("error")}

        email_data = email_result.get("message", {})
        if not email_data:
            return {"success": False, "error": "Empty email data"}

    except Exception as e:
        frappe.logger().error(f"Error fetching email {message_id}: {e}")
        return {"success": False, "error": f"Failed to fetch email: {str(e)}"}

    # Get attachments (non-critical, continue if fails)
    attachments = []
    try:
        attachments_result = get_message_attachments(message_id)
        attachments = attachments_result.get("attachments", [])
    except Exception as e:
        frappe.logger().warning(f"Error fetching attachments for {message_id}: {e}")

    # Process with parser
    try:
        parser = OrderEmailParser()
        result = parser.process_order_email(
            email_data={
                "subject": email_data.get("subject", ""),
                "body": email_data.get("body", ""),
                "sender": email_data.get("from", ""),
                "date": email_data.get("date", "")
            },
            attachments=attachments
        )
    except Exception as e:
        frappe.logger().error(f"Error processing email {message_id}: {e}")
        return {"success": False, "error": f"Failed to process email: {str(e)}"}

    # Ensure result has expected structure
    if not isinstance(result, dict):
        result = {}

    result["success"] = True
    result["email_data"] = {
        "subject": email_data.get("subject", ""),
        "from": email_data.get("from", ""),
        "date": email_data.get("date", ""),
        "message_id": message_id
    }

    return result


@frappe.whitelist()
def create_order_from_email(
    message_id: str,
    customer: str,
    items: str,
    delivery_date: str = None,
    notes: str = None,
    price_list: str = None
):
    """
    Crea un Sales Order a partir de datos extraídos de email.
    Marca el email como procesado.
    """
    import json as json_module

    # Validate inputs
    if not message_id or not isinstance(message_id, str):
        return {"success": False, "error": "message_id is required"}

    message_id = message_id.strip()
    if len(message_id) < 10:
        return {"success": False, "error": "Invalid message_id format"}

    if not customer or not isinstance(customer, str):
        return {"success": False, "error": "customer is required"}

    # Parse items
    try:
        if isinstance(items, str):
            items_list = json_module.loads(items)
        else:
            items_list = items

        if not items_list or not isinstance(items_list, list):
            return {"success": False, "error": "items must be a non-empty list"}
    except json_module.JSONDecodeError as e:
        return {"success": False, "error": f"Invalid items JSON: {str(e)}"}

    # Validate customer exists
    if not frappe.db.exists("Customer", customer):
        return {"success": False, "error": f"Customer {customer} not found"}

    # Validate and parse delivery_date
    if delivery_date:
        try:
            parsed_date = frappe.utils.getdate(delivery_date)
            if parsed_date < frappe.utils.getdate(frappe.utils.today()):
                return {"success": False, "error": "Delivery date cannot be in the past"}
            delivery_date = parsed_date
        except Exception:
            return {"success": False, "error": "Invalid delivery_date format (use YYYY-MM-DD)"}
    else:
        delivery_date = frappe.utils.add_days(frappe.utils.today(), 3)

    # Get customer's default price list if not provided
    if not price_list:
        price_list = frappe.db.get_value("Customer", customer, "default_price_list")

    try:
        # Create Sales Order
        so = frappe.get_doc({
            "doctype": "Sales Order",
            "customer": customer,
            "delivery_date": delivery_date,
            "selling_price_list": price_list,
            "po_no": f"EMAIL-{message_id[:8]}",
            "items": []
        })

        # Add items with validation
        for item in items_list:
            item_code = item.get("item_code")
            if not item_code:
                continue

            # Validate item exists
            if not frappe.db.exists("Item", item_code):
                frappe.logger().warning(f"Item {item_code} not found, skipping")
                continue

            # Validate qty
            try:
                qty = float(item.get("qty", 1))
                if qty <= 0:
                    frappe.logger().warning(f"Invalid qty {qty} for {item_code}, skipping")
                    continue
            except (ValueError, TypeError):
                frappe.logger().warning(f"Invalid qty type for {item_code}, skipping")
                continue

            # Validate rate (optional)
            rate = None
            if item.get("rate") is not None:
                try:
                    rate = float(item.get("rate"))
                    if rate < 0:
                        frappe.logger().warning(f"Negative rate for {item_code}, using default")
                        rate = None
                except (ValueError, TypeError):
                    rate = None

            so.append("items", {
                "item_code": item_code,
                "qty": qty,
                "rate": rate
            })

        if not so.items:
            return {"success": False, "error": "No valid items found"}

        # Insert Sales Order
        so.insert(ignore_permissions=True)

        # Add notes as comment
        if notes:
            so.add_comment("Comment", notes)

        # Mark email as processed (use unique constraint to prevent race conditions)
        try:
            frappe.get_doc({
                "doctype": "WH Processed Email",
                "gmail_id": message_id,
                "sales_order": so.name,
                "processed_at": frappe.utils.now_datetime(),
                "status": "Converted"
            }).insert(ignore_permissions=True)
        except frappe.DuplicateEntryError:
            # Email already processed - rollback SO and return error
            frappe.db.rollback()
            return {
                "success": False,
                "error": f"Email {message_id} has already been processed"
            }
        except Exception as e:
            # Failed to mark as processed - rollback SO and return error
            frappe.db.rollback()
            frappe.logger().error(f"Error marking email as processed: {e}")
            return {
                "success": False,
                "error": f"Failed to track processed email: {str(e)}"
            }

        # Commit at the end
        frappe.db.commit()

        return {
            "success": True,
            "order_id": so.name,
            "total": so.grand_total or 0,
            "status": so.status
        }

    except Exception as e:
        frappe.logger().error(f"Error creating order from email {message_id}: {e}")
        frappe.db.rollback()
        return {"success": False, "error": str(e)}
