# Copyright (c) 2026, SantaBrisa and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class WHTaskWorkLog(Document):
	def validate(self):
		"""Calculate duration_hours from hours and minutes."""
		self.calculate_duration()

	def calculate_duration(self):
		"""Calculate duration_hours as hours + minutes/60."""
		hours = self.hours or 0
		minutes = self.minutes or 0
		self.duration_hours = hours + (minutes / 60.0)
