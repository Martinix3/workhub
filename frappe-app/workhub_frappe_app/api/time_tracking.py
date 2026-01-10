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


# Time reports (to be implemented in subsequent subtasks)
# - get_time_report(user=None, project=None, from_date=None, to_date=None)
# - get_project_time_summary(project_id)
# - get_user_time_summary(user=None, from_date=None, to_date=None)
