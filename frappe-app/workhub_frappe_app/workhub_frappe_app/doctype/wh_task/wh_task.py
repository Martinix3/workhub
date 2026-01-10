# Copyright (c) 2026, Santa Brisa and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import nowdate, now_datetime, getdate, add_days, date_diff


class WHTask(Document):
    def before_save(self):
        self.handle_status_change()
        self.handle_worked_today()
        self.set_defaults()

    def on_update(self):
        self.update_project_kpis()
        self.propagate_to_successors()

    def set_defaults(self):
        """Establece valores por defecto"""
        if not self.created_by:
            self.created_by = frappe.session.user

        # Si tiene proyecto, heredar departamento si no tiene
        if self.project and not self.department:
            project_dept = frappe.db.get_value("WH Project", self.project, "department")
            if project_dept:
                self.department = project_dept

        # Marcar como inbox si no tiene proyecto
        if not self.project and not self.parent_task:
            self.is_inbox = 1

    def handle_status_change(self):
        """Maneja cambios de estado - registra fechas reales"""
        if not self.is_new():
            old_status = frappe.db.get_value("WH Task", self.name, "status")

            # Cambio a DOING -> registrar inicio real
            if old_status != "DOING" and self.status == "DOING":
                if not self.actual_start:
                    self.actual_start = now_datetime()

            # Cambio a DONE -> registrar fin real
            if old_status != "DONE" and self.status == "DONE":
                if not self.actual_end:
                    self.actual_end = now_datetime()

    def handle_worked_today(self):
        """Si se marca 'trabaje hoy', agregar entrada al log"""
        if self.worked_today and not self.is_new():
            # Verificar si ya hay entrada para hoy
            today = nowdate()
            existing = [
                log for log in (self.work_log or [])
                if str(log.date) == today and log.user == frappe.session.user
            ]

            if not existing:
                self.append("work_log", {
                    "date": today,
                    "user": frappe.session.user,
                    "notes": ""
                })

            # Recalcular total de dias trabajados
            unique_days = set()
            for log in (self.work_log or []):
                if log.date:
                    unique_days.add(str(log.date))
            self.total_work_days = len(unique_days)

    def update_project_kpis(self):
        """Notifica al proyecto que recalcule sus KPIs"""
        if self.project:
            try:
                project = frappe.get_doc("WH Project", self.project)
                project.recalculate_kpis()
            except Exception:
                # Si falla, no bloquear la operacion
                pass

    def propagate_to_successors(self):
        """Propaga cambios de fecha a tareas sucesoras"""
        if not self.name:
            return

        # Buscar dependencias donde esta tarea es predecessora
        dependencies = frappe.get_all(
            "WH Task Dependency",
            filters={"predecessor": self.name, "is_active": 1},
            fields=["successor", "type", "lag_days"]
        )

        for dep in dependencies:
            try:
                successor = frappe.get_doc("WH Task", dep.successor)
                min_start = None

                # Calcular fecha minima de inicio basada en tipo de dependencia
                if dep.type == "FS":  # Finish-to-Start (mas comun)
                    if self.due_date:
                        min_start = add_days(getdate(self.due_date), (dep.lag_days or 0) + 1)
                elif dep.type == "SS":  # Start-to-Start
                    if self.start_date:
                        min_start = add_days(getdate(self.start_date), dep.lag_days or 0)
                elif dep.type == "FF":  # Finish-to-Finish
                    if self.due_date and successor.due_date:
                        # Ajustar debido a que finish debe coincidir
                        pass
                elif dep.type == "SF":  # Start-to-Finish
                    pass

                # Actualizar successor si es necesario
                if min_start:
                    current_start = getdate(successor.start_date) if successor.start_date else None
                    if not current_start or current_start < min_start:
                        # Mantener duracion, ajustar fechas
                        duration = 0
                        if successor.start_date and successor.due_date:
                            duration = date_diff(successor.due_date, successor.start_date)

                        frappe.db.set_value("WH Task", successor.name, {
                            "start_date": min_start,
                            "due_date": add_days(min_start, duration) if duration > 0 else None
                        })
            except Exception:
                # Si falla una propagacion, continuar con las demas
                pass


@frappe.whitelist()
def quick_add(title, priority="P1", department=None, assigned_to=None):
    """Crear tarea rapida (inbox)"""
    task = frappe.get_doc({
        "doctype": "WH Task",
        "title": title,
        "priority": priority,
        "status": "BACKLOG",
        "department": department,
        "assigned_to": assigned_to or frappe.session.user,
        "is_inbox": 1
    })
    task.insert()
    return task.name


@frappe.whitelist()
def change_status(task_id, new_status):
    """Cambiar estado de una tarea"""
    valid_statuses = ["BACKLOG", "NEXT", "DOING", "BLOCKED", "DONE"]
    if new_status not in valid_statuses:
        frappe.throw(f"Estado invalido: {new_status}")

    task = frappe.get_doc("WH Task", task_id)
    task.status = new_status
    task.save()
    return task.status


@frappe.whitelist()
def log_work(task_id, date=None, notes=""):
    """Registrar trabajo en una tarea"""
    task = frappe.get_doc("WH Task", task_id)
    task.append("work_log", {
        "date": date or nowdate(),
        "user": frappe.session.user,
        "notes": notes
    })
    task.save()
    return True
