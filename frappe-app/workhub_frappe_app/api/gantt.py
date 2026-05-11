# Gantt API
# Operaciones para vista Gantt y dependencias

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, add_days, date_diff
import json
from collections import defaultdict

from workhub_frappe_app.api.utils import require_auth, require_permission


def _enrich_task_assignees(task):
    """Enrich task with assignees data including user info"""
    if not task.get("name"):
        return []

    assignees = frappe.get_all("WH Task Assignee",
        filters={"parent": task["name"]},
        fields=["user", "role"],
        order_by="idx"
    )

    # Enrich with user info
    for assignee in assignees:
        if assignee.get("user"):
            assignee["user_name"] = frappe.db.get_value("User", assignee["user"], "full_name")

    return assignees


@frappe.whitelist()
def get_gantt_view(project_id):
    """Obtener datos para renderizar Gantt"""
    require_auth()

    # Tareas del proyecto
    tasks = frappe.get_all("WH Task",
        filters={"project": project_id},
        fields=[
            "name", "title", "status", "priority",
            "start_date", "due_date", "actual_start", "actual_end",
            "assigned_to", "is_milestone", "parent_task",
            "estimated_hours"
        ],
        order_by="start_date asc, priority asc")

    # Enriquecer con info adicional
    for task in tasks:
        # Add assignees with user info
        task["assignees"] = _enrich_task_assignees(task)

        # Keep assigned_name for backward compatibility (primary owner)
        if task.get("assigned_to"):
            task["assigned_name"] = frappe.db.get_value("User", task["assigned_to"], "full_name")

        # Duracion en dias
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

    # Dependencias
    dependencies = frappe.get_all("WH Task Dependency",
        filters={"is_active": 1},
        fields=["name", "predecessor", "successor", "type", "lag_days", "is_critical"])

    # Filtrar solo dependencias de este proyecto
    project_task_names = [t["name"] for t in tasks]
    dependencies = [d for d in dependencies
                    if d["predecessor"] in project_task_names or d["successor"] in project_task_names]

    # Info del proyecto
    project = frappe.get_doc("WH Project", project_id)

    return {
        "project": {
            "name": project.name,
            "title": project.title,
            "start_date": str(project.start_date) if project.start_date else None,
            "target_date": str(project.target_date) if project.target_date else None,
            "health": project.health
        },
        "tasks": tasks,
        "dependencies": dependencies,
        "critical_path": json.loads(project.critical_path) if project.critical_path else []
    }


@frappe.whitelist()
def update_task_schedule(task_id, start_date=None, due_date=None):
    """Actualizar fechas de una tarea (desde drag-and-drop)"""
    require_auth()

    task = frappe.get_doc("WH Task", task_id)

    # Parse dates
    new_start = getdate(start_date) if start_date else task.start_date
    new_due = getdate(due_date) if due_date else task.due_date

    # VALIDATION: Ensure start_date is before due_date
    if new_start and new_due and new_start > new_due:
        frappe.throw(_("La fecha de inicio no puede ser posterior a la fecha de fin"))

    # Update task
    if start_date:
        task.start_date = new_start
    if due_date:
        task.due_date = new_due

    task.save()

    # Propagar a sucesores si es necesario
    propagate_dates(task_id)

    return {
        "success": True,
        "task": task.name,
        "start_date": str(task.start_date) if task.start_date else None,
        "due_date": str(task.due_date) if task.due_date else None
    }


def propagate_dates(task_id):
    """Propagar fechas a tareas sucesoras"""
    task = frappe.get_doc("WH Task", task_id)

    if not task.due_date:
        return

    # Obtener dependencias donde esta tarea es predecesora
    deps = frappe.get_all("WH Task Dependency",
        filters={"predecessor": task_id, "is_active": 1},
        fields=["successor", "type", "lag_days"])

    for dep in deps:
        successor = frappe.get_doc("WH Task", dep["successor"])
        lag = dep.get("lag_days") or 0

        if dep["type"] == "FS":  # Finish-to-Start
            min_start = add_days(task.due_date, lag + 1)
            if not successor.start_date or successor.start_date < min_start:
                # Mantener duracion
                old_duration = 1
                if successor.start_date and successor.due_date:
                    old_duration = date_diff(successor.due_date, successor.start_date)

                successor.start_date = min_start
                successor.due_date = add_days(min_start, old_duration)
                successor.save()

                # Propagar recursivamente
                propagate_dates(successor.name)

        elif dep["type"] == "SS":  # Start-to-Start
            min_start = add_days(task.start_date, lag) if task.start_date else None
            if min_start and (not successor.start_date or successor.start_date < min_start):
                old_duration = 1
                if successor.start_date and successor.due_date:
                    old_duration = date_diff(successor.due_date, successor.start_date)

                successor.start_date = min_start
                successor.due_date = add_days(min_start, old_duration)
                successor.save()
                propagate_dates(successor.name)

        elif dep["type"] == "FF":  # Finish-to-Finish
            min_finish = add_days(task.due_date, lag)
            if not successor.due_date or successor.due_date < min_finish:
                old_duration = 1
                if successor.start_date and successor.due_date:
                    old_duration = date_diff(successor.due_date, successor.start_date)

                successor.due_date = min_finish
                successor.start_date = add_days(min_finish, -old_duration)
                successor.save()
                propagate_dates(successor.name)


