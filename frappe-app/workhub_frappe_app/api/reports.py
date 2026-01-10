# WH Reports API
# CRUD operations for report definition management

import frappe
from frappe import _
from frappe.utils import nowdate
import json

from workhub_frappe_app.api.utils import require_auth, require_permission


@frappe.whitelist()
def get_reports(filters=None, limit=50, offset=0):
	"""Get report list with optional filters"""
	require_auth()
	if filters and isinstance(filters, str):
		filters = json.loads(filters)

	filter_conditions = {}

	if filters:
		if filters.get("report_type"):
			filter_conditions["report_type"] = filters["report_type"]
		if filters.get("category"):
			filter_conditions["category"] = filters["category"]
		if filters.get("is_active") is not None:
			filter_conditions["is_active"] = filters["is_active"]
		if filters.get("created_by"):
			filter_conditions["created_by"] = filters["created_by"]
		if filters.get("search"):
			filter_conditions["title"] = ["like", f"%{filters['search']}%"]

	reports = frappe.get_list("WH Report Definition",
		filters=filter_conditions,
		fields=[
			"name", "title", "description", "report_type", "category",
			"is_active", "created_by", "creation", "modified"
		],
		limit_page_length=int(limit),
		limit_start=int(offset),
		order_by="modified desc",
		ignore_permissions=True
	)

	# Enrich with creator info and section count
	for report in reports:
		if report.get("created_by"):
			user_data = frappe.db.get_value("User", report["created_by"],
				["full_name", "user_image"], as_dict=True)
			if user_data:
				report["created_by_name"] = user_data.full_name
				report["created_by_image"] = user_data.user_image

		# Count sections
		section_count = frappe.db.count("WH Report Section",
			filters={"parent": report["name"]})
		report["section_count"] = section_count

	return reports


@frappe.whitelist()
def get_report_detail(report_id):
	"""Get single report with full details including sections"""
	require_auth()
	if not report_id:
		frappe.throw(_("Report ID is required"))

	report = frappe.get_doc("WH Report Definition", report_id)

	# Get sections sorted by display order
	sections = []
	for section in report.sections:
		section_data = {
			"name": section.name,
			"section_type": section.section_type,
			"title": section.title,
			"data_source": section.data_source,
			"display_order": section.display_order,
			"is_visible": section.is_visible,
			"config": section.config
		}
		sections.append(section_data)

	# Sort sections by display order
	sections = sorted(sections, key=lambda x: x["display_order"])

	# Get creator info
	creator_info = None
	if report.created_by:
		user_data = frappe.db.get_value("User", report.created_by,
			["full_name", "user_image", "email"], as_dict=True)
		if user_data:
			creator_info = user_data

	return {
		"report": {
			"name": report.name,
			"title": report.title,
			"description": report.description,
			"report_type": report.report_type,
			"category": report.category,
			"is_active": report.is_active,
			"created_by": report.created_by,
			"creation": report.creation,
			"modified": report.modified
		},
		"sections": sections,
		"creator_info": creator_info
	}


@frappe.whitelist()
def create_report(data):
	"""Create a new report definition"""
	require_permission("WH Report Definition", "create")
	if isinstance(data, str):
		data = json.loads(data)

	if not data.get("title"):
		frappe.throw(_("Title is required"))

	doc = frappe.new_doc("WH Report Definition")
	doc.title = data["title"]
	doc.description = data.get("description")
	doc.report_type = data.get("report_type", "Custom")
	doc.category = data.get("category", "Custom")
	doc.is_active = data.get("is_active", 1)

	# Add sections if provided
	if data.get("sections"):
		for section in data["sections"]:
			doc.append("sections", {
				"section_type": section.get("section_type"),
				"title": section.get("title"),
				"data_source": section.get("data_source"),
				"display_order": section.get("display_order", 0),
				"is_visible": section.get("is_visible", 1),
				"config": section.get("config")
			})

	doc.insert()
	return {"success": True, "report_id": doc.name}


