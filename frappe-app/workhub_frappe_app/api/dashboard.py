import frappe
from frappe import _
from frappe.utils import flt, today, get_first_day, get_last_day, add_months

@frappe.whitelist()
def get_sales_kpis():
    """Get sales dashboard KPIs"""
    first_day = get_first_day(today())
    last_day = get_last_day(today())

    # Sales this month
    sales_this_month = frappe.db.sql("""
        SELECT COUNT(*) as total_orders, SUM(grand_total) as total_amount
        FROM `tabSales Order`
        WHERE transaction_date BETWEEN %s AND %s AND docstatus = 1
    """, (first_day, last_day), as_dict=True)[0]

    # Previous month for comparison
    prev_first = get_first_day(add_months(today(), -1))
    prev_last = get_last_day(add_months(today(), -1))

    prev_sales = frappe.db.sql("""
        SELECT SUM(grand_total) as total
        FROM `tabSales Order`
        WHERE transaction_date BETWEEN %s AND %s AND docstatus = 1
    """, (prev_first, prev_last))[0][0] or 0

    # Active customers
    active_customers = frappe.db.sql("""
        SELECT COUNT(DISTINCT customer) as count
        FROM `tabSales Order`
        WHERE transaction_date BETWEEN %s AND %s AND docstatus = 1
    """, (first_day, last_day))[0][0] or 0

    # Pending orders
    pending_orders = frappe.db.count("Sales Order", {
        "docstatus": 1,
        "status": ["not in", ["Completed", "Cancelled", "Closed"]]
    })

    # Pipeline value
    pipeline_value = frappe.db.sql("""
        SELECT SUM(opportunity_amount) as total
        FROM `tabOpportunity`
        WHERE status NOT IN ('Lost', 'Closed')
    """)[0][0] or 0

    # Growth calculation
    current = flt(sales_this_month.total_amount or 0)
    growth = 0
    if prev_sales > 0:
        growth = ((current - prev_sales) / prev_sales) * 100

    return {
        "sales_this_month": current,
        "total_orders": sales_this_month.total_orders or 0,
        "growth_percent": growth,
        "active_customers": active_customers,
        "pending_orders": pending_orders,
        "pipeline_value": flt(pipeline_value)
    }
