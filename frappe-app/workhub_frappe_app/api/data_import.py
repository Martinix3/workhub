"""
WorkHub Data Import - Importador de datos desde CSV

Uso desde bench:
    bench --site workhub.localhost execute workhub_frappe_app.api.data_import.import_all

O importar individualmente:
    bench --site workhub.localhost execute workhub_frappe_app.api.data_import.import_customers --kwargs '{"csv_path": "/path/to/clientes.csv"}'
"""

import frappe
from frappe import _
from frappe.utils import today, flt
import csv
import os
from pathlib import Path


# ============================================================
# IMPORTADORES INDIVIDUALES
# ============================================================

def import_customers(csv_path: str = None, dry_run: bool = False) -> dict:
    """
    Importar clientes desde CSV

    SECURITY: This is a data import utility that uses ignore_permissions=True. Safe because:
    1. Not exposed as API endpoint - only runs via `bench execute` as Administrator
    2. Used for initial data setup and bulk import operations
    3. Requires server shell access to execute
    """
    if not csv_path:
        csv_path = _find_csv("01_clientes.csv")

    if not csv_path or not os.path.exists(csv_path):
        return {"error": f"Archivo no encontrado: {csv_path}"}

    results = {"created": 0, "updated": 0, "errors": [], "skipped": 0}

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for i, row in enumerate(reader, start=2):
            try:
                nombre = row.get('nombre', '').strip()
                if not nombre:
                    results["skipped"] += 1
                    continue

                # Determinar grupo
                tipo = row.get('tipo', 'directo').lower().strip()
                customer_group = "Distribuidor" if tipo == "distribuidor" else "All Customer Groups"

                # Verificar si existe
                existing = frappe.db.exists("Customer", {"customer_name": nombre})

                customer_data = {
                    "doctype": "Customer",
                    "customer_name": nombre,
                    "customer_group": customer_group,
                    "territory": row.get('zona', '').strip() or "All Territories",
                    "email_id": row.get('email', '').strip() or None,
                    "mobile_no": row.get('telefono', '').strip() or None,
                }

                # Campo custom para distribuidor asignado
                dist_asignado = row.get('distribuidor_asignado', '').strip()
                if dist_asignado:
                    customer_data["assigned_distributor"] = dist_asignado

                if dry_run:
                    print(f"  [DRY] {'UPDATE' if existing else 'CREATE'}: {nombre}")
                    continue

                if existing:
                    doc = frappe.get_doc("Customer", existing)
                    doc.update(customer_data)
                    # SECURITY: Safe - runs as Administrator via bench execute
                    doc.save(ignore_permissions=True)
                    results["updated"] += 1
                else:
                    doc = frappe.get_doc(customer_data)
                    # SECURITY: Safe - runs as Administrator via bench execute
                    doc.insert(ignore_permissions=True)
                    results["created"] += 1

            except Exception as e:
                results["errors"].append(f"Fila {i}: {str(e)}")

    frappe.db.commit()
    return results


def import_distributors(csv_path: str = None, dry_run: bool = False) -> dict:
    """
    Importar distribuidores desde CSV

    SECURITY: This is a data import utility that uses ignore_permissions=True. Safe because:
    1. Not exposed as API endpoint - only runs via `bench execute` as Administrator
    2. Used for initial data setup and bulk import operations
    3. Requires server shell access to execute
    """
    if not csv_path:
        csv_path = _find_csv("02_distribuidores.csv")

    if not csv_path or not os.path.exists(csv_path):
        return {"error": f"Archivo no encontrado: {csv_path}"}

    results = {"created": 0, "updated": 0, "errors": [], "skipped": 0}

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for i, row in enumerate(reader, start=2):
            try:
                codigo = row.get('codigo', '').strip()
                nombre = row.get('nombre', '').strip()

                if not nombre:
                    results["skipped"] += 1
                    continue

                # Usar codigo como name si existe, sino usar nombre
                customer_name = codigo if codigo else nombre

                existing = frappe.db.exists("Customer", customer_name)

                customer_data = {
                    "doctype": "Customer",
                    "customer_name": nombre,
                    "customer_group": "Distribuidor",
                    "territory": row.get('territorio', '').strip() or "All Territories",
                    "email_id": row.get('email', '').strip() or None,
                    "mobile_no": row.get('telefono', '').strip() or None,
                }

                if dry_run:
                    print(f"  [DRY] {'UPDATE' if existing else 'CREATE'}: {nombre}")
                    continue

                if existing:
                    doc = frappe.get_doc("Customer", existing)
                    doc.update(customer_data)
                    # SECURITY: Safe - runs as Administrator via bench execute
                    doc.save(ignore_permissions=True)
                    results["updated"] += 1
                else:
                    # Crear con nombre específico si tiene codigo
                    if codigo:
                        customer_data["name"] = codigo
                    doc = frappe.get_doc(customer_data)
                    # SECURITY: Safe - runs as Administrator via bench execute
                    doc.insert(ignore_permissions=True)
                    results["created"] += 1

            except Exception as e:
                results["errors"].append(f"Fila {i}: {str(e)}")

    frappe.db.commit()
    return results


