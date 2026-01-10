# Copyright (c) 2026, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class WHReportDefinition(Document):
	def before_insert(self):
		"""Set created_by on first save"""
		if not self.created_by:
			self.created_by = frappe.session.user

	def validate(self):
		"""Validation before saving"""
		# Ensure title is unique
		if self.is_new():
			existing = frappe.db.exists("WH Report Definition", {"title": self.title})
			if existing and existing != self.name:
				frappe.throw(f"Report with title '{self.title}' already exists")

	def on_trash(self):
		"""Cleanup when deleting report definition"""
		# Delete related sections if any (will be implemented in later subtasks)
		pass
