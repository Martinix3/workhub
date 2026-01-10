# WH Standard Reports
# Pre-built standard report templates for common use cases

import frappe
from frappe import _
import json

from workhub_frappe_app.api.utils import require_auth, require_permission


def create_team_productivity_report():
	"""
	Create the Team Productivity standard report template

	Includes:
	- KPI cards: tasks completed, velocity, blockers, time to completion
	- Line charts: velocity trends
	- Tables: tasks by team member, blockers analysis
	"""
	# Check if report already exists
	if frappe.db.exists("WH Report Definition", {"title": "Team Productivity Report"}):
		frappe.logger().info("Team Productivity Report already exists, skipping creation")
		return

	# Create the report definition
	report = frappe.new_doc("WH Report Definition")
	report.title = "Team Productivity Report"
	report.description = "Comprehensive team productivity analysis showing tasks completed per team member, velocity trends, blockers analysis, and time to completion metrics."
	report.report_type = "Standard"
	report.category = "Team"
	report.is_active = 1

	# Section 1: Report Header
	report.append("sections", {
		"section_type": "Header",
		"title": "Team Productivity Report",
		"display_order": 1,
		"is_visible": 1,
		"config": json.dumps({
			"subtitle": "Team performance and productivity analysis"
		})
	})

	# Section 2: KPI Cards Row
	# KPI 1: Tasks Completed This Month
	report.append("sections", {
		"section_type": "KPI",
		"title": "Tasks Completed This Month",
		"data_source": "team_metrics",
		"display_order": 2,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {"period": "month"},
			"metric_field": "value",
			"metric_filter": {"metric_name": "tasks_completed"},
			"show_trend": True,
			"trend_field": "change",
			"color": "primary",
			"icon": "✓",
			"format": "number"
		})
	})

	# KPI 2: Team Velocity (Tasks/Person/Week)
	report.append("sections", {
		"section_type": "KPI",
		"title": "Team Velocity",
		"data_source": "team_metrics",
		"display_order": 3,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {"period": "week"},
			"metric_field": "value",
			"metric_filter": {"metric_name": "velocity"},
			"show_trend": True,
			"trend_field": "change",
			"color": "success",
			"icon": "⚡",
			"format": "number",
			"decimals": 1,
			"subtitle": "tasks/person/week"
		})
	})

	# KPI 3: Blocked Tasks
	report.append("sections", {
		"section_type": "KPI",
		"title": "Blocked Tasks",
		"data_source": "team_metrics",
		"display_order": 4,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {"period": "week"},
			"metric_field": "value",
			"metric_filter": {"metric_name": "tasks_blocked"},
			"show_trend": True,
			"trend_field": "change",
			"color": "warning",
			"icon": "⚠",
			"format": "number"
		})
	})

	# KPI 4: Average Time to Completion
	report.append("sections", {
		"section_type": "KPI",
		"title": "Avg Time to Completion",
		"data_source": "team_metrics",
		"display_order": 5,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {"period": "month"},
			"metric_field": "value",
			"metric_filter": {"metric_name": "avg_completion_time"},
			"show_trend": True,
			"trend_field": "change",
			"color": "info",
			"icon": "⏱",
			"format": "number",
			"decimals": 1,
			"subtitle": "days"
		})
	})

	# Section 3: Velocity Trend Chart
	report.append("sections", {
		"section_type": "Chart",
		"title": "Velocity Trend (Last 8 Weeks)",
		"data_source": "team_metrics",
		"display_order": 6,
		"is_visible": 1,
		"config": json.dumps({
			"chart_type": "line",
			"filters": {"period": "week", "trend_weeks": 8},
			"x_field": "week",
			"y_field": "velocity",
			"label": "Tasks/Person/Week",
			"colors": ["#10b981"],
			"show_points": True,
			"show_grid": True,
			"height": 300
		})
	})

	# Section 4: Tasks Completed by Team Member
	report.append("sections", {
		"section_type": "Table",
		"title": "Tasks Completed by Team Member",
		"data_source": "tasks",
		"display_order": 7,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {
				"status": "DONE",
				"date_range": "current_month"
			},
			"columns": [
				{"field": "assigned_to", "label": "Team Member", "type": "string"},
				{"field": "title", "label": "Task", "type": "string"},
				{"field": "project", "label": "Project", "type": "string"},
				{"field": "department", "label": "Department", "type": "string"},
				{"field": "priority", "label": "Priority", "type": "string"},
				{"field": "modified", "label": "Completed Date", "type": "datetime"}
			],
			"sort_by": "assigned_to",
			"sort_order": "asc",
			"group_by": "assigned_to",
			"show_totals": True
		})
	})

	# Section 5: Blockers Analysis
	report.append("sections", {
		"section_type": "Table",
		"title": "Active Blockers Analysis",
		"data_source": "tasks",
		"display_order": 8,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {
				"status": "BLOCKED"
			},
			"columns": [
				{"field": "name", "label": "Task ID", "type": "string"},
				{"field": "title", "label": "Task Title", "type": "string"},
				{"field": "assigned_to", "label": "Assigned To", "type": "string"},
				{"field": "project", "label": "Project", "type": "string"},
				{"field": "department", "label": "Department", "type": "string"},
				{"field": "priority", "label": "Priority", "type": "string"},
				{"field": "due_date", "label": "Due Date", "type": "date"},
				{"field": "is_overdue", "label": "Overdue", "type": "boolean"}
			],
			"sort_by": "priority",
			"sort_order": "asc",
			"highlight_overdue": True
		})
	})

	# Section 6: Time to Completion Analysis
	report.append("sections", {
		"section_type": "Table",
		"title": "Time to Completion by Priority",
		"data_source": "tasks",
		"display_order": 9,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {
				"status": "DONE",
				"date_range": "current_month"
			},
			"columns": [
				{"field": "priority", "label": "Priority", "type": "string"},
				{"field": "name", "label": "Task ID", "type": "string"},
				{"field": "title", "label": "Task", "type": "string"},
				{"field": "assigned_to", "label": "Assigned To", "type": "string"},
				{"field": "start_date", "label": "Start Date", "type": "date"},
				{"field": "modified", "label": "Completed Date", "type": "datetime"},
				{"field": "days_to_complete", "label": "Days to Complete", "type": "number"}
			],
			"sort_by": "priority",
			"sort_order": "asc",
			"group_by": "priority",
			"show_averages": True
		})
	})

	# Section 7: Summary and Insights
	report.append("sections", {
		"section_type": "Text",
		"title": "Report Summary",
		"display_order": 10,
		"is_visible": 1,
		"config": json.dumps({
			"content": """
				<p>This report provides a comprehensive view of team productivity metrics:</p>
				<ul>
					<li><strong>KPI Overview:</strong> Key metrics showing current team performance including tasks completed, velocity, blocked items, and completion times.</li>
					<li><strong>Velocity Trends:</strong> Historical view of team velocity to identify productivity patterns and trends over time.</li>
					<li><strong>Individual Performance:</strong> Breakdown of tasks completed by each team member for workload visibility.</li>
					<li><strong>Blockers:</strong> Active blocked tasks requiring attention to maintain team momentum.</li>
					<li><strong>Completion Analysis:</strong> Time-to-completion metrics segmented by priority for process improvement insights.</li>
				</ul>
				<p><em>Use this report for sprint retrospectives, team performance reviews, and capacity planning.</em></p>
			"""
		})
	})

	# Save the report
	report.insert(ignore_permissions=True)
	frappe.logger().info(f"Created Team Productivity Report: {report.name}")
	return report.name