def import_products(csv_path: str = None, dry_run: bool = False) -> dict:
    """
    Importar productos desde CSV

    SECURITY: This is a data import utility that uses ignore_permissions=True. Safe because:
    1. Not exposed as API endpoint - only runs via `bench execute` as Administrator
    2. Used for initial data setup and bulk import operations
    3. Requires server shell access to execute
    """
    if not csv_path:
        csv_path = _find_csv("03_productos.csv")

    if not csv_path or not os.path.exists(csv_path):
        return {"error": f"Archivo no encontrado: {csv_path}"}

    results = {"created": 0, "updated": 0, "errors": [], "skipped": 0}

    # Mapeo de unidades comunes
    uom_map = {
        "botella": "Nos",
        "caja": "Box",
        "litro": "Litre",
        "unidad": "Nos",
        "pieza": "Nos",
        "kg": "Kg",
    }

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for i, row in enumerate(reader, start=2):
            try:
                codigo = row.get('codigo', '').strip()
                nombre = row.get('nombre', '').strip()

                if not codigo or not nombre:
                    results["skipped"] += 1
                    continue

                # Mapear UOM
                unidad_raw = row.get('unidad', 'Nos').lower().strip()
                stock_uom = uom_map.get(unidad_raw, "Nos")

                # Verificar que UOM existe
                if not frappe.db.exists("UOM", stock_uom):
                    stock_uom = "Nos"

                existing = frappe.db.exists("Item", codigo)

                item_data = {
                    "doctype": "Item",
                    "item_code": codigo,
                    "item_name": nombre,
                    "item_group": row.get('grupo', '').strip() or "All Item Groups",
                    "stock_uom": stock_uom,
                    "standard_rate": flt(row.get('precio_unitario', 0)),
                    "is_sales_item": 1 if row.get('es_item_venta', 'si').lower() == 'si' else 0,
                    "is_stock_item": 1,
                    "has_batch_no": 1 if row.get('tiene_lote', 'no').lower() == 'si' else 0,
                }

                if item_data["has_batch_no"]:
                    item_data["create_new_batch"] = 1
                    item_data["batch_number_series"] = "BATCH-.#####"

                if dry_run:
                    print(f"  [DRY] {'UPDATE' if existing else 'CREATE'}: {codigo} - {nombre}")
                    continue

                if existing:
                    doc = frappe.get_doc("Item", codigo)
                    doc.update(item_data)
                    # SECURITY: Safe - runs as Administrator via bench execute
                    doc.save(ignore_permissions=True)
                    results["updated"] += 1
                else:
                    doc = frappe.get_doc(item_data)
                    # SECURITY: Safe - runs as Administrator via bench execute
                    doc.insert(ignore_permissions=True)
                    results["created"] += 1

            except Exception as e:
                results["errors"].append(f"Fila {i}: {str(e)}")

    frappe.db.commit()
    return results


