# Copyright (c) 2026, SantaBrisa and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import json


class WHKPIMetric(Document):
	def validate(self):
		"""Validate metric configuration"""
		# Ensure metric_code is uppercase and no spaces
		if self.metric_code:
			self.metric_code = self.metric_code.upper().replace(" ", "_")

		# Validate data_source based on type
		if self.data_source_type == "sql" and not self.data_source:
			frappe.throw("SQL query is required for SQL data source type")
		elif self.data_source_type == "api" and not self.data_source:
			frappe.throw("API endpoint is required for API data source type")
		elif self.data_source_type == "python" and not self.data_source:
			frappe.throw("Python code is required for Python data source type")

	def calculate_value(self, department=None, user=None, date_from=None, date_to=None):
		"""
		Calculate the current value for this metric

		Args:
			department: Filter by department (optional, uses metric's department if not provided)
			user: Filter by user (optional)
			date_from: Start date for date range queries (optional)
			date_to: End date for date range queries (optional)

		Returns:
			dict: {"value": numeric_value, "formatted": formatted_string}
		"""
		if not self.is_active:
			return {"value": 0, "formatted": "Metric inactive"}

		try:
			if self.data_source_type == "sql":
				return self._calculate_from_sql(department, user, date_from, date_to)
			elif self.data_source_type == "api":
				return self._calculate_from_api(department, user, date_from, date_to)
			elif self.data_source_type == "python":
				return self._calculate_from_python(department, user, date_from, date_to)
			else:
				frappe.throw(f"Unknown data source type: {self.data_source_type}")
		except Exception as e:
			frappe.log_error(f"Error calculating metric {self.metric_code}: {str(e)}")
			return {"value": 0, "formatted": "Error", "error": str(e)}

	def _calculate_from_sql(self, department, user, date_from, date_to):
		"""Execute SQL query to get metric value"""
		# Prepare parameters for parameterized query
		params = {
			"department": department or self.department,
			"user": user,
			"date_from": date_from,
			"date_to": date_to
		}

		# Execute query safely
		result = frappe.db.sql(self.data_source, params, as_dict=True)

		if not result:
			value = 0
		else:
			# Get the first column of the first row
			value = list(result[0].values())[0] if result[0] else 0

		# Apply aggregation if needed (most SQL queries already aggregate)
		formatted = self._format_value(value)

		return {"value": float(value or 0), "formatted": formatted}

	def _calculate_from_api(self, department, user, date_from, date_to):
		"""Fetch metric value from external API"""
		import requests

		# Parse API configuration (expected format: URL with optional JSON path)
		api_config = json.loads(self.data_source) if self.data_source.startswith("{") else {"url": self.data_source}

		url = api_config.get("url")
		json_path = api_config.get("json_path", "value")

		# Prepare query parameters
		params = {}
		if department:
			params["department"] = department
		if user:
			params["user"] = user
		if date_from:
			params["date_from"] = date_from
		if date_to:
			params["date_to"] = date_to

		# Make API request
		response = requests.get(url, params=params, timeout=10)
		response.raise_for_status()

		data = response.json()

		# Extract value using json_path
		value = self._extract_json_value(data, json_path)
		formatted = self._format_value(value)

		return {"value": float(value or 0), "formatted": formatted}

	def _calculate_from_python(self, department, user, date_from, date_to):
		"""Execute Python code to calculate metric value"""
		# Create a safe execution context
		context = {
			"frappe": frappe,
			"department": department or self.department,
			"user": user,
			"date_from": date_from,
			"date_to": date_to,
			"value": 0
		}

		# Execute the Python code
		exec(self.data_source, context)

		value = context.get("value", 0)
		formatted = self._format_value(value)

		return {"value": float(value or 0), "formatted": formatted}

	def _extract_json_value(self, data, path):
		"""Extract value from JSON using dot notation path"""
		keys = path.split(".")
		value = data
		for key in keys:
			if isinstance(value, dict):
				value = value.get(key)
			else:
				return None
		return value

	def _format_value(self, value):
		"""Format value based on value_type"""
		try:
			num_value = float(value or 0)
		except (ValueError, TypeError):
			return str(value)

		if self.value_type == "currency":
			return frappe.utils.fmt_money(num_value, currency="USD")
		elif self.value_type == "percent":
			return f"{num_value:.1f}%"
		else:  # number
			return frappe.utils.fmt_money(num_value, precision=0, currency="")


@frappe.whitelist()
def get_metric_value(metric_code, department=None, user=None, date_from=None, date_to=None):
	"""
	API endpoint to get a metric's current value

	Args:
		metric_code: The metric code to calculate
		department: Filter by department (optional)
		user: Filter by user (optional)
		date_from: Start date for date range (optional)
		date_to: End date for date range (optional)

	Returns:
		dict: {"value": numeric_value, "formatted": formatted_string}
	"""
	metric = frappe.get_doc("WH KPI Metric", metric_code)
	return metric.calculate_value(department, user, date_from, date_to)


@frappe.whitelist()
def get_available_metrics(department=None, is_active=True):
	"""
	Get list of available metrics for a department

	Args:
		department: Filter by department (optional, returns ALL if not specified)
		is_active: Only return active metrics (default: True)

	Returns:
		list: List of metric dictionaries
	"""
	filters = {}

	if is_active:
		filters["is_active"] = 1

	if department:
		# Get metrics for specific department or ALL
		filters["department"] = ["in", [department, "ALL"]]

	metrics = frappe.get_all(
		"WH KPI Metric",
		filters=filters,
		fields=[
			"metric_code",
			"label",
			"description",
			"department",
			"value_type",
			"aggregation"
		],
		order_by="department, label"
	)

	return metrics