def create_project_status_report():
	"""
	Create the Project Status standard report template

	Includes:
	- Project health overview
	- Milestone progress
	- Task completion by project
	- Risk indicators
	- Timeline adherence
	"""
	# Check if report already exists
	if frappe.db.exists("WH Report Definition", {"title": "Project Status Report"}):
		frappe.logger().info("Project Status Report already exists, skipping creation")
		return

	# Create the report definition
	report = frappe.new_doc("WH Report Definition")
	report.title = "Project Status Report"
	report.description = "Comprehensive project status overview showing project health, milestone progress, task completion rates, risk indicators, and timeline adherence with visualization."
	report.report_type = "Standard"
	report.category = "Project"
	report.is_active = 1

	# Section 1: Report Header
	report.append("sections", {
		"section_type": "Header",
		"title": "Project Status Report",
		"display_order": 1,
		"is_visible": 1,
		"config": json.dumps({
			"subtitle": "Project health, progress, and timeline analysis"
		})
	})

	# Section 2-5: KPI Cards Row
	# KPI 1: Active Projects
	report.append("sections", {
		"section_type": "KPI",
		"title": "Active Projects",
		"data_source": "projects",
		"display_order": 2,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {"status": "active"},
			"metric_type": "count",
			"color": "primary",
			"icon": "📊",
			"format": "number"
		})
	})

	# KPI 2: Healthy Projects
	report.append("sections", {
		"section_type": "KPI",
		"title": "Healthy Projects",
		"data_source": "projects",
		"display_order": 3,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {"status": "active", "health": "healthy"},
			"metric_type": "count",
			"color": "success",
			"icon": "✓",
			"format": "number",
			"subtitle": "On track"
		})
	})

	# KPI 3: At Risk Projects
	report.append("sections", {
		"section_type": "KPI",
		"title": "At Risk Projects",
		"data_source": "projects",
		"display_order": 4,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {"status": "active", "health": "at_risk"},
			"metric_type": "count",
			"color": "warning",
			"icon": "⚠",
			"format": "number",
			"subtitle": "Needs attention"
		})
	})

	# KPI 4: Overall Completion Rate
	report.append("sections", {
		"section_type": "KPI",
		"title": "Overall Completion Rate",
		"data_source": "projects",
		"display_order": 5,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {"status": "active"},
			"metric_field": "avg_progress",
			"aggregation": "average",
			"color": "info",
			"icon": "📈",
			"format": "percentage",
			"decimals": 1
		})
	})

	# Section 6: Project Health Overview Chart
	report.append("sections", {
		"section_type": "Chart",
		"title": "Project Health Overview",
		"data_source": "projects",
		"display_order": 6,
		"is_visible": 1,
		"config": json.dumps({
			"chart_type": "pie",
			"filters": {"status": "active"},
			"group_by": "health",
			"value_field": "count",
			"label_field": "health",
			"colors": ["#10b981", "#f59e0b", "#ef4444"],
			"labels": ["Healthy", "At Risk", "Critical"],
			"show_legend": True,
			"height": 300
		})
	})

	# Section 7: Timeline Adherence Chart
	report.append("sections", {
		"section_type": "Chart",
		"title": "Timeline Adherence (Progress vs Time)",
		"data_source": "projects",
		"display_order": 7,
		"is_visible": 1,
		"config": json.dumps({
			"chart_type": "bar",
			"filters": {"status": "active"},
			"x_field": "name",
			"y_fields": ["progress_percentage", "time_elapsed_percentage"],
			"labels": ["Progress %", "Time Elapsed %"],
			"colors": ["#3b82f6", "#94a3b8"],
			"show_grid": True,
			"stacked": False,
			"height": 350
		})
	})

	# Section 8: Project Status Details Table
	report.append("sections", {
		"section_type": "Table",
		"title": "Project Status Details",
		"data_source": "projects",
		"display_order": 8,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {"status": "active"},
			"columns": [
				{"field": "name", "label": "Project ID", "type": "string"},
				{"field": "title", "label": "Project Name", "type": "string"},
				{"field": "health", "label": "Health", "type": "string"},
				{"field": "progress_percentage", "label": "Progress", "type": "percentage"},
				{"field": "tasks_total", "label": "Total Tasks", "type": "number"},
				{"field": "tasks_completed", "label": "Completed", "type": "number"},
				{"field": "tasks_in_progress", "label": "In Progress", "type": "number"},
				{"field": "owner", "label": "Owner", "type": "string"},
				{"field": "department", "label": "Department", "type": "string"}
			],
			"sort_by": "health",
			"sort_order": "asc"
		})
	})

	# Section 9: Milestone Progress Table
	report.append("sections", {
		"section_type": "Table",
		"title": "Milestone Progress by Project",
		"data_source": "projects",
		"display_order": 9,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {"status": "active"},
			"columns": [
				{"field": "name", "label": "Project", "type": "string"},
				{"field": "title", "label": "Project Name", "type": "string"},
				{"field": "milestones_total", "label": "Total Milestones", "type": "number"},
				{"field": "milestones_completed", "label": "Completed", "type": "number"},
				{"field": "milestones_pending", "label": "Pending", "type": "number"},
				{"field": "milestone_completion_rate", "label": "Completion Rate", "type": "percentage"},
				{"field": "next_milestone_date", "label": "Next Milestone", "type": "date"}
			],
			"sort_by": "milestone_completion_rate",
			"sort_order": "asc",
			"show_averages": True
		})
	})

	# Section 10: Task Completion by Project
	report.append("sections", {
		"section_type": "Table",
		"title": "Task Completion by Project",
		"data_source": "tasks",
		"display_order": 10,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {},
			"columns": [
				{"field": "project", "label": "Project", "type": "string"},
				{"field": "name", "label": "Task ID", "type": "string"},
				{"field": "title", "label": "Task", "type": "string"},
				{"field": "status", "label": "Status", "type": "string"},
				{"field": "priority", "label": "Priority", "type": "string"},
				{"field": "assigned_to", "label": "Assigned To", "type": "string"},
				{"field": "due_date", "label": "Due Date", "type": "date"},
				{"field": "is_overdue", "label": "Overdue", "type": "boolean"}
			],
			"sort_by": "project",
			"sort_order": "asc",
			"group_by": "project",
			"highlight_overdue": True,
			"show_totals": True
		})
	})

	# Section 11: Risk Indicators Table
	report.append("sections", {
		"section_type": "Table",
		"title": "Risk Indicators",
		"data_source": "projects",
		"display_order": 11,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {"status": "active", "health": ["at_risk", "critical"]},
			"columns": [
				{"field": "name", "label": "Project ID", "type": "string"},
				{"field": "title", "label": "Project", "type": "string"},
				{"field": "health", "label": "Health Status", "type": "string"},
				{"field": "tasks_blocked", "label": "Blocked Tasks", "type": "number"},
				{"field": "tasks_overdue", "label": "Overdue Tasks", "type": "number"},
				{"field": "days_remaining", "label": "Days Remaining", "type": "number"},
				{"field": "progress_percentage", "label": "Progress", "type": "percentage"},
				{"field": "owner", "label": "Owner", "type": "string"}
			],
			"sort_by": "health",
			"sort_order": "desc"
		})
	})

	# Section 12: Timeline Adherence Table
	report.append("sections", {
		"section_type": "Table",
		"title": "Timeline Adherence Analysis",
		"data_source": "projects",
		"display_order": 12,
		"is_visible": 1,
		"config": json.dumps({
			"filters": {"status": "active"},
			"columns": [
				{"field": "name", "label": "Project", "type": "string"},
				{"field": "title", "label": "Project Name", "type": "string"},
				{"field": "start_date", "label": "Start Date", "type": "date"},
				{"field": "end_date", "label": "End Date", "type": "date"},
				{"field": "days_elapsed", "label": "Days Elapsed", "type": "number"},
				{"field": "days_remaining", "label": "Days Remaining", "type": "number"},
				{"field": "time_elapsed_percentage", "label": "Time Elapsed", "type": "percentage"},
				{"field": "progress_percentage", "label": "Progress", "type": "percentage"},
				{"field": "schedule_variance", "label": "Schedule Variance", "type": "number"}
			],
			"sort_by": "schedule_variance",
			"sort_order": "desc"
		})
	})

	# Section 13: Summary and Insights
	report.append("sections", {
		"section_type": "Text",
		"title": "Report Summary",
		"display_order": 13,
		"is_visible": 1,
		"config": json.dumps({
			"content": """
				<p>This report provides a comprehensive overview of project status and health metrics:</p>
				<ul>
					<li><strong>Health Overview:</strong> Visual breakdown of project health status (Healthy, At Risk, Critical) across all active projects.</li>
					<li><strong>Progress Tracking:</strong> Detailed view of task completion rates, milestone achievement, and overall project progress.</li>
					<li><strong>Timeline Analysis:</strong> Comparison of actual progress vs. time elapsed to identify projects ahead or behind schedule.</li>
					<li><strong>Risk Indicators:</strong> Identification of projects with blocked or overdue tasks requiring immediate attention.</li>
					<li><strong>Resource Allocation:</strong> Overview of project ownership and departmental distribution for capacity planning.</li>
				</ul>
				<p><em>Use this report for executive briefings, project review meetings, and strategic planning sessions.</em></p>
			"""
		})
	})

	# Save the report
	report.insert(ignore_permissions=True)
	frappe.logger().info(f"Created Project Status Report: {report.name}")
	return report.name


