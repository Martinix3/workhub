import importlib
import sys
import types
from datetime import date


class Row(dict):
    def __getattr__(self, key):
        try:
            return self[key]
        except KeyError as exc:
            raise AttributeError(key) from exc


def install_fake_frappe(monkeypatch, *, accounts=None, interactions=None, tasks=None, visibility=None, alerts=None):
    accounts = [Row(a) for a in (accounts or [])]
    interactions = [Row(i) for i in (interactions or [])]
    tasks = [Row(t) for t in (tasks or [])]
    visibility = [Row(v) for v in (visibility or [])]
    alerts = [Row(a) for a in (alerts or [])]

    frappe = types.SimpleNamespace()
    frappe.session = types.SimpleNamespace(user="martin@example.com")
    frappe._ = lambda value: value

    def whitelist(fn=None, **_kwargs):
        if fn is None:
            return lambda inner: inner
        return fn

    frappe.whitelist = whitelist
    frappe.throw = lambda message: (_ for _ in ()).throw(Exception(message))

    def matches(row, filters):
        if not filters:
            return True
        for key, expected in filters.items():
            value = row.get(key)
            if isinstance(expected, list):
                op = expected[0]
                operand = expected[1]
                if op == "in" and value not in operand:
                    return False
                if op == "not in" and value in operand:
                    return False
                if op == "like" and operand.strip("%").lower() not in str(value or "").lower():
                    return False
                if op == "<" and not (value and str(value) < str(operand)):
                    return False
                if op == ">" and not (value and str(value) > str(operand)):
                    return False
            elif value != expected:
                return False
        return True

    datasets = {
        "Momentum Account": accounts,
        "Momentum Interaction": interactions,
        "WH Task": tasks,
        "WH Account Visibility": visibility,
        "Account Rotation Alert": alerts,
    }

    def get_all(doctype, filters=None, fields=None, order_by=None, limit=None, limit_page_length=None, limit_start=0, **_kwargs):
        rows = [Row(r) for r in datasets.get(doctype, []) if matches(r, filters)]
        if "interaction_date desc" in str(order_by):
            rows.sort(key=lambda r: str(r.get("interaction_date") or ""), reverse=True)
        elif "due_date asc" in str(order_by):
            rows.sort(key=lambda r: str(r.get("due_date") or ""))
        elif "rotation_priority desc" in str(order_by):
            rows.sort(key=lambda r: r.get("rotation_priority", 0), reverse=True)
        start = int(limit_start or 0)
        end = start + int(limit or limit_page_length or len(rows))
        rows = rows[start:end]
        if fields:
            projected = []
            for row in rows:
                projected.append(Row({field: row.get(field) for field in fields}))
            return projected
        return rows

    def count(doctype, filters=None):
        return len([r for r in datasets.get(doctype, []) if matches(r, filters)])

    def get_value(doctype, filters, fields, as_dict=False):
        if isinstance(filters, dict):
            row = next((r for r in datasets.get(doctype, []) if matches(r, filters)), None)
        else:
            row = next((r for r in datasets.get(doctype, []) if r.get("name") == filters), None)
        if row is None:
            return None
        if isinstance(fields, list):
            result = Row({field: row.get(field) for field in fields})
            return result if as_dict else tuple(result.values())
        return row.get(fields)

    def exists(doctype, name):
        if doctype == "DocType":
            return name in datasets
        return any(r.get("name") == name for r in datasets.get(doctype, []))

    frappe.get_all = get_all
    frappe.get_list = get_all
    frappe.db = types.SimpleNamespace(count=count, get_value=get_value, exists=exists)
    frappe.utils = types.SimpleNamespace(
        nowdate=lambda: "2026-05-12",
        getdate=lambda value=None: date.fromisoformat(str(value or "2026-05-12")[:10]),
        date_diff=lambda later, earlier: (date.fromisoformat(str(later)[:10]) - date.fromisoformat(str(earlier)[:10])).days,
        add_days=lambda value, days: str(date.fromisoformat(str(value)[:10]) + __import__("datetime").timedelta(days=days)),
        get_first_day=lambda value=None: "2026-05-01",
    )

    monkeypatch.setitem(sys.modules, "frappe", frappe)
    monkeypatch.setitem(sys.modules, "frappe.utils", frappe.utils)
    return frappe


def reload_module(name):
    sys.modules.pop(name, None)
    if name.startswith("workhub_frappe_app.api."):
        module_filename = name.rsplit(".", 1)[-1] + ".py"
        module_path = __import__("pathlib").Path(__file__).parents[1] / "api" / module_filename
        spec = importlib.util.spec_from_file_location(name, module_path)
        module = importlib.util.module_from_spec(spec)
        sys.modules[name] = module
        spec.loader.exec_module(module)
        return module
    return importlib.import_module(name)