@frappe.whitelist()
def update_report(report_id, data):
	"""Update an existing report definition"""
	require_permission("WH Report Definition", "write")
	if isinstance(data, str):
		data = json.loads(data)

	if not report_id:
		frappe.throw(_("Report ID is required"))

	doc = frappe.get_doc("WH Report Definition", report_id)

	# Update allowed fields
	allowed_fields = [
		"title", "description", "report_type", "category", "is_active"
	]

	for field in allowed_fields:
		if field in data:
			setattr(doc, field, data[field])

	# Update sections if provided
	if "sections" in data:
		# Clear existing sections
		doc.sections = []

		# Add new sections
		for section in data["sections"]:
			doc.append("sections", {
				"section_type": section.get("section_type"),
				"title": section.get("title"),
				"data_source": section.get("data_source"),
				"display_order": section.get("display_order", 0),
				"is_visible": section.get("is_visible", 1),
				"config": section.get("config")
			})

	doc.save()
	return {"success": True, "report_id": doc.name}


@frappe.whitelist()
def delete_report(report_id):
	"""Delete a report definition"""
	require_permission("WH Report Definition", "delete")
	if not report_id:
		frappe.throw(_("Report ID is required"))

	# Check if report has any scheduled instances
	scheduled_count = frappe.db.count("WH Scheduled Report",
		filters={"report_definition": report_id})

	if scheduled_count > 0:
		frappe.throw(_(
			"Cannot delete report. It has {0} scheduled report(s). "
			"Please delete the scheduled reports first."
		).format(scheduled_count))

	frappe.delete_doc("WH Report Definition", report_id)
	return {"success": True}


@frappe.whitelist()
def duplicate_report(report_id, new_title=None):
	"""Duplicate an existing report"""
	require_permission("WH Report Definition", "create")
	if not report_id:
		frappe.throw(_("Report ID is required"))

	# Get the source report
	source = frappe.get_doc("WH Report Definition", report_id)

	# Create new report
	new_report = frappe.new_doc("WH Report Definition")
	new_report.title = new_title or f"{source.title} (Copy)"
	new_report.description = source.description
	new_report.report_type = "Custom"  # Duplicates are always custom
	new_report.category = source.category
	new_report.is_active = 1

	# Copy sections
	for section in source.sections:
		new_report.append("sections", {
			"section_type": section.section_type,
			"title": section.title,
			"data_source": section.data_source,
			"display_order": section.display_order,
			"is_visible": section.is_visible,
			"config": section.config
		})

	new_report.insert()
	return {
		"success": True,
		"report_id": new_report.name,
		"title": new_report.title
	}