def create_haccp_compliance_report():
	"""
	Create the HACCP Compliance standard report template

	Includes:
	- Inspection summary
	- Non-conformances
	- Corrective actions status
	- Compliance percentage
	- Audit trail
	"""
	# To be implemented in subtask 5.3
	pass


@frappe.whitelist()
def install_standard_reports():
	"""
	Install all standard report templates
	Called during app installation or migration
	"""
	require_auth()
	require_permission("WH Report Definition", "create")

	created_reports = []

	# Create Team Productivity Report
	try:
		report_id = create_team_productivity_report()
		if report_id:
			created_reports.append({"name": report_id, "title": "Team Productivity Report"})
	except Exception as e:
		frappe.log_error(f"Error creating Team Productivity Report: {str(e)}")

	# Create Project Status Report (subtask 5.2)
	try:
		report_id = create_project_status_report()
		if report_id:
			created_reports.append({"name": report_id, "title": "Project Status Report"})
	except Exception as e:
		frappe.log_error(f"Error creating Project Status Report: {str(e)}")

	# Create HACCP Compliance Report (subtask 5.3)
	# try:
	# 	report_id = create_haccp_compliance_report()
	# 	if report_id:
	# 		created_reports.append({"name": report_id, "title": "HACCP Compliance Report"})
	# except Exception as e:
	# 	frappe.log_error(f"Error creating HACCP Compliance Report: {str(e)}")

	frappe.db.commit()

	return {
		"success": True,
		"created_reports": created_reports,
		"message": f"Successfully installed {len(created_reports)} standard report(s)"
	}


@frappe.whitelist()
def get_standard_reports():
	"""
	Get list of available standard reports
	"""
	require_auth()

	reports = frappe.get_list("WH Report Definition",
		filters={"report_type": "Standard"},
		fields=["name", "title", "description", "category", "is_active"],
		order_by="title asc"
	)

	return {
		"success": True,
		"reports": reports
	}