def import_sales(csv_path: str = None, dry_run: bool = False) -> dict:
    """
    Importar ventas desde CSV (Sell In y Sell Out)

    SECURITY: This is a data import utility that uses ignore_permissions=True. Safe because:
    1. Not exposed as API endpoint - only runs via `bench execute` as Administrator
    2. Used for initial data setup and bulk import operations
    3. Requires server shell access to execute
    """
    if not csv_path:
        csv_path = _find_csv("04_ventas.csv")

    if not csv_path or not os.path.exists(csv_path):
        return {"error": f"Archivo no encontrado: {csv_path}"}

    results = {"sell_in_created": 0, "sell_out_created": 0, "errors": [], "skipped": 0}

    # Agrupar ventas por cliente y fecha para crear un pedido con múltiples items
    sell_in_orders = {}  # key: (fecha, cliente) -> items[]
    sell_out_orders = {}  # key: (fecha, cliente, distribuidor) -> items[]

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for i, row in enumerate(reader, start=2):
            try:
                tipo = row.get('tipo', '').lower().strip()
                fecha = row.get('fecha', today()).strip()
                cliente = row.get('cliente', '').strip()
                producto = row.get('producto', '').strip()
                cantidad = flt(row.get('cantidad', 0))
                precio = flt(row.get('precio_unitario', 0))
                distribuidor = row.get('distribuidor', '').strip()

                if not cliente or not producto or cantidad <= 0:
                    results["skipped"] += 1
                    continue

                item = {
                    "item_code": producto,
                    "qty": cantidad,
                    "rate": precio,
                }

                if tipo == "sell_in":
                    key = (fecha, cliente)
                    if key not in sell_in_orders:
                        sell_in_orders[key] = []
                    sell_in_orders[key].append(item)

                elif tipo == "sell_out":
                    if not distribuidor:
                        results["errors"].append(f"Fila {i}: sell_out requiere distribuidor")
                        continue
                    key = (fecha, cliente, distribuidor)
                    if key not in sell_out_orders:
                        sell_out_orders[key] = []
                    sell_out_orders[key].append(item)
                else:
                    results["errors"].append(f"Fila {i}: tipo debe ser 'sell_in' o 'sell_out'")

            except Exception as e:
                results["errors"].append(f"Fila {i}: {str(e)}")

    # Crear Sales Orders (Sell In)
    company = frappe.db.get_single_value("Global Defaults", "default_company") or "Santa Brisa"

    for (fecha, cliente), items in sell_in_orders.items():
        try:
            if dry_run:
                print(f"  [DRY] SELL_IN: {fecha} - {cliente} - {len(items)} items")
                continue

            # Buscar cliente
            customer_name = frappe.db.get_value("Customer", {"customer_name": cliente}, "name")
            if not customer_name:
                customer_name = frappe.db.get_value("Customer", cliente, "name")
            if not customer_name:
                results["errors"].append(f"Cliente no encontrado: {cliente}")
                continue

            doc = frappe.get_doc({
                "doctype": "Sales Order",
                "customer": customer_name,
                "transaction_date": fecha,
                "delivery_date": fecha,
                "company": company,
                "order_type": "Sales",
                "currency": "MXN",
                "selling_price_list": "Standard Selling",
                "items": items,
            })
            # SECURITY: Safe - runs as Administrator via bench execute for bulk imports
            doc.insert(ignore_permissions=True)
            results["sell_in_created"] += 1

        except Exception as e:
            results["errors"].append(f"Error Sell In {fecha}/{cliente}: {str(e)}")

    # Crear Distributor Sell Out Orders
    for (fecha, cliente, distribuidor), items in sell_out_orders.items():
        try:
            if dry_run:
                print(f"  [DRY] SELL_OUT: {fecha} - {cliente} via {distribuidor} - {len(items)} items")
                continue

            # Buscar cliente
            customer_name = frappe.db.get_value("Customer", {"customer_name": cliente}, "name")
            if not customer_name:
                customer_name = frappe.db.get_value("Customer", cliente, "name")
            if not customer_name:
                results["errors"].append(f"Cliente no encontrado: {cliente}")
                continue

            # Buscar distribuidor
            dist_name = frappe.db.get_value("Customer", distribuidor, "name")
            if not dist_name:
                dist_name = frappe.db.get_value("Customer", {"customer_name": distribuidor}, "name")
            if not dist_name:
                results["errors"].append(f"Distribuidor no encontrado: {distribuidor}")
                continue

            doc = frappe.get_doc({
                "doctype": "Distributor Sell Out Order",
                "customer": customer_name,
                "distributor": dist_name,
                "order_date": fecha,
                "expected_delivery_date": fecha,
                "status": "Delivered",  # Historico = ya entregado
                "items": items,
            })
            # SECURITY: Safe - runs as Administrator via bench execute for bulk imports
            doc.insert(ignore_permissions=True)
            results["sell_out_created"] += 1

        except Exception as e:
            results["errors"].append(f"Error Sell Out {fecha}/{cliente}: {str(e)}")

    frappe.db.commit()
    return results


