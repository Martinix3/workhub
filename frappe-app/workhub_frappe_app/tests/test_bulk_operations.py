# -*- coding: utf-8 -*-
# Copyright (c) 2026, WorkHub and contributors
# For license information, please see license.txt

"""
Unit tests for bulk operation endpoints.

Tests cover:
- Valid operations for all bulk endpoints
- Invalid inputs (empty arrays, wrong types, invalid values)
- Partial failures (some tasks succeed, some fail)
- Undo functionality for all operations
- Cache expiration for undo data
"""

import frappe
import unittest
import json
import time
from unittest.mock import patch, MagicMock
from frappe.tests.utils import FrappeTestCase

from workhub_frappe_app.api import bulk_operations


class TestBulkOperations(FrappeTestCase):
    """Test suite for bulk task operations"""

    @classmethod
    def setUpClass(cls):
        """Set up test fixtures"""
        super().setUpClass()

        # Create test user with appropriate permissions
        if not frappe.db.exists("User", "test_bulk_user@example.com"):
            user = frappe.get_doc({
                "doctype": "User",
                "email": "test_bulk_user@example.com",
                "first_name": "Test",
                "last_name": "Bulk User",
                "enabled": 1,
                "user_type": "System User"
            })
            user.insert(ignore_permissions=True)
            frappe.db.commit()

    def setUp(self):
        """Set up each test"""
        frappe.set_user("test_bulk_user@example.com")

        # Create test tasks
        self.test_tasks = []
        for i in range(5):
            task_id = f"TEST-TASK-{i+1:03d}"
            if not frappe.db.exists("WH Task", task_id):
                task = frappe.get_doc({
                    "doctype": "WH Task",
                    "name": task_id,
                    "title": f"Test Task {i+1}",
                    "status": "BACKLOG",
                    "priority": "P2",
                    "assigned_to": None,
                    "is_inbox": 1
                })
                task.insert(ignore_permissions=True)
            self.test_tasks.append(task_id)

        frappe.db.commit()

    def tearDown(self):
        """Clean up after each test"""
        # Clean up test tasks
        for task_id in self.test_tasks:
            if frappe.db.exists("WH Task", task_id):
                frappe.delete_doc("WH Task", task_id, force=True, ignore_permissions=True)

        # Clean up any WorkLinks created during tests
        worklinks = frappe.get_all("WorkLink",
            filters={"wh_task": ["in", self.test_tasks]},
            pluck="name")
        for worklink in worklinks:
            frappe.delete_doc("WorkLink", worklink, force=True, ignore_permissions=True)

        frappe.db.commit()

    # ========================================================================
    # Test bulk_change_status
    # ========================================================================

    def test_bulk_change_status_valid(self):
        """Test bulk status change with valid inputs"""
        result = bulk_operations.bulk_change_status(
            task_ids=self.test_tasks[:3],
            new_status="DOING"
        )

        self.assertEqual(result["total"], 3)
        self.assertEqual(result["success_count"], 3)
        self.assertEqual(result["failure_count"], 0)
        self.assertIn("undo_id", result)

        # Verify status was actually changed
        for task_id in self.test_tasks[:3]:
            status = frappe.db.get_value("WH Task", task_id, "status")
            self.assertEqual(status, "DOING")

    def test_bulk_change_status_invalid_status(self):
        """Test bulk status change with invalid status value"""
        with self.assertRaises(frappe.ValidationError):
            bulk_operations.bulk_change_status(
                task_ids=self.test_tasks[:2],
                new_status="INVALID_STATUS"
            )

    def test_bulk_change_status_empty_array(self):
        """Test bulk status change with empty task array"""
        with self.assertRaises(frappe.ValidationError):
            bulk_operations.bulk_change_status(
                task_ids=[],
                new_status="DOING"
            )

    def test_bulk_change_status_partial_failure(self):
        """Test bulk status change with some non-existent tasks"""
        mixed_tasks = self.test_tasks[:2] + ["NON-EXISTENT-1", "NON-EXISTENT-2"]
        result = bulk_operations.bulk_change_status(
            task_ids=mixed_tasks,
            new_status="NEXT"
        )

        self.assertEqual(result["total"], 4)
        self.assertEqual(result["success_count"], 2)
        self.assertEqual(result["failure_count"], 2)

        # Check that failures have error messages
        self.assertEqual(len(result["results"]["failed"]), 2)
        for failure in result["results"]["failed"]:
            self.assertIn("task_id", failure)
            self.assertIn("error", failure)

    def test_bulk_change_status_json_string(self):
        """Test bulk status change with JSON string input"""
        result = bulk_operations.bulk_change_status(
            task_ids=json.dumps(self.test_tasks[:2]),
            new_status="NEXT"
        )

        self.assertEqual(result["total"], 2)
        self.assertEqual(result["success_count"], 2)

    # ========================================================================
    # Test bulk_assign
    # ========================================================================

    def test_bulk_assign_valid(self):
        """Test bulk assignment with valid inputs"""
        result = bulk_operations.bulk_assign(
            task_ids=self.test_tasks[:3],
            assigned_to="test_bulk_user@example.com"
        )

        self.assertEqual(result["total"], 3)
        self.assertEqual(result["success_count"], 3)
        self.assertEqual(result["failure_count"], 0)
        self.assertIn("undo_id", result)

        # Verify assignment was actually changed
        for task_id in self.test_tasks[:3]:
            assigned_to = frappe.db.get_value("WH Task", task_id, "assigned_to")
            self.assertEqual(assigned_to, "test_bulk_user@example.com")

    def test_bulk_assign_invalid_user(self):
        """Test bulk assignment with non-existent user"""
        with self.assertRaises(frappe.ValidationError):
            bulk_operations.bulk_assign(
                task_ids=self.test_tasks[:2],
                assigned_to="nonexistent@example.com"
            )

    def test_bulk_assign_empty_user(self):
        """Test bulk assignment with empty assigned_to"""
        with self.assertRaises(frappe.ValidationError):
            bulk_operations.bulk_assign(
                task_ids=self.test_tasks[:2],
                assigned_to=""
            )

    def test_bulk_assign_partial_failure(self):
        """Test bulk assignment with some non-existent tasks"""
        mixed_tasks = self.test_tasks[:2] + ["NON-EXISTENT-1"]
        result = bulk_operations.bulk_assign(
            task_ids=mixed_tasks,
            assigned_to="test_bulk_user@example.com"
        )

        self.assertEqual(result["total"], 3)
        self.assertEqual(result["success_count"], 2)
        self.assertEqual(result["failure_count"], 1)

    # ========================================================================
    # Test bulk_change_priority
    # ========================================================================

    def test_bulk_change_priority_valid(self):
        """Test bulk priority change with valid inputs"""
        result = bulk_operations.bulk_change_priority(
            task_ids=self.test_tasks[:3],
            new_priority="P0"
        )

        self.assertEqual(result["total"], 3)
        self.assertEqual(result["success_count"], 3)
        self.assertEqual(result["failure_count"], 0)
        self.assertIn("undo_id", result)

        # Verify priority was actually changed
        for task_id in self.test_tasks[:3]:
            priority = frappe.db.get_value("WH Task", task_id, "priority")
            self.assertEqual(priority, "P0")

    def test_bulk_change_priority_invalid_priority(self):
        """Test bulk priority change with invalid priority value"""
        with self.assertRaises(frappe.ValidationError):
            bulk_operations.bulk_change_priority(
                task_ids=self.test_tasks[:2],
                new_priority="P99"
            )

    def test_bulk_change_priority_all_priorities(self):
        """Test bulk priority change with all valid priorities"""
        for priority in ["P0", "P1", "P2"]:
            result = bulk_operations.bulk_change_priority(
                task_ids=self.test_tasks[:2],
                new_priority=priority
            )
            self.assertEqual(result["success_count"], 2)

    # ========================================================================
    # Test bulk_move_project
    # ========================================================================

    def test_bulk_move_project_valid(self):
        """Test bulk project move with valid project"""
        # Create a test project
        if not frappe.db.exists("WH Project", "TEST-PROJECT-001"):
            project = frappe.get_doc({
                "doctype": "WH Project",
                "name": "TEST-PROJECT-001",
                "title": "Test Project",
                "department": "OPS",
                "status": "ACTIVE"
            })
            project.insert(ignore_permissions=True)
            frappe.db.commit()

        try:
            result = bulk_operations.bulk_move_project(
                task_ids=self.test_tasks[:3],
                project_id="TEST-PROJECT-001"
            )

            self.assertEqual(result["total"], 3)
            self.assertEqual(result["success_count"], 3)
            self.assertEqual(result["failure_count"], 0)
            self.assertIn("undo_id", result)

            # Verify project was actually changed
            for task_id in self.test_tasks[:3]:
                project = frappe.db.get_value("WH Task", task_id, "project")
                self.assertEqual(project, "TEST-PROJECT-001")
        finally:
            # Clean up test project
            if frappe.db.exists("WH Project", "TEST-PROJECT-001"):
                frappe.delete_doc("WH Project", "TEST-PROJECT-001", force=True, ignore_permissions=True)
                frappe.db.commit()

    def test_bulk_move_project_clear_project(self):
        """Test bulk project move to clear project (move to inbox)"""
        result = bulk_operations.bulk_move_project(
            task_ids=self.test_tasks[:2],
            project_id=None
        )

        self.assertEqual(result["success_count"], 2)

        # Verify is_inbox flag was set
        for task_id in self.test_tasks[:2]:
            is_inbox = frappe.db.get_value("WH Task", task_id, "is_inbox")
            self.assertEqual(is_inbox, 1)

    def test_bulk_move_project_invalid_project(self):
        """Test bulk project move with non-existent project"""
        with self.assertRaises(frappe.ValidationError):
            bulk_operations.bulk_move_project(
                task_ids=self.test_tasks[:2],
                project_id="NON-EXISTENT-PROJECT"
            )

    # ========================================================================
    # Test bulk_create_worklinks
    # ========================================================================

    def test_bulk_create_worklinks_valid(self):
        """Test bulk WorkLink creation with valid inputs"""
        # Create a test Sales Order
        if not frappe.db.exists("Sales Order", "TEST-SO-001"):
            so = frappe.get_doc({
                "doctype": "Sales Order",
                "name": "TEST-SO-001",
                "customer": "Test Customer",
                "transaction_date": frappe.utils.today()
            })
            so.insert(ignore_permissions=True)
            frappe.db.commit()

        try:
            result = bulk_operations.bulk_create_worklinks(
                task_ids=self.test_tasks[:2],
                source_doctype="Sales Order",
                source_id="TEST-SO-001"
            )

            self.assertEqual(result["total"], 2)
            self.assertEqual(result["success_count"], 2)
            self.assertEqual(result["failure_count"], 0)
            self.assertIn("undo_id", result)

            # Verify WorkLinks were created
            for task_id in self.test_tasks[:2]:
                worklink = frappe.db.get_value("WH Task", task_id, "worklink")
                self.assertIsNotNone(worklink)
        finally:
            # Clean up test Sales Order
            if frappe.db.exists("Sales Order", "TEST-SO-001"):
                frappe.delete_doc("Sales Order", "TEST-SO-001", force=True, ignore_permissions=True)
                frappe.db.commit()

    def test_bulk_create_worklinks_invalid_doctype(self):
        """Test bulk WorkLink creation with invalid source doctype"""
        with self.assertRaises(frappe.ValidationError):
            bulk_operations.bulk_create_worklinks(
                task_ids=self.test_tasks[:2],
                source_doctype="Invalid DocType",
                source_id="TEST-001"
            )

    def test_bulk_create_worklinks_missing_params(self):
        """Test bulk WorkLink creation with missing parameters"""
        with self.assertRaises(frappe.ValidationError):
            bulk_operations.bulk_create_worklinks(
                task_ids=self.test_tasks[:2],
                source_doctype="",
                source_id=""
            )

    def test_bulk_create_worklinks_already_has_worklink(self):
        """Test bulk WorkLink creation when task already has WorkLink"""
        # Set up: Give first task a WorkLink
        if not frappe.db.exists("WorkLink", "TEST-WL-001"):
            wl = frappe.get_doc({
                "doctype": "WorkLink",
                "name": "TEST-WL-001",
                "source_doctype": "Account",
                "source_id": "Test Account",
                "department": "OPS",
                "wh_task": self.test_tasks[0]
            })
            wl.insert(ignore_permissions=True)
            frappe.db.set_value("WH Task", self.test_tasks[0], "worklink", "TEST-WL-001")
            frappe.db.commit()

        try:
            # Try to create another WorkLink for the same task
            result = bulk_operations.bulk_create_worklinks(
                task_ids=self.test_tasks[:2],
                source_doctype="Account",
                source_id="Another Account"
            )

            # First task should fail, second should succeed
            self.assertEqual(result["failure_count"], 1)
            self.assertEqual(result["success_count"], 1)
        finally:
            # Clean up
            if frappe.db.exists("WorkLink", "TEST-WL-001"):
                frappe.delete_doc("WorkLink", "TEST-WL-001", force=True, ignore_permissions=True)
                frappe.db.commit()

    # ========================================================================
    # Test bulk_remove_worklinks
    # ========================================================================

    def test_bulk_remove_worklinks_valid(self):
        """Test bulk WorkLink removal with valid inputs"""
        # Set up: Create WorkLinks for test tasks
        worklinks = []
        for i, task_id in enumerate(self.test_tasks[:2]):
            wl_name = f"TEST-WL-{i+1:03d}"
            if not frappe.db.exists("WorkLink", wl_name):
                wl = frappe.get_doc({
                    "doctype": "WorkLink",
                    "name": wl_name,
                    "source_doctype": "Account",
                    "source_id": f"Test Account {i+1}",
                    "department": "OPS",
                    "wh_task": task_id
                })
                wl.insert(ignore_permissions=True)
                frappe.db.set_value("WH Task", task_id, "worklink", wl_name)
                worklinks.append(wl_name)
        frappe.db.commit()

        try:
            result = bulk_operations.bulk_remove_worklinks(
                task_ids=self.test_tasks[:2]
            )

            self.assertEqual(result["total"], 2)
            self.assertEqual(result["success_count"], 2)
            self.assertEqual(result["failure_count"], 0)
            self.assertIn("undo_id", result)

            # Verify WorkLinks were removed from tasks
            for task_id in self.test_tasks[:2]:
                worklink = frappe.db.get_value("WH Task", task_id, "worklink")
                self.assertIsNone(worklink)
        finally:
            # Clean up any remaining WorkLinks
            for wl_name in worklinks:
                if frappe.db.exists("WorkLink", wl_name):
                    frappe.delete_doc("WorkLink", wl_name, force=True, ignore_permissions=True)
            frappe.db.commit()

    def test_bulk_remove_worklinks_no_worklink(self):
        """Test bulk WorkLink removal when tasks don't have WorkLinks"""
        result = bulk_operations.bulk_remove_worklinks(
            task_ids=self.test_tasks[:2]
        )

        # All should fail since tasks don't have WorkLinks
        self.assertEqual(result["failure_count"], 2)
        self.assertEqual(result["success_count"], 0)

    # ========================================================================
    # Test undo_bulk_operation
    # ========================================================================

    def test_undo_bulk_change_status(self):
        """Test undo for bulk status change"""
        # Perform bulk status change
        result = bulk_operations.bulk_change_status(
            task_ids=self.test_tasks[:3],
            new_status="DOING"
        )
        undo_id = result["undo_id"]

        # Verify status was changed
        for task_id in self.test_tasks[:3]:
            status = frappe.db.get_value("WH Task", task_id, "status")
            self.assertEqual(status, "DOING")

        # Undo the operation
        undo_result = bulk_operations.undo_bulk_operation(undo_id)

        self.assertEqual(undo_result["total"], 3)
        self.assertEqual(undo_result["success_count"], 3)
        self.assertEqual(undo_result["operation_type"], "change_status")

        # Verify status was reverted to BACKLOG
        for task_id in self.test_tasks[:3]:
            status = frappe.db.get_value("WH Task", task_id, "status")
            self.assertEqual(status, "BACKLOG")

    def test_undo_bulk_assign(self):
        """Test undo for bulk assignment"""
        # Perform bulk assignment
        result = bulk_operations.bulk_assign(
            task_ids=self.test_tasks[:2],
            assigned_to="test_bulk_user@example.com"
        )
        undo_id = result["undo_id"]

        # Undo the operation
        undo_result = bulk_operations.undo_bulk_operation(undo_id)

        self.assertEqual(undo_result["success_count"], 2)

        # Verify assignment was reverted to None
        for task_id in self.test_tasks[:2]:
            assigned_to = frappe.db.get_value("WH Task", task_id, "assigned_to")
            self.assertIsNone(assigned_to)

    def test_undo_bulk_change_priority(self):
        """Test undo for bulk priority change"""
        # Perform bulk priority change
        result = bulk_operations.bulk_change_priority(
            task_ids=self.test_tasks[:2],
            new_priority="P0"
        )
        undo_id = result["undo_id"]

        # Undo the operation
        undo_result = bulk_operations.undo_bulk_operation(undo_id)

        self.assertEqual(undo_result["success_count"], 2)

        # Verify priority was reverted to P2
        for task_id in self.test_tasks[:2]:
            priority = frappe.db.get_value("WH Task", task_id, "priority")
            self.assertEqual(priority, "P2")

    def test_undo_bulk_move_project(self):
        """Test undo for bulk project move"""
        # Create a test project
        if not frappe.db.exists("WH Project", "TEST-PROJECT-002"):
            project = frappe.get_doc({
                "doctype": "WH Project",
                "name": "TEST-PROJECT-002",
                "title": "Test Project 2",
                "department": "OPS",
                "status": "ACTIVE"
            })
            project.insert(ignore_permissions=True)
            frappe.db.commit()

        try:
            # Perform bulk project move
            result = bulk_operations.bulk_move_project(
                task_ids=self.test_tasks[:2],
                project_id="TEST-PROJECT-002"
            )
            undo_id = result["undo_id"]

            # Undo the operation
            undo_result = bulk_operations.undo_bulk_operation(undo_id)

            self.assertEqual(undo_result["success_count"], 2)

            # Verify project was reverted to None and is_inbox to 1
            for task_id in self.test_tasks[:2]:
                project = frappe.db.get_value("WH Task", task_id, "project")
                is_inbox = frappe.db.get_value("WH Task", task_id, "is_inbox")
                self.assertIsNone(project)
                self.assertEqual(is_inbox, 1)
        finally:
            # Clean up test project
            if frappe.db.exists("WH Project", "TEST-PROJECT-002"):
                frappe.delete_doc("WH Project", "TEST-PROJECT-002", force=True, ignore_permissions=True)
                frappe.db.commit()

    def test_undo_expired_cache(self):
        """Test undo with expired cache (after 30 seconds)"""
        # Perform bulk status change
        result = bulk_operations.bulk_change_status(
            task_ids=self.test_tasks[:2],
            new_status="NEXT"
        )
        undo_id = result["undo_id"]

        # Mock the cache to return None (simulating expiration)
        with patch.object(frappe.cache(), 'get_value', return_value=None):
            # Try to undo - should raise error
            with self.assertRaises(frappe.ValidationError) as context:
                bulk_operations.undo_bulk_operation(undo_id)

            self.assertIn("expired", str(context.exception).lower())

    def test_undo_invalid_undo_id(self):
        """Test undo with invalid/non-existent undo_id"""
        with self.assertRaises(frappe.ValidationError) as context:
            bulk_operations.undo_bulk_operation("invalid_undo_id")

        self.assertIn("not found", str(context.exception).lower())

    def test_undo_empty_undo_id(self):
        """Test undo with empty undo_id"""
        with self.assertRaises(frappe.ValidationError):
            bulk_operations.undo_bulk_operation("")

    # ========================================================================
    # Test cache and undo helpers
    # ========================================================================

    def test_generate_undo_id_unique(self):
        """Test that generated undo IDs are unique"""
        undo_ids = set()
        for _ in range(100):
            undo_id = bulk_operations._generate_undo_id()
            self.assertNotIn(undo_id, undo_ids)
            self.assertTrue(undo_id.startswith("undo_"))
            undo_ids.add(undo_id)

    def test_store_and_get_undo_data(self):
        """Test storing and retrieving undo data"""
        undo_id = "test_undo_id_123"
        test_data = {
            "operation_type": "change_status",
            "task_ids": ["TASK-001", "TASK-002"],
            "previous_values": {
                "TASK-001": {"status": "BACKLOG"},
                "TASK-002": {"status": "NEXT"}
            }
        }

        # Store undo data
        bulk_operations._store_undo_data(
            undo_id=undo_id,
            operation_type=test_data["operation_type"],
            task_ids=test_data["task_ids"],
            previous_values=test_data["previous_values"]
        )

        # Retrieve undo data
        retrieved_data = bulk_operations._get_undo_data(undo_id)

        self.assertIsNotNone(retrieved_data)
        self.assertEqual(retrieved_data["operation_type"], test_data["operation_type"])
        self.assertEqual(retrieved_data["task_ids"], test_data["task_ids"])
        self.assertEqual(retrieved_data["previous_values"], test_data["previous_values"])
        self.assertIn("timestamp", retrieved_data)
        self.assertIn("user", retrieved_data)

    def test_get_undo_data_expired(self):
        """Test retrieving expired undo data returns None"""
        undo_id = "expired_undo_id"

        # Mock the cache to return None
        with patch.object(frappe.cache(), 'get_value', return_value=None):
            result = bulk_operations._get_undo_data(undo_id)
            self.assertIsNone(result)

    # ========================================================================
    # Test permissions
    # ========================================================================

    def test_bulk_operations_require_permission(self):
        """Test that bulk operations require proper permissions"""
        # Create a user without permissions
        if not frappe.db.exists("User", "no_perm_user@example.com"):
            user = frappe.get_doc({
                "doctype": "User",
                "email": "no_perm_user@example.com",
                "first_name": "No",
                "last_name": "Permissions",
                "enabled": 1,
                "user_type": "System User"
            })
            user.insert(ignore_permissions=True)
            frappe.db.commit()

        # Switch to user without permissions
        frappe.set_user("no_perm_user@example.com")

        try:
            # Should raise PermissionError
            with self.assertRaises(frappe.PermissionError):
                bulk_operations.bulk_change_status(
                    task_ids=self.test_tasks[:2],
                    new_status="DOING"
                )
        finally:
            # Switch back to test user
            frappe.set_user("test_bulk_user@example.com")

            # Clean up
            if frappe.db.exists("User", "no_perm_user@example.com"):
                frappe.delete_doc("User", "no_perm_user@example.com", force=True, ignore_permissions=True)
                frappe.db.commit()

    # ========================================================================
    # Test edge cases
    # ========================================================================

    def test_bulk_operation_with_single_task(self):
        """Test bulk operation with just one task"""
        result = bulk_operations.bulk_change_status(
            task_ids=[self.test_tasks[0]],
            new_status="DONE"
        )

        self.assertEqual(result["total"], 1)
        self.assertEqual(result["success_count"], 1)

    def test_bulk_operation_with_duplicate_tasks(self):
        """Test bulk operation with duplicate task IDs"""
        duplicated_tasks = [self.test_tasks[0], self.test_tasks[0], self.test_tasks[1]]
        result = bulk_operations.bulk_change_status(
            task_ids=duplicated_tasks,
            new_status="NEXT"
        )

        # Should process all entries (even duplicates)
        self.assertEqual(result["total"], 3)

    def test_process_bulk_operation_with_exception(self):
        """Test _process_bulk_operation handles exceptions gracefully"""
        def failing_operation(task_id):
            raise Exception("Test exception")

        result = bulk_operations._process_bulk_operation(
            task_ids=self.test_tasks[:2],
            operation_func=failing_operation,
            operation_name="test_operation"
        )

        # All should fail with exceptions
        self.assertEqual(result["failure_count"], 2)
        self.assertEqual(result["success_count"], 0)


# Run tests
def run_tests():
    """Helper function to run tests from console"""
    unittest.main()


if __name__ == "__main__":
    run_tests()