def test_rotation_accounts_contract_and_status(monkeypatch):
    install_fake_frappe(
        monkeypatch,
        accounts=[
            {
                "name": "MOM-1",
                "account_name": "Catering El Laurel",
                "city": "Madrid",
                "sales_channel": "Catering",
                "distributor": "Distribuidor Norte",
                "column": "Pipeline",
                "assigned_to": "martin@example.com",
                "sales_last_order_date": "2026-05-01",
                "sales_orders_last_90d": 3,
                "sales_total_orders": 10,
                "sales_total_boxes": 120,
            },
            {
                "name": "MOM-2",
                "account_name": "Bar Dormido",
                "city": "Valencia",
                "sales_channel": "Horeca",
                "column": "Hot",
                "assigned_to": "martin@example.com",
                "sales_last_order_date": "2026-02-01",
                "sales_orders_last_90d": 0,
            },
        ],
        interactions=[
            {"name": "INT-1", "momentum_account": "MOM-1", "interaction_type": "Visita", "interaction_date": "2026-05-10 10:00:00"},
        ],
        visibility=[{"name": "VIS-1", "momentum_account": "MOM-1", "is_active": 1, "visibility_type": "PLV"}],
    )
    rotation = reload_module("workhub_frappe_app.api.rotation")

    result = rotation.get_rotation_accounts(limit=10)

    assert set(result.keys()) == {"rows", "total", "kpis", "filters"}
    assert result["total"] == 2
    assert result["kpis"]["total_accounts"] == 2
    assert result["kpis"]["active"] == 1
    assert result["kpis"]["dead"] == 1
    first = result["rows"][0]
    assert first["account_name"] == "Bar Dormido"
    assert first["status"] == "muerta"
    assert result["rows"][1]["has_plv"] is True
    assert result["rows"][1]["last_interaction_type"] == "Visita"


def test_rotation_detail_always_returns_drawer_sections(monkeypatch):
    install_fake_frappe(
        monkeypatch,
        accounts=[{"name": "MOM-1", "account_name": "Catering El Laurel", "sales_last_order_date": "2026-05-01", "sales_orders_last_90d": 3}],
        interactions=[{"name": "INT-1", "momentum_account": "MOM-1", "interaction_type": "Visita", "interaction_date": "2026-05-10"}],
        visibility=[{"name": "VIS-1", "momentum_account": "MOM-1", "is_active": 1, "visibility_type": "PLV"}],
        alerts=[{"name": "MOM-1", "account": "MOM-1", "enabled": 1, "threshold_days": 30}],
    )
    rotation = reload_module("workhub_frappe_app.api.rotation")

    result = rotation.get_rotation_account_detail("MOM-1")

    assert set(result.keys()) == {"account", "kpis", "products", "menus", "visibility", "activations", "visits", "notes", "alert"}
    assert result["account"]["name"] == "MOM-1"
    assert result["visibility"][0]["visibility_type"] == "PLV"
    assert result["visits"][0]["interaction_type"] == "Visita"
    assert result["alert"]["threshold_days"] == 30


def test_daily_briefing_contract_with_tasks_and_pipeline(monkeypatch):
    install_fake_frappe(
        monkeypatch,
        accounts=[
            {"name": "MOM-1", "account_name": "Hot sin mover", "column": "Hot", "last_movement_date": "2026-05-01", "assigned_to": "martin@example.com"},
            {"name": "MOM-2", "account_name": "Pipeline", "column": "Pipeline", "last_movement_date": "2026-05-12", "assigned_to": "martin@example.com"},
        ],
        tasks=[
            {"name": "T-1", "title": "Llamar serigrafía", "status": "NEXT", "priority": "P1", "assigned_to": "martin@example.com", "due_date": "2026-05-12"},
            {"name": "T-2", "title": "Responder duty-free", "status": "DOING", "priority": "P0", "assigned_to": "martin@example.com", "due_date": "2026-05-12"},
            {"name": "T-3", "title": "Vencida", "status": "NEXT", "priority": "P0", "assigned_to": "martin@example.com", "due_date": "2026-05-10"},
        ],
    )
    briefing = reload_module("workhub_frappe_app.api.briefing")

    result = briefing.get_daily_briefing(date="2026-05-12", user="martin@example.com")

    assert set(result.keys()) == {"greeting", "summary", "kpis", "goals", "urgent", "agenda", "tasks", "emails", "pipeline", "insights", "projects", "metadata"}
    assert result["summary"]["tasks"] == 3
    assert len(result["tasks"]["overdue"]) == 1
    assert len(result["tasks"]["in_progress"]) == 1
    assert len(result["tasks"]["next"]) == 1
    assert {row["column"] for row in result["pipeline"]} >= {"Hot", "Pipeline"}
    assert result["insights"][0]["type"] == "hot_stale"
    assert len(result["insights"]) <= 3
