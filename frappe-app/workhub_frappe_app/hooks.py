app_name = "workhub_frappe_app"
app_title = "WorkHub Frappe App"
app_publisher = "WorkHub"
app_description = "WorkHub customizations"
app_email = "local@workhub"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "workhub_frappe_app",
# 		"logo": "/assets/workhub_frappe_app/logo.png",
# 		"title": "WorkHub Frappe App",
# 		"route": "/workhub_frappe_app",
# 		"has_permission": "workhub_frappe_app.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "/assets/workhub_frappe_app/css/workhub.bundle.css"
app_include_js = "/assets/workhub_frappe_app/js/workhub.bundle.js"

# include js, css files in header of web template
# web_include_css = "/assets/workhub_frappe_app/css/workhub_frappe_app.css"
# web_include_js = "/assets/workhub_frappe_app/js/workhub_frappe_app.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "workhub_frappe_app/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "workhub_frappe_app/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "workhub_frappe_app.utils.jinja_methods",
# 	"filters": "workhub_frappe_app.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "workhub_frappe_app.install.before_install"
# after_install = "workhub_frappe_app.install.after_install"
after_install = "workhub_frappe_app.workhub_frappe_app.utils.crm_lite.ensure_crm_lite"

# Fixtures
# --------
fixtures = [
    {"dt": "Custom Field", "filters": [["dt", "=", "Sales Order"], ["fieldname", "=", "sales_type"]]},
    # Project templates con sus tareas
    {"dt": "WH Project Template", "filters": [["is_active", "=", 1]]}
]

# Boot Session
# ------------
# boot_session = "workhub_frappe_app.workhub_frappe_app.boot.boot_session"

# Run again on migrations (idempotent) to keep UX entry points available.
after_migrate = ["workhub_frappe_app.workhub_frappe_app.utils.crm_lite.ensure_crm_lite"]

# Uninstallation
# ------------

# before_uninstall = "workhub_frappe_app.uninstall.before_uninstall"
# after_uninstall = "workhub_frappe_app.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "workhub_frappe_app.utils.before_app_install"
# after_app_install = "workhub_frappe_app.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "workhub_frappe_app.utils.before_app_uninstall"
# after_app_uninstall = "workhub_frappe_app.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "workhub_frappe_app.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

scheduler_events = {
	"cron": {
		# Email diario a las 8am (hora local)
		"0 8 * * *": [
			"workhub_frappe_app.api.notifications.send_daily_emails"
		]
	},
	"daily": [
		# Agregar estadísticas de tareas completadas para AI
		"workhub_frappe_app.services.ai_recommendations.aggregate_task_completion_stats"
	],
	"hourly": [
		# Alertas de tareas vencidas
		"workhub_frappe_app.api.notifications.send_overdue_alerts",
		# Verificar salud de proyectos
		"workhub_frappe_app.api.notifications.check_project_health",
		# Notificar dependencias bloqueadas
		"workhub_frappe_app.api.notifications.notify_blocked_dependencies",
		# Recalcular KPIs de proyectos
		"workhub_frappe_app.doctype.wh_project.wh_project.recalculate_all_projects",
		# Generar alertas de AI para tareas en riesgo
		"workhub_frappe_app.services.ai_recommendations.generate_at_risk_alerts"
	],
}

# Testing
# -------

# before_tests = "workhub_frappe_app.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "workhub_frappe_app.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "workhub_frappe_app.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "workhub_frappe_app.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# Cookie authentication middleware runs before each request
before_request = ["workhub_frappe_app.api.middleware.authenticate_with_cookie"]

# CORS credentials header middleware runs after each request
# Adds Access-Control-Allow-Credentials: true to enable cookie-based auth
# with cross-origin requests (required for credentials: 'include')
after_request = ["workhub_frappe_app.api.middleware.add_cors_credentials_header"]

# Job Events
# ----------
# before_job = ["workhub_frappe_app.utils.before_job"]
# after_job = ["workhub_frappe_app.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"workhub_frappe_app.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

# CORS Configuration
# ------------------
# Allow cross-origin requests from the React frontend
# Production: restrict to specific domains
# Development: localhost is allowed by default in Frappe

import os

_env = os.environ.get("FRAPPE_ENV", "development")

if _env == "production":
    # Production: only allow specific domains
    allow_cors = [
        "https://workhub.santabrisa.com",
        "https://app.santabrisa.com",
    ]
else:
    # Development: allow localhost variants
    allow_cors = [
        "http://localhost:5177",
        "http://localhost:5173",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:5173",
    ]