@frappe.whitelist()
def get_critical_path(project_id):
    """Calcular ruta critica usando CPM"""
    require_auth()

    # Obtener tareas con sus dependencias
    tasks = frappe.get_all("WH Task",
        filters={"project": project_id, "status": ["not in", ["DONE"]]},
        fields=["name", "title", "start_date", "due_date", "status"])

    if not tasks:
        return {"critical_path": [], "slack_times": {}}

    task_dict = {t["name"]: t for t in tasks}

    # Obtener dependencias
    deps = frappe.get_all("WH Task Dependency",
        filters={"is_active": 1},
        fields=["predecessor", "successor", "lag_days"])

    # Construir grafo
    predecessors = defaultdict(list)
    successors = defaultdict(list)

    for dep in deps:
        if dep["predecessor"] in task_dict and dep["successor"] in task_dict:
            predecessors[dep["successor"]].append({
                "task": dep["predecessor"],
                "lag": dep.get("lag_days") or 0
            })
            successors[dep["predecessor"]].append({
                "task": dep["successor"],
                "lag": dep.get("lag_days") or 0
            })

    # Calcular duracion de cada tarea
    for name, task in task_dict.items():
        if task.get("start_date") and task.get("due_date"):
            task["duration"] = date_diff(task["due_date"], task["start_date"]) + 1
        else:
            task["duration"] = 1

    # Forward pass - calcular Early Start (ES) y Early Finish (EF)
    for name in task_dict:
        task_dict[name]["es"] = 0
        task_dict[name]["ef"] = task_dict[name]["duration"]

    # Ordenamiento topologico
    sorted_tasks = topological_sort(task_dict, predecessors)

    for name in sorted_tasks:
        task = task_dict[name]
        preds = predecessors.get(name, [])

        if preds:
            task["es"] = max(task_dict[p["task"]]["ef"] + p["lag"] for p in preds)
            task["ef"] = task["es"] + task["duration"]

    # Backward pass - calcular Late Start (LS) y Late Finish (LF)
    project_end = max(t["ef"] for t in task_dict.values())

    for name in task_dict:
        task_dict[name]["lf"] = project_end
        task_dict[name]["ls"] = project_end - task_dict[name]["duration"]

    for name in reversed(sorted_tasks):
        task = task_dict[name]
        succs = successors.get(name, [])

        if succs:
            task["lf"] = min(task_dict[s["task"]]["ls"] - s["lag"] for s in succs)
            task["ls"] = task["lf"] - task["duration"]

    # Calcular slack y determinar ruta critica
    critical_path = []
    slack_times = {}

    for name, task in task_dict.items():
        slack = task["ls"] - task["es"]
        slack_times[name] = slack

        if slack == 0:
            critical_path.append(name)

            # Marcar dependencia como critica
            for dep in deps:
                if dep["predecessor"] == name and dep["successor"] in critical_path:
                    frappe.db.set_value("WH Task Dependency",
                        {"predecessor": name, "successor": dep["successor"]},
                        "is_critical", 1)

    # Guardar en proyecto
    frappe.db.set_value("WH Project", project_id, {
        "critical_path": json.dumps(critical_path),
        "slack_days": min(slack_times.values()) if slack_times else 0
    })

    return {
        "critical_path": critical_path,
        "slack_times": slack_times,
        "project_duration": project_end
    }


def topological_sort(task_dict, predecessors):
    """Ordenar tareas topologicamente"""
    in_degree = {name: 0 for name in task_dict}

    for name in task_dict:
        for pred in predecessors.get(name, []):
            if pred["task"] in task_dict:
                in_degree[name] += 1

    # Cola con tareas sin predecesores
    queue = [name for name, degree in in_degree.items() if degree == 0]
    sorted_list = []

    while queue:
        current = queue.pop(0)
        sorted_list.append(current)

        # Encontrar sucesores
        for name in task_dict:
            for pred in predecessors.get(name, []):
                if pred["task"] == current:
                    in_degree[name] -= 1
                    if in_degree[name] == 0:
                        queue.append(name)

    return sorted_list


@frappe.whitelist()
def get_slack_times(project_id):
    """Obtener tiempos de holgura por tarea"""
    require_auth()

    result = get_critical_path(project_id)
    return result.get("slack_times", {})