@frappe.whitelist()
def get_report_data_sources():
	"""List available data sources for reports"""
	require_auth()

	# Define available data sources with metadata
	data_sources = [
		{
			"id": "tasks",
			"name": "Tasks",
			"description": "Task data with status, priority, assignments, and completion metrics",
			"category": "Team",
			"fields": [
				{"name": "name", "label": "Task ID", "type": "string"},
				{"name": "title", "label": "Title", "type": "string"},
				{"name": "status", "label": "Status", "type": "string"},
				{"name": "priority", "label": "Priority", "type": "string"},
				{"name": "department", "label": "Department", "type": "string"},
				{"name": "assigned_to", "label": "Assigned To", "type": "string"},
				{"name": "project", "label": "Project", "type": "string"},
				{"name": "due_date", "label": "Due Date", "type": "date"},
				{"name": "start_date", "label": "Start Date", "type": "date"},
				{"name": "is_overdue", "label": "Is Overdue", "type": "boolean"}
			],
			"filters": [
				{"name": "status", "label": "Status", "type": "select", "options": ["BACKLOG", "NEXT", "DOING", "BLOCKED", "DONE"]},
				{"name": "priority", "label": "Priority", "type": "select", "options": ["P0", "P1", "P2"]},
				{"name": "department", "label": "Department", "type": "select", "options": ["SALES", "OPS", "MKT"]},
				{"name": "date_range", "label": "Date Range", "type": "daterange"}
			]
		},
		{
			"id": "projects",
			"name": "Projects",
			"description": "Project health, progress, task counts, and timeline data",
			"category": "Project",
			"fields": [
				{"name": "name", "label": "Project ID", "type": "string"},
				{"name": "title", "label": "Title", "type": "string"},
				{"name": "status", "label": "Status", "type": "string"},
				{"name": "health", "label": "Health", "type": "string"},
				{"name": "department", "label": "Department", "type": "string"},
				{"name": "owner_user", "label": "Owner", "type": "string"},
				{"name": "progress_pct", "label": "Progress %", "type": "number"},
				{"name": "total_tasks", "label": "Total Tasks", "type": "number"},
				{"name": "completed_tasks", "label": "Completed Tasks", "type": "number"},
				{"name": "blocked_tasks", "label": "Blocked Tasks", "type": "number"},
				{"name": "target_date", "label": "Target Date", "type": "date"}
			],
			"filters": [
				{"name": "status", "label": "Status", "type": "select", "options": ["ACTIVE", "COMPLETED", "PAUSED"]},
				{"name": "health", "label": "Health", "type": "select", "options": ["GREEN", "YELLOW", "RED"]},
				{"name": "department", "label": "Department", "type": "select", "options": ["SALES", "OPS", "MKT"]}
			]
		},
		{
			"id": "team_metrics",
			"name": "Team Metrics",
			"description": "Team productivity, velocity, completion rates, and trends",
			"category": "Team",
			"fields": [
				{"name": "metric_name", "label": "Metric", "type": "string"},
				{"name": "value", "label": "Value", "type": "number"},
				{"name": "change", "label": "Change %", "type": "number"},
				{"name": "trend", "label": "Trend", "type": "string"}
			],
			"filters": [
				{"name": "period", "label": "Period", "type": "select", "options": ["week", "month", "quarter"]}
			]
		},
		{
			"id": "haccp_inspections",
			"name": "HACCP Inspections",
			"description": "Quality inspection data with approval rates and status",
			"category": "HACCP",
			"fields": [
				{"name": "id", "label": "Inspection ID", "type": "string"},
				{"name": "item_code", "label": "Item Code", "type": "string"},
				{"name": "item_name", "label": "Item Name", "type": "string"},
				{"name": "status", "label": "Status", "type": "string"},
				{"name": "report_date", "label": "Inspection Date", "type": "date"},
				{"name": "inspected_by", "label": "Inspector", "type": "string"},
				{"name": "result", "label": "Result", "type": "string"}
			],
			"filters": [
				{"name": "status", "label": "Status", "type": "select", "options": ["Accepted", "Rejected", "Pending"]},
				{"name": "date_range", "label": "Date Range", "type": "daterange"}
			]
		},
		{
			"id": "quality_metrics",
			"name": "Quality Metrics",
			"description": "Quality KPIs including approval rates, non-conformances, and trends",
			"category": "HACCP",
			"fields": [
				{"name": "metric_name", "label": "Metric", "type": "string"},
				{"name": "value", "label": "Current Value", "type": "number"},
				{"name": "previous_value", "label": "Previous Value", "type": "number"},
				{"name": "change", "label": "Change %", "type": "number"},
				{"name": "label", "label": "Label", "type": "string"}
			],
			"filters": [
				{"name": "period", "label": "Period", "type": "select", "options": ["current_month", "previous_month"]}
			]
		}
	]

	return {"success": True, "data_sources": data_sources}


@frappe.whitelist()
def execute_data_source(data_source_id, filters=None, config=None):
	"""Execute a data source query and return formatted data"""
	require_auth()

	if isinstance(filters, str):
		filters = json.loads(filters)
	if isinstance(config, str):
		config = json.loads(config)

	if not data_source_id:
		frappe.throw(_("Data source ID is required"))

	# Execute the appropriate data source
	if data_source_id == "tasks":
		return _execute_tasks_data_source(filters or {}, config or {})
	elif data_source_id == "projects":
		return _execute_projects_data_source(filters or {}, config or {})
	elif data_source_id == "team_metrics":
		return _execute_team_metrics_data_source(filters or {}, config or {})
	elif data_source_id == "haccp_inspections":
		return _execute_haccp_inspections_data_source(filters or {}, config or {})
	elif data_source_id == "quality_metrics":
		return _execute_quality_metrics_data_source(filters or {}, config or {})
	else:
		frappe.throw(_("Unknown data source: {0}").format(data_source_id))


