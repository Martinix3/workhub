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


# These will be implemented in subsequent subtasks:
# - pause_timer()
# - resume_timer()
# - get_active_timer()

# Manual time entry
# - add_time_entry(task_id, hours, minutes, date=None, notes=None)

# Time reports
# - get_time_report(user=None, project=None, from_date=None, to_date=None)
# - get_project_time_summary(project_id)
# - get_user_time_summary(user=None, from_date=None, to_date=None)