@frappe.whitelist()
def auto_schedule(project_id):
    """Auto-programar tareas basado en dependencias"""
    require_auth()

    project = frappe.get_doc("WH Project", project_id)
    start_date = project.start_date or getdate(nowdate())

    # Obtener tareas sin fecha
    tasks = frappe.get_all("WH Task",
        filters={"project": project_id},
        fields=["name", "start_date", "due_date", "estimated_hours"])

    task_dict = {t["name"]: t for t in tasks}

    # Obtener dependencias
    deps = frappe.get_all("WH Task Dependency",
        filters={"is_active": 1},
        fields=["predecessor", "successor", "lag_days"])

    predecessors = defaultdict(list)
    for dep in deps:
        if dep["predecessor"] in task_dict and dep["successor"] in task_dict:
            predecessors[dep["successor"]].append({
                "task": dep["predecessor"],
                "lag": dep.get("lag_days") or 0
            })

    # Ordenar topologicamente
    sorted_tasks = topological_sort(task_dict, predecessors)

    # Asignar fechas
    for name in sorted_tasks:
        task = task_dict[name]
        preds = predecessors.get(name, [])

        # Duracion estimada (default 1 dia)
        duration = 1
        if task.get("estimated_hours"):
            duration = max(1, int(task["estimated_hours"] / 8))

        if preds:
            # Empezar despues del ultimo predecesor
            max_end = start_date
            for pred in preds:
                pred_task = task_dict[pred["task"]]
                if pred_task.get("due_date"):
                    pred_end = add_days(getdate(pred_task["due_date"]), pred["lag"] + 1)
                    if pred_end > max_end:
                        max_end = pred_end

            new_start = max_end
        else:
            # Sin predecesores: empezar en fecha de inicio del proyecto
            new_start = start_date

        new_end = add_days(new_start, duration - 1)

        # Actualizar en DB
        frappe.db.set_value("WH Task", name, {
            "start_date": new_start,
            "due_date": new_end
        })

        # Actualizar dict local para siguientes calculos
        task_dict[name]["start_date"] = new_start
        task_dict[name]["due_date"] = new_end

    # Recalcular ruta critica
    get_critical_path(project_id)

    return {
        "success": True,
        "scheduled_count": len(sorted_tasks),
        "project_start": str(start_date)
    }


@frappe.whitelist()
def add_dependency(predecessor_id, successor_id, dep_type="FS", lag_days=0):
    """Agregar dependencia entre tareas"""
    require_auth()

    # Verificar que no exista
    existing = frappe.db.exists("WH Task Dependency", {
        "predecessor": predecessor_id,
        "successor": successor_id,
        "is_active": 1
    })

    if existing:
        return {"success": False, "message": "Dependencia ya existe"}

    # Verificar que no cree ciclo
    if would_create_cycle(predecessor_id, successor_id):
        return {"success": False, "message": "Esto crearia un ciclo de dependencias"}

    # Check user has permission to create dependencies
    require_permission("WH Task Dependency", "create")

    doc = frappe.new_doc("WH Task Dependency")
    doc.predecessor = predecessor_id
    doc.successor = successor_id
    doc.type = dep_type
    doc.lag_days = lag_days
    doc.is_active = 1
    doc.insert()

    # Propagar fechas
    propagate_dates(predecessor_id)

    return {"success": True, "dependency": doc.name}


def would_create_cycle(predecessor_id, successor_id):
    """Verificar si agregar esta dependencia crearia un ciclo"""
    visited = set()

    def dfs(task_id):
        if task_id == predecessor_id:
            return True
        if task_id in visited:
            return False

        visited.add(task_id)

        # Obtener sucesores
        succs = frappe.get_all("WH Task Dependency",
            filters={"predecessor": task_id, "is_active": 1},
            fields=["successor"])

        for succ in succs:
            if dfs(succ["successor"]):
                return True

        return False

    return dfs(successor_id)


@frappe.whitelist()
def remove_dependency(dependency_id):
    """Eliminar dependencia"""
    require_auth()

    frappe.db.set_value("WH Task Dependency", dependency_id, "is_active", 0)
    return {"success": True}


@frappe.whitelist()
def get_milestones(project_id):
    """Obtener hitos del proyecto"""
    require_auth()

    milestones = frappe.get_all("WH Task",
        filters={"project": project_id, "is_milestone": 1},
        fields=["name", "title", "due_date", "status", "assigned_to"],
        order_by="due_date asc")

    for m in milestones:
        # Add assignees
        m["assignees"] = _enrich_task_assignees(m)

        # Keep assigned_name for backward compatibility
        if m.get("assigned_to"):
            m["assigned_name"] = frappe.db.get_value("User", m["assigned_to"], "full_name")

        if m.get("due_date"):
            m["days_remaining"] = date_diff(m["due_date"], nowdate())
            m["is_overdue"] = m["days_remaining"] < 0 and m["status"] != "DONE"

    return milestones
