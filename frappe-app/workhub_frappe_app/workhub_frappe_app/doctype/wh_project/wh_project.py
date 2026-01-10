# Copyright (c) 2026, Santa Brisa and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import date_diff, add_days, getdate, nowdate


class WHProject(Document):
    def before_save(self):
        self.calculate_duration()

    def on_update(self):
        self.recalculate_kpis()

    def calculate_duration(self):
        """Calcula duracion en dias entre start_date y target_date/actual_end_date"""
        if self.start_date:
            end = self.actual_end_date or self.target_date
            if end:
                self.duration_days = date_diff(end, self.start_date)

    def recalculate_kpis(self):
        """Recalcula KPIs del proyecto basado en tareas"""
        if not self.name:
            return

        # Obtener estadisticas de tareas
        tasks = frappe.get_all(
            "WH Task",
            filters={"project": self.name},
            fields=["status", "due_date", "actual_end"]
        )

        if not tasks:
            return

        total = len(tasks)
        completed = len([t for t in tasks if t.status == "DONE"])
        blocked = len([t for t in tasks if t.status == "BLOCKED"])
        overdue = len([
            t for t in tasks
            if t.due_date and getdate(t.due_date) < getdate(nowdate()) and t.status != "DONE"
        ])

        # Calcular progreso
        progress = (completed / total * 100) if total > 0 else 0

        # Actualizar sin trigger recursivo
        frappe.db.set_value("WH Project", self.name, {
            "total_tasks": total,
            "completed_tasks": completed,
            "blocked_tasks": blocked,
            "overdue_tasks": overdue,
            "progress_pct": progress
        }, update_modified=False)

        # Recalcular health
        self.update_health(total, blocked, overdue, progress)

    def update_health(self, total, blocked, overdue, progress):
        """Calcula health automaticamente basado en metricas"""
        if total == 0:
            health = "GREEN"
            reason = ""
        else:
            blocked_ratio = blocked / total
            overdue_ratio = overdue / total

            # Calcular progreso esperado basado en tiempo transcurrido
            expected_progress = 0
            if self.start_date and self.target_date:
                total_days = date_diff(self.target_date, self.start_date)
                elapsed_days = date_diff(nowdate(), self.start_date)
                if total_days > 0 and elapsed_days > 0:
                    expected_progress = min(100, (elapsed_days / total_days) * 100)

            progress_vs_expected = progress / expected_progress if expected_progress > 0 else 1

            # Scoring de riesgo
            risk_score = (
                blocked_ratio * 40 +
                overdue_ratio * 40 +
                max(0, (1 - progress_vs_expected)) * 20
            )

            if risk_score > 30 or blocked >= 3 or overdue >= 3:
                health = "RED"
                reasons = []
                if blocked >= 3:
                    reasons.append(f"{blocked} bloqueadas")
                if overdue >= 3:
                    reasons.append(f"{overdue} vencidas")
                if progress_vs_expected < 0.7:
                    reasons.append("progreso bajo")
                reason = ", ".join(reasons) if reasons else "riesgo alto"
            elif risk_score > 15 or blocked >= 1 or overdue >= 1:
                health = "YELLOW"
                reasons = []
                if blocked >= 1:
                    reasons.append(f"{blocked} bloqueadas")
                if overdue >= 1:
                    reasons.append(f"{overdue} vencidas")
                reason = ", ".join(reasons) if reasons else "atencion requerida"
            else:
                health = "GREEN"
                reason = ""

        frappe.db.set_value("WH Project", self.name, {
            "health": health,
            "health_reason": reason
        }, update_modified=False)


def recalculate_all_projects():
    """Scheduler: recalcula KPIs de todos los proyectos activos"""
    projects = frappe.get_all(
        "WH Project",
        filters={"status": "ACTIVE"},
        pluck="name"
    )
    for project_name in projects:
        doc = frappe.get_doc("WH Project", project_name)
        doc.recalculate_kpis()
