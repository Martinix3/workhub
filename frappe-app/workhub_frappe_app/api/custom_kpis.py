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
		      - User's own KPIs (marked with is_owned=True)
		      - Shared KPIs from same department (marked with is_owned=False)
		      If department is specified, only returns KPIs from that department.
		      If department is not specified, returns KPIs from all user's departments.
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
	if include_shared:
		if department:
			# If department is specified, get shared KPIs from that department only
			shared_filters = {
				"is_shared": 1,
				"department": department,
				"owner_user": ["!=", user]
			}
		else:
			# If no department specified, get shared KPIs from user's departments
			from workhub_frappe_app.api.settings import get_user_departments
			user_departments = get_user_departments(user)

			if user_departments:
				shared_filters = {
					"is_shared": 1,
					"department": ["in", user_departments],
					"owner_user": ["!=", user]
				}
			else:
				# User has no departments, skip shared KPIs
				shared_filters = None

		if shared_filters:
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
	Update display order for multiple KPIs (drag-and-drop reordering)

	Args:
		kpi_order: List of KPI names in desired order (JSON string or list)

	Returns:
		dict: Success message with count of updated KPIs

	Raises:
		frappe.ValidationError: If user doesn't own or have access to any KPI in the list
	"""
	require_auth()

	# Parse if string
	if isinstance(kpi_order, str):
		kpi_order = json.loads(kpi_order)

	if not isinstance(kpi_order, list) or len(kpi_order) == 0:
		frappe.throw(_("kpi_order must be a non-empty list of KPI names"))

	# First, validate that user has permission to reorder all KPIs
	current_user = frappe.session.user
	validated_kpis = []

	for kpi_name in kpi_order:
		if not frappe.db.exists("WH Custom KPI", kpi_name):
			frappe.throw(_("KPI {0} does not exist").format(kpi_name))

		doc = frappe.get_doc("WH Custom KPI", kpi_name)

		# Verify user owns this KPI or it's shared with them
		# Only owners can reorder their KPIs; shared KPIs cannot be reordered by non-owners
		if doc.owner_user != current_user:
			frappe.throw(
				_("You don't have permission to reorder KPI '{0}'. Only the owner can reorder KPIs.").format(
					doc.title or kpi_name
				)
			)

		validated_kpis.append(doc)

	# All validations passed, now update display_order
	for index, doc in enumerate(validated_kpis):
		doc.display_order = index
		doc.save(ignore_permissions=True)

	return {
		"message": "KPI order updated successfully",
		"updated_count": len(validated_kpis)
	}


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


@frappe.whitelist()
def calculate_kpi_value(kpi_name, date_from=None, date_to=None, use_cache=True):
	"""
	Service function to calculate current value for a KPI with trend comparison

	Args:
		kpi_name: Name/ID of the WH Custom KPI
		date_from: Start date for calculation (optional)
		date_to: End date for calculation (optional)
		use_cache: Use cached values if available (default: True)

	Returns:
		dict: {
			"value": numeric_value,
			"formatted": formatted_string,
			"status": "ok" | "warning" | "critical",
			"target_value": target,
			"warning_threshold": warning,
			"critical_threshold": critical,
			"trend": {
				"previous_value": numeric_value,
				"change": numeric_change,
				"change_percent": percent_change,
				"direction": "up" | "down" | "stable"
			}
		}
	"""
	require_auth()

	# Check cache first if enabled
	cache_key = f"kpi_value_{kpi_name}_{date_from}_{date_to}"
	if use_cache:
		cached_value = frappe.cache().get_value(cache_key)
		if cached_value:
			return cached_value

	# Get the KPI document
	kpi_doc = frappe.get_doc("WH Custom KPI", kpi_name)

	# Verify user has access to this KPI
	if kpi_doc.owner_user != frappe.session.user:
		# If not owner, check if it's shared with user's department
		if kpi_doc.is_shared:
			from workhub_frappe_app.api.settings import get_user_departments
			user_departments = get_user_departments(frappe.session.user)
			if kpi_doc.department not in user_departments:
				frappe.throw(_("You don't have permission to view this KPI"))
		else:
			# Not shared, check standard permissions
			if not frappe.has_permission("WH Custom KPI", "read", kpi_doc):
				frappe.throw(_("You don't have permission to view this KPI"))

	# Calculate current period value
	current_result = kpi_doc.get_current_value(date_from=date_from, date_to=date_to)
	current_value = current_result.get("value", 0)

	# Calculate previous period value for trend
	trend = _calculate_trend(kpi_doc, current_value, date_from, date_to)

	# Build complete result
	result = {
		"value": current_value,
		"formatted": current_result.get("formatted", "0"),
		"status": current_result.get("status", "unknown"),
		"target_value": current_result.get("target_value"),
		"warning_threshold": current_result.get("warning_threshold"),
		"critical_threshold": current_result.get("critical_threshold"),
		"trend": trend,
		"error": current_result.get("error")
	}

	# Cache the result for 5 minutes (300 seconds)
	if use_cache and not result.get("error"):
		frappe.cache().set_value(cache_key, result, expires_in_sec=300)

	return result


def _calculate_trend(kpi_doc, current_value, date_from=None, date_to=None):
	"""
	Calculate trend by comparing current value to previous period

	Args:
		kpi_doc: WH Custom KPI document
		current_value: Current period value
		date_from: Start date of current period
		date_to: End date of current period

	Returns:
		dict: Trend information with previous value, change, and direction
	"""
	from frappe.utils import add_days, getdate

	try:
		# If no date range specified, compare to same period last week/month
		if not date_from or not date_to:
			# Default to last 30 days for current period
			date_to = getdate()
			date_from = add_days(date_to, -30)

		# Calculate previous period (same duration, shifted back)
		date_from = getdate(date_from)
		date_to = getdate(date_to)
		period_days = (date_to - date_from).days

		prev_date_to = add_days(date_from, -1)
		prev_date_from = add_days(prev_date_to, -period_days)

		# Get metric and calculate previous period value
		metric = frappe.get_doc("WH KPI Metric", kpi_doc.metric)
		prev_result = metric.calculate_value(
			department=kpi_doc.department,
			user=kpi_doc.owner_user,
			date_from=str(prev_date_from),
			date_to=str(prev_date_to)
		)

		previous_value = prev_result.get("value", 0)

		# Calculate change and direction
		change = current_value - previous_value

		# Calculate percentage change (avoid division by zero)
		if previous_value != 0:
			change_percent = (change / abs(previous_value)) * 100
		else:
			change_percent = 100 if current_value > 0 else 0

		# Determine direction
		if abs(change_percent) < 1:
			direction = "stable"
		elif change > 0:
			direction = "up"
		else:
			direction = "down"

		return {
			"previous_value": previous_value,
			"change": change,
			"change_percent": round(change_percent, 1),
			"direction": direction
		}

	except Exception as e:
		frappe.log_error(f"Error calculating trend for KPI {kpi_doc.name}: {str(e)}")
		return {
			"previous_value": 0,
			"change": 0,
			"change_percent": 0,
			"direction": "stable",
			"error": str(e)
		}
