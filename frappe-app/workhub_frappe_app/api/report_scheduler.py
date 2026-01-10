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

		# Count executions (from WH Generated Report linked to this schedule)
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

	Args:
		schedule_id: ID of the scheduled report
		limit: Maximum number of records to return
		offset: Number of records to skip for pagination

	Returns:
		List of report generation records for this schedule
	"""
	require_auth()

	if not schedule_id:
		frappe.throw(_("Schedule ID is required"))

	# Verify schedule exists
	if not frappe.db.exists("WH Scheduled Report", schedule_id):
		frappe.throw(_("Scheduled Report {0} not found").format(schedule_id))

	# Get the scheduled report for context
	schedule = frappe.get_doc("WH Scheduled Report", schedule_id)

	# Get generated reports for this specific schedule
	history = frappe.get_list("WH Generated Report",
		filters={"scheduled_report": schedule_id},
		fields=[
			"name", "report_definition", "scheduled_report", "generated_at", "generated_by",
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

	# Get summary statistics for this specific schedule
	total_count = frappe.db.count("WH Generated Report",
		filters={"scheduled_report": schedule_id})

	success_count = frappe.db.count("WH Generated Report",
		filters={"scheduled_report": schedule_id, "status": "Completed"})

	failed_count = frappe.db.count("WH Generated Report",
		filters={"scheduled_report": schedule_id, "status": "Failed"})

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
		}
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


# ========================================
# Scheduler Job Functions
# ========================================

def process_scheduled_reports():
	"""
	Scheduler function to check and execute due scheduled reports
	This function is called by the Frappe scheduler (cron)
	"""
	try:
		# Get all active scheduled reports that are due
		now = now_datetime()

		due_schedules = frappe.get_all("WH Scheduled Report",
			filters={
				"is_active": 1,
				"next_run": ["<=", now]
			},
			fields=["name", "schedule_name", "report_definition", "export_format"],
			order_by="next_run asc",
			ignore_permissions=True
		)

		if not due_schedules:
			frappe.logger().info("No scheduled reports due for execution")
			return

		frappe.logger().info(f"Processing {len(due_schedules)} scheduled reports")

		# Execute each due schedule
		for schedule in due_schedules:
			try:
				execute_scheduled_report(schedule["name"])
			except Exception as e:
				error_message = f"Error executing scheduled report {schedule['name']}: {str(e)}"
				frappe.log_error(error_message, "Scheduled Report Execution Failed")

				# Mark schedule as failed
				try:
					schedule_doc = frappe.get_doc("WH Scheduled Report", schedule["name"])
					schedule_doc.mark_failed(error_message)
				except Exception:
					pass

		frappe.db.commit()
		frappe.logger().info(f"Completed processing {len(due_schedules)} scheduled reports")

	except Exception as e:
		frappe.log_error(f"Error in process_scheduled_reports: {str(e)}", "Scheduled Reports Processor Error")


def execute_scheduled_report(schedule_id):
	"""
	Execute a single scheduled report: generate report and send to recipients

	Args:
		schedule_id: ID of the WH Scheduled Report to execute

	Returns:
		Dict with success status and generated report ID
	"""
	frappe.logger().info(f"Executing scheduled report: {schedule_id}")

	# Get the scheduled report
	schedule_doc = frappe.get_doc("WH Scheduled Report", schedule_id)

	if not schedule_doc.is_active:
		frappe.logger().info(f"Scheduled report {schedule_id} is not active, skipping")
		return {"success": False, "message": "Schedule is not active"}

	# Get the report definition
	report_def = frappe.get_doc("WH Report Definition", schedule_doc.report_definition)

	if not report_def.is_active:
		error_message = f"Report definition '{schedule_doc.report_definition}' is not active"
		frappe.logger().warning(error_message)
		schedule_doc.mark_failed(error_message)
		return {"success": False, "message": error_message}

	try:
		# Import export function
		from workhub_frappe_app.api.report_export import (
			get_report_generation_data,
			create_generated_report_record,
			update_generated_report_status,
			export_to_pdf,
			export_to_excel,
			export_to_csv
		)

		# Generate the report data
		frappe.logger().info(f"Generating report data for: {schedule_doc.report_definition}")
		report_data = get_report_generation_data(schedule_doc.report_definition, filters=None)

		# Create generated report record with scheduled_report link
		generated_report_id = create_generated_report_record(
			report_id=schedule_doc.report_definition,
			export_format=schedule_doc.export_format,
			data_snapshot=report_data
		)

		# Update the generated report to link it to this schedule
		frappe.db.set_value("WH Generated Report", generated_report_id, "scheduled_report", schedule_id)

		# Export the report in the specified format
		frappe.logger().info(f"Exporting report in {schedule_doc.export_format} format")

		export_result = None
		if schedule_doc.export_format == "PDF":
			export_result = export_to_pdf(
				report_id=schedule_doc.report_definition,
				filters=None,
				generated_report_id=generated_report_id
			)
		elif schedule_doc.export_format == "Excel":
			export_result = export_to_excel(
				report_id=schedule_doc.report_definition,
				filters=None,
				generated_report_id=generated_report_id
			)
		elif schedule_doc.export_format == "CSV":
			export_result = export_to_csv(
				report_id=schedule_doc.report_definition,
				filters=None,
				generated_report_id=generated_report_id
			)
		else:
			error_message = f"Unsupported export format: {schedule_doc.export_format}"
			update_generated_report_status(generated_report_id, "Failed", error_message=error_message)
			schedule_doc.mark_failed(error_message)
			return {"success": False, "message": error_message}

		if not export_result.get("success"):
			error_message = export_result.get("message", "Export failed")
			schedule_doc.mark_failed(error_message)
			return {"success": False, "message": error_message}

		file_url = export_result.get("file_url")

		frappe.logger().info(f"Report exported successfully: {file_url}")

		# Send email to recipients
		send_result = send_scheduled_report_email(
			schedule_doc=schedule_doc,
			report_def=report_def,
			file_url=file_url,
			generated_report_id=generated_report_id
		)

		if send_result.get("success"):
			# Mark schedule as successful
			schedule_doc.mark_success()
			frappe.logger().info(f"Scheduled report {schedule_id} executed successfully")

			return {
				"success": True,
				"generated_report_id": generated_report_id,
				"file_url": file_url,
				"recipients_sent": send_result.get("recipients_sent", 0)
			}
		else:
			# Email sending failed, but report was generated
			error_message = f"Report generated but email delivery failed: {send_result.get('message', 'Unknown error')}"
			frappe.logger().warning(error_message)
			schedule_doc.mark_failed(error_message)

			return {
				"success": False,
				"message": error_message,
				"generated_report_id": generated_report_id,
				"file_url": file_url
			}

	except Exception as e:
		error_message = f"Error executing scheduled report: {str(e)}"
		frappe.log_error(error_message, f"Scheduled Report Execution Error - {schedule_id}")

		# Mark schedule as failed
		try:
			schedule_doc.mark_failed(error_message)
		except Exception:
			pass

		return {"success": False, "message": error_message}


def send_scheduled_report_email(schedule_doc, report_def, file_url, generated_report_id):
	"""
	Send scheduled report email to all recipients

	Args:
		schedule_doc: WH Scheduled Report document
		report_def: WH Report Definition document
		file_url: URL of the generated report file
		generated_report_id: ID of the generated report record

	Returns:
		Dict with success status and count of emails sent
	"""
	try:
		# Get recipients
		recipients = []

		for recipient_row in schedule_doc.recipients:
			if recipient_row.recipient_type == "User":
				# Get user email
				user_email = frappe.db.get_value("User", recipient_row.user, "email")
				if user_email:
					recipients.append(user_email)
			elif recipient_row.recipient_type == "Email":
				# Use email directly
				if recipient_row.email:
					recipients.append(recipient_row.email)

		if not recipients:
			frappe.logger().warning(f"No recipients configured for scheduled report {schedule_doc.name}")
			return {"success": False, "message": "No recipients configured"}

		frappe.logger().info(f"Sending report to {len(recipients)} recipients: {', '.join(recipients)}")

		# Build email subject
		subject = schedule_doc.email_subject or f"Reporte Programado: {report_def.title}"

		# Build email body
		if schedule_doc.email_body:
			# Use custom email body if specified
			message = schedule_doc.email_body
		else:
			# Use professional email template
			# Get generated report to extract section information
			generated_report = frappe.get_doc("WH Generated Report", generated_report_id)

			# Get sections preview for summary
			sections_preview = []
			sections_count = 0
			if report_def.sections:
				sections_count = len(report_def.sections)
				# Get first 5 sections for preview
				for section in report_def.sections[:5]:
					section_type_label = {
						"Header": "Encabezado",
						"Text": "Texto",
						"KPI": "Indicador KPI",
						"Chart": "Gráfico",
						"Table": "Tabla"
					}.get(section.section_type, section.section_type)

					sections_preview.append(f"{section.title} ({section_type_label})")

				# Add "and more" if there are more than 5 sections
				if sections_count > 5:
					sections_preview.append(f"... y {sections_count - 5} secciones más")

			# Get user info
			generated_by_name = frappe.db.get_value("User", generated_report.generated_by, "full_name") or generated_report.generated_by

			# Build download URL (if file exists)
			download_url = None
			if file_url:
				# Construct full URL for download
				site_url = frappe.utils.get_url()
				download_url = f"{site_url}{file_url}"

			# Build view URL
			view_url = f"{frappe.utils.get_url()}/app/wh-generated-report/{generated_report_id}"

			# Prepare template context
			context = {
				"report_title": report_def.title,
				"report_type": report_def.report_type,
				"category": report_def.category,
				"report_description": report_def.description,
				"generated_at": format_datetime(generated_report.generated_at, "dd MMM yyyy HH:mm"),
				"export_format": schedule_doc.export_format,
				"generated_by_name": generated_by_name,
				"schedule_name": schedule_doc.schedule_name if hasattr(schedule_doc, 'schedule_name') else None,
				"schedule_type": schedule_doc.schedule_type,
				"next_run": format_datetime(schedule_doc.next_run, "dd MMM yyyy HH:mm") if schedule_doc.next_run else None,
				"sections_count": sections_count,
				"sections_preview": sections_preview,
				"download_url": download_url,
				"view_url": view_url,
				"custom_message": None  # Can be used for additional messages
			}

			# Render template
			message = frappe.render_template("workhub_frappe_app/templates/emails/scheduled_report.html", context)

		# Get the file document to attach
		file_doc = None
		if file_url:
			try:
				file_doc = frappe.get_doc("File", {"file_url": file_url})
			except Exception as e:
				frappe.logger().warning(f"Could not find file document for {file_url}: {str(e)}")

		# Prepare attachments
		attachments = []
		if file_doc:
			# Get the physical file path
			from frappe.utils import get_site_path
			import os

			if file_doc.is_private:
				file_path = os.path.join(get_site_path(), "private", "files", file_doc.file_name)
			else:
				file_path = os.path.join(get_site_path(), "public", "files", file_doc.file_name)

			# Check if file exists
			if os.path.exists(file_path):
				attachments.append({
					"fname": file_doc.file_name,
					"fcontent": open(file_path, "rb").read()
				})
			else:
				frappe.logger().warning(f"File not found at path: {file_path}")

		# Send email
		frappe.sendmail(
			recipients=recipients,
			subject=subject,
			message=message,
			attachments=attachments if attachments else None,
			reference_doctype="WH Generated Report",
			reference_name=generated_report_id
		)

		frappe.logger().info(f"Email sent successfully to {len(recipients)} recipients")

		return {
			"success": True,
			"recipients_sent": len(recipients),
			"recipients": recipients
		}

	except Exception as e:
		error_message = f"Error sending scheduled report email: {str(e)}"
		frappe.log_error(error_message, f"Scheduled Report Email Error - {schedule_doc.name}")
		return {"success": False, "message": error_message}