def _execute_tasks_data_source(filters, config):
	"""Execute tasks data source query"""
	from frappe.utils import getdate, nowdate, add_days

	filter_conditions = {}

	# Apply filters
	if filters.get("status"):
		if isinstance(filters["status"], list):
			filter_conditions["status"] = ["in", filters["status"]]
		else:
			filter_conditions["status"] = filters["status"]

	if filters.get("priority"):
		if isinstance(filters["priority"], list):
			filter_conditions["priority"] = ["in", filters["priority"]]
		else:
			filter_conditions["priority"] = filters["priority"]

	if filters.get("department"):
		filter_conditions["department"] = filters["department"]

	if filters.get("project"):
		filter_conditions["project"] = filters["project"]

	if filters.get("assigned_to"):
		filter_conditions["assigned_to"] = filters["assigned_to"]

	# Date range filter
	if filters.get("date_range"):
		date_range = filters["date_range"]
		if isinstance(date_range, dict) and date_range.get("from") and date_range.get("to"):
			filter_conditions["due_date"] = ["between", [date_range["from"], date_range["to"]]]

	# Get tasks
	tasks = frappe.get_list("WH Task",
		filters=filter_conditions,
		fields=[
			"name", "title", "description", "status", "priority",
			"project", "department", "assigned_to", "created_by",
			"start_date", "due_date", "is_milestone",
			"worked_today", "total_work_days",
			"creation", "modified"
		],
		limit_page_length=config.get("limit", 1000),
		order_by=config.get("order_by", "priority asc, due_date asc"),
		ignore_permissions=True
	)

	# Enrich task data
	for task in tasks:
		# Add project info
		if task.get("project"):
			project_data = frappe.db.get_value("WH Project", task["project"],
				["title", "health"], as_dict=True)
			if project_data:
				task["project_title"] = project_data.title
				task["project_health"] = project_data.health

		# Add assigned user info
		if task.get("assigned_to"):
			user_data = frappe.db.get_value("User", task["assigned_to"],
				["full_name"], as_dict=True)
			if user_data:
				task["assigned_to_name"] = user_data.full_name

		# Calculate overdue status
		if task.get("due_date") and task.get("status") != "DONE":
			task["is_overdue"] = getdate(task["due_date"]) < getdate(nowdate())
		else:
			task["is_overdue"] = False

	return {"success": True, "data": tasks, "total": len(tasks)}


def _execute_projects_data_source(filters, config):
	"""Execute projects data source query"""
	from frappe.utils import nowdate, date_diff

	filter_conditions = {}

	# Apply filters
	if filters.get("status"):
		if isinstance(filters["status"], list):
			filter_conditions["status"] = ["in", filters["status"]]
		else:
			filter_conditions["status"] = filters["status"]

	if filters.get("health"):
		if isinstance(filters["health"], list):
			filter_conditions["health"] = ["in", filters["health"]]
		else:
			filter_conditions["health"] = filters["health"]

	if filters.get("department"):
		filter_conditions["department"] = filters["department"]

	if filters.get("owner_user"):
		filter_conditions["owner_user"] = filters["owner_user"]

	# Get projects
	projects = frappe.get_list("WH Project",
		filters=filter_conditions,
		fields=[
			"name", "title", "description", "status", "health", "health_reason",
			"department", "owner_user", "start_date", "target_date",
			"progress_pct", "total_tasks", "completed_tasks",
			"blocked_tasks", "overdue_tasks", "velocity",
			"creation", "modified"
		],
		limit_page_length=config.get("limit", 1000),
		order_by=config.get("order_by", "health desc, target_date asc"),
		ignore_permissions=True
	)

	# Enrich project data
	for project in projects:
		# Add owner info
		if project.get("owner_user"):
			user_data = frappe.db.get_value("User", project["owner_user"],
				["full_name"], as_dict=True)
			if user_data:
				project["owner_name"] = user_data.full_name

		# Calculate days remaining
		if project.get("target_date"):
			days_remaining = date_diff(project["target_date"], nowdate())
			project["days_remaining"] = days_remaining
			project["is_overdue"] = days_remaining < 0 and project["status"] == "ACTIVE"
		else:
			project["days_remaining"] = None
			project["is_overdue"] = False

	return {"success": True, "data": projects, "total": len(projects)}


