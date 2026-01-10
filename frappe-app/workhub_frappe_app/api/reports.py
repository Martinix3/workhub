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
