# Copyright (c) 2026, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class DistributorMessage(Document):
	def validate(self):
		"""Validación antes de guardar"""
		# Generar thread_id si no existe
		if not self.thread_id:
			self.generate_thread_id()

	def generate_thread_id(self):
		"""
		Genera un thread_id único basado en sender y receiver
		para agrupar mensajes en la misma conversación
		"""
		# Ordenar sender y receiver alfabéticamente para mantener consistencia
		users = sorted([self.sender, self.receiver])
		self.thread_id = f"{users[0]}::{users[1]}"

		# Si hay un pedido relacionado, incluirlo en el thread_id
		if self.related_order:
			self.thread_id = f"{self.thread_id}::{self.related_order}"

	def after_insert(self):
		"""Acciones después de crear el mensaje"""
		# Aquí se puede notificar al receptor
		pass


@frappe.whitelist()
def get_conversation_thread(thread_id, limit=50):
	"""
	Obtiene todos los mensajes de una conversación
	"""
	if not frappe.has_permission("Distributor Message", "read"):
		frappe.throw("No permission")

	messages = frappe.get_all(
		"Distributor Message",
		filters={"thread_id": thread_id},
		fields=["name", "sender", "receiver", "subject", "message", "timestamp", "read_status"],
		order_by="timestamp asc",
		limit=limit
	)

	return messages


@frappe.whitelist()
def mark_thread_as_read(thread_id, user):
	"""
	Marca todos los mensajes de una conversación como leídos
	para un usuario específico
	"""
	if not frappe.has_permission("Distributor Message", "write"):
		frappe.throw("No permission")

	messages = frappe.get_all(
		"Distributor Message",
		filters={
			"thread_id": thread_id,
			"receiver": user,
			"read_status": 0
		},
		pluck="name"
	)

	for msg_name in messages:
		msg = frappe.get_doc("Distributor Message", msg_name)
		msg.read_status = 1
		msg.save(ignore_permissions=True)

	return {"success": True, "marked": len(messages)}


@frappe.whitelist()
def get_unread_count(user):
	"""
	Obtiene el número de mensajes no leídos para un usuario
	"""
	if not frappe.has_permission("Distributor Message", "read"):
		frappe.throw("No permission")

	count = frappe.db.count(
		"Distributor Message",
		filters={
			"receiver": user,
			"read_status": 0
		}
	)

	return {"unread_count": count}
