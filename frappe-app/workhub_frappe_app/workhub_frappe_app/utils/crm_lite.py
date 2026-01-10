from __future__ import annotations

import frappe


_PAGE_NAME = "workhub-crm"
_SIDEBAR_TITLE = "WorkHub CRM"


def _ensure_page() -> None:
	# The page is a standard page defined in files (workhub_crm.js, workhub_crm.json).
	# Frappe loads standard pages from files during sync, so we just verify it exists.
	if not frappe.db.exists("Page", _PAGE_NAME):
		# Import the page from the JSON file
		import os
		from frappe.modules.import_file import import_file_by_path

		# Get the path to the page JSON file
		app_path = frappe.get_app_path("workhub_frappe_app")
		page_path = os.path.join(app_path, "workhub_frappe_app", "page", "workhub_crm", "workhub_crm.json")

		if os.path.exists(page_path):
			import_file_by_path(page_path, force=True)


def _ensure_sidebar() -> None:
	if frappe.db.exists("Workspace Sidebar", _SIDEBAR_TITLE):
		return

	doc = frappe.get_doc(
		{
			"doctype": "Workspace Sidebar",
			"title": _SIDEBAR_TITLE,
			"app": "workhub_frappe_app",
			"for_user": "",
			"header_icon": "crm",
			"items": [
				{
					"type": "Link",
					"label": "Home",
					"link_type": "Page",
					"link_to": _PAGE_NAME,
					"icon": "home",
					"child": 0,
					"indent": 0,
					"collapsible": 1,
					"keep_closed": 0,
					"show_arrow": 0,
				},
				{
					"type": "Link",
					"label": "Customer",
					"link_type": "DocType",
					"link_to": "Customer",
					"icon": "customer",
					"child": 0,
					"indent": 0,
					"collapsible": 1,
					"keep_closed": 0,
					"show_arrow": 0,
				},
				{
					"type": "Link",
					"label": "Lead",
					"link_type": "DocType",
					"link_to": "Lead",
					"icon": "users-round",
					"child": 0,
					"indent": 0,
					"collapsible": 1,
					"keep_closed": 0,
					"show_arrow": 0,
				},
				{
					"type": "Link",
					"label": "Opportunity",
					"link_type": "DocType",
					"link_to": "Opportunity",
					"icon": "lightbulb",
					"child": 0,
					"indent": 0,
					"collapsible": 1,
					"keep_closed": 0,
					"show_arrow": 0,
				},
				{
					"type": "Link",
					"label": "Contact",
					"link_type": "DocType",
					"link_to": "Contact",
					"icon": "contact",
					"child": 0,
					"indent": 0,
					"collapsible": 1,
					"keep_closed": 0,
					"show_arrow": 0,
				},
				{
					"type": "Link",
					"label": "Campaign",
					"link_type": "DocType",
					"link_to": "Campaign",
					"icon": "megaphone",
					"child": 0,
					"indent": 0,
					"collapsible": 1,
					"keep_closed": 0,
					"show_arrow": 0,
				},
			],
		}
	)
	doc.insert(ignore_permissions=True)


def create_workspace() -> dict[str, object]:
	"""Create a simple workspace for CRM."""
	frappe.set_user("Administrator")

	workspace_name = "Santa Brisa CRM"

	# Delete existing workspace
	if frappe.db.exists("Workspace", workspace_name):
		frappe.delete_doc("Workspace", workspace_name, force=True)

	# Create workspace
	workspace = frappe.get_doc({
		"doctype": "Workspace",
		"name": workspace_name,
		"title": workspace_name,
		"label": workspace_name,
		"icon": "customer",
		"module": "CRM",
		"public": 1,
		"shortcuts": [
			{
				"type": "DocType",
				"label": "Customer",
				"link_to": "Customer",
				"color": "Blue"
			},
			{
				"type": "DocType",
				"label": "Lead",
				"link_to": "Lead",
				"color": "Orange"
			},
			{
				"type": "DocType",
				"label": "Opportunity",
				"link_to": "Opportunity",
				"color": "Green"
			},
			{
				"type": "DocType",
				"label": "Contact",
				"link_to": "Contact",
				"color": "Purple"
			}
		],
		"links": [
			{
				"type": "Link",
				"link_type": "DocType",
				"link_to": "Customer",
				"label": "Customer"
			},
			{
				"type": "Link",
				"link_type": "DocType",
				"link_to": "Lead",
				"label": "Lead"
			},
			{
				"type": "Link",
				"link_type": "DocType",
				"link_to": "Opportunity",
				"label": "Opportunity"
			},
			{
				"type": "Link",
				"link_type": "DocType",
				"link_to": "Contact",
				"label": "Contact"
			}
		]
	})
	workspace.insert(ignore_permissions=True)
	frappe.db.commit()

	return {"ok": True, "workspace": workspace_name}


def set_spanish() -> dict[str, object]:
	"""Set system and user language to Spanish."""
	frappe.set_user("Administrator")

	# Set system language
	frappe.db.set_value('System Settings', None, 'language', 'es')

	# Set Administrator user language
	frappe.db.set_value('User', 'Administrator', 'language', 'es')

	frappe.db.commit()
	frappe.clear_cache()

	return {"ok": True, "language": "es"}


def ensure_crm_lite() -> dict[str, object]:
	frappe.set_user("Administrator")
	_ensure_page()
	_ensure_sidebar()
	create_workspace()
	frappe.clear_cache()
	return {"ok": True, "page": _PAGE_NAME, "sidebar": _SIDEBAR_TITLE}

