# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import date_diff
import json

def get_context(context):
	"""Controller para la página de Timeline/Gantt del proyecto"""

	# Pasar roles al template
	context.user_roles = frappe.get_roles()

	# Obtener project_id desde URL params
	project_id = frappe.form_dict.get("project")

	if not project_id:
		frappe.throw(_("No se especificó ningún proyecto"), frappe.DoesNotExistError)

	# Verificar que el proyecto existe
	if not frappe.db.exists("WH Project", project_id):
		frappe.throw(_("Proyecto no encontrado"), frappe.DoesNotExistError)

	# Verificar permisos
	if not frappe.has_permission("WH Project", "read", project_id):
		frappe.throw(_("No tienes permisos para ver este proyecto"), frappe.PermissionError)

	# Obtener información del proyecto
	project = get_project_info(project_id)
	context.project = project

	# Obtener tareas con fechas
	tasks = get_project_tasks(project_id)
	context.tasks = tasks

	# Obtener dependencias
	dependencies = get_task_dependencies(project_id, tasks)
	context.dependencies = dependencies

	# Obtener milestones
	milestones = get_project_milestones(project_id)
	context.milestones = milestones

	# Ruta crítica (si existe)
	context.critical_path = json.loads(project.get("critical_path") or "[]")

	# Pasar project_id para JavaScript
	context.project_id = project_id

	return context


def get_project_info(project_id):
	"""Obtiene información básica del proyecto"""
	project = frappe.get_doc("WH Project", project_id)

	return {
		"name": project.name,
		"title": project.title,
		"start_date": str(project.start_date) if project.start_date else None,
		"target_date": str(project.target_date) if project.target_date else None,
		"health": project.health or "green",
		"status": project.status or "Active",
		"critical_path": project.critical_path,
		"slack_days": project.slack_days or 0
	}


def get_project_tasks(project_id):
	"""Obtiene todas las tareas del proyecto con sus fechas"""
	tasks = frappe.get_all("WH Task",
		filters={"project": project_id},
		fields=[
			"name", "title", "status", "priority",
			"start_date", "due_date", "actual_start", "actual_end",
			"assigned_to", "is_milestone", "parent_task",
			"estimated_hours", "description"
		],
		order_by="start_date asc, priority asc")

	# Enriquecer con información adicional
	for task in tasks:
		# Nombre del asignado
		if task.get("assigned_to"):
			user = frappe.get_cached_value("User", task["assigned_to"], ["full_name", "user_image"], as_dict=True)
			task["assigned_name"] = user.get("full_name") if user else None
			task["assigned_image"] = user.get("user_image") if user else None

		# Duración en días
		if task.get("start_date") and task.get("due_date"):
			task["duration_days"] = date_diff(task["due_date"], task["start_date"]) + 1
		else:
			task["duration_days"] = 1

		# Progreso basado en status
		status_progress = {
			"BACKLOG": 0,
			"NEXT": 10,
			"DOING": 50,
			"BLOCKED": 50,
			"DONE": 100
		}
		task["progress"] = status_progress.get(task.get("status"), 0)

		# Color basado en prioridad
		priority_colors = {
			"P0": "red",
			"P1": "orange",
			"P2": "blue"
		}
		task["priority_color"] = priority_colors.get(task.get("priority"), "gray")

	return tasks


def get_task_dependencies(project_id, tasks):
	"""Obtiene dependencias entre tareas del proyecto"""
	# Obtener todas las dependencias activas
	dependencies = frappe.get_all("WH Task Dependency",
		filters={"is_active": 1},
		fields=["name", "predecessor", "successor", "type", "lag_days", "is_critical"])

	# Filtrar solo dependencias de este proyecto
	project_task_names = {t["name"] for t in tasks}
	dependencies = [d for d in dependencies
					if d["predecessor"] in project_task_names and d["successor"] in project_task_names]

	return dependencies


def get_project_milestones(project_id):
	"""Obtiene los hitos del proyecto"""
	milestones = frappe.get_all("WH Task",
		filters={"project": project_id, "is_milestone": 1},
		fields=["name", "title", "due_date", "status", "assigned_to"],
		order_by="due_date asc")

	# Enriquecer con información del asignado
	for milestone in milestones:
		if milestone.get("assigned_to"):
			milestone["assigned_name"] = frappe.db.get_value("User", milestone["assigned_to"], "full_name")

	return milestones
