from __future__ import annotations

import frappe


def _pick_first_name(doctype: str) -> str | None:
	rows = frappe.get_all(doctype, pluck="name", limit=1)  # type: ignore[arg-type]
	if not rows:
		return None
	return str(rows[0] or "").strip() or None


def _ensure_customer(*, customer_name: str = "SB Test Customer") -> str:
	"""
	SECURITY: Bootstrap utility - creates test customer for development setup.
	Not exposed as API endpoint. Called by ensure_erpnext_bootstrap() which runs as Administrator.
	"""
	if frappe.db.exists("Customer", {"customer_name": customer_name}):
		name = frappe.db.get_value("Customer", {"customer_name": customer_name}, "name")
		return str(name or customer_name)

	customer_group = "All Customer Groups" if frappe.db.exists("Customer Group", "All Customer Groups") else _pick_first_name("Customer Group")
	territory = "All Territories" if frappe.db.exists("Territory", "All Territories") else _pick_first_name("Territory")
	if not customer_group:
		raise RuntimeError("No se pudo determinar Customer Group (fixtures incompletas)")
	if not territory:
		raise RuntimeError("No se pudo determinar Territory (fixtures incompletas)")

	doc = frappe.get_doc(
		{
			"doctype": "Customer",
			"customer_name": customer_name,
			"customer_group": customer_group,
			"territory": territory,
			"customer_type": "Company",
		}
	)
	doc.insert(ignore_permissions=True)  # SECURITY: Safe - bootstrap utility running as Administrator
	return str(doc.name)


def _ensure_supplier(*, supplier_name: str = "SB Test Supplier") -> str:
	"""
	SECURITY: Bootstrap utility - creates test supplier for development setup.
	Not exposed as API endpoint. Called by ensure_erpnext_bootstrap() which runs as Administrator.
	"""
	if frappe.db.exists("Supplier", {"supplier_name": supplier_name}):
		name = frappe.db.get_value("Supplier", {"supplier_name": supplier_name}, "name")
		return str(name or supplier_name)

	supplier_group = "All Supplier Groups" if frappe.db.exists("Supplier Group", "All Supplier Groups") else _pick_first_name("Supplier Group")
	if not supplier_group:
		raise RuntimeError("No se pudo determinar Supplier Group (fixtures incompletas)")

	doc = frappe.get_doc(
		{
			"doctype": "Supplier",
			"supplier_name": supplier_name,
			"supplier_group": supplier_group,
			"supplier_type": "Company",
		}
	)
	doc.insert(ignore_permissions=True)  # SECURITY: Safe - bootstrap utility running as Administrator
	return str(doc.name)


def _ensure_item(*, item_code: str = "SB-TEST-ITEM", item_name: str = "SB Test Item") -> str:
	"""
	SECURITY: Bootstrap utility - creates test items for development setup.
	Not exposed as API endpoint. Called by ensure_erpnext_bootstrap() which runs as Administrator.
	"""
	if frappe.db.exists("Item", item_code):
		if item_code == "SB-TEST-ITEM":
			# Enable batch tracking (required to create Batch in Production flow).
			try:
				frappe.db.set_value(
					"Item",
					item_code,
					{
						"has_batch_no": 1,
						"create_new_batch": 1,
						"batch_number_series": "BATCH-.#####",
					},
				)
			except Exception:
				pass
		return item_code

	item_group = "All Item Groups" if frappe.db.exists("Item Group", "All Item Groups") else _pick_first_name("Item Group")
	if not item_group:
		raise RuntimeError("No se pudo determinar Item Group (fixtures incompletas)")

	uom = "Nos" if frappe.db.exists("UOM", "Nos") else _pick_first_name("UOM")
	if not uom:
		raise RuntimeError("No se pudo determinar UOM (fixtures incompletas)")

	doc = frappe.get_doc(
		{
			"doctype": "Item",
			"item_code": item_code,
			"item_name": item_name,
			"item_group": item_group,
			"stock_uom": uom,
			"is_stock_item": 1,
			"is_sales_item": 1,
			"is_purchase_item": 1,
			"has_batch_no": 1 if item_code == "SB-TEST-ITEM" else 0,
			"create_new_batch": 1 if item_code == "SB-TEST-ITEM" else 0,
			"batch_number_series": "BATCH-.#####" if item_code == "SB-TEST-ITEM" else None,
		}
	)
	doc.insert(ignore_permissions=True)  # SECURITY: Safe - bootstrap utility running as Administrator
	return str(doc.name)