def _execute_team_metrics_data_source(filters, config):
	"""Execute team metrics data source query"""
	from frappe.utils import nowdate, add_days, add_months

	today = nowdate()
	period = filters.get("period", "week")

	# Calculate date ranges based on period
	if period == "week":
		start_date = add_days(today, -7)
		prev_start_date = add_days(today, -14)
		prev_end_date = add_days(today, -7)
	elif period == "quarter":
		start_date = add_days(today, -90)
		prev_start_date = add_days(today, -180)
		prev_end_date = add_days(today, -90)
	else:  # month
		start_date = add_days(today, -30)
		prev_start_date = add_days(today, -60)
		prev_end_date = add_days(today, -30)

	# Tasks completed in period
	tasks_completed = frappe.db.sql("""
		SELECT COUNT(*) FROM `tabWH Task`
		WHERE status = 'DONE' AND modified >= %s
	""", (start_date,))[0][0] or 0

	# Tasks completed in previous period
	prev_tasks_completed = frappe.db.sql("""
		SELECT COUNT(*) FROM `tabWH Task`
		WHERE status = 'DONE'
		AND modified >= %s AND modified < %s
	""", (prev_start_date, prev_end_date))[0][0] or 1

	# Active team size
	team_size = frappe.db.sql("""
		SELECT COUNT(DISTINCT assigned_to) FROM `tabWH Task`
		WHERE status != 'DONE'
	""")[0][0] or 1

	# Calculate metrics
	velocity = round(tasks_completed / team_size, 1) if team_size else 0
	prev_velocity = round(prev_tasks_completed / team_size, 1) if team_size else 0
	velocity_change = round(((velocity - prev_velocity) / prev_velocity * 100), 1) if prev_velocity else 0

	completion_change = round(((tasks_completed - prev_tasks_completed) / prev_tasks_completed * 100), 1) if prev_tasks_completed else 0

	# Blocked tasks
	tasks_blocked = frappe.db.count("WH Task", {"status": "BLOCKED"})

	# Overdue tasks
	tasks_overdue = frappe.db.sql("""
		SELECT COUNT(*) FROM `tabWH Task`
		WHERE status NOT IN ('DONE') AND due_date < CURDATE()
	""")[0][0] or 0

	# Build metrics response
	metrics = [
		{
			"metric_name": "team_size",
			"value": team_size,
			"change": 0,
			"trend": "stable",
			"label": "Team Size"
		},
		{
			"metric_name": "velocity",
			"value": velocity,
			"change": velocity_change,
			"trend": "up" if velocity_change > 5 else "down" if velocity_change < -5 else "stable",
			"label": f"Velocity (tasks/{period})"
		},
		{
			"metric_name": "tasks_completed",
			"value": tasks_completed,
			"change": completion_change,
			"trend": "up" if completion_change > 5 else "down" if completion_change < -5 else "stable",
			"label": f"Tasks Completed ({period})"
		},
		{
			"metric_name": "tasks_blocked",
			"value": tasks_blocked,
			"change": 0,
			"trend": "stable",
			"label": "Tasks Blocked"
		},
		{
			"metric_name": "tasks_overdue",
			"value": tasks_overdue,
			"change": 0,
			"trend": "stable",
			"label": "Tasks Overdue"
		}
	]

	return {"success": True, "data": metrics, "total": len(metrics)}


def _execute_haccp_inspections_data_source(filters, config):
	"""Execute HACCP inspections data source query"""
	from frappe.utils import get_first_day, get_last_day, today

	filter_conditions = {}

	# Apply status filter
	if filters.get("status"):
		if filters["status"] == "Pending":
			filter_conditions["docstatus"] = 0
		else:
			filter_conditions["status"] = filters["status"]
			filter_conditions["docstatus"] = 1

	# Apply date range filter
	if filters.get("date_range"):
		date_range = filters["date_range"]
		if isinstance(date_range, dict) and date_range.get("from") and date_range.get("to"):
			filter_conditions["report_date"] = ["between", [date_range["from"], date_range["to"]]]
	else:
		# Default to current month
		filter_conditions["report_date"] = ["between", [get_first_day(today()), get_last_day(today())]]

	try:
		# Get inspections
		inspections = frappe.get_list("Quality Inspection",
			filters=filter_conditions,
			fields=[
				"name", "inspection_type", "reference_type", "reference_name",
				"item_code", "item_name", "sample_size", "status",
				"inspected_by", "report_date", "creation"
			],
			limit_page_length=config.get("limit", 1000),
			order_by=config.get("order_by", "report_date desc"),
			ignore_permissions=True
		)

		# Transform to standard format
		result = []
		for insp in inspections:
			# Map status to result
			if insp.status == "Accepted":
				result_status = "approved"
			elif insp.status == "Rejected":
				result_status = "rejected"
			else:
				result_status = "pending"

			result.append({
				"id": insp.name,
				"lot_number": insp.reference_name or insp.name,
				"item_code": insp.item_code or "",
				"item_name": insp.item_name or insp.item_code or "",
				"status": insp.status or "Pending",
				"report_date": str(insp.report_date or insp.creation),
				"inspected_by": insp.inspected_by or "Not Assigned",
				"result": result_status
			})

		return {"success": True, "data": result, "total": len(result)}

	except Exception as e:
		# Return empty data if Quality Inspection doesn't exist
		frappe.log_error(f"Error fetching HACCP inspections: {str(e)}")
		return {"success": True, "data": [], "total": 0}


