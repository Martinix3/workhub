# WH Report Scheduler API
# API endpoints for managing scheduled reports

import frappe
from frappe import _
from frappe.utils import now_datetime, get_datetime, format_datetime
import json

from workhub_frappe_app.api.utils import require_auth, require_permission


@frappe.whitelist()
def get_scheduled_reports(filters=None, limit=50, offset=0):
	"""
	Get list of scheduled reports with optional filters

	Args:
		filters: Optional dict with filter criteria (report_definition, is_active, schedule_type)
		limit: Maximum number of records to return
		offset: Number of records to skip for pagination

	Returns:
		List of scheduled reports with enriched data
	"""
	require_auth()

	if filters and isinstance(filters, str):
		filters = json.loads(filters)

	filter_conditions = {}

	if filters:
		if filters.get("report_definition"):
			filter_conditions["report_definition"] = filters["report_definition"]
		if filters.get("is_active") is not None:
			filter_conditions["is_active"] = filters["is_active"]
		if filters.get("schedule_type"):
			filter_conditions["schedule_type"] = filters["schedule_type"]
		if filters.get("export_format"):
			filter_conditions["export_format"] = filters["export_format"]
		if filters.get("created_by"):
			filter_conditions["created_by"] = filters["created_by"]
		if filters.get("search"):
			filter_conditions["schedule_name"] = ["like", f"%{filters['search']}%"]

	# Get scheduled reports
	schedules = frappe.get_list("WH Scheduled Report",
		filters=filter_conditions,
		fields=[
			"name", "schedule_name", "report_definition", "schedule_type",
			"schedule_time", "day_of_week", "day_of_month", "export_format",
			"is_active", "last_run", "next_run", "last_status", "error_log",
			"created_by", "creation", "modified"
		],
		limit_page_length=int(limit),
		limit_start=int(offset),
		order_by="next_run asc, modified desc",
		ignore_permissions=True
	)

	# Enrich with additional data
	for schedule in schedules:
		# Get report definition info
		if schedule.get("report_definition"):
			report_data = frappe.db.get_value("WH Report Definition",
				schedule["report_definition"],
				["title", "category", "is_active"], as_dict=True)
			if report_data:
				schedule["report_title"] = report_data.title
				schedule["report_category"] = report_data.category
				schedule["report_is_active"] = report_data.is_active

		# Get creator info
		if schedule.get("created_by"):
			user_data = frappe.db.get_value("User", schedule["created_by"],
				["full_name", "user_image"], as_dict=True)
			if user_data:
				schedule["created_by_name"] = user_data.full_name
				schedule["created_by_image"] = user_data.user_image

		# Count recipients
		recipient_count = frappe.db.count("WH Scheduled Report Recipient",
			filters={"parent": schedule["name"]})
		schedule["recipient_count"] = recipient_count

		# Count executions (from WH Generated Report)
		execution_count = frappe.db.count("WH Generated Report",
			filters={"scheduled_report": schedule["name"]})
		schedule["execution_count"] = execution_count

		# Format schedule description
		schedule["schedule_description"] = _format_schedule_description(schedule)

	return {"success": True, "schedules": schedules, "total": len(schedules)}


@frappe.whitelist()
def create_schedule(data):
	"""
	Create a new scheduled report

	Args:
		data: Dict with schedule configuration (report_definition, schedule_name, schedule_type, etc.)

	Returns:
		Dict with success status and created schedule ID
	"""
	require_permission("WH Scheduled Report", "create")

	if isinstance(data, str):
		data = json.loads(data)

	# Validate required fields
	if not data.get("report_definition"):
		frappe.throw(_("Report Definition is required"))

	if not data.get("schedule_name"):
		frappe.throw(_("Schedule Name is required"))

	if not data.get("schedule_type"):
		frappe.throw(_("Schedule Type is required"))

	# Create new scheduled report
	doc = frappe.new_doc("WH Scheduled Report")
	doc.report_definition = data["report_definition"]
	doc.schedule_name = data["schedule_name"]
	doc.schedule_type = data["schedule_type"]
	doc.schedule_time = data.get("schedule_time", "09:00:00")
	doc.export_format = data.get("export_format", "PDF")
	doc.is_active = data.get("is_active", 1)

	# Schedule-specific fields
	if data.get("day_of_week"):
		doc.day_of_week = data["day_of_week"]
	if data.get("day_of_month"):
		doc.day_of_month = data["day_of_month"]

	# Email configuration
	if data.get("email_subject"):
		doc.email_subject = data["email_subject"]
	if data.get("email_body"):
		doc.email_body = data["email_body"]

	# Add recipients if provided
	if data.get("recipients"):
		for recipient in data["recipients"]:
			doc.append("recipients", {
				"recipient_type": recipient.get("recipient_type", "User"),
				"user": recipient.get("user"),
				"email": recipient.get("email")
			})

	# Save the document
	doc.insert()

	return {
		"success": True,
		"schedule_id": doc.name,
		"next_run": doc.next_run
	}