def _ensure_bom(*, company: str, production_item: str, raw_item: str) -> str:
	"""
	SECURITY: Bootstrap utility - creates test BOM for development setup.
	Not exposed as API endpoint. Called by ensure_erpnext_bootstrap() which runs as Administrator.
	"""
	if not company:
		raise RuntimeError("No se pudo determinar company para BOM seed")
	if not production_item or not raw_item:
		raise RuntimeError("production_item/raw_item inválidos para BOM seed")

	# Reusar BOM activa si existe.
	existing = frappe.db.get_value("BOM", {"item": production_item, "is_active": 1}, "name")
	if isinstance(existing, str) and existing.strip():
		return existing.strip()

	uom = str(frappe.db.get_value("Item", production_item, "stock_uom") or "").strip() or "Nos"
	raw_uom = str(frappe.db.get_value("Item", raw_item, "stock_uom") or "").strip() or uom

	doc = frappe.get_doc(
		{
			"doctype": "BOM",
			"item": production_item,
			"company": company,
			"quantity": 1,
			"uom": uom,
			"is_active": 1,
			"is_default": 1,
			"bom_type": "Manufacture",
			"items": [
				{
					"item_code": raw_item,
					"qty": 1,
					"uom": raw_uom,
					"rate": 1.0,
				}
			],
		}
	)
	doc.insert(ignore_permissions=True)  # SECURITY: Safe - bootstrap utility running as Administrator
	doc.submit()
	return str(doc.name)


def _pick_warehouse(*, company: str, keywords: list[str]) -> str | None:
	if not company:
		return None
	rows = frappe.get_all(  # type: ignore[arg-type]
		"Warehouse",
		filters={"company": company},
		pluck="name",
		limit=200,
	)
	names = [str(x or "").strip() for x in rows if str(x or "").strip()]
	for kw in keywords:
		k = kw.lower()
		for name in names:
			if k in name.lower():
				return name
	return names[0] if names else None


def _ensure_company_warehouse_defaults(*, company_name: str) -> dict[str, str | None]:
	"""
	SECURITY: Bootstrap utility - sets default warehouses for company development setup.
	Not exposed as API endpoint. Called by ensure_erpnext_bootstrap() which runs as Administrator.
	"""
	if not company_name:
		raise RuntimeError("company_name vacío")
	if not frappe.db.exists("Company", company_name):
		raise RuntimeError(f"Company no existe: {company_name}")

	company = frappe.get_doc("Company", company_name)

	changed = False
	if not getattr(company, "default_wip_warehouse", None):
		company.default_wip_warehouse = _pick_warehouse(company=company_name, keywords=["work in progress", "wip"])  # type: ignore[attr-defined]
		changed = True
	if not getattr(company, "default_fg_warehouse", None):
		company.default_fg_warehouse = _pick_warehouse(company=company_name, keywords=["finished goods", "fg"])  # type: ignore[attr-defined]
		changed = True
	if not getattr(company, "default_scrap_warehouse", None):
		company.default_scrap_warehouse = _pick_warehouse(company=company_name, keywords=["scrap"])  # type: ignore[attr-defined]
		changed = True

	if changed:
		company.save(ignore_permissions=True)  # SECURITY: Safe - bootstrap utility running as Administrator

	return {
		"default_wip_warehouse": str(getattr(company, "default_wip_warehouse", "") or "").strip() or None,
		"default_fg_warehouse": str(getattr(company, "default_fg_warehouse", "") or "").strip() or None,
		"default_scrap_warehouse": str(getattr(company, "default_scrap_warehouse", "") or "").strip() or None,
	}

