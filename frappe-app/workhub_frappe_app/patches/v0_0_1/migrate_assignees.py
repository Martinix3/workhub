# Copyright (c) 2026, Santa Brisa and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import now_datetime


def execute():
	"""
	Migrates existing tasks from single assignee (assigned_to) to multi-assignee (assignees table).
	For each task with assigned_to populated, creates a corresponding WH Task Assignee row with role=Owner.
	"""
	# Get all WH Tasks that have assigned_to populated
	tasks = frappe.db.get_all(
		"WH Task",
		filters={"assigned_to": ["!=", ""]},
		fields=["name", "assigned_to", "created_by"]
	)

	migrated_count = 0
	skipped_count = 0

	for task_data in tasks:
		try:
			# Check if task already has assignees in child table
			existing_assignees = frappe.db.get_all(
				"WH Task Assignee",
				filters={"parent": task_data.name},
				fields=["name"]
			)

			# Skip if assignees already exist (migration already done or manually set)
			if existing_assignees:
				skipped_count += 1
				continue

			# Create WH Task Assignee child row with role=Owner
			assignee_doc = frappe.get_doc({
				"doctype": "WH Task Assignee",
				"parent": task_data.name,
				"parenttype": "WH Task",
				"parentfield": "assignees",
				"user": task_data.assigned_to,
				"role": "Owner",
				"added_at": now_datetime(),
				"added_by": task_data.created_by or "Administrator"
			})
			assignee_doc.insert(ignore_permissions=True)
			migrated_count += 1

		except Exception as e:
			frappe.log_error(
				title=f"Failed to migrate assignee for task {task_data.name}",
				message=str(e)
			)
			continue

	# Commit changes
	frappe.db.commit()

	# Log migration summary
	frappe.logger().info(
		f"Assignee migration complete: {migrated_count} tasks migrated, {skipped_count} tasks skipped"
	)
