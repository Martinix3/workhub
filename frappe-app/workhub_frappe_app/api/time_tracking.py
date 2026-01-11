# Time Tracking API
# Timer functionality and manual time entry for tasks

import frappe
from frappe import _
from frappe.utils import nowdate, now_datetime, get_datetime, time_diff_in_seconds
import json

from workhub_frappe_app.api.utils import require_auth, require_permission


# Timer operations

@frappe.whitelist()
def start_timer(task_id):
	"""
	Start a timer on a task - stops any existing timer first.

	Args:
		task_id: ID of the WH Task to track time for

	Returns:
		dict with success flag and timer details
	"""
	require_permission("WH Task", "write")

	if not task_id:
		frappe.throw(_("Task ID is required"))

	# Validate task exists
	if not frappe.db.exists("WH Task", task_id):
		frappe.throw(_("Task {0} not found").format(task_id))

	user = frappe.session.user

	# Stop any existing active timer first
	existing_timer = frappe.db.get_value(
		"WH Time Timer",
		{"user": user, "status": ["in", ["Running", "Paused"]]},
		["name", "task", "start_time", "status", "accumulated_seconds"],
		as_dict=True
	)

	if existing_timer:
		# Stop the existing timer and log the time
		_stop_and_log_timer(existing_timer)

	# Create new timer
	timer = frappe.new_doc("WH Time Timer")
	timer.task = task_id
	timer.user = user
	timer.start_time = now_datetime()
	timer.status = "Running"
	timer.accumulated_seconds = 0
	timer.insert()

	# Get task info for response
	task = frappe.get_doc("WH Task", task_id)

	return {
		"success": True,
		"timer": {
			"name": timer.name,
			"task": task_id,
			"task_title": task.title,
			"user": user,
			"start_time": timer.start_time,
			"status": timer.status,
			"accumulated_seconds": timer.accumulated_seconds
		}
	}


@frappe.whitelist()
def stop_timer(notes=None):
	"""
	Stop the active timer and log the time to the task.

	Args:
		notes: Optional notes to include in the work_log entry

	Returns:
		dict with success flag and logged time details
	"""
	require_permission("WH Task", "write")

	user = frappe.session.user

	# Find active timer
	active_timer = frappe.db.get_value(
		"WH Time Timer",
		{"user": user, "status": ["in", ["Running", "Paused"]]},
		["name", "task", "start_time", "status", "accumulated_seconds"],
		as_dict=True
	)

	if not active_timer:
		frappe.throw(_("No active timer found for user {0}").format(user))

	# Get task info before stopping
	task = frappe.get_doc("WH Task", active_timer["task"])

	# Stop the timer and log the time
	time_details = _stop_and_log_timer(active_timer, notes)

	return {
		"success": True,
		"time_entry": {
			"task": time_details["task"],
			"task_title": task.title,
			"hours": time_details["hours"],
			"minutes": time_details["minutes"],
			"total_seconds": time_details["total_seconds"],
			"date": time_details["date"],
			"notes": notes or _("Auto-logged from timer")
		}
	}


