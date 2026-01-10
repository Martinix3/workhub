# Copyright (c) 2026, SantaBrisa and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class WHTimeTimer(Document):
	def validate(self):
		"""Validate that only one active timer exists per user."""
		self.validate_one_active_timer_per_user()

	def validate_one_active_timer_per_user(self):
		"""Ensure only one Running or Paused timer exists per user."""
		if self.status in ["Running", "Paused"]:
			# Check if there's another active timer for this user
			filters = {
				"user": self.user,
				"status": ["in", ["Running", "Paused"]],
				"name": ["!=", self.name] if not self.is_new() else ["is", "set"]
			}

			existing_timer = frappe.db.exists("WH Time Timer", filters)

			if existing_timer:
				frappe.throw(
					f"El usuario {self.user} ya tiene un temporizador activo. "
					"Solo puede haber un temporizador activo por usuario a la vez."
				)
