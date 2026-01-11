# Copyright (c) 2026, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class WHGeneratedReport(Document):
	def before_insert(self):
		"""Set generated_by and generated_at on first save"""
		if not self.generated_by:
			self.generated_by = frappe.session.user
		if not self.generated_at:
			self.generated_at = frappe.utils.now()

	def validate(self):
		"""Validation before saving"""
		# Ensure linked report definition exists
		if self.report_definition:
			if not frappe.db.exists("WH Report Definition", self.report_definition):
				frappe.throw(f"Report Definition '{self.report_definition}' does not exist")

	def mark_completed(self, file_url=None):
		"""Mark the report generation as completed"""
		self.status = "Completed"
		if file_url:
			self.file_url = file_url
		self.save(ignore_permissions=True)

	def mark_failed(self, error_message=None):
		"""Mark the report generation as failed"""
		self.status = "Failed"
		if error_message and self.data_snapshot:
			# Store error in data_snapshot if it's being used
			if isinstance(self.data_snapshot, dict):
				self.data_snapshot["error"] = error_message
		self.save(ignore_permissions=True)