def _execute_quality_metrics_data_source(filters, config):
	"""Execute quality metrics data source query"""
	from frappe.utils import get_first_day, get_last_day, today, add_months

	period = filters.get("period", "current_month")

	# Set date ranges
	if period == "previous_month":
		first_day = get_first_day(add_months(today(), -1))
		last_day = get_last_day(add_months(today(), -1))
		prev_first = get_first_day(add_months(today(), -2))
		prev_last = get_last_day(add_months(today(), -2))
	else:  # current_month
		first_day = get_first_day(today())
		last_day = get_last_day(today())
		prev_first = get_first_day(add_months(today(), -1))
		prev_last = get_last_day(add_months(today(), -1))

	metrics = []

	try:
		# Quality inspections
		inspections_accepted = frappe.db.count("Quality Inspection", {
			"status": "Accepted",
			"report_date": ["between", [first_day, last_day]]
		})
		inspections_rejected = frappe.db.count("Quality Inspection", {
			"status": "Rejected",
			"report_date": ["between", [first_day, last_day]]
		})
		total_inspections = inspections_accepted + inspections_rejected
		approval_rate = (inspections_accepted / total_inspections * 100) if total_inspections else 100

		# Previous period
		prev_accepted = frappe.db.count("Quality Inspection", {
			"status": "Accepted",
			"report_date": ["between", [prev_first, prev_last]]
		})
		prev_rejected = frappe.db.count("Quality Inspection", {
			"status": "Rejected",
			"report_date": ["between", [prev_first, prev_last]]
		})
		prev_total = prev_accepted + prev_rejected
		prev_approval = (prev_accepted / prev_total * 100) if prev_total else 100

		approval_change = round(approval_rate - prev_approval, 1)

		metrics.append({
			"metric_name": "approval_rate",
			"value": round(approval_rate, 1),
			"previous_value": round(prev_approval, 1),
			"change": approval_change,
			"label": "Approval Rate (%)"
		})

		# Pending inspections
		inspections_pending = frappe.db.count("Quality Inspection", {"docstatus": 0})
		metrics.append({
			"metric_name": "pending_inspections",
			"value": inspections_pending,
			"previous_value": 0,
			"change": 0,
			"label": "Pending Inspections"
		})

		# Non-conformances
		try:
			open_ncs = frappe.db.count("Non Conformance", {
				"status": ["not in", ["Closed", "Cancelled"]]
			})
			metrics.append({
				"metric_name": "open_ncs",
				"value": open_ncs,
				"previous_value": 0,
				"change": 0,
				"label": "Open Non-Conformances"
			})
		except Exception:
			pass

	except Exception as e:
		frappe.log_error(f"Error fetching quality metrics: {str(e)}")

	return {"success": True, "data": metrics, "total": len(metrics)}


