# Copyright (c) 2026, SantaBrisa and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class WHCustomKPI(Document):
	def validate(self):
		"""Validate custom KPI configuration"""
		# Set owner_user to current user if not set
		if not self.owner_user:
			self.owner_user = frappe.session.user

		# Validate that metric exists and is active
		if self.metric:
			metric = frappe.get_doc("WH KPI Metric", self.metric)
			if not metric.is_active:
				frappe.throw(f"Cannot use inactive metric: {self.metric}")

			# Ensure department matches metric's department (or metric is ALL)
			if metric.department not in [self.department, "ALL"]:
				frappe.throw(
					f"Metric {self.metric} is for department {metric.department}, "
					f"but KPI is for {self.department}"
				)

		# Validate threshold logic (if thresholds are set)
		self._validate_thresholds()

	def _validate_thresholds(self):
		"""Validate that thresholds make logical sense"""
		if not self.target_value:
			return

		# Check that warning and critical thresholds are set together
		has_warning = self.warning_threshold is not None
		has_critical = self.critical_threshold is not None

		if has_warning and has_critical:
			# Determine if this is a "higher is better" or "lower is better" metric
			# by comparing target to warning threshold
			higher_is_better = self.target_value > self.warning_threshold

			if higher_is_better:
				# For higher-is-better: target > warning > critical
				if not (self.target_value >= self.warning_threshold >= self.critical_threshold):
					frappe.throw(
						"For higher-is-better metrics: "
						"Target >= Warning >= Critical"
					)
			else:
				# For lower-is-better: target < warning < critical
				if not (self.target_value <= self.warning_threshold <= self.critical_threshold):
					frappe.throw(
						"For lower-is-better metrics: "
						"Target <= Warning <= Critical"
					)

	def get_current_value(self, date_from=None, date_to=None):
		"""
		Get the current value for this KPI by calculating the linked metric

		Args:
			date_from: Start date for calculation (optional)
			date_to: End date for calculation (optional)

		Returns:
			dict: {
				"value": numeric_value,
				"formatted": formatted_string,
				"status": "ok" | "warning" | "critical",
				"target_value": target,
				"warning_threshold": warning,
				"critical_threshold": critical
			}
		"""
		if not self.metric:
			return {
				"value": 0,
				"formatted": "No metric",
				"status": "unknown",
				"target_value": self.target_value,
				"warning_threshold": self.warning_threshold,
				"critical_threshold": self.critical_threshold
			}

		# Get the metric document and calculate value
		metric = frappe.get_doc("WH KPI Metric", self.metric)
		result = metric.calculate_value(
			department=self.department,
			user=self.owner_user,
			date_from=date_from,
			date_to=date_to
		)

		# Determine status based on thresholds
		status = self._determine_status(result.get("value", 0))

		return {
			"value": result.get("value", 0),
			"formatted": result.get("formatted", "0"),
			"status": status,
			"target_value": self.target_value,
			"warning_threshold": self.warning_threshold,
			"critical_threshold": self.critical_threshold,
			"error": result.get("error")
		}

	def _determine_status(self, value):
		"""
		Determine if the current value is ok, warning, or critical

		Args:
			value: Current metric value

		Returns:
			str: "ok", "warning", "critical", or "unknown"
		"""
		if value is None or self.target_value is None:
			return "unknown"

		# If no thresholds set, just compare to target
		if self.warning_threshold is None or self.critical_threshold is None:
			return "ok" if value >= self.target_value else "warning"

		# Determine if higher is better
		higher_is_better = self.target_value > self.warning_threshold

		if higher_is_better:
			# Higher values are better
			if value >= self.target_value:
				return "ok"
			elif value >= self.warning_threshold:
				return "warning"
			else:
				return "critical"
		else:
			# Lower values are better
			if value <= self.target_value:
				return "ok"
			elif value <= self.warning_threshold:
				return "warning"
			else:
				return "critical"


