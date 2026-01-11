# Copyright (c) 2026, SantaBrisa and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class WHNotificationPreferences(Document):
	def before_insert(self):
		"""Set created_at timestamp on insert"""
		self.created_at = now_datetime()
		self.modified_at = now_datetime()

	def before_save(self):
		"""Update modified_at timestamp on save"""
		self.modified_at = now_datetime()

	def validate(self):
		"""Validate quiet hours settings"""
		if self.quiet_hours_enabled:
			if not self.quiet_hours_start or not self.quiet_hours_end:
				frappe.throw("Debe especificar inicio y fin de horas silenciosas")