@frappe.whitelist()
def generate_report(report_id, filters=None, config=None):
	"""Generate a complete report with all section data"""
	require_auth()

	if isinstance(filters, str):
		filters = json.loads(filters)
	if isinstance(config, str):
		config = json.loads(config)

	if not report_id:
		frappe.throw(_("Report ID is required"))

	# Get the report definition
	report_doc = frappe.get_doc("WH Report Definition", report_id)

	if not report_doc.is_active:
		frappe.throw(_("This report is not active"))

	# Build report metadata
	report_metadata = {
		"report_id": report_doc.name,
		"title": report_doc.title,
		"description": report_doc.description,
		"report_type": report_doc.report_type,
		"category": report_doc.category,
		"generated_at": nowdate(),
		"generated_by": frappe.session.user
	}

	# Get creator info
	if report_doc.created_by:
		user_data = frappe.db.get_value("User", report_doc.created_by,
			["full_name", "email"], as_dict=True)
		if user_data:
			report_metadata["created_by"] = report_doc.created_by
			report_metadata["created_by_name"] = user_data.full_name
			report_metadata["created_by_email"] = user_data.email

	# Get current user info
	current_user = frappe.db.get_value("User", frappe.session.user,
		["full_name", "email"], as_dict=True)
	if current_user:
		report_metadata["generated_by_name"] = current_user.full_name
		report_metadata["generated_by_email"] = current_user.email

	# Get all sections sorted by display order
	sections = []
	for section in sorted(report_doc.sections, key=lambda x: x.display_order):
		# Skip hidden sections
		if not section.is_visible:
			continue

		# Build section metadata
		section_data = {
			"name": section.name,
			"section_type": section.section_type,
			"title": section.title,
			"display_order": section.display_order,
			"data_source": section.data_source,
			"config": section.config
		}

		# Parse section config if it's a string
		section_config = section.config
		if isinstance(section_config, str):
			try:
				section_config = json.loads(section_config)
			except:
				section_config = {}

		# Execute data source to get section data
		if section.data_source:
			try:
				# Merge filters: report-level filters + section-level filters
				section_filters = filters.copy() if filters else {}
				if section_config and section_config.get("filters"):
					section_filters.update(section_config.get("filters"))

				# Execute the data source
				result = execute_data_source(
					section.data_source,
					section_filters,
					section_config
				)

				if result.get("success"):
					section_data["data"] = result.get("data", [])
					section_data["total"] = result.get("total", 0)
					section_data["status"] = "success"
				else:
					section_data["data"] = []
					section_data["total"] = 0
					section_data["status"] = "error"
					section_data["error"] = "Failed to fetch data"
			except Exception as e:
				frappe.log_error(f"Error executing data source for section {section.name}: {str(e)}")
				section_data["data"] = []
				section_data["total"] = 0
				section_data["status"] = "error"
				section_data["error"] = str(e)
		else:
			# For sections without data sources (like header, text sections)
			section_data["data"] = None
			section_data["total"] = 0
			section_data["status"] = "success"

		sections.append(section_data)

	# Build complete report structure
	report = {
		"success": True,
		"metadata": report_metadata,
		"sections": sections,
		"total_sections": len(sections)
	}

	return report


# Section Management API

@frappe.whitelist()
def add_section(report_id, section_data):
	"""Add a new section to a report"""
	require_permission("WH Report Definition", "write")

	if isinstance(section_data, str):
		section_data = json.loads(section_data)

	if not report_id:
		frappe.throw(_("Report ID is required"))

	if not section_data.get("section_type"):
		frappe.throw(_("Section type is required"))

	if not section_data.get("title"):
		frappe.throw(_("Section title is required"))

	# Validate section type
	valid_section_types = ["Header", "KPI", "Chart", "Table", "Text"]
	if section_data["section_type"] not in valid_section_types:
		frappe.throw(_("Invalid section type. Must be one of: {0}").format(", ".join(valid_section_types)))

	# Get the report document
	report_doc = frappe.get_doc("WH Report Definition", report_id)

	# Determine display order (append to end if not specified)
	display_order = section_data.get("display_order")
	if display_order is None:
		# Get the max display order and add 1
		max_order = max([s.display_order for s in report_doc.sections], default=-1)
		display_order = max_order + 1

	# Add the new section
	new_section = report_doc.append("sections", {
		"section_type": section_data["section_type"],
		"title": section_data["title"],
		"data_source": section_data.get("data_source", ""),
		"config": section_data.get("config", "{}") if isinstance(section_data.get("config"), str) else json.dumps(section_data.get("config", {})),
		"display_order": display_order,
		"is_visible": section_data.get("is_visible", 1)
	})

	# Save the report
	report_doc.save()

	return {
		"success": True,
		"section": {
			"name": new_section.name,
			"section_type": new_section.section_type,
			"title": new_section.title,
			"data_source": new_section.data_source,
			"config": new_section.config,
			"display_order": new_section.display_order,
			"is_visible": new_section.is_visible
		}
	}