@frappe.whitelist()
def get_custom_kpis(department=None, user=None, include_shared=True):
	"""
	Get custom KPIs for a user/department

	Args:
		department: Filter by department (optional)
		user: Filter by owner user (optional, defaults to current user)
		include_shared: Include KPIs shared with the department (default: True)

	Returns:
		list: List of custom KPI dictionaries with current values
	"""
	if not user:
		user = frappe.session.user

	filters = []

	# Build filters for owned KPIs
	owned_filters = {"owner_user": user}
	if department:
		owned_filters["department"] = department

	# Get owned KPIs
	kpis = frappe.get_all(
		"WH Custom KPI",
		filters=owned_filters,
		fields=["*"],
		order_by="display_order, creation"
	)

	# Mark as owned
	for kpi in kpis:
		kpi["is_owned"] = True

	# Get shared KPIs if requested
	if include_shared and department:
		shared_filters = {
			"is_shared": 1,
			"department": department,
			"owner_user": ["!=", user]
		}

		shared_kpis = frappe.get_all(
			"WH Custom KPI",
			filters=shared_filters,
			fields=["*"],
			order_by="display_order, creation"
		)

		# Mark as shared
		for kpi in shared_kpis:
			kpi["is_owned"] = False

		kpis.extend(shared_kpis)

	# Get current values for each KPI
	for kpi in kpis:
		kpi_doc = frappe.get_doc("WH Custom KPI", kpi.name)
		current_value = kpi_doc.get_current_value()
		kpi.update(current_value)

	return kpis


@frappe.whitelist()
def create_custom_kpi(title, metric, department, target_value=None, warning_threshold=None,
                      critical_threshold=None, visualization_type="number", is_shared=False):
	"""
	Create a new custom KPI

	Args:
		title: KPI title
		metric: Link to WH KPI Metric
		department: Department (SALES, OPS, MKT)
		target_value: Target value (optional)
		warning_threshold: Warning threshold (optional)
		critical_threshold: Critical threshold (optional)
		visualization_type: Visualization type (number, gauge, sparkline, progress)
		is_shared: Share with department (default: False)

	Returns:
		dict: Created KPI document
	"""
	doc = frappe.get_doc({
		"doctype": "WH Custom KPI",
		"title": title,
		"metric": metric,
		"department": department,
		"owner_user": frappe.session.user,
		"target_value": target_value,
		"warning_threshold": warning_threshold,
		"critical_threshold": critical_threshold,
		"visualization_type": visualization_type,
		"is_shared": is_shared
	})

	doc.insert()
	return doc.as_dict()


@frappe.whitelist()
def update_custom_kpi(name, **kwargs):
	"""
	Update a custom KPI

	Args:
		name: KPI name
		**kwargs: Fields to update

	Returns:
		dict: Updated KPI document
	"""
	doc = frappe.get_doc("WH Custom KPI", name)

	# Verify user owns this KPI
	if doc.owner_user != frappe.session.user and not frappe.has_permission("WH Custom KPI", "write"):
		frappe.throw("You don't have permission to edit this KPI")

	# Update fields
	for key, value in kwargs.items():
		if hasattr(doc, key):
			setattr(doc, key, value)

	doc.save()
	return doc.as_dict()


@frappe.whitelist()
def delete_custom_kpi(name):
	"""
	Delete a custom KPI

	Args:
		name: KPI name

	Returns:
		dict: Success message
	"""
	doc = frappe.get_doc("WH Custom KPI", name)

	# Verify user owns this KPI
	if doc.owner_user != frappe.session.user and not frappe.has_permission("WH Custom KPI", "delete"):
		frappe.throw("You don't have permission to delete this KPI")

	doc.delete()
	return {"message": "KPI deleted successfully"}


@frappe.whitelist()
def update_kpi_order(kpi_order):
	"""
	Update display order for multiple KPIs

	Args:
		kpi_order: List of KPI names in desired order (JSON string or list)

	Returns:
		dict: Success message
	"""
	import json

	# Parse if string
	if isinstance(kpi_order, str):
		kpi_order = json.loads(kpi_order)

	# Update display_order for each KPI
	for index, kpi_name in enumerate(kpi_order):
		doc = frappe.get_doc("WH Custom KPI", kpi_name)

		# Verify user owns this KPI or it's shared
		if doc.owner_user != frappe.session.user and not doc.is_shared:
			continue

		doc.display_order = index
		doc.save(ignore_permissions=True)

	return {"message": "KPI order updated successfully"}
