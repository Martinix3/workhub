# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt, today, add_days

def get_context(context):
	"""Controller para la página de Pipeline/CRM"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()
	if not frappe.has_permission("Lead", "read") and not frappe.has_permission("Opportunity", "read"):
		frappe.throw(_("No tienes permisos para ver el pipeline"), frappe.PermissionError)

	# Obtener filtro
	view_type = frappe.form_dict.get("view", "opportunities")  # opportunities o leads

	# Obtener datos según el tipo de vista
	if view_type == "leads":
		context.leads = get_leads()
		context.opportunities = []
	else:
		context.leads = []
		context.opportunities = get_opportunities()

	# Estadísticas globales
	context.stats = get_pipeline_stats()
	context.view_type = view_type

	return context

def get_leads():
	"""Obtiene leads activos"""
	leads = frappe.get_list(
		"Lead",
		filters={"status": ["!=", "Converted"]},
		fields=[
			"name", "lead_name", "company_name", "email_id",
			"mobile_no", "status", "source", "territory",
			"creation", "lead_owner"
		],
		order_by="creation desc",
		limit=100
	)

	# Agrupar leads por estado
	leads_by_status = {
		"Open": [],
		"Replied": [],
		"Opportunity": [],
		"Interested": [],
		"Do Not Contact": []
	}

	for lead in leads:
		status = lead.status or "Open"
		if status not in leads_by_status:
			leads_by_status[status] = []
		leads_by_status[status].append(lead)

	return leads_by_status

def get_opportunities():
	"""Obtiene oportunidades activas"""
	opportunities = frappe.get_list(
		"Opportunity",
		filters={"status": ["not in", ["Lost", "Closed"]]},
		fields=[
			"name", "customer_name", "opportunity_from",
			"party_name", "status", "opportunity_amount",
			"probability", "expected_closing", "sales_stage",
			"source", "territory", "creation"
		],
		order_by="expected_closing",
		limit=100
	)

	# Agrupar por sales stage
	opps_by_stage = {
		"Prospecting": [],
		"Qualification": [],
		"Needs Analysis": [],
		"Value Proposition": [],
		"Proposal/Price Quote": [],
		"Negotiation/Review": []
	}

	for opp in opportunities:
		stage = opp.sales_stage or "Prospecting"
		if stage not in opps_by_stage:
			opps_by_stage[stage] = []
		opps_by_stage[stage].append(opp)

	return opps_by_stage

def get_pipeline_stats():
	"""Obtiene estadísticas del pipeline"""

	# Leads
	total_leads = frappe.db.count("Lead", {"status": ["!=", "Converted"]})

	leads_this_month = frappe.db.sql("""
		SELECT COUNT(*) as count
		FROM `tabLead`
		WHERE creation >= DATE_FORMAT(NOW(), '%%Y-%%m-01')
			AND status != 'Converted'
	""")

	# Opportunities
	total_opps = frappe.db.count("Opportunity", {"status": ["not in", ["Lost", "Closed"]]})

	opp_value = frappe.db.sql("""
		SELECT
			SUM(opportunity_amount) as total,
			AVG(probability) as avg_probability
		FROM `tabOpportunity`
		WHERE status NOT IN ('Lost', 'Closed')
	""", as_dict=True)

	# Conversión
	converted_this_month = frappe.db.sql("""
		SELECT COUNT(*) as count
		FROM `tabLead`
		WHERE status = 'Converted'
			AND modified >= DATE_FORMAT(NOW(), '%%Y-%%m-01')
	""")

	won_this_month = frappe.db.sql("""
		SELECT
			COUNT(*) as count,
			SUM(opportunity_amount) as total
		FROM `tabOpportunity`
		WHERE status = 'Closed'
			AND modified >= DATE_FORMAT(NOW(), '%%Y-%%m-01')
	""", as_dict=True)

	return {
		"total_leads": total_leads,
		"leads_this_month": int(leads_this_month[0][0] or 0) if leads_this_month else 0,
		"total_opportunities": total_opps,
		"opportunity_value": flt(opp_value[0].total or 0) if opp_value else 0,
		"avg_probability": flt(opp_value[0].avg_probability or 0) if opp_value else 0,
		"converted_this_month": int(converted_this_month[0][0] or 0) if converted_this_month else 0,
		"won_this_month": int(won_this_month[0].count or 0) if won_this_month else 0,
		"won_value": flt(won_this_month[0].total or 0) if won_this_month else 0
	}