@frappe.whitelist()
def update_section(report_id, section_name, section_data):
	"""Update an existing section"""
	require_permission("WH Report Definition", "write")

	if isinstance(section_data, str):
		section_data = json.loads(section_data)

	if not report_id:
		frappe.throw(_("Report ID is required"))

	if not section_name:
		frappe.throw(_("Section name is required"))

	# Get the report document
	report_doc = frappe.get_doc("WH Report Definition", report_id)

	# Find the section to update
	section_found = False
	for section in report_doc.sections:
		if section.name == section_name:
			section_found = True

			# Update allowed fields
			if "section_type" in section_data:
				valid_section_types = ["Header", "KPI", "Chart", "Table", "Text"]
				if section_data["section_type"] not in valid_section_types:
					frappe.throw(_("Invalid section type. Must be one of: {0}").format(", ".join(valid_section_types)))
				section.section_type = section_data["section_type"]

			if "title" in section_data:
				section.title = section_data["title"]

			if "data_source" in section_data:
				section.data_source = section_data["data_source"]

			if "config" in section_data:
				config = section_data["config"]
				if isinstance(config, str):
					section.config = config
				else:
					section.config = json.dumps(config)

			if "display_order" in section_data:
				section.display_order = section_data["display_order"]

			if "is_visible" in section_data:
				section.is_visible = section_data["is_visible"]

			break

	if not section_found:
		frappe.throw(_("Section {0} not found in report {1}").format(section_name, report_id))

	# Save the report
	report_doc.save()

	return {"success": True, "message": _("Section updated successfully")}


@frappe.whitelist()
def delete_section(report_id, section_name):
	"""Delete a section from a report"""
	require_permission("WH Report Definition", "write")

	if not report_id:
		frappe.throw(_("Report ID is required"))

	if not section_name:
		frappe.throw(_("Section name is required"))

	# Get the report document
	report_doc = frappe.get_doc("WH Report Definition", report_id)

	# Find and remove the section
	section_found = False
	sections_to_keep = []

	for section in report_doc.sections:
		if section.name == section_name:
			section_found = True
		else:
			sections_to_keep.append(section)

	if not section_found:
		frappe.throw(_("Section {0} not found in report {1}").format(section_name, report_id))

	# Replace sections with filtered list
	report_doc.sections = []
	for section in sections_to_keep:
		report_doc.append("sections", {
			"section_type": section.section_type,
			"title": section.title,
			"data_source": section.data_source,
			"config": section.config,
			"display_order": section.display_order,
			"is_visible": section.is_visible
		})

	# Save the report
	report_doc.save()

	return {"success": True, "message": _("Section deleted successfully")}


@frappe.whitelist()
def reorder_sections(report_id, section_order):
	"""Reorder sections in a report"""
	require_permission("WH Report Definition", "write")

	if isinstance(section_order, str):
		section_order = json.loads(section_order)

	if not report_id:
		frappe.throw(_("Report ID is required"))

	if not isinstance(section_order, list):
		frappe.throw(_("Section order must be a list of section names"))

	# Get the report document
	report_doc = frappe.get_doc("WH Report Definition", report_id)

	# Create a mapping of section name to section object
	section_map = {section.name: section for section in report_doc.sections}

	# Validate that all sections exist
	for section_name in section_order:
		if section_name not in section_map:
			frappe.throw(_("Section {0} not found in report {1}").format(section_name, report_id))

	# Check if all sections are accounted for
	if len(section_order) != len(report_doc.sections):
		frappe.throw(_("Section order must include all {0} sections").format(len(report_doc.sections)))

	# Clear existing sections and re-add in new order
	report_doc.sections = []

	for index, section_name in enumerate(section_order):
		section = section_map[section_name]
		report_doc.append("sections", {
			"section_type": section.section_type,
			"title": section.title,
			"data_source": section.data_source,
			"config": section.config,
			"display_order": index,
			"is_visible": section.is_visible
		})

	# Save the report
	report_doc.save()

	return {"success": True, "message": _("Sections reordered successfully")}
