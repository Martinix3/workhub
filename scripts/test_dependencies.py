#!/usr/bin/env python3
"""
WorkHub Frappe App - Dependency API Test Script
Tests all dependency-related API endpoints added in Task Dependencies & Blocker Visualization feature

Run from frappe-bench directory:
  bench --site [site] execute workhub_frappe_app.scripts.test_dependencies.run_all_tests

Or run as standalone script with Frappe context:
  cd /path/to/frappe-bench
  bench --site [site] console
  >>> from workhub_frappe_app.scripts.test_dependencies import run_all_tests
  >>> run_all_tests()
"""

import frappe
from frappe import _
import json
from datetime import datetime, timedelta


class TestRunner:
    """Test runner for dependency API endpoints"""

    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        self.test_data = {}  # Store created test data for cleanup

    def log(self, message, level="INFO"):
        """Log a message with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        prefix = {
            "INFO": "  [INFO]",
            "PASS": "  ✓ [PASS]",
            "FAIL": "  ✗ [FAIL]",
            "ERROR": "  ✗ [ERROR]"
        }.get(level, "  [INFO]")
        print(f"{prefix} {message}")

    def assert_true(self, condition, message):
        """Assert a condition is true"""
        if condition:
            self.passed += 1
            self.log(message, "PASS")
            return True
        else:
            self.failed += 1
            self.errors.append(message)
            self.log(message, "FAIL")
            return False

    def assert_equal(self, actual, expected, label):
        """Assert actual equals expected"""
        if actual == expected:
            self.passed += 1
            self.log(f"{label}: {actual} == {expected}", "PASS")
            return True
        else:
            self.failed += 1
            msg = f"{label}: {actual} != {expected}"
            self.errors.append(msg)
            self.log(msg, "FAIL")
            return False

    def assert_has_key(self, data, key, label):
        """Assert dictionary has key"""
        if isinstance(data, dict) and key in data:
            self.passed += 1
            self.log(f"{label}: has key '{key}'", "PASS")
            return True
        else:
            self.failed += 1
            msg = f"{label}: missing key '{key}'"
            self.errors.append(msg)
            self.log(msg, "FAIL")
            return False

    def assert_is_type(self, value, expected_type, label):
        """Assert value is of expected type"""
        if isinstance(value, expected_type):
            self.passed += 1
            self.log(f"{label}: is {expected_type.__name__}", "PASS")
            return True
        else:
            self.failed += 1
            msg = f"{label}: expected {expected_type.__name__}, got {type(value).__name__}"
            self.errors.append(msg)
            self.log(msg, "FAIL")
            return False

    def setup_test_data(self):
        """Create test tasks and dependencies"""
        self.log("\n[SETUP] Creating test data...")

        try:
            # Create test project
            project = frappe.new_doc("WH Project")
            project.title = "Test Project - Dependencies"
            project.department = "OPS"
            project.owner_user = frappe.session.user
            project.insert(ignore_permissions=True)
            self.test_data["project"] = project.name
            self.log(f"Created test project: {project.name}")

            # Create test tasks
            task_titles = [
                "Task A - Predecessor",
                "Task B - Successor (blocked by A)",
                "Task C - Successor (blocked by A)",
                "Task D - Independent"
            ]

            tasks = []
            for i, title in enumerate(task_titles):
                task = frappe.new_doc("WH Task")
                task.title = title
                task.project = project.name
                task.department = "OPS"
                task.status = "NEXT"
                task.priority = "P1"
                task.assigned_to = frappe.session.user
                task.insert(ignore_permissions=True)
                tasks.append(task.name)
                self.log(f"Created test task: {task.name} - {title}")

            self.test_data["tasks"] = tasks

            # Create dependencies: A blocks B and C
            dep1 = frappe.new_doc("WH Task Dependency")
            dep1.predecessor = tasks[0]  # Task A
            dep1.successor = tasks[1]    # Task B
            dep1.type = "FS"
            dep1.is_active = 1
            dep1.insert(ignore_permissions=True)
            self.test_data.setdefault("dependencies", []).append(dep1.name)
            self.log(f"Created dependency: {tasks[0]} blocks {tasks[1]}")

            dep2 = frappe.new_doc("WH Task Dependency")
            dep2.predecessor = tasks[0]  # Task A
            dep2.successor = tasks[2]    # Task C
            dep2.type = "FS"
            dep2.is_active = 1
            dep2.insert(ignore_permissions=True)
            self.test_data.setdefault("dependencies", []).append(dep2.name)
            self.log(f"Created dependency: {tasks[0]} blocks {tasks[2]}")

            frappe.db.commit()
            self.log("[SETUP] Test data created successfully\n")
            return True

        except Exception as e:
            self.log(f"[SETUP ERROR] Failed to create test data: {str(e)}", "ERROR")
            frappe.db.rollback()
            return False

    def cleanup_test_data(self):
        """Clean up created test data"""
        self.log("\n[CLEANUP] Removing test data...")

        try:
            # Delete dependencies
            if "dependencies" in self.test_data:
                for dep_id in self.test_data["dependencies"]:
                    if frappe.db.exists("WH Task Dependency", dep_id):
                        frappe.delete_doc("WH Task Dependency", dep_id, force=1, ignore_permissions=True)
                self.log(f"Deleted {len(self.test_data['dependencies'])} dependencies")

            # Delete tasks
            if "tasks" in self.test_data:
                for task_id in self.test_data["tasks"]:
                    if frappe.db.exists("WH Task", task_id):
                        frappe.delete_doc("WH Task", task_id, force=1, ignore_permissions=True)
                self.log(f"Deleted {len(self.test_data['tasks'])} tasks")

            # Delete project
            if "project" in self.test_data:
                if frappe.db.exists("WH Project", self.test_data["project"]):
                    frappe.delete_doc("WH Project", self.test_data["project"], force=1, ignore_permissions=True)
                self.log(f"Deleted test project")

            frappe.db.commit()
            self.log("[CLEANUP] Test data removed successfully\n")

        except Exception as e:
            self.log(f"[CLEANUP ERROR] {str(e)}", "ERROR")
            frappe.db.rollback()


def test_get_tasks_includes_dependency_counts(runner):
    """Test that get_tasks API includes blocked_by_count and blocks_count"""
    runner.log("\n[TEST] get_tasks() includes dependency counts")

    from workhub_frappe_app.api.tasks import get_tasks

    try:
        # Get all tasks in test project
        tasks = get_tasks(filters=json.dumps({"project": runner.test_data["project"]}))

        runner.assert_true(len(tasks) > 0, "Returns tasks")

        # Find Task A (blocks 2 tasks)
        task_a = next((t for t in tasks if "Task A" in t.get("title", "")), None)
        if task_a:
            runner.assert_has_key(task_a, "blocked_by_count", "Task A has blocked_by_count")
            runner.assert_has_key(task_a, "blocks_count", "Task A has blocks_count")
            runner.assert_equal(task_a.get("blocked_by_count"), 0, "Task A blocked_by_count is 0")
            runner.assert_equal(task_a.get("blocks_count"), 2, "Task A blocks_count is 2")
        else:
            runner.assert_true(False, "Task A found in results")

        # Find Task B (blocked by 1 task)
        task_b = next((t for t in tasks if "Task B" in t.get("title", "")), None)
        if task_b:
            runner.assert_equal(task_b.get("blocked_by_count"), 1, "Task B blocked_by_count is 1")
            runner.assert_equal(task_b.get("blocks_count"), 0, "Task B blocks_count is 0")
        else:
            runner.assert_true(False, "Task B found in results")

        # Find Task D (no dependencies)
        task_d = next((t for t in tasks if "Task D" in t.get("title", "")), None)
        if task_d:
            runner.assert_equal(task_d.get("blocked_by_count"), 0, "Task D blocked_by_count is 0")
            runner.assert_equal(task_d.get("blocks_count"), 0, "Task D blocks_count is 0")
        else:
            runner.assert_true(False, "Task D found in results")

    except Exception as e:
        runner.log(f"Exception: {str(e)}", "ERROR")
        runner.failed += 1


def test_get_board_includes_dependency_counts(runner):
    """Test that get_board API includes blocked_by_count and blocks_count"""
    runner.log("\n[TEST] get_board() includes dependency counts")

    from workhub_frappe_app.api.projects import get_board

    try:
        # Get board data for test project
        columns = get_board(project_id=runner.test_data["project"])

        runner.assert_true(len(columns) > 0, "Returns columns")
        runner.assert_is_type(columns, list, "Returns list of columns")

        # Get all tasks from all columns
        all_tasks = []
        for column in columns:
            runner.assert_has_key(column, "tasks", f"Column {column.get('status')} has tasks")
            all_tasks.extend(column.get("tasks", []))

        runner.assert_true(len(all_tasks) > 0, "Board has tasks")

        # Verify Task A
        task_a = next((t for t in all_tasks if "Task A" in t.get("title", "")), None)
        if task_a:
            runner.assert_has_key(task_a, "blocked_by_count", "Board Task A has blocked_by_count")
            runner.assert_has_key(task_a, "blocks_count", "Board Task A has blocks_count")
            runner.assert_equal(task_a.get("blocks_count"), 2, "Board Task A blocks 2 tasks")
        else:
            runner.assert_true(False, "Task A found in board")

    except Exception as e:
        runner.log(f"Exception: {str(e)}", "ERROR")
        runner.failed += 1


def test_change_status_blocking_warning(runner):
    """Test that change_status warns when completing a task that blocks others"""
    runner.log("\n[TEST] change_status() warns about blocking tasks")

    from workhub_frappe_app.api.tasks import change_status

    try:
        task_a_id = runner.test_data["tasks"][0]

        # Change Task A to DONE (should warn about blocking B and C)
        result = change_status(task_a_id, "DONE")

        runner.assert_has_key(result, "success", "Result has success")
        runner.assert_equal(result.get("success"), True, "Change status succeeded")
        runner.assert_has_key(result, "warning", "Result has warning")
        runner.assert_has_key(result, "blocked_tasks", "Result has blocked_tasks")

        blocked_tasks = result.get("blocked_tasks", [])
        runner.assert_equal(len(blocked_tasks), 2, "Warning shows 2 blocked tasks")

        # Verify warning message
        warning = result.get("warning", "")
        runner.assert_true("2" in warning, "Warning mentions 2 tasks")
        runner.assert_true("blocking" in warning.lower() or "bloqu" in warning.lower(),
                          "Warning mentions blocking")

        # Change back to NEXT for other tests
        change_status(task_a_id, "NEXT")
        frappe.db.commit()

    except Exception as e:
        runner.log(f"Exception: {str(e)}", "ERROR")
        runner.failed += 1


def test_move_task_blocking_warning(runner):
    """Test that move_task warns when completing a task that blocks others"""
    runner.log("\n[TEST] move_task() warns about blocking tasks")

    from workhub_frappe_app.api.projects import move_task

    try:
        task_a_id = runner.test_data["tasks"][0]

        # Move Task A to DONE (should warn about blocking B and C)
        result = move_task(task_a_id, "DONE")

        runner.assert_has_key(result, "success", "Result has success")
        runner.assert_equal(result.get("success"), True, "Move task succeeded")
        runner.assert_has_key(result, "warning", "Result has warning")
        runner.assert_has_key(result, "blocked_tasks", "Result has blocked_tasks")

        blocked_tasks = result.get("blocked_tasks", [])
        runner.assert_equal(len(blocked_tasks), 2, "Warning shows 2 blocked tasks")

        # Move back to NEXT for other tests
        move_task(task_a_id, "NEXT")
        frappe.db.commit()

    except Exception as e:
        runner.log(f"Exception: {str(e)}", "ERROR")
        runner.failed += 1


def test_get_dependency_popover_data(runner):
    """Test get_dependency_popover_data endpoint"""
    runner.log("\n[TEST] get_dependency_popover_data() returns detailed dependency info")

    from workhub_frappe_app.api.tasks import get_dependency_popover_data

    try:
        # Test Task A (blocks 2 tasks)
        task_a_id = runner.test_data["tasks"][0]
        result = get_dependency_popover_data(task_a_id)

        runner.assert_has_key(result, "blocked_by", "Result has blocked_by")
        runner.assert_has_key(result, "blocks", "Result has blocks")
        runner.assert_has_key(result, "blocked_by_count", "Result has blocked_by_count")
        runner.assert_has_key(result, "blocks_count", "Result has blocks_count")

        runner.assert_equal(result.get("blocked_by_count"), 0, "Task A blocked_by_count is 0")
        runner.assert_equal(result.get("blocks_count"), 2, "Task A blocks_count is 2")

        blocks = result.get("blocks", [])
        runner.assert_equal(len(blocks), 2, "Task A blocks array has 2 items")

        # Verify block item structure
        if len(blocks) > 0:
            block = blocks[0]
            runner.assert_has_key(block, "task_id", "Block has task_id")
            runner.assert_has_key(block, "title", "Block has title")
            runner.assert_has_key(block, "status", "Block has status")
            runner.assert_has_key(block, "assigned_to", "Block has assigned_to")
            runner.assert_has_key(block, "priority", "Block has priority")

        # Test Task B (blocked by 1 task)
        task_b_id = runner.test_data["tasks"][1]
        result_b = get_dependency_popover_data(task_b_id)

        runner.assert_equal(result_b.get("blocked_by_count"), 1, "Task B blocked_by_count is 1")
        runner.assert_equal(result_b.get("blocks_count"), 0, "Task B blocks_count is 0")

        blocked_by = result_b.get("blocked_by", [])
        runner.assert_equal(len(blocked_by), 1, "Task B blocked_by array has 1 item")

        # Verify blocked_by item structure
        if len(blocked_by) > 0:
            blocker = blocked_by[0]
            runner.assert_has_key(blocker, "task_id", "Blocker has task_id")
            runner.assert_has_key(blocker, "title", "Blocker has title")
            runner.assert_has_key(blocker, "status", "Blocker has status")
            runner.assert_true("Task A" in blocker.get("title", ""),
                              "Blocker is Task A")

    except Exception as e:
        runner.log(f"Exception: {str(e)}", "ERROR")
        runner.failed += 1


def test_get_dependency_counts(runner):
    """Test get_dependency_counts batch endpoint"""
    runner.log("\n[TEST] get_dependency_counts() returns counts for multiple tasks")

    from workhub_frappe_app.api.tasks import get_dependency_counts

    try:
        # Get counts for all test tasks
        task_ids = runner.test_data["tasks"]
        result = get_dependency_counts(task_ids)

        runner.assert_is_type(result, list, "Result is list")

        # Result should only include tasks with dependencies (A, B, C)
        # Task D has no dependencies so it won't be in the result
        runner.assert_true(len(result) >= 3, "Result includes at least 3 tasks with dependencies")

        # Verify structure of returned items
        if len(result) > 0:
            item = result[0]
            runner.assert_has_key(item, "task_id", "Item has task_id")
            runner.assert_has_key(item, "blocked_by_count", "Item has blocked_by_count")
            runner.assert_has_key(item, "blocks_count", "Item has blocks_count")

        # Find Task A in results
        task_a_result = next((r for r in result if r.get("task_id") == task_ids[0]), None)
        if task_a_result:
            runner.assert_equal(task_a_result.get("blocked_by_count"), 0,
                              "Batch: Task A blocked_by_count is 0")
            runner.assert_equal(task_a_result.get("blocks_count"), 2,
                              "Batch: Task A blocks_count is 2")
        else:
            runner.assert_true(False, "Task A found in batch results")

    except Exception as e:
        runner.log(f"Exception: {str(e)}", "ERROR")
        runner.failed += 1


def test_add_dependency(runner):
    """Test add_dependency endpoint"""
    runner.log("\n[TEST] add_dependency() creates new dependency")

    from workhub_frappe_app.api.tasks import add_dependency

    try:
        # Create new dependency: Task D blocks Task B
        task_d_id = runner.test_data["tasks"][3]
        task_b_id = runner.test_data["tasks"][1]

        result = add_dependency(predecessor_id=task_d_id, successor_id=task_b_id)

        runner.assert_has_key(result, "success", "Result has success")
        runner.assert_has_key(result, "dependency_id", "Result has dependency_id")
        runner.assert_equal(result.get("success"), True, "Add dependency succeeded")

        # Store for cleanup
        dep_id = result.get("dependency_id")
        if dep_id:
            runner.test_data.setdefault("dependencies", []).append(dep_id)

        # Verify dependency was created
        dep_exists = frappe.db.exists("WH Task Dependency", {
            "predecessor": task_d_id,
            "successor": task_b_id,
            "is_active": 1
        })
        runner.assert_true(dep_exists, "Dependency exists in database")

        frappe.db.commit()

    except Exception as e:
        runner.log(f"Exception: {str(e)}", "ERROR")
        runner.failed += 1


def test_add_dependency_circular_check(runner):
    """Test that add_dependency prevents circular dependencies"""
    runner.log("\n[TEST] add_dependency() prevents circular dependencies")

    from workhub_frappe_app.api.tasks import add_dependency

    try:
        # Try to create circular dependency: Task B blocks Task A (but A already blocks B)
        task_a_id = runner.test_data["tasks"][0]
        task_b_id = runner.test_data["tasks"][1]

        try:
            result = add_dependency(predecessor_id=task_b_id, successor_id=task_a_id)
            runner.assert_true(False, "Should have thrown error for circular dependency")
        except frappe.exceptions.ValidationError as e:
            runner.assert_true("circular" in str(e).lower(),
                              "Error message mentions circular dependency")
        except Exception as e:
            # Frappe might throw different exception types
            runner.assert_true("circular" in str(e).lower() or "cycle" in str(e).lower(),
                              "Error mentions circular dependency or cycle")

        frappe.db.rollback()  # Rollback any partial changes

    except Exception as e:
        runner.log(f"Exception: {str(e)}", "ERROR")
        runner.failed += 1
        frappe.db.rollback()


def test_remove_dependency(runner):
    """Test remove_dependency endpoint"""
    runner.log("\n[TEST] remove_dependency() deactivates dependency")

    from workhub_frappe_app.api.tasks import remove_dependency

    try:
        # Get one of the test dependencies
        if "dependencies" in runner.test_data and len(runner.test_data["dependencies"]) > 0:
            dep_id = runner.test_data["dependencies"][0]

            # Remove the dependency
            result = remove_dependency(dep_id)

            runner.assert_has_key(result, "success", "Result has success")
            runner.assert_equal(result.get("success"), True, "Remove dependency succeeded")

            # Verify is_active was set to 0
            is_active = frappe.db.get_value("WH Task Dependency", dep_id, "is_active")
            runner.assert_equal(is_active, 0, "Dependency is_active set to 0")

            # Re-activate for other tests
            frappe.db.set_value("WH Task Dependency", dep_id, "is_active", 1)
            frappe.db.commit()
        else:
            runner.assert_true(False, "Test dependencies available")

    except Exception as e:
        runner.log(f"Exception: {str(e)}", "ERROR")
        runner.failed += 1


def test_get_task_dependencies(runner):
    """Test get_task_dependencies endpoint"""
    runner.log("\n[TEST] get_task_dependencies() returns predecessors and successors")

    from workhub_frappe_app.api.tasks import get_task_dependencies

    try:
        # Test Task A (has 2 successors, no predecessors)
        task_a_id = runner.test_data["tasks"][0]
        result = get_task_dependencies(task_a_id)

        runner.assert_has_key(result, "predecessors", "Result has predecessors")
        runner.assert_has_key(result, "successors", "Result has successors")

        predecessors = result.get("predecessors", [])
        successors = result.get("successors", [])

        runner.assert_equal(len(predecessors), 0, "Task A has no predecessors")
        runner.assert_equal(len(successors), 2, "Task A has 2 successors")

        # Verify successor structure
        if len(successors) > 0:
            successor = successors[0]
            runner.assert_has_key(successor, "name", "Successor has name (dependency ID)")
            runner.assert_has_key(successor, "successor", "Successor has successor (task ID)")
            runner.assert_has_key(successor, "type", "Successor has type")
            runner.assert_has_key(successor, "title", "Successor has title")
            runner.assert_has_key(successor, "status", "Successor has status")

        # Test Task B (has 1 predecessor, no successors)
        task_b_id = runner.test_data["tasks"][1]
        result_b = get_task_dependencies(task_b_id)

        predecessors_b = result_b.get("predecessors", [])
        successors_b = result_b.get("successors", [])

        runner.assert_equal(len(predecessors_b), 1, "Task B has 1 predecessor")
        runner.assert_equal(len(successors_b), 0, "Task B has no successors")

        # Verify predecessor structure
        if len(predecessors_b) > 0:
            predecessor = predecessors_b[0]
            runner.assert_has_key(predecessor, "predecessor", "Predecessor has predecessor (task ID)")
            runner.assert_has_key(predecessor, "title", "Predecessor has title")
            runner.assert_true("Task A" in predecessor.get("title", ""),
                              "Predecessor is Task A")

    except Exception as e:
        runner.log(f"Exception: {str(e)}", "ERROR")
        runner.failed += 1


def run_all_tests():
    """Run all dependency API tests"""
    print("\n" + "=" * 70)
    print("WorkHub Dependency API Test Suite")
    print("=" * 70)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"User: {frappe.session.user}")
    print(f"Site: {frappe.local.site}")

    runner = TestRunner()

    # Setup test data
    if not runner.setup_test_data():
        print("\n[ABORT] Failed to setup test data. Aborting tests.")
        return

    try:
        # Run all tests
        test_get_tasks_includes_dependency_counts(runner)
        test_get_board_includes_dependency_counts(runner)
        test_change_status_blocking_warning(runner)
        test_move_task_blocking_warning(runner)
        test_get_dependency_popover_data(runner)
        test_get_dependency_counts(runner)
        test_add_dependency(runner)
        test_add_dependency_circular_check(runner)
        test_remove_dependency(runner)
        test_get_task_dependencies(runner)

    finally:
        # Always cleanup
        runner.cleanup_test_data()

    # Print summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print(f"Total Tests: {runner.passed + runner.failed}")
    print(f"✓ Passed: {runner.passed}")
    print(f"✗ Failed: {runner.failed}")

    if runner.errors:
        print("\nFailed Tests:")
        for error in runner.errors:
            print(f"  - {error}")

    print(f"\nCompleted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70 + "\n")

    return {
        "passed": runner.passed,
        "failed": runner.failed,
        "total": runner.passed + runner.failed,
        "errors": runner.errors
    }


if __name__ == "__main__":
    # This won't work standalone - needs Frappe context
    print("This script must be run from within Frappe context:")
    print("  bench --site [site] execute workhub_frappe_app.scripts.test_dependencies.run_all_tests")
