import frappe
from frappe.model.document import Document
from frappe.utils import flt, today


class DistributorSellOutOrder(Document):
    def validate(self):
        self.calculate_totals()
        self.validate_distributor()

    def calculate_totals(self):
        """Calculate total qty and amount from items"""
        total_qty = 0
        total_amount = 0
        for item in self.items:
            item.amount = flt(item.qty) * flt(item.rate)
            total_qty += flt(item.qty)
            total_amount += flt(item.amount)
        self.total_qty = total_qty
        self.total_amount = total_amount

    def validate_distributor(self):
        """Validate distributor is actually a distributor"""
        if self.distributor:
            group = frappe.db.get_value("Customer", self.distributor, "customer_group")
            if group and group.lower() not in ["distribuidor", "distributor"]:
                frappe.throw("El distribuidor asignado debe ser del grupo 'Distribuidor'")

    def before_save(self):
        """Set actual delivery date when marked as delivered"""
        if self.status == "Delivered" and not self.actual_delivery_date:
            self.actual_delivery_date = today()

    def on_update(self):
        """Notify relevant parties on status change"""
        # TODO: Implement notifications
        pass