@frappe.whitelist()
def update_schedule(schedule_id, data):
	"""
	Update an existing scheduled report

	Args:
		schedule_id: ID of the schedule to update
		data: Dict with updated fields

	Returns:
		Dict with success status
	"""
	require_permission("WH Scheduled Report", "write")

	if isinstance(data, str):
		data = json.loads(data)

	if not schedule_id:
		frappe.throw(_("Schedule ID is required"))

	# Get the scheduled report
	doc = frappe.get_doc("WH Scheduled Report", schedule_id)

	# Update allowed fields
	allowed_fields = [
		"schedule_name", "schedule_type", "schedule_time", "day_of_week",
		"day_of_month", "export_format", "is_active", "email_subject",
		"email_body", "include_charts"
	]

	for field in allowed_fields:
		if field in data:
			setattr(doc, field, data[field])

	# Update recipients if provided
	if "recipients" in data:
		# Clear existing recipients
		doc.recipients = []

		# Add new recipients
		for recipient in data["recipients"]:
			doc.append("recipients", {
				"recipient_type": recipient.get("recipient_type", "User"),
				"user": recipient.get("user"),
				"email": recipient.get("email")
			})

	# Save the document (validate will recalculate next_run if schedule changed)
	doc.save()

	return {
		"success": True,
		"schedule_id": doc.name,
		"next_run": doc.next_run
	}


@frappe.whitelist()
def delete_schedule(schedule_id):
	"""
	Delete a scheduled report

	Args:
		schedule_id: ID of the schedule to delete

	Returns:
		Dict with success status
	"""
	require_permission("WH Scheduled Report", "delete")

	if not schedule_id:
		frappe.throw(_("Schedule ID is required"))

	# Delete the scheduled report
	frappe.delete_doc("WH Scheduled Report", schedule_id)

	return {"success": True, "message": _("Schedule deleted successfully")}


@frappe.whitelist()
def toggle_schedule(schedule_id, is_active=None):
	"""
	Toggle the active status of a scheduled report

	Args:
		schedule_id: ID of the schedule to toggle
		is_active: Optional explicit value (0 or 1). If not provided, toggles current state.

	Returns:
		Dict with success status and new active state
	"""
	require_permission("WH Scheduled Report", "write")

	if not schedule_id:
		frappe.throw(_("Schedule ID is required"))

	# Get the scheduled report
	doc = frappe.get_doc("WH Scheduled Report", schedule_id)

	# Toggle or set the active state
	if is_active is not None:
		doc.is_active = int(is_active)
	else:
		doc.is_active = 0 if doc.is_active else 1

	# Save the document
	doc.save()

	return {
		"success": True,
		"schedule_id": doc.name,
		"is_active": doc.is_active,
		"message": _("Schedule {0}").format(_("activated") if doc.is_active else _("deactivated"))
	}


