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

        # Track status changes for notifications
        self.handle_status_change()

    def handle_status_change(self):
        """Track when status changes"""
        if not self.is_new():
            old_doc = self.get_doc_before_save()
            if old_doc and old_doc.status != self.status:
                self._status_changed = True
                self._old_status = old_doc.status
                self._new_status = self.status
            else:
                self._status_changed = False
        else:
            self._status_changed = False

    def on_update(self):
        """Notify relevant parties on status change"""
        # Send status change notifications
        if hasattr(self, '_status_changed') and self._status_changed:
            self.send_status_change_notifications()

        # Notify on new order creation (after insert, on first update)
        if self.is_new() or (self.get_doc_before_save() is None and self.status == "Pending"):
            self.send_new_order_notification()

    def send_status_change_notifications(self):
        """Send notifications when order status changes"""
        if not hasattr(self, '_old_status') or not hasattr(self, '_new_status'):
            return

        try:
            from workhub_frappe_app.api.notifications import notify_order_status_changed
            notify_order_status_changed(self.name, self._old_status, self._new_status)
        except Exception as e:
            frappe.log_error(f"Error sending order status notification: {e}")

    def send_new_order_notification(self):
        """Send notification when new order is created"""
        try:
            from workhub_frappe_app.api.notifications import create_notification

            # Notify sales team about new order
            sales_users = frappe.get_all("Has Role",
                filters={"role": "Sales User", "parenttype": "User"},
                fields=["parent"],
                distinct=True)

            order_details = f"Cliente: {self.customer_name}, Distribuidor: {self.distributor_name}, Monto: {frappe.utils.fmt_money(self.total_amount)}"

            for user_row in sales_users:
                create_notification(
                    user=user_row.parent,
                    notification_type="ORDER_CREATED",
                    title=f"Nueva orden: {self.name}",
                    message=f"Se creó una nueva orden de distribuidor. {order_details}",
                    reference_doctype="Distributor Sell Out Order",
                    reference_name=self.name,
                    priority="MEDIUM",
                    action_url=f"/app/distributor-sell-out-order/{self.name}"
                )
        except Exception as e:
            frappe.log_error(f"Error sending new order notification: {e}")
