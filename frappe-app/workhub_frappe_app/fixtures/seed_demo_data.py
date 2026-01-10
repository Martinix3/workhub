"""
Seed Demo Data para WorkHub Task Management

Ejecutar desde bench:
    bench --site <site> execute workhub_frappe_app.fixtures.seed_demo_data.create_demo_data

Para limpiar:
    bench --site <site> execute workhub_frappe_app.fixtures.seed_demo_data.clear_demo_data
"""

import frappe
from frappe.utils import add_days, today, getdate
from datetime import datetime


def get_demo_users():
    """Obtiene usuarios para asignar tareas. Si no hay suficientes, usa Administrator."""
    users = frappe.get_all(
        "User",
        filters={"enabled": 1, "name": ["not in", ["Guest", "Administrator"]]},
        pluck="name",
        limit=5
    )

    # Fallback si no hay usuarios
    if not users:
        users = ["Administrator"]

    return users


def create_demo_data():
    """Crea datos de demo: proyectos, tareas y dependencias."""

    # Limpiar datos existentes primero
    clear_demo_data()

    users = get_demo_users()
    today_date = getdate(today())

    # ==========================
    # PROYECTO 1: En progreso, saludable (GREEN)
    # ==========================
    project1 = frappe.get_doc({
        "doctype": "WH Project",
        "title": "Onboarding Cliente Distribuidora Norte",
        "description": "Incorporacion del nuevo distribuidor en zona norte. Cliente clave para expansion regional.",
        "department": "SALES",
        "owner_user": users[0] if users else "Administrator",
        "start_date": add_days(today_date, -7),
        "target_date": add_days(today_date, 14),
        "status": "ACTIVE",
        "health": "GREEN",
        "health_reason": ""
    })
    project1.insert()

    # Tareas del proyecto 1
    tasks_p1 = [
        {
            "title": "Reunion kick-off con gerente",
            "description": "Primera reunion para establecer expectativas y conocer necesidades",
            "status": "DONE",
            "priority": "P1",
            "start_date": add_days(today_date, -7),
            "due_date": add_days(today_date, -6),
            "is_milestone": 1
        },
        {
            "title": "Recopilar documentacion legal",
            "description": "RFC, constancia fiscal, acta constitutiva",
            "status": "DONE",
            "priority": "P1",
            "start_date": add_days(today_date, -5),
            "due_date": add_days(today_date, -3),
        },
        {
            "title": "Configurar cuenta en ERP",
            "description": "Alta como cliente, condiciones de pago NET30, descuento 5%",
            "status": "DOING",
            "priority": "P0",
            "start_date": add_days(today_date, -2),
            "due_date": today_date,
        },
        {
            "title": "Capacitacion sobre catalogo",
            "description": "Presentar productos, precios y promociones actuales",
            "status": "NEXT",
            "priority": "P1",
            "start_date": add_days(today_date, 1),
            "due_date": add_days(today_date, 3),
        },
        {
            "title": "Primer pedido de prueba",
            "description": "Acompanar en el primer pedido para validar proceso",
            "status": "BACKLOG",
            "priority": "P1",
            "start_date": add_days(today_date, 4),
            "due_date": add_days(today_date, 6),
            "is_milestone": 1
        },
        {
            "title": "Seguimiento post-entrega",
            "description": "Verificar satisfaccion con entrega inicial",
            "status": "BACKLOG",
            "priority": "P2",
            "start_date": add_days(today_date, 8),
            "due_date": add_days(today_date, 10),
        },
        {
            "title": "Cierre de onboarding",
            "description": "Reunion de cierre y feedback",
            "status": "BACKLOG",
            "priority": "P2",
            "start_date": add_days(today_date, 12),
            "due_date": add_days(today_date, 14),
            "is_milestone": 1
        },
    ]

    p1_task_docs = []
    for i, task_data in enumerate(tasks_p1):
        task = frappe.get_doc({
            "doctype": "WH Task",
            "project": project1.name,
            "assigned_to": users[i % len(users)],
            "created_by": users[0],
            "department": "SALES",
            **task_data
        })
        task.insert()
        p1_task_docs.append(task)

    # Dependencias proyecto 1 (secuenciales)
    for i in range(len(p1_task_docs) - 1):
        dep = frappe.get_doc({
            "doctype": "WH Task Dependency",
            "predecessor": p1_task_docs[i].name,
            "successor": p1_task_docs[i + 1].name,
            "dependency_type": "FS",
            "lag_days": 0,
            "is_active": 1
        })
        dep.insert()

    # ==========================
    # PROYECTO 2: Con riesgo (YELLOW) - algunas tareas vencidas
    # ==========================
    project2 = frappe.get_doc({
        "doctype": "WH Project",
        "title": "Campana Black Friday 2024",
        "description": "Campana de marketing digital para Black Friday. Incluye email, redes y ads.",
        "department": "MKT",
        "owner_user": users[1 % len(users)],
        "start_date": add_days(today_date, -14),
        "target_date": add_days(today_date, 7),
        "status": "ACTIVE",
        "health": "YELLOW",
        "health_reason": "2 tareas vencidas, 1 bloqueada"
    })
    project2.insert()

    tasks_p2 = [
        {
            "title": "Definir objetivos y KPIs",
            "description": "Meta: 20% incremento ventas vs ano anterior",
            "status": "DONE",
            "priority": "P1",
            "start_date": add_days(today_date, -14),
            "due_date": add_days(today_date, -12),
            "is_milestone": 1
        },
        {
            "title": "Crear calendario de contenidos",
            "description": "Posts diarios del 20-30 Nov",
            "status": "DONE",
            "priority": "P1",
            "start_date": add_days(today_date, -11),
            "due_date": add_days(today_date, -8),
        },
        {
            "title": "Disenar creativos para redes",
            "description": "10 piezas para Instagram/Facebook",
            "status": "DOING",
            "priority": "P0",
            "start_date": add_days(today_date, -7),
            "due_date": add_days(today_date, -2),  # VENCIDA
        },
        {
            "title": "Configurar campana en Meta Ads",
            "description": "Audiencias, presupuesto, segmentacion",
            "status": "BLOCKED",
            "priority": "P0",
            "start_date": add_days(today_date, -1),
            "due_date": add_days(today_date, 1),
            "blocked_reason": "Esperando creativos del disenador"
        },
        {
            "title": "Redactar copys para emails",
            "description": "3 emails: teaser, lanzamiento, last chance",
            "status": "DOING",
            "priority": "P1",
            "start_date": add_days(today_date, -5),
            "due_date": add_days(today_date, -1),  # VENCIDA
        },
        {
            "title": "Lanzamiento de campana",
            "description": "Activar todos los canales",
            "status": "BACKLOG",
            "priority": "P0",
            "start_date": add_days(today_date, 2),
            "due_date": add_days(today_date, 2),
            "is_milestone": 1
        },
        {
            "title": "Monitoreo y optimizacion",
            "description": "Ajustar bids y creativos segun performance",
            "status": "BACKLOG",
            "priority": "P1",
            "start_date": add_days(today_date, 3),
            "due_date": add_days(today_date, 7),
        },
    ]

    p2_task_docs = []
    for i, task_data in enumerate(tasks_p2):
        task = frappe.get_doc({
            "doctype": "WH Task",
            "project": project2.name,
            "assigned_to": users[(i + 1) % len(users)],
            "created_by": users[1 % len(users)],
            "department": "MKT",
            **task_data
        })
        task.insert()
        p2_task_docs.append(task)

    # Dependencias proyecto 2
    deps_p2 = [
        (0, 1), (1, 2), (2, 3), (1, 4), (3, 5), (4, 5), (5, 6)
    ]
    for pred_idx, succ_idx in deps_p2:
        dep = frappe.get_doc({
            "doctype": "WH Task Dependency",
            "predecessor": p2_task_docs[pred_idx].name,
            "successor": p2_task_docs[succ_idx].name,
            "dependency_type": "FS",
            "lag_days": 0,
            "is_active": 1
        })
        dep.insert()

    # ==========================
    # PROYECTO 3: Critico (RED) - muy retrasado
    # ==========================
    project3 = frappe.get_doc({
        "doctype": "WH Project",
        "title": "Integracion Sistema Logistica",
        "description": "Conectar ERP con sistema del transportista para tracking automatico.",
        "department": "OPS",
        "owner_user": users[2 % len(users)],
        "start_date": add_days(today_date, -30),
        "target_date": add_days(today_date, -5),  # YA VENCIDO
        "status": "ACTIVE",
        "health": "RED",
        "health_reason": "Proyecto vencido, 3 tareas bloqueadas, sin avance en 1 semana"
    })
    project3.insert()

    tasks_p3 = [
        {
            "title": "Documentar requerimientos tecnicos",
            "description": "APIs disponibles, formatos de datos, autenticacion",
            "status": "DONE",
            "priority": "P1",
            "start_date": add_days(today_date, -30),
            "due_date": add_days(today_date, -25),
        },
        {
            "title": "Desarrollar conector API",
            "description": "Modulo Python para comunicacion con transportista",
            "status": "DONE",
            "priority": "P0",
            "start_date": add_days(today_date, -24),
            "due_date": add_days(today_date, -17),
        },
        {
            "title": "Pruebas en ambiente staging",
            "description": "Validar flujo completo con datos de prueba",
            "status": "BLOCKED",
            "priority": "P0",
            "start_date": add_days(today_date, -16),
            "due_date": add_days(today_date, -10),
            "blocked_reason": "Ambiente de staging caido - ticket IT #4521"
        },
        {
            "title": "Corregir errores encontrados",
            "description": "Bugs de parsing en respuestas XML",
            "status": "BLOCKED",
            "priority": "P0",
            "start_date": add_days(today_date, -9),
            "due_date": add_days(today_date, -7),
            "blocked_reason": "Depende de pruebas en staging"
        },
        {
            "title": "Deploy a produccion",
            "description": "Puesta en marcha del sistema",
            "status": "BLOCKED",
            "priority": "P0",
            "start_date": add_days(today_date, -6),
            "due_date": add_days(today_date, -5),
            "blocked_reason": "Depende de correccion de errores",
            "is_milestone": 1
        },
    ]

    p3_task_docs = []
    for i, task_data in enumerate(tasks_p3):
        task = frappe.get_doc({
            "doctype": "WH Task",
            "project": project3.name,
            "assigned_to": users[(i + 2) % len(users)],
            "created_by": users[2 % len(users)],
            "department": "OPS",
            **task_data
        })
        task.insert()
        p3_task_docs.append(task)

    # Dependencias proyecto 3
    for i in range(len(p3_task_docs) - 1):
        dep = frappe.get_doc({
            "doctype": "WH Task Dependency",
            "predecessor": p3_task_docs[i].name,
            "successor": p3_task_docs[i + 1].name,
            "dependency_type": "FS",
            "lag_days": 0,
            "is_active": 1
        })
        dep.insert()

    # ==========================
    # PROYECTO 4: Completado exitosamente
    # ==========================
    project4 = frappe.get_doc({
        "doctype": "WH Project",
        "title": "Lanzamiento Linea Eco-Friendly",
        "description": "Introduccion de nueva linea de productos sustentables.",
        "department": "SALES",
        "owner_user": users[0],
        "start_date": add_days(today_date, -45),
        "target_date": add_days(today_date, -15),
        "actual_end_date": add_days(today_date, -14),  # Terminado 1 dia antes
        "status": "COMPLETED",
        "health": "GREEN",
        "health_reason": ""
    })
    project4.insert()

    tasks_p4 = [
        {
            "title": "Estudio de mercado",
            "status": "DONE",
            "priority": "P1",
            "start_date": add_days(today_date, -45),
            "due_date": add_days(today_date, -38),
        },
        {
            "title": "Negociar con proveedores",
            "status": "DONE",
            "priority": "P0",
            "start_date": add_days(today_date, -37),
            "due_date": add_days(today_date, -30),
        },
        {
            "title": "Definir precios y margenes",
            "status": "DONE",
            "priority": "P1",
            "start_date": add_days(today_date, -29),
            "due_date": add_days(today_date, -25),
            "is_milestone": 1
        },
        {
            "title": "Crear materiales de venta",
            "status": "DONE",
            "priority": "P1",
            "start_date": add_days(today_date, -24),
            "due_date": add_days(today_date, -18),
        },
        {
            "title": "Lanzamiento a equipo interno",
            "status": "DONE",
            "priority": "P0",
            "start_date": add_days(today_date, -17),
            "due_date": add_days(today_date, -15),
            "is_milestone": 1
        },
    ]

    for i, task_data in enumerate(tasks_p4):
        task = frappe.get_doc({
            "doctype": "WH Task",
            "project": project4.name,
            "assigned_to": users[i % len(users)],
            "created_by": users[0],
            "department": "SALES",
            "description": "",
            **task_data
        })
        task.insert()

    # ==========================
    # TAREAS SUELTAS (Inbox) - sin proyecto
    # ==========================
    inbox_tasks = [
        {
            "title": "Llamar a cliente Ferreteria Lopez",
            "description": "Seguimiento de cotizacion enviada hace 5 dias",
            "status": "NEXT",
            "priority": "P1",
            "department": "SALES",
            "due_date": today_date,
            "is_inbox": 1
        },
        {
            "title": "Revisar facturas pendientes",
            "description": "3 facturas por vencer esta semana",
            "status": "DOING",
            "priority": "P0",
            "department": "OPS",
            "due_date": add_days(today_date, 2),
            "is_inbox": 1
        },
        {
            "title": "Preparar reporte mensual",
            "description": "KPIs de ventas para junta directiva",
            "status": "BACKLOG",
            "priority": "P2",
            "department": "SALES",
            "due_date": add_days(today_date, 5),
            "is_inbox": 1
        },
        {
            "title": "Actualizar precios en web",
            "description": "Nuevos precios vigentes desde 1 de mes",
            "status": "NEXT",
            "priority": "P1",
            "department": "MKT",
            "due_date": add_days(today_date, 1),
            "is_inbox": 1
        },
        {
            "title": "Contestar email de proveedor",
            "description": "Responder sobre disponibilidad de stock",
            "status": "DOING",
            "priority": "P2",
            "department": "OPS",
            "due_date": today_date,
            "is_inbox": 1
        },
    ]

    for i, task_data in enumerate(inbox_tasks):
        task = frappe.get_doc({
            "doctype": "WH Task",
            "assigned_to": users[i % len(users)],
            "created_by": users[0],
            **task_data
        })
        task.insert()

    frappe.db.commit()

    print(f"Demo data creado exitosamente:")
    print(f"  - 4 proyectos")
    print(f"  - {len(tasks_p1) + len(tasks_p2) + len(tasks_p3) + len(tasks_p4) + len(inbox_tasks)} tareas")
    print(f"  - Dependencias configuradas")


def clear_demo_data():
    """Elimina todos los datos de WH Project, WH Task y dependencias."""

    # Eliminar dependencias primero (FK)
    frappe.db.delete("WH Task Dependency")

    # Eliminar work logs
    frappe.db.delete("WH Task Work Log")

    # Eliminar tareas
    frappe.db.delete("WH Task")

    # Eliminar proyectos
    frappe.db.delete("WH Project")

    frappe.db.commit()
    print("Demo data eliminado")


if __name__ == "__main__":
    create_demo_data()
