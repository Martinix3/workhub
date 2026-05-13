import importlib.util
import sys
import types
from pathlib import Path


class FakeFrappe(types.SimpleNamespace):
    def __init__(self):
        super().__init__()
        self.session = types.SimpleNamespace(user="user@santabrisa.com")
        self._roles = []
        self.whitelist = lambda *args, **kwargs: (lambda fn: fn)

    def get_roles(self, user=None):
        return self._roles


def load_projects_module(monkeypatch):
    fake_frappe = FakeFrappe()
    fake_utils = types.SimpleNamespace(
        require_auth=lambda: None,
        require_permission=lambda doctype, ptype="read": None,
    )
    monkeypatch.setitem(sys.modules, "frappe", fake_frappe)
    monkeypatch.setitem(sys.modules, "frappe.utils", types.SimpleNamespace(nowdate=lambda: "2026-05-13"))
    sys.modules["frappe"]._ = lambda text: text
    sys.modules["frappe.utils"].getdate = lambda value: value
    sys.modules["frappe.utils"].add_days = lambda value, days: value
    sys.modules["frappe.utils"].date_diff = lambda a, b: 0
    monkeypatch.setitem(sys.modules, "workhub_frappe_app.api.utils", fake_utils)
    module_path = Path(__file__).resolve().parents[1] / "api" / "projects.py"
    spec = importlib.util.spec_from_file_location("projects_under_test", module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module, fake_frappe


def test_non_manager_is_forced_to_own_tasks_even_when_requesting_all(monkeypatch):
    projects, fake_frappe = load_projects_module(monkeypatch)
    fake_frappe.session.user = "pg@santabrisa.com"
    fake_frappe._roles = ["Sales User"]

    filters = projects._build_board_filters({"assignee": "all", "department": "SALES"})

    assert filters["assigned_to"] == "pg@santabrisa.com"
    assert filters["department"] == "SALES"


def test_non_manager_cannot_request_another_user(monkeypatch):
    projects, fake_frappe = load_projects_module(monkeypatch)
    fake_frappe.session.user = "pg@santabrisa.com"
    fake_frappe._roles = ["Sales User"]

    filters = projects._build_board_filters({"assignee": "mo@santabrisa.com"})

    assert filters["assigned_to"] == "pg@santabrisa.com"


def test_manager_can_view_all_or_filter_specific_user(monkeypatch):
    projects, fake_frappe = load_projects_module(monkeypatch)
    fake_frappe.session.user = "mj@santabrisa.com"
    fake_frappe._roles = ["Sales Manager"]

    assert "assigned_to" not in projects._build_board_filters({"assignee": "all"})
    assert projects._build_board_filters({"assignee": "pp@santabrisa.com"})["assigned_to"] == "pp@santabrisa.com"