def _stop_and_log_timer(timer_dict, notes=None):
	"""
	Helper to stop a timer and log the time to the task.

	Args:
		timer_dict: Dictionary with timer fields (name, task, start_time, status, accumulated_seconds)
		notes: Optional notes to include in the work_log entry
	"""
	# Get the actual timer document
	timer = frappe.get_doc("WH Time Timer", timer_dict["name"])

	# Calculate total duration
	if timer.status == "Running":
		# Calculate time from start_time to now
		elapsed_seconds = time_diff_in_seconds(now_datetime(), timer.start_time)
		total_seconds = (timer.accumulated_seconds or 0) + elapsed_seconds
	else:  # Paused
		# Just use accumulated_seconds
		total_seconds = timer.accumulated_seconds or 0

	# Convert to hours and minutes
	total_minutes = int(total_seconds // 60)
	hours = total_minutes // 60
	minutes = total_minutes % 60

	# Log to task work_log if there's actual time tracked
	if total_seconds > 0:
		task = frappe.get_doc("WH Task", timer.task)
		work_log_entry = {
			"date": nowdate(),
			"user": timer.user,
			"hours": hours,
			"minutes": minutes,
			"notes": notes or _("Auto-logged from timer")
		}
		task.append("work_log", work_log_entry)
		task.save()

	# Mark timer as stopped
	timer.status = "Stopped"
	timer.save()

	# Return details for response
	return {
		"task": timer.task,
		"hours": hours,
		"minutes": minutes,
		"total_seconds": total_seconds,
		"date": nowdate()
	}


@frappe.whitelist()
def get_active_timer():
	"""
	Check if user has an active timer and on which task.

	Returns:
		dict with active timer info or None if no active timer
	"""
	require_permission("WH Task", "read")

	user = frappe.session.user

	# Find active timer (Running or Paused)
	active_timer = frappe.db.get_value(
		"WH Time Timer",
		{"user": user, "status": ["in", ["Running", "Paused"]]},
		["name", "task", "start_time", "status", "accumulated_seconds"],
		as_dict=True
	)

	if not active_timer:
		return {
			"success": True,
			"active_timer": None
		}

	# Get task details
	task = frappe.get_doc("WH Task", active_timer["task"])

	# Calculate running duration
	if active_timer["status"] == "Running":
		# Calculate time from start_time to now
		elapsed_seconds = time_diff_in_seconds(now_datetime(), get_datetime(active_timer["start_time"]))
		total_seconds = (active_timer["accumulated_seconds"] or 0) + elapsed_seconds
	else:  # Paused
		# Just use accumulated_seconds
		total_seconds = active_timer["accumulated_seconds"] or 0

	# Convert to hours and minutes for display
	total_minutes = int(total_seconds // 60)
	hours = total_minutes // 60
	minutes = total_minutes % 60

	return {
		"success": True,
		"active_timer": {
			"name": active_timer["name"],
			"task": active_timer["task"],
			"task_title": task.title,
			"project": task.project,
			"project_name": task.project_name if hasattr(task, "project_name") else None,
			"status": active_timer["status"],
			"start_time": active_timer["start_time"],
			"accumulated_seconds": active_timer["accumulated_seconds"],
			"running_seconds": total_seconds,
			"running_hours": hours,
			"running_minutes": minutes
		}
	}


@frappe.whitelist()
def add_time_entry(task_id, hours=0, minutes=0, date=None, notes=None):
	"""
	Add manual time entry without using timer.

	Args:
		task_id: ID of the WH Task to log time for
		hours: Hours worked (Float, >= 0)
		minutes: Minutes worked (Int, 0-59)
		date: Date of work (defaults to today)
		notes: Optional notes for the time entry

	Returns:
		dict with success flag and time entry details
	"""
	require_permission("WH Task", "write")

	# Validate task_id
	if not task_id:
		frappe.throw(_("Task ID is required"))

	if not frappe.db.exists("WH Task", task_id):
		frappe.throw(_("Task {0} not found").format(task_id))

	# Parse and validate hours
	try:
		hours = float(hours) if hours else 0
	except (ValueError, TypeError):
		frappe.throw(_("Hours must be a valid number"))

	if hours < 0:
		frappe.throw(_("Hours must be greater than or equal to 0"))

	# Parse and validate minutes
	try:
		minutes = int(minutes) if minutes else 0
	except (ValueError, TypeError):
		frappe.throw(_("Minutes must be a valid integer"))

	if minutes < 0 or minutes >= 60:
		frappe.throw(_("Minutes must be between 0 and 59"))

	# Ensure at least some time is being logged
	if hours == 0 and minutes == 0:
		frappe.throw(_("Hours and minutes cannot both be zero"))

	# Default date to today if not provided
	if not date:
		date = nowdate()

	# Get task and add work_log entry
	task = frappe.get_doc("WH Task", task_id)
	user = frappe.session.user

	work_log_entry = {
		"date": date,
		"user": user,
		"hours": hours,
		"minutes": minutes,
		"notes": notes or _("Manual time entry")
	}
	task.append("work_log", work_log_entry)
	task.save()

	# Calculate duration for response
	duration_hours = hours + (minutes / 60)

	return {
		"success": True,
		"time_entry": {
			"task": task_id,
			"task_title": task.title,
			"hours": hours,
			"minutes": minutes,
			"duration_hours": duration_hours,
			"date": date,
			"user": user,
			"notes": notes or _("Manual time entry")
		}
	}


@frappe.whitelist()
def pause_timer():
	"""
	Pause the active timer, storing elapsed time in accumulated_seconds.

	Returns:
		dict with success flag and timer details
	"""
	require_permission("WH Task", "write")

	user = frappe.session.user

	# Find running timer
	running_timer = frappe.db.get_value(
		"WH Time Timer",
		{"user": user, "status": "Running"},
		["name", "task", "start_time", "accumulated_seconds"],
		as_dict=True
	)

	if not running_timer:
		frappe.throw(_("No running timer found for user {0}").format(user))

	# Get the timer document
	timer = frappe.get_doc("WH Time Timer", running_timer["name"])

	# Calculate elapsed time since start_time
	elapsed_seconds = time_diff_in_seconds(now_datetime(), timer.start_time)

	# Add to accumulated_seconds
	timer.accumulated_seconds = (timer.accumulated_seconds or 0) + elapsed_seconds

	# Set status to Paused
	timer.status = "Paused"
	timer.save()

	# Get task info for response
	task = frappe.get_doc("WH Task", timer.task)

	# Calculate total time for display
	total_minutes = int(timer.accumulated_seconds // 60)
	hours = total_minutes // 60
	minutes = total_minutes % 60

	return {
		"success": True,
		"timer": {
			"name": timer.name,
			"task": timer.task,
			"task_title": task.title,
			"user": user,
			"status": timer.status,
			"accumulated_seconds": timer.accumulated_seconds,
			"accumulated_hours": hours,
			"accumulated_minutes": minutes
		}
	}


@frappe.whitelist()
def resume_timer():
	"""
	Resume a paused timer, resetting start_time to now.

	Returns:
		dict with success flag and timer details
	"""
	require_permission("WH Task", "write")

	user = frappe.session.user

	# Find paused timer
	paused_timer = frappe.db.get_value(
		"WH Time Timer",
		{"user": user, "status": "Paused"},
		["name", "task", "accumulated_seconds"],
		as_dict=True
	)

	if not paused_timer:
		frappe.throw(_("No paused timer found for user {0}").format(user))

	# Get the timer document
	timer = frappe.get_doc("WH Time Timer", paused_timer["name"])

	# Reset start_time to now
	timer.start_time = now_datetime()

	# Set status to Running (keep accumulated_seconds as is)
	timer.status = "Running"
	timer.save()

	# Get task info for response
	task = frappe.get_doc("WH Task", timer.task)

	return {
		"success": True,
		"timer": {
			"name": timer.name,
			"task": timer.task,
			"task_title": task.title,
			"user": user,
			"start_time": timer.start_time,
			"status": timer.status,
			"accumulated_seconds": timer.accumulated_seconds
		}
	}


# Time Reports

@frappe.whitelist()
def get_time_report(user=None, project=None, from_date=None, to_date=None):
	"""
	Get time tracking data with filters for user reports.

	Args:
		user: User email (optional, defaults to current user)
		project: Project ID to filter by (optional)
		from_date: Start date for filtering (optional)
		to_date: End date for filtering (optional)

	Returns:
		dict with time entries list and totals
	"""
	require_permission("WH Task", "read")

	# Default user to current user if not provided
	if not user:
		user = frappe.session.user

	# Build SQL query to get work_log entries with task details
	# We need to join WH Task Work Log (child table) with WH Task (parent)
	conditions = ["wl.user = %(user)s"]
	params = {"user": user}

	if project:
		conditions.append("t.project = %(project)s")
		params["project"] = project

	if from_date:
		conditions.append("wl.date >= %(from_date)s")
		params["from_date"] = from_date

	if to_date:
		conditions.append("wl.date <= %(to_date)s")
		params["to_date"] = to_date

	where_clause = " AND ".join(conditions)

	# Query to get work_log entries with task details
	query = f"""
		SELECT
			wl.name as log_name,
			wl.parent as task_id,
			wl.date,
			wl.user,
			wl.hours,
			wl.minutes,
			wl.duration_hours,
			wl.notes,
			t.title as task_title,
			t.project,
			t.status as task_status,
			t.priority as task_priority
		FROM `tabWH Task Work Log` wl
		INNER JOIN `tabWH Task` t ON wl.parent = t.name
		WHERE {where_clause}
		ORDER BY wl.date DESC, wl.creation DESC
	"""

	entries = frappe.db.sql(query, params, as_dict=True)

	# Enrich entries with project info
	for entry in entries:
		if entry.get("project"):
			project_data = frappe.db.get_value(
				"WH Project",
				entry["project"],
				["title", "department"],
				as_dict=True
			)
			if project_data:
				entry["project_title"] = project_data.title
				entry["project_department"] = project_data.department

	# Calculate totals
	total_hours = sum(entry.get("duration_hours") or 0 for entry in entries)
	entries_count = len(entries)

	return {
		"success": True,
		"entries": entries,
		"totals": {
			"total_hours": total_hours,
			"entries_count": entries_count
		},
		"filters": {
			"user": user,
			"project": project,
			"from_date": from_date,
			"to_date": to_date
		}
	}


@frappe.whitelist()
def get_project_time_summary(project_id):
	"""
	Get time summary for a project with breakdowns by user and task.

	Args:
		project_id: ID of the WH Project

	Returns:
		dict with total hours, breakdown by user, breakdown by task, and comparison with estimated hours
	"""
	require_permission("WH Task", "read")

	if not project_id:
		frappe.throw(_("Project ID is required"))

	# Validate project exists
	if not frappe.db.exists("WH Project", project_id):
		frappe.throw(_("Project {0} not found").format(project_id))

	# Get project details
	project = frappe.get_doc("WH Project", project_id)

	# Query to get all work_log entries for tasks in this project
	query = """
		SELECT
			wl.parent as task_id,
			wl.user,
			wl.hours,
			wl.minutes,
			wl.duration_hours,
			wl.date,
			t.title as task_title,
			t.estimated_hours as task_estimated_hours,
			t.total_hours as task_total_hours,
			t.status as task_status
		FROM `tabWH Task Work Log` wl
		INNER JOIN `tabWH Task` t ON wl.parent = t.name
		WHERE t.project = %(project_id)s
		ORDER BY wl.date DESC
	"""

	entries = frappe.db.sql(query, {"project_id": project_id}, as_dict=True)

	# Calculate total hours tracked
	total_hours_tracked = sum(entry.get("duration_hours") or 0 for entry in entries)

	# Breakdown by user
	user_breakdown = {}
	for entry in entries:
		user = entry.get("user")
		duration = entry.get("duration_hours") or 0
		if user not in user_breakdown:
			user_breakdown[user] = {
				"user": user,
				"hours": 0,
				"entries_count": 0
			}
		user_breakdown[user]["hours"] += duration
		user_breakdown[user]["entries_count"] += 1

	# Convert user_breakdown dict to list
	user_breakdown_list = list(user_breakdown.values())

	# Breakdown by task
	task_breakdown = {}
	for entry in entries:
		task_id = entry.get("task_id")
		duration = entry.get("duration_hours") or 0
		if task_id not in task_breakdown:
			task_breakdown[task_id] = {
				"task_id": task_id,
				"task_title": entry.get("task_title"),
				"task_status": entry.get("task_status"),
				"estimated_hours": entry.get("task_estimated_hours") or 0,
				"tracked_hours": 0,
				"entries_count": 0
			}
		task_breakdown[task_id]["tracked_hours"] += duration
		task_breakdown[task_id]["entries_count"] += 1

	# Convert task_breakdown dict to list and calculate variance
	task_breakdown_list = []
	for task_data in task_breakdown.values():
		# Calculate variance if estimated_hours exists
		if task_data["estimated_hours"] > 0:
			task_data["variance_hours"] = task_data["tracked_hours"] - task_data["estimated_hours"]
			task_data["variance_percentage"] = (task_data["variance_hours"] / task_data["estimated_hours"]) * 100
		else:
			task_data["variance_hours"] = None
			task_data["variance_percentage"] = None
		task_breakdown_list.append(task_data)

	# Sort task breakdown by tracked hours (descending)
	task_breakdown_list.sort(key=lambda x: x["tracked_hours"], reverse=True)

	# Calculate total estimated hours for the project (sum of all tasks' estimated_hours)
	total_estimated_hours = sum(task_data["estimated_hours"] for task_data in task_breakdown_list)

	# Calculate project-level variance
	project_variance = None
	project_variance_percentage = None
	if total_estimated_hours > 0:
		project_variance = total_hours_tracked - total_estimated_hours
		project_variance_percentage = (project_variance / total_estimated_hours) * 100

	return {
		"success": True,
		"project": {
			"id": project_id,
			"title": project.title,
			"department": project.department if hasattr(project, "department") else None
		},
		"summary": {
			"total_hours_tracked": total_hours_tracked,
			"total_estimated_hours": total_estimated_hours,
			"variance_hours": project_variance,
			"variance_percentage": project_variance_percentage,
			"entries_count": len(entries)
		},
		"breakdown_by_user": user_breakdown_list,
		"breakdown_by_task": task_breakdown_list
	}


@frappe.whitelist()
def get_user_time_summary(user=None, from_date=None, to_date=None):
	"""
	Get time summary for a user (productivity view) with daily/weekly totals and breakdowns.

	Args:
		user: User email (optional, defaults to current user)
		from_date: Start date for filtering (optional)
		to_date: End date for filtering (optional)

	Returns:
		dict with daily totals, breakdown by project, and breakdown by task
	"""
	require_permission("WH Task", "read")

	# Default user to current user if not provided
	if not user:
		user = frappe.session.user

	# Build SQL query conditions
	conditions = ["wl.user = %(user)s"]
	params = {"user": user}

	if from_date:
		conditions.append("wl.date >= %(from_date)s")
		params["from_date"] = from_date

	if to_date:
		conditions.append("wl.date <= %(to_date)s")
		params["to_date"] = to_date

	where_clause = " AND ".join(conditions)

	# Query to get all work_log entries for the user with task and project details
	query = f"""
		SELECT
			wl.name as log_name,
			wl.parent as task_id,
			wl.date,
			wl.user,
			wl.hours,
			wl.minutes,
			wl.duration_hours,
			wl.notes,
			t.title as task_title,
			t.project,
			t.status as task_status,
			t.priority as task_priority
		FROM `tabWH Task Work Log` wl
		INNER JOIN `tabWH Task` t ON wl.parent = t.name
		WHERE {where_clause}
		ORDER BY wl.date DESC, wl.creation DESC
	"""

	entries = frappe.db.sql(query, params, as_dict=True)

	# Calculate daily totals
	daily_totals = {}
	for entry in entries:
		date = str(entry.get("date"))
		duration = entry.get("duration_hours") or 0
		if date not in daily_totals:
			daily_totals[date] = {
				"date": date,
				"hours": 0,
				"entries_count": 0
			}
		daily_totals[date]["hours"] += duration
		daily_totals[date]["entries_count"] += 1

	# Convert daily_totals dict to list and sort by date descending
	daily_totals_list = sorted(daily_totals.values(), key=lambda x: x["date"], reverse=True)

	# Calculate breakdown by project
	project_breakdown = {}
	for entry in entries:
		project = entry.get("project")
		duration = entry.get("duration_hours") or 0

		if project:
			if project not in project_breakdown:
				# Get project details
				project_data = frappe.db.get_value(
					"WH Project",
					project,
					["title", "department"],
					as_dict=True
				)
				project_breakdown[project] = {
					"project_id": project,
					"project_title": project_data.get("title") if project_data else None,
					"project_department": project_data.get("department") if project_data else None,
					"hours": 0,
					"entries_count": 0
				}
			project_breakdown[project]["hours"] += duration
			project_breakdown[project]["entries_count"] += 1

	# Convert project_breakdown dict to list and sort by hours descending
	project_breakdown_list = sorted(project_breakdown.values(), key=lambda x: x["hours"], reverse=True)

	# Calculate breakdown by task
	task_breakdown = {}
	for entry in entries:
		task_id = entry.get("task_id")
		duration = entry.get("duration_hours") or 0

		if task_id not in task_breakdown:
			task_breakdown[task_id] = {
				"task_id": task_id,
				"task_title": entry.get("task_title"),
				"task_status": entry.get("task_status"),
				"task_priority": entry.get("task_priority"),
				"project": entry.get("project"),
				"hours": 0,
				"entries_count": 0
			}
		task_breakdown[task_id]["hours"] += duration
		task_breakdown[task_id]["entries_count"] += 1

	# Convert task_breakdown dict to list and sort by hours descending
	task_breakdown_list = sorted(task_breakdown.values(), key=lambda x: x["hours"], reverse=True)

	# Enrich task breakdown with project info
	for task_data in task_breakdown_list:
		if task_data.get("project"):
			project_data = frappe.db.get_value(
				"WH Project",
				task_data["project"],
				["title", "department"],
				as_dict=True
			)
			if project_data:
				task_data["project_title"] = project_data.get("title")
				task_data["project_department"] = project_data.get("department")

	# Calculate total hours
	total_hours = sum(entry.get("duration_hours") or 0 for entry in entries)

	return {
		"success": True,
		"summary": {
			"user": user,
			"total_hours": total_hours,
			"total_entries": len(entries),
			"from_date": from_date,
			"to_date": to_date
		},
		"daily_totals": daily_totals_list,
		"breakdown_by_project": project_breakdown_list,
		"breakdown_by_task": task_breakdown_list
	}
