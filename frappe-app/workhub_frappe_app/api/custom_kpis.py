# Custom KPIs API
# API endpoints for CRUD operations on custom KPIs

import frappe
from frappe import _
import json

from workhub_frappe_app.api.utils import require_auth


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
	require_auth()

	if not user:
		user = frappe.session.user

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
	require_auth()

	# Validate that metric exists and is active
	if not frappe.db.exists("WH KPI Metric", metric):
		frappe.throw(_("Invalid metric: {0}").format(metric))

	metric_doc = frappe.get_doc("WH KPI Metric", metric)
	if not metric_doc.is_active:
		frappe.throw(_("Cannot use inactive metric: {0}").format(metric))

	# Ensure department matches metric's department (or metric is ALL)
	if metric_doc.department not in [department, "ALL"]:
		frappe.throw(
			_("Metric {0} is for department {1}, but KPI is for {2}").format(
				metric, metric_doc.department, department
			)
		)

	# Create the KPI
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
	require_auth()

	doc = frappe.get_doc("WH Custom KPI", name)

	# Verify user owns this KPI
	if doc.owner_user != frappe.session.user and not frappe.has_permission("WH Custom KPI", "write"):
		frappe.throw(_("You don't have permission to edit this KPI"))

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
	require_auth()

	doc = frappe.get_doc("WH Custom KPI", name)

	# Verify user owns this KPI
	if doc.owner_user != frappe.session.user and not frappe.has_permission("WH Custom KPI", "delete"):
		frappe.throw(_("You don't have permission to delete this KPI"))

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
	require_auth()

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


@frappe.whitelist()
def get_available_metrics(department=None):
	"""
	Get list of available metrics for the builder UI

	Args:
		department: Filter by department (optional, returns metrics for ALL departments if not specified)

	Returns:
		list: List of metric dictionaries with metadata (label, description, value_type, etc.)
	"""
	require_auth()

	filters = {"is_active": 1}

	if department:
		# Get metrics for specific department or ALL
		filters["department"] = ["in", [department, "ALL"]]

	metrics = frappe.get_all(
		"WH KPI Metric",
		filters=filters,
		fields=[
			"name",
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
