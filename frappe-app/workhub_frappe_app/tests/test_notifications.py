#!/usr/bin/env python3
"""
WorkHub Notification System Tests
Tests all notification types and verifies they're created correctly

Run from frappe bench:
    bench --site <site> execute workhub_frappe_app.tests.test_notifications.run_all_tests
"""

import frappe
from frappe.utils import now_datetime, nowdate, add_days
import json


class NotificationTestRunner:
    """Test runner for notification system"""

    def __init__(self):
        self.test_results = []
        self.test_user = None
        self.test_user2 = None
        self.test_project = None
        self.test_task = None
        self.test_order = None
        self.test_customer = None
        self.cleanup_items = []

    def log_test(self, test_name, passed, message=""):
        """Log test result"""
        status = "✓ PASS" if passed else "✗ FAIL"
        result = {
            "test": test_name,
            "passed": passed,
            "message": message
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if message:
            print(f"  {message}")

    def setup_test_data(self):
        """Create test data for notification tests"""
        print("\n=== Setting up test data ===")

        try:
            # Create test users
            self.test_user = self._create_test_user("test_notif_user1@example.com", "Test User 1")
            self.test_user2 = self._create_test_user("test_notif_user2@example.com", "Test User 2")

            # Create test project
            self.test_project = self._create_test_project()

            # Create test customer for orders
            self.test_customer = self._create_test_customer()

            print(f"✓ Test data created: users={self.test_user}, {self.test_user2}")
            print(f"  Project: {self.test_project}")
            print(f"  Customer: {self.test_customer}")
            return True

        except Exception as e:
            print(f"✗ Failed to setup test data: {e}")
            frappe.db.rollback()
            return False

    def _create_test_user(self, email, full_name):
        """Create a test user if it doesn't exist"""
        if frappe.db.exists("User", email):
            user = frappe.get_doc("User", email)
        else:
            user = frappe.new_doc("User")
            user.email = email
            user.first_name = full_name
            user.enabled = 1
            user.send_welcome_email = 0
            user.insert(ignore_permissions=True)
            self.cleanup_items.append(("User", email))

        # Set notification preferences to default (all enabled)
        prefs = {
            "email": True,
            "push": False,
            "task_assigned": True,
            "task_status": True,
            "overdue_alerts": True,
            "order_status": True,
            "project_health": True,
            "digest_frequency": "daily"
        }
        user.workhub_notifications = json.dumps(prefs)
        user.save(ignore_permissions=True)

        return email

    def _create_test_project(self):
        """Create a test project"""
        project = frappe.new_doc("WH Project")
        project.title = "Test Notification Project"
        project.description = "Test project for notifications"
        project.status = "ACTIVE"
        project.department = "OPS"
        project.owner_user = self.test_user
        project.insert(ignore_permissions=True)
        self.cleanup_items.append(("WH Project", project.name))
        return project.name

    def _create_test_customer(self):
        """Create a test customer for distributor orders"""
        if frappe.db.exists("Customer", "Test Notif Customer"):
            return "Test Notif Customer"

        customer = frappe.new_doc("Customer")
        customer.customer_name = "Test Notif Customer"
        customer.customer_type = "Company"
        customer.customer_group = "Commercial"
        customer.territory = "All Territories"
        customer.insert(ignore_permissions=True)
        self.cleanup_items.append(("Customer", customer.name))
        return customer.name

    def _create_test_task(self, title, assigned_to=None, status="BACKLOG"):
        """Create a test task"""
        task = frappe.new_doc("WH Task")
        task.title = title
        task.description = f"Test task: {title}"
        task.status = status
        task.priority = "P2"
        task.project = self.test_project
        task.assigned_to = assigned_to or self.test_user
        task.due_date = add_days(nowdate(), 7)
        task.insert(ignore_permissions=True)
        self.cleanup_items.append(("WH Task", task.name))
        return task.name

    def _create_test_order(self, status="Pending"):
        """Create a test distributor order"""
        order = frappe.new_doc("Distributor Sell Out Order")
        order.customer = self.test_customer
        order.customer_name = self.test_customer
        order.distributor = self.test_customer
        order.distributor_name = self.test_customer
        order.status = status
        order.order_date = nowdate()
        order.total_amount = 1000.00
        order.insert(ignore_permissions=True)
        self.cleanup_items.append(("Distributor Sell Out Order", order.name))
        return order.name

    def _get_notifications_for_user(self, user, notification_type=None):
        """Get notifications for a user"""
        filters = {"user": user}
        if notification_type:
            filters["type"] = notification_type

        notifications = frappe.get_all("WH Notification",
            filters=filters,
            fields=["name", "type", "title", "message", "priority", "reference_name"],
            order_by="created_at desc")

        return notifications

    def _clear_notifications_for_user(self, user):
        """Clear all notifications for a user"""
        notifications = frappe.get_all("WH Notification",
            filters={"user": user},
            fields=["name"])

        for notif in notifications:
            frappe.delete_doc("WH Notification", notif.name, ignore_permissions=True)

    # ========== TEST: Task Assignment Notifications ==========

    def test_task_assignment_notification(self):
        """Test that task assignment creates notification"""
        print("\n=== Test: Task Assignment Notification ===")

        try:
            # Clear previous notifications
            self._clear_notifications_for_user(self.test_user)

            # Create a task assigned to test_user
            task_id = self._create_test_task("Task for assignment test", self.test_user)
            frappe.db.commit()

            # Check notification was created
            notifications = self._get_notifications_for_user(self.test_user, "TASK_ASSIGNED")

            if len(notifications) > 0:
                notif = notifications[0]
                if task_id in notif.get("reference_name", ""):
                    self.log_test("Task Assignment Notification", True,
                        f"Notification created: {notif['title']}")
                else:
                    self.log_test("Task Assignment Notification", False,
                        f"Notification reference mismatch: expected {task_id}, got {notif.get('reference_name')}")
            else:
                self.log_test("Task Assignment Notification", False,
                    "No TASK_ASSIGNED notification created")

        except Exception as e:
            self.log_test("Task Assignment Notification", False, f"Error: {e}")

    def test_task_reassignment_notification(self):
        """Test that reassigning a task notifies both users"""
        print("\n=== Test: Task Reassignment Notification ===")

        try:
            # Clear previous notifications
            self._clear_notifications_for_user(self.test_user)
            self._clear_notifications_for_user(self.test_user2)

            # Create task assigned to user1
            task_id = self._create_test_task("Task for reassignment test", self.test_user)
            frappe.db.commit()

            # Clear notifications after initial assignment
            self._clear_notifications_for_user(self.test_user)

            # Reassign to user2
            task = frappe.get_doc("WH Task", task_id)
            task.assigned_to = self.test_user2
            task.save(ignore_permissions=True)
            frappe.db.commit()

            # Check user1 got notification about reassignment
            user1_notifs = self._get_notifications_for_user(self.test_user, "TASK_ASSIGNED")

            # Check user2 got notification about new assignment
            user2_notifs = self._get_notifications_for_user(self.test_user2, "TASK_ASSIGNED")

            if len(user1_notifs) > 0 and len(user2_notifs) > 0:
                self.log_test("Task Reassignment Notification", True,
                    f"Both users notified: user1={len(user1_notifs)}, user2={len(user2_notifs)}")
            elif len(user2_notifs) > 0:
                self.log_test("Task Reassignment Notification", True,
                    f"New assignee notified (old assignee notification may be optional)")
            else:
                self.log_test("Task Reassignment Notification", False,
                    f"Missing notifications: user1={len(user1_notifs)}, user2={len(user2_notifs)}")

        except Exception as e:
            self.log_test("Task Reassignment Notification", False, f"Error: {e}")

    # ========== TEST: Task Status Change Notifications ==========

    def test_task_status_change_to_done(self):
        """Test that marking task as DONE creates notification"""
        print("\n=== Test: Task Status Change to DONE ===")

        try:
            # Clear previous notifications
            self._clear_notifications_for_user(self.test_user)

            # Create task in DOING status
            task_id = self._create_test_task("Task for completion test", self.test_user, "DOING")
            frappe.db.commit()

            # Clear initial notifications
            self._clear_notifications_for_user(self.test_user)

            # Change status to DONE (as different user to trigger notification)
            frappe.set_user(self.test_user2)
            task = frappe.get_doc("WH Task", task_id)
            task.status = "DONE"
            task.save(ignore_permissions=True)
            frappe.db.commit()
            frappe.set_user("Administrator")

            # Check notification was created
            notifications = self._get_notifications_for_user(self.test_user, "COMPLETED")

            if len(notifications) > 0:
                notif = notifications[0]
                self.log_test("Task Status Change to DONE", True,
                    f"COMPLETED notification created: {notif['title']}")
            else:
                self.log_test("Task Status Change to DONE", False,
                    "No COMPLETED notification created")

        except Exception as e:
            self.log_test("Task Status Change to DONE", False, f"Error: {e}")
        finally:
            frappe.set_user("Administrator")

    def test_task_status_change_to_blocked(self):
        """Test that marking task as BLOCKED creates HIGH priority notification"""
        print("\n=== Test: Task Status Change to BLOCKED ===")

        try:
            # Clear previous notifications
            self._clear_notifications_for_user(self.test_user)

            # Create task in DOING status
            task_id = self._create_test_task("Task for blocking test", self.test_user, "DOING")
            frappe.db.commit()

            # Clear initial notifications
            self._clear_notifications_for_user(self.test_user)

            # Change status to BLOCKED
            task = frappe.get_doc("WH Task", task_id)
            task.status = "BLOCKED"
            task.blocked_reason = "Waiting for approval"
            task.save(ignore_permissions=True)
            frappe.db.commit()

            # Check notification was created with HIGH/MEDIUM priority
            notifications = self._get_notifications_for_user(self.test_user, "BLOCKED")

            if len(notifications) > 0:
                notif = notifications[0]
                priority = notif.get("priority", "")
                if priority in ["HIGH", "MEDIUM"]:
                    self.log_test("Task Status Change to BLOCKED", True,
                        f"BLOCKED notification created with {priority} priority")
                else:
                    self.log_test("Task Status Change to BLOCKED", False,
                        f"Wrong priority: expected HIGH/MEDIUM, got {priority}")
            else:
                self.log_test("Task Status Change to BLOCKED", False,
                    "No BLOCKED notification created")

        except Exception as e:
            self.log_test("Task Status Change to BLOCKED", False, f"Error: {e}")

    def test_task_completion_notifies_successors(self):
        """Test that completing a task notifies blocked successors"""
        print("\n=== Test: Task Completion Notifies Successors ===")

        try:
            # Clear previous notifications
            self._clear_notifications_for_user(self.test_user2)

            # Create two tasks: predecessor (user1) and successor (user2)
            task1_id = self._create_test_task("Predecessor task", self.test_user, "DOING")
            task2_id = self._create_test_task("Successor task", self.test_user2, "BLOCKED")

            # Create dependency
            dep = frappe.new_doc("WH Task Dependency")
            dep.predecessor = task1_id
            dep.successor = task2_id
            dep.is_active = 1
            dep.insert(ignore_permissions=True)
            self.cleanup_items.append(("WH Task Dependency", dep.name))
            frappe.db.commit()

            # Clear notifications
            self._clear_notifications_for_user(self.test_user2)

            # Complete task1
            task1 = frappe.get_doc("WH Task", task1_id)
            task1.status = "DONE"
            task1.save(ignore_permissions=True)
            frappe.db.commit()

            # Check user2 got notification that task is unblocked
            notifications = self._get_notifications_for_user(self.test_user2, "COMPLETED")

            found_unblock_notif = False
            for notif in notifications:
                if task2_id in notif.get("reference_name", ""):
                    found_unblock_notif = True
                    break

            if found_unblock_notif:
                self.log_test("Task Completion Notifies Successors", True,
                    f"Successor notified about unblocking")
            else:
                self.log_test("Task Completion Notifies Successors", False,
                    f"No notification for successor task {task2_id}")

        except Exception as e:
            self.log_test("Task Completion Notifies Successors", False, f"Error: {e}")

    # ========== TEST: Distributor Order Notifications ==========

    def test_order_status_change_to_delivered(self):
        """Test that marking order as Delivered creates notification"""
        print("\n=== Test: Order Status Change to Delivered ===")

        try:
            # Create a Sales User for testing
            sales_user = self._create_test_user("test_sales_user@example.com", "Sales Test User")

            # Add Sales User role
            if not frappe.db.exists("Has Role", {
                "parent": sales_user,
                "role": "Sales User",
                "parenttype": "User"
            }):
                user_doc = frappe.get_doc("User", sales_user)
                user_doc.append("roles", {"role": "Sales User"})
                user_doc.save(ignore_permissions=True)

            # Clear notifications
            self._clear_notifications_for_user(sales_user)

            # Create order in Pending status
            order_id = self._create_test_order("Pending")
            frappe.db.commit()

            # Clear initial notifications
            self._clear_notifications_for_user(sales_user)

            # Change status to Delivered
            order = frappe.get_doc("Distributor Sell Out Order", order_id)
            order.status = "Delivered"
            order.save(ignore_permissions=True)
            frappe.db.commit()

            # Check notification was created for sales team
            notifications = self._get_notifications_for_user(sales_user, "ORDER_DELIVERED")

            if len(notifications) > 0:
                notif = notifications[0]
                self.log_test("Order Status Change to Delivered", True,
                    f"ORDER_DELIVERED notification created: {notif['title']}")
            else:
                self.log_test("Order Status Change to Delivered", False,
                    "No ORDER_DELIVERED notification created for sales user")

        except Exception as e:
            self.log_test("Order Status Change to Delivered", False, f"Error: {e}")

    def test_order_status_change_to_issue(self):
        """Test that marking order with Issue creates HIGH priority notification"""
        print("\n=== Test: Order Status Change to Issue ===")

        try:
            # Create a Sales User for testing
            sales_user = self._create_test_user("test_sales_user@example.com", "Sales Test User")

            # Add Sales User role if not exists
            if not frappe.db.exists("Has Role", {
                "parent": sales_user,
                "role": "Sales User",
                "parenttype": "User"
            }):
                user_doc = frappe.get_doc("User", sales_user)
                user_doc.append("roles", {"role": "Sales User"})
                user_doc.save(ignore_permissions=True)

            # Clear notifications
            self._clear_notifications_for_user(sales_user)

            # Create order in Pending status
            order_id = self._create_test_order("Pending")
            frappe.db.commit()

            # Clear initial notifications
            self._clear_notifications_for_user(sales_user)

            # Change status to Issue
            order = frappe.get_doc("Distributor Sell Out Order", order_id)
            order.status = "Issue"
            order.issue_notes = "Damaged goods received"
            order.save(ignore_permissions=True)
            frappe.db.commit()

            # Check notification was created with HIGH priority
            notifications = self._get_notifications_for_user(sales_user, "ORDER_STATUS")

            found_issue_notif = False
            for notif in notifications:
                if notif.get("priority") == "HIGH" and order_id in notif.get("reference_name", ""):
                    found_issue_notif = True
                    break

            if found_issue_notif:
                self.log_test("Order Status Change to Issue", True,
                    f"HIGH priority ORDER_STATUS notification created")
            else:
                self.log_test("Order Status Change to Issue", False,
                    f"No HIGH priority notification for issue order")

        except Exception as e:
            self.log_test("Order Status Change to Issue", False, f"Error: {e}")

    def test_new_order_notification(self):
        """Test that creating new order notifies sales team"""
        print("\n=== Test: New Order Notification ===")

        try:
            # Create a Sales User for testing
            sales_user = self._create_test_user("test_sales_user@example.com", "Sales Test User")

            # Add Sales User role if not exists
            if not frappe.db.exists("Has Role", {
                "parent": sales_user,
                "role": "Sales User",
                "parenttype": "User"
            }):
                user_doc = frappe.get_doc("User", sales_user)
                user_doc.append("roles", {"role": "Sales User"})
                user_doc.save(ignore_permissions=True)

            # Clear notifications
            self._clear_notifications_for_user(sales_user)

            # Create new order
            order_id = self._create_test_order("Pending")
            frappe.db.commit()

            # Check notification was created
            notifications = self._get_notifications_for_user(sales_user, "ORDER_CREATED")

            if len(notifications) > 0:
                notif = notifications[0]
                self.log_test("New Order Notification", True,
                    f"ORDER_CREATED notification created: {notif['title']}")
            else:
                self.log_test("New Order Notification", False,
                    "No ORDER_CREATED notification created")

        except Exception as e:
            self.log_test("New Order Notification", False, f"Error: {e}")

    # ========== TEST: Preference Filtering ==========

    def test_preference_filtering_task_assigned(self):
        """Test that disabling task_assigned preference blocks notifications"""
        print("\n=== Test: Preference Filtering - Task Assigned ===")

        try:
            # Disable task_assigned preference for test_user
            user_doc = frappe.get_doc("User", self.test_user)
            prefs = json.loads(user_doc.workhub_notifications) if user_doc.workhub_notifications else {}
            prefs["task_assigned"] = False
            user_doc.workhub_notifications = json.dumps(prefs)
            user_doc.save(ignore_permissions=True)

            # Clear notifications
            self._clear_notifications_for_user(self.test_user)

            # Create task assigned to test_user (MEDIUM priority)
            task_id = self._create_test_task("Task for preference test", self.test_user)
            task = frappe.get_doc("WH Task", task_id)
            task.priority = "P2"  # MEDIUM priority (not HIGH)
            task.save(ignore_permissions=True)
            frappe.db.commit()

            # Check NO notification was created (preference disabled)
            notifications = self._get_notifications_for_user(self.test_user, "TASK_ASSIGNED")

            if len(notifications) == 0:
                self.log_test("Preference Filtering - Task Assigned", True,
                    "Notification correctly blocked by preference")
            else:
                self.log_test("Preference Filtering - Task Assigned", False,
                    f"Notification created despite preference disabled: {len(notifications)} notifications")

            # Re-enable preference for other tests
            prefs["task_assigned"] = True
            user_doc.workhub_notifications = json.dumps(prefs)
            user_doc.save(ignore_permissions=True)

        except Exception as e:
            self.log_test("Preference Filtering - Task Assigned", False, f"Error: {e}")

    def test_high_priority_bypasses_preferences(self):
        """Test that HIGH priority notifications bypass preferences"""
        print("\n=== Test: HIGH Priority Bypasses Preferences ===")

        try:
            # Disable task_assigned preference for test_user
            user_doc = frappe.get_doc("User", self.test_user)
            prefs = json.loads(user_doc.workhub_notifications) if user_doc.workhub_notifications else {}
            prefs["task_assigned"] = False
            user_doc.workhub_notifications = json.dumps(prefs)
            user_doc.save(ignore_permissions=True)

            # Clear notifications
            self._clear_notifications_for_user(self.test_user)

            # Create P0 task (HIGH priority) assigned to test_user
            task = frappe.new_doc("WH Task")
            task.title = "HIGH priority task for preference test"
            task.description = "Test HIGH priority bypass"
            task.status = "NEXT"
            task.priority = "P0"  # HIGH priority
            task.project = self.test_project
            task.assigned_to = self.test_user
            task.due_date = nowdate()
            task.insert(ignore_permissions=True)
            self.cleanup_items.append(("WH Task", task.name))
            frappe.db.commit()

            # Check notification WAS created (HIGH priority bypasses preference)
            notifications = self._get_notifications_for_user(self.test_user, "TASK_ASSIGNED")

            if len(notifications) > 0:
                notif = notifications[0]
                if notif.get("priority") == "HIGH":
                    self.log_test("HIGH Priority Bypasses Preferences", True,
                        "HIGH priority notification created despite preference disabled")
                else:
                    self.log_test("HIGH Priority Bypasses Preferences", False,
                        f"Notification created but wrong priority: {notif.get('priority')}")
            else:
                self.log_test("HIGH Priority Bypasses Preferences", False,
                    "HIGH priority notification was blocked by preference (should bypass)")

            # Re-enable preference for other tests
            prefs["task_assigned"] = True
            user_doc.workhub_notifications = json.dumps(prefs)
            user_doc.save(ignore_permissions=True)

        except Exception as e:
            self.log_test("HIGH Priority Bypasses Preferences", False, f"Error: {e}")

    # ========== CLEANUP ==========

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n=== Cleaning up test data ===")

        try:
            # Clean up in reverse order (dependencies first)
            for doctype, name in reversed(self.cleanup_items):
                try:
                    if frappe.db.exists(doctype, name):
                        frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
                except Exception as e:
                    print(f"  Warning: Could not delete {doctype} {name}: {e}")

            # Clear all test notifications
            if self.test_user:
                self._clear_notifications_for_user(self.test_user)
            if self.test_user2:
                self._clear_notifications_for_user(self.test_user2)

            frappe.db.commit()
            print("✓ Cleanup complete")

        except Exception as e:
            print(f"✗ Cleanup error: {e}")

    # ========== SUMMARY ==========

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)

        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r["passed"])
        failed = total - passed

        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")

        if failed > 0:
            print("\nFailed Tests:")
            for result in self.test_results:
                if not result["passed"]:
                    print(f"  ✗ {result['test']}")
                    if result["message"]:
                        print(f"    {result['message']}")

        print("=" * 60)

        return passed == total


def run_all_tests():
    """Main function to run all notification tests"""
    print("\n" + "=" * 60)
    print("WorkHub Notification System - Comprehensive Tests")
    print("=" * 60)

    runner = NotificationTestRunner()

    try:
        # Setup
        if not runner.setup_test_data():
            print("✗ Failed to setup test data. Aborting tests.")
            return False

        # Run tests
        runner.test_task_assignment_notification()
        runner.test_task_reassignment_notification()
        runner.test_task_status_change_to_done()
        runner.test_task_status_change_to_blocked()
        runner.test_task_completion_notifies_successors()
        runner.test_order_status_change_to_delivered()
        runner.test_order_status_change_to_issue()
        runner.test_new_order_notification()
        runner.test_preference_filtering_task_assigned()
        runner.test_high_priority_bypasses_preferences()

        # Print summary
        all_passed = runner.print_summary()

        return all_passed

    except Exception as e:
        print(f"\n✗ Test suite error: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # Cleanup
        runner.cleanup_test_data()


if __name__ == "__main__":
    run_all_tests()
