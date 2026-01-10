# Copyright (c) 2026, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import json


class OrderChangeRequest(Document):
	def validate(self):
		"""Validación antes de guardar"""
		# Validar que el distribuidor pertenece al pedido
		self.validate_distributor_owns_order()

		# Validar formato de new_values si existe
		if self.new_values:
			self.validate_new_values_format()

	def validate_distributor_owns_order(self):
		"""
		Valida que el distribuidor sea el cliente del pedido
		"""
		if not self.order_id or not self.distributor:
			return

		order = frappe.get_doc("Sales Order", self.order_id)
		if order.customer != self.distributor:
			frappe.throw(f"El distribuidor {self.distributor} no corresponde al pedido {self.order_id}")

	def validate_new_values_format(self):
		"""
		Valida que new_values sea JSON válido
		"""
		try:
			if isinstance(self.new_values, str):
				json.loads(self.new_values)
		except json.JSONDecodeError:
			frappe.throw("El campo 'Nuevos Valores' debe contener JSON válido")

	def before_save(self):
		"""Acciones antes de guardar"""
		# Si el estado cambia a Approved o Rejected, registrar quien lo procesó
		if self.has_value_changed("status") and self.status in ["Approved", "Rejected"]:
			if not self.processed_by:
				self.processed_by = frappe.session.user
			self.processed_date = frappe.utils.now()

	def after_save(self):
		"""Acciones después de guardar"""
		# Si el estado cambia, notificar al distribuidor
		if self.has_value_changed("status"):
			self.notify_status_change()

	def notify_status_change(self):
		"""
		Notifica al distribuidor cuando cambia el estado de su solicitud
		"""
		# Integrar con el sistema de notificaciones WH
		from workhub_frappe_app.api.notifications import notify_change_request_status
		try:
			notify_change_request_status(self.name)
		except Exception as e:
			frappe.log_error(f"Error notificando cambio de estado de solicitud {self.name}: {str(e)}")


@frappe.whitelist()
def get_change_requests_for_order(order_id):
	"""
	Obtiene todas las solicitudes de cambio para un pedido específico
	"""
	if not frappe.has_permission("Order Change Request", "read"):
		frappe.throw("No permission")

	requests = frappe.get_all(
		"Order Change Request",
		filters={"order_id": order_id},
		fields=[
			"name",
			"request_type",
			"status",
			"reason",
			"new_values",
			"response_notes",
			"processed_by",
			"processed_date",
			"creation",
			"modified"
		],
		order_by="creation desc"
	)

	return requests


@frappe.whitelist()
def get_pending_requests_for_sales_rep(sales_rep=None):
	"""
	Obtiene solicitudes de cambio pendientes para un vendedor
	Si no se especifica sales_rep, usa el usuario actual
	"""
	if not frappe.has_permission("Order Change Request", "read"):
		frappe.throw("No permission")

	if not sales_rep:
		sales_rep = frappe.session.user

	# Obtener pedidos del vendedor
	orders = frappe.get_all(
		"Sales Order",
		filters={"owner": sales_rep},
		pluck="name"
	)

	if not orders:
		return []

	# Obtener solicitudes pendientes para esos pedidos
	requests = frappe.get_all(
		"Order Change Request",
		filters={
			"order_id": ["in", orders],
			"status": "Pending"
		},
		fields=[
			"name",
			"order_id",
			"distributor",
			"request_type",
			"reason",
			"new_values",
			"creation"
		],
		order_by="creation desc"
	)

	return requests


@frappe.whitelist()
def approve_request(request_id, response_notes=None):
	"""
	Aprueba una solicitud de cambio
	"""
	if not frappe.has_permission("Order Change Request", "write"):
		frappe.throw("No permission")

	request = frappe.get_doc("Order Change Request", request_id)

	if request.status != "Pending":
		frappe.throw(f"La solicitud ya fue procesada con estado: {request.status}")

	request.status = "Approved"
	request.response_notes = response_notes or ""
	request.processed_by = frappe.session.user
	request.processed_date = frappe.utils.now()
	request.save()

	return {"success": True, "message": "Solicitud aprobada"}


@frappe.whitelist()
def reject_request(request_id, response_notes=None):
	"""
	Rechaza una solicitud de cambio
	"""
	if not frappe.has_permission("Order Change Request", "write"):
		frappe.throw("No permission")

	request = frappe.get_doc("Order Change Request", request_id)

	if request.status != "Pending":
		frappe.throw(f"La solicitud ya fue procesada con estado: {request.status}")

	if not response_notes:
		frappe.throw("Debe proporcionar una razón para el rechazo")

	request.status = "Rejected"
	request.response_notes = response_notes
	request.processed_by = frappe.session.user
	request.processed_date = frappe.utils.now()
	request.save()

	return {"success": True, "message": "Solicitud rechazada"}


@frappe.whitelist()
def cancel_request(request_id):
	"""
	Cancela una solicitud de cambio (solo el solicitante puede cancelar)
	"""
	if not frappe.has_permission("Order Change Request", "write"):
		frappe.throw("No permission")

	request = frappe.get_doc("Order Change Request", request_id)

	if request.status != "Pending":
		frappe.throw(f"Solo se pueden cancelar solicitudes pendientes")

	# Verificar que el usuario actual es el dueño de la solicitud
	if request.owner != frappe.session.user:
		frappe.throw("Solo el solicitante puede cancelar esta solicitud")

	request.status = "Rejected"
	request.response_notes = "Cancelado por el solicitante"
	request.processed_by = frappe.session.user
	request.processed_date = frappe.utils.now()
	request.save()

	return {"success": True, "message": "Solicitud cancelada"}