# ============================================================
# IMPORTADOR COMPLETO
# ============================================================

def import_all(data_dir: str = None, dry_run: bool = False) -> dict:
    """
    Importar todos los datos en orden correcto.

    Uso:
        bench --site workhub.localhost execute workhub_frappe_app.api.data_import.import_all

    Con dry_run:
        bench --site workhub.localhost execute workhub_frappe_app.api.data_import.import_all --kwargs '{"dry_run": true}'
    """
    frappe.set_user("Administrator")

    if not data_dir:
        # Buscar directorio data en el monorepo
        data_dir = _find_data_dir()

    print("\n" + "="*50)
    print("  WORKHUB DATA IMPORT")
    print("="*50 + "\n")

    if dry_run:
        print("  [MODO DRY RUN - No se crearán documentos]\n")

    results = {}

    # 1. Distribuidores (primero, porque clientes los referencian)
    print("1/4 Importando distribuidores...")
    results["distribuidores"] = import_distributors(dry_run=dry_run)
    _print_result(results["distribuidores"])

    # 2. Clientes
    print("\n2/4 Importando clientes...")
    results["clientes"] = import_customers(dry_run=dry_run)
    _print_result(results["clientes"])

    # 3. Productos
    print("\n3/4 Importando productos...")
    results["productos"] = import_products(dry_run=dry_run)
    _print_result(results["productos"])

    # 4. Ventas
    print("\n4/4 Importando ventas...")
    results["ventas"] = import_sales(dry_run=dry_run)
    _print_result(results["ventas"])

    print("\n" + "="*50)
    print("  IMPORTACION COMPLETADA")
    print("="*50 + "\n")

    return results


# ============================================================
# UTILIDADES
# ============================================================

def _find_data_dir() -> str:
    """Buscar directorio data/templates en el monorepo"""
    # Intentar varias ubicaciones
    possible_paths = [
        "/Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/data",
        "/Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/data/templates",
        os.path.expanduser("~/vibe-monorepo/apps/workhub/data"),
    ]

    for path in possible_paths:
        if os.path.isdir(path):
            return path

    return possible_paths[0]


def _find_csv(filename: str) -> str:
    """Buscar archivo CSV en ubicaciones conocidas"""
    data_dir = _find_data_dir()

    # Buscar en data/ y data/templates/
    paths = [
        os.path.join(data_dir, filename),
        os.path.join(data_dir, "templates", filename),
    ]

    for path in paths:
        if os.path.exists(path):
            return path

    return paths[0]


def _print_result(result: dict):
    """Imprimir resultado de importación"""
    if "error" in result:
        print(f"  ERROR: {result['error']}")
        return

    created = result.get("created", 0) or result.get("sell_in_created", 0)
    updated = result.get("updated", 0)
    sell_out = result.get("sell_out_created", 0)
    skipped = result.get("skipped", 0)
    errors = result.get("errors", [])

    parts = []
    if created:
        parts.append(f"creados: {created}")
    if updated:
        parts.append(f"actualizados: {updated}")
    if sell_out:
        parts.append(f"sell_out: {sell_out}")
    if skipped:
        parts.append(f"omitidos: {skipped}")

    print(f"  OK - {', '.join(parts) if parts else 'sin cambios'}")

    if errors:
        print(f"  Errores ({len(errors)}):")
        for err in errors[:5]:
            print(f"    - {err}")
        if len(errors) > 5:
            print(f"    ... y {len(errors) - 5} más")