def _ensure_test_stock(*, company: str, item_code: str, min_qty: float = 5.0) -> dict[str, object]:
	"""
	Añade stock para poder submit de Delivery Note en pruebas locales.

	Esto evita el error típico de NegativeStockError en el flujo Ventas.

	SECURITY: Bootstrap utility - creates test stock for development setup.
	Not exposed as API endpoint. Called by ensure_erpnext_bootstrap() which runs as Administrator.
	"""

	if not company:
		raise RuntimeError("No se pudo determinar company para stock seed")

	warehouse = None
	preferred = f"Stores - {company.split()[-1][:3].upper()}"
	if frappe.db.exists("Warehouse", preferred):
		warehouse = preferred
	if not warehouse and frappe.db.exists("Warehouse", "Stores - SB"):
		warehouse = "Stores - SB"
	if not warehouse:
		rows = frappe.get_all(  # type: ignore[arg-type]
			"Warehouse",
			filters={"company": company, "is_group": 0},
			pluck="name",
			limit=1,
		)
		warehouse = str(rows[0] or "").strip() if rows else None
	if not warehouse:
		raise RuntimeError("No se pudo determinar un Warehouse para stock seed")

	try:
		actual = float(frappe.db.get_value("Bin", {"item_code": item_code, "warehouse": warehouse}, "actual_qty") or 0)
	except Exception:
		actual = 0.0
	if actual >= float(min_qty):
		return {"ok": True, "warehouse": warehouse, "actual_qty": actual, "created": False}

	doc = frappe.get_doc(
		{
			"doctype": "Stock Entry",
			"purpose": "Material Receipt",
			"stock_entry_type": "Material Receipt",
			"company": company,
			"items": [
				{
					"item_code": item_code,
					"qty": max(10.0, float(min_qty)),
					"t_warehouse": warehouse,
					"basic_rate": 1.0,
					"valuation_rate": 1.0,
				}
			],
		}
	)
	doc.insert(ignore_permissions=True)  # SECURITY: Safe - bootstrap utility running as Administrator
	doc.submit()
	return {"ok": True, "warehouse": warehouse, "actual_qty": actual, "created": True, "stock_entry": str(doc.name)}


def ensure_erpnext_bootstrap(
	*,
	company_name: str = "Santa Brisa",
	company_abbr: str = "SB",
	country: str = "Spain",
	currency: str = "EUR",
	chart_of_accounts: str = "Standard",
	domain: str = "Manufacturing",
	fy_start_date: str = "2025-01-01",
	fy_end_date: str = "2025-12-31",
) -> dict[str, object]:
	"""
	Bootstrap de ERPNext (fixtures + company + defaults) para entorno local.

	Esto crea lo necesario para trabajar en dev:
	- Item Groups (incl. "All Item Groups")
	- UOM base (incl. "Nos")
	- Warehouses básicos, price lists, stock settings, etc.
	- Company + Chart of Accounts (standard template)

	SECURITY: Bootstrap/setup utility function - not exposed as API endpoint.
	Runs as Administrator (frappe.set_user("Administrator")) for initial development setup.
	Used for local development environment initialization only.
	"""

	frappe.set_user("Administrator")

	try:
		from erpnext.setup.setup_wizard.operations import install_fixtures as fixtures
	except Exception as e:  # pragma: no cover
		raise RuntimeError("ERPNext no está instalado en este sitio") from e

	# Permitir plantillas no verificadas (útil para países que solo están en /unverified).
	frappe.local.flags.allow_unverified_charts = True

	args = frappe._dict(
		{
			"company_name": company_name,
			"company_abbr": company_abbr,
			"country": country,
			"currency": currency,
			"chart_of_accounts": chart_of_accounts,
			"domain": domain,
			"fy_start_date": fy_start_date,
			"fy_end_date": fy_end_date,
		}
	)

	steps: list[str] = []

	# 1) Fixtures (solo si faltan estructuras base típicas).
	if not frappe.db.exists("Item Group", "All Item Groups"):
		fixtures.install(country)
		steps.append("fixtures")

	# 2) Company (+ Fiscal Year) si no existe.
	if not frappe.db.count("Company"):
		fixtures.install_company(args)
		steps.append("company")

	# 3) Defaults globales si no hay company, o si el default_company está vacío.
	default_company = frappe.db.get_single_value("Global Defaults", "default_company")
	if not default_company:
		fixtures.install_defaults(args)
		steps.append("defaults")

	# 4) Datos mínimos para probar flujos “sin ERP” desde el Portal/BFF.
	wh_defaults = _ensure_company_warehouse_defaults(company_name=company_name)
	if not wh_defaults.get("default_wip_warehouse") or not wh_defaults.get("default_fg_warehouse"):
		raise RuntimeError("No se pudieron configurar default_wip_warehouse/default_fg_warehouse en Company")

	seeded = {
		"customer": _ensure_customer(),
		"supplier": _ensure_supplier(),
		"item": _ensure_item(item_code="SB-TEST-ITEM", item_name="SB Test Item"),
		"raw_item": _ensure_item(item_code="SB-RAW-001", item_name="SB Raw Material"),
	}
	steps.append("seed_mvp")

	seeded["stock"] = _ensure_test_stock(company=company_name, item_code=str(seeded["item"]))
	seeded["raw_stock"] = _ensure_test_stock(company=company_name, item_code=str(seeded["raw_item"]))
	seeded["bom"] = _ensure_bom(company=company_name, production_item=str(seeded["item"]), raw_item=str(seeded["raw_item"]))

	return {"ok": True, "steps": steps, "company_name": company_name, "seeded": seeded}
