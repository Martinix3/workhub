# Copyright (c) 2026, SantaBrisa and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import json


class WHSavedFilter(Document):
	def validate(self):
		"""Validate filter_json is valid JSON and contains expected fields"""
		if self.filter_json:
			try:
				filter_data = json.loads(self.filter_json)
				# Basic validation - ensure it's a dict
				if not isinstance(filter_data, dict):
					frappe.throw("filter_json debe ser un objeto JSON valido")
			except json.JSONDecodeError:
				frappe.throw("filter_json contiene JSON invalido")

	def before_save(self):
		"""Prevent deletion of preset filters"""
		if self.is_preset and self.has_value_changed("is_preset"):
			# Prevent changing is_preset from 1 to 0
			if self.get_doc_before_save() and self.get_doc_before_save().is_preset:
				frappe.throw("No se puede modificar un filtro preset del sistema")

	def on_trash(self):
		"""Prevent deletion of preset filters"""
		if self.is_preset:
			frappe.throw("No se puede eliminar un filtro preset del sistema")
