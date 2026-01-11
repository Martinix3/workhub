# Copyright (c) 2026, WorkHub and contributors
# For license information, please see license.txt

import frappe
import unittest
from frappe.utils import nowdate, add_days, getdate
from workhub_frappe_app.api.gantt import (
    get_gantt_view,
    update_task_schedule,
    add_dependency,
    would_create_cycle
)

class TestGantt(unittest.TestCase):
    def setUp(self):
        """Create test project and tasks"""
        # Create test project
        self.project = frappe.get_doc({
            "doctype": "WH Project",
            "title": "Test Gantt Project",
            "start_date": nowdate(),
            "target_date": add_days(nowdate(), 30)
        })
        self.project.insert()

        # Create test tasks
        self.task1 = frappe.get_doc({
            "doctype": "WH Task",
            "title": "Task 1",
            "project": self.project.name,
            "start_date": nowdate(),
            "due_date": add_days(nowdate(), 5)
        })
        self.task1.insert()

        self.task2 = frappe.get_doc({
            "doctype": "WH Task",
            "title": "Task 2",
            "project": self.project.name,
            "start_date": add_days(nowdate(), 6),
            "due_date": add_days(nowdate(), 10)
        })
        self.task2.insert()

    def tearDown(self):
        """Clean up test data"""
        frappe.delete_doc("WH Project", self.project.name, force=True)

    def test_get_gantt_view_returns_data(self):
        """Test Gantt view data retrieval"""
        result = get_gantt_view(self.project.name)

        self.assertIsNotNone(result)
        self.assertIn("project", result)
        self.assertIn("tasks", result)
        self.assertIn("dependencies", result)
        self.assertEqual(len(result["tasks"]), 2)

    def test_update_task_schedule_validates_dates(self):
        """Test that start date must be before due date"""
        with self.assertRaises(frappe.ValidationError):
            update_task_schedule(
                task_id=self.task1.name,
                start_date=add_days(nowdate(), 10),
                due_date=nowdate()  # Due before start - should fail
            )

    def test_add_dependency_prevents_cycles(self):
        """Test cycle detection in dependencies"""
        # Add dependency: Task1 -> Task2
        add_dependency(self.task1.name, self.task2.name, "FS")

        # Try to add reverse dependency: Task2 -> Task1 (would create cycle)
        result = add_dependency(self.task2.name, self.task1.name, "FS")

        self.assertFalse(result["success"])
        self.assertIn("ciclo", result["message"].lower())

    def test_critical_path_calculation(self):
        """Test critical path calculation"""
        from workhub_frappe_app.api.gantt import get_critical_path

        # Add dependency to create path
        add_dependency(self.task1.name, self.task2.name, "FS")

        result = get_critical_path(self.project.name)

        self.assertIn("critical_path", result)
        self.assertIn("slack_times", result)
        self.assertTrue(len(result["critical_path"]) > 0)