@frappe.whitelist()
def get_schedule_history(schedule_id, limit=50, offset=0):
	"""
	Get execution history for a scheduled report

	Note: This function currently returns generated reports for the same report definition.
	A 'scheduled_report' link field should be added to WH Generated Report DocType
	in subtask 4.2 to properly track which schedule generated each report.

	Args:
		schedule_id: ID of the scheduled report
		limit: Maximum number of records to return
		offset: Number of records to skip for pagination

	Returns:
		List of report generation records for this schedule's report definition
	"""
	require_auth()

	if not schedule_id:
		frappe.throw(_("Schedule ID is required"))

	# Verify schedule exists
	if not frappe.db.exists("WH Scheduled Report", schedule_id):
		frappe.throw(_("Scheduled Report {0} not found").format(schedule_id))

	# Get the scheduled report for context
	schedule = frappe.get_doc("WH Scheduled Report", schedule_id)

	# Get generated reports for this report definition
	# TODO: Filter by scheduled_report field once it's added to WH Generated Report in subtask 4.2
	history = frappe.get_list("WH Generated Report",
		filters={"report_definition": schedule.report_definition},
		fields=[
			"name", "report_definition", "generated_at", "generated_by",
			"export_format", "file_url", "status", "creation", "modified"
		],
		limit_page_length=int(limit),
		limit_start=int(offset),
		order_by="generated_at desc",
		ignore_permissions=True
	)

	# Enrich with additional data
	for record in history:
		# Get report definition title
		if record.get("report_definition"):
			report_title = frappe.db.get_value("WH Report Definition",
				record["report_definition"], "title")
			record["report_title"] = report_title

		# Get user info
		if record.get("generated_by"):
			user_data = frappe.db.get_value("User", record["generated_by"],
				["full_name", "email"], as_dict=True)
			if user_data:
				record["generated_by_name"] = user_data.full_name
				record["generated_by_email"] = user_data.email

		# Get file size if file exists
		if record.get("file_url"):
			try:
				file_doc = frappe.get_doc("File", {"file_url": record["file_url"]})
				if file_doc:
					record["file_size"] = file_doc.file_size
					record["file_name"] = file_doc.file_name
			except Exception:
				pass

	# Get summary statistics for this report definition
	# TODO: Filter by scheduled_report once field is added
	total_count = frappe.db.count("WH Generated Report",
		filters={"report_definition": schedule.report_definition})

	success_count = frappe.db.count("WH Generated Report",
		filters={"report_definition": schedule.report_definition, "status": "Completed"})

	failed_count = frappe.db.count("WH Generated Report",
		filters={"report_definition": schedule.report_definition, "status": "Failed"})

	return {
		"success": True,
		"schedule": {
			"name": schedule.name,
			"schedule_name": schedule.schedule_name,
			"report_definition": schedule.report_definition,
			"is_active": schedule.is_active,
			"last_run": schedule.last_run,
			"next_run": schedule.next_run,
			"last_status": schedule.last_status
		},
		"history": history,
		"statistics": {
			"total_executions": total_count,
			"successful": success_count,
			"failed": failed_count,
			"success_rate": round((success_count / total_count * 100), 1) if total_count > 0 else 0
		},
		"note": "History shows all generations of this report definition. Add 'scheduled_report' field to WH Generated Report to track specific schedule executions."
	}


# ========================================
# Helper Functions
# ========================================

def _format_schedule_description(schedule):
	"""
	Format a human-readable schedule description

	Args:
		schedule: Dict with schedule data

	Returns:
		String description like "Daily at 09:00" or "Weekly on Monday at 14:00"
	"""
	schedule_type = schedule.get("schedule_type", "Daily")
	schedule_time = schedule.get("schedule_time", "09:00:00")

	# Format time (remove seconds)
	time_parts = str(schedule_time).split(":")
	formatted_time = f"{time_parts[0]}:{time_parts[1]}"

	if schedule_type == "Daily":
		return f"Daily at {formatted_time}"

	elif schedule_type == "Weekly":
		day_of_week = schedule.get("day_of_week", 1)
		days = {
			"1": "Monday",
			"2": "Tuesday",
			"3": "Wednesday",
			"4": "Thursday",
			"5": "Friday",
			"6": "Saturday",
			"7": "Sunday"
		}
		day_name = days.get(str(day_of_week), "Monday")
		return f"Weekly on {day_name} at {formatted_time}"

	elif schedule_type == "Monthly":
		day_of_month = schedule.get("day_of_month", 1)
		return f"Monthly on day {day_of_month} at {formatted_time}"

	return f"{schedule_type} at {formatted_time}"
