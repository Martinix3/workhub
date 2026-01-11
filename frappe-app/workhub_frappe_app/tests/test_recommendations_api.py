# Integration Tests for AI Recommendations API
# Tests full API flow with real database interactions

import unittest
import frappe
from frappe.utils import nowdate, add_days, now_datetime
import json


class TestRecommendationsAPI(unittest.TestCase):
    """Integration tests for AI recommendations API endpoints."""

    @classmethod
    def setUpClass(cls):
        """Set up test data once for all tests."""
        # Create test site and initialize if needed
        frappe.set_user("Administrator")

    def setUp(self):
        """Set up fresh test data before each test."""
        frappe.set_user("Administrator")

        # Clear existing test data
        self.cleanup_test_data()

        # Create test user
        self.test_user = self.create_test_user("test_user@example.com", "Test User")
        self.manager_user = self.create_test_user("manager@example.com", "Test Manager", is_manager=True)

        # Create test tasks
        self.tasks = self.create_test_tasks()

    def tearDown(self):
        """Clean up after each test."""
        self.cleanup_test_data()
        frappe.set_user("Administrator")

    def cleanup_test_data(self):
        """Delete all test data from database."""
        # Delete test recommendations and feedback
        frappe.db.delete("WH Recommendation Feedback", {
            "user": ["in", ["test_user@example.com", "manager@example.com"]]
        })
        frappe.db.delete("WH AI Recommendation", {
            "user": ["in", ["test_user@example.com", "manager@example.com"]]
        })

        # Delete test tasks
        frappe.db.delete("WH Task", {
            "assigned_to": ["in", ["test_user@example.com", "manager@example.com"]]
        })

        # Delete test completion stats
        frappe.db.delete("WH Task Completion Stats", {
            "department": "SALES"
        })

        # Delete test users (but not Administrator)
        for email in ["test_user@example.com", "manager@example.com"]:
            if frappe.db.exists("User", email):
                frappe.delete_doc("User", email, force=True, ignore_permissions=True)

        frappe.db.commit()

    def create_test_user(self, email, full_name, is_manager=False):
        """Create a test user."""
        if frappe.db.exists("User", email):
            return email

        user = frappe.new_doc("User")
        user.email = email
        user.first_name = full_name
        user.enabled = 1
        user.send_welcome_email = 0

        # Add roles
        user.append("roles", {"role": "System User"})
        if is_manager:
            user.append("roles", {"role": "WH Manager"})

        user.insert(ignore_permissions=True)
        frappe.db.commit()

        return email

    def create_test_tasks(self):
        """Create test tasks with various priorities and deadlines."""
        tasks = []

        # Task 1: P0 overdue - should score highest
        task1 = frappe.new_doc("WH Task")
        task1.title = "Urgent critical task"
        task1.assigned_to = self.test_user
        task1.priority = "P0"
        task1.status = "NEXT"
        task1.due_date = add_days(nowdate(), -2)
        task1.department = "SALES"
        task1.estimated_hours = 4
        task1.insert(ignore_permissions=True)
        tasks.append(task1.name)

        # Task 2: P1 due today
        task2 = frappe.new_doc("WH Task")
        task2.title = "Important task for today"
        task2.assigned_to = self.test_user
        task2.priority = "P1"
        task2.status = "NEXT"
        task2.due_date = nowdate()
        task2.department = "SALES"
        task2.estimated_hours = 2
        task2.insert(ignore_permissions=True)
        tasks.append(task2.name)

        # Task 3: P2 future deadline - should score lower
        task3 = frappe.new_doc("WH Task")
        task3.title = "Low priority task"
        task3.assigned_to = self.test_user
        task3.priority = "P2"
        task3.status = "BACKLOG"
        task3.due_date = add_days(nowdate(), 30)
        task3.department = "SALES"
        task3.estimated_hours = 8
        task3.insert(ignore_permissions=True)
        tasks.append(task3.name)

        # Task 4: Blocked task - should be at risk
        task4 = frappe.new_doc("WH Task")
        task4.title = "Blocked task near deadline"
        task4.assigned_to = self.test_user
        task4.priority = "P1"
        task4.status = "BLOCKED"
        task4.due_date = add_days(nowdate(), 2)
        task4.department = "SALES"
        task4.estimated_hours = 10
        task4.insert(ignore_permissions=True)
        tasks.append(task4.name)

        # Task 5: Task for manager user - for permission tests
        task5 = frappe.new_doc("WH Task")
        task5.title = "Manager task"
        task5.assigned_to = self.manager_user
        task5.priority = "P1"
        task5.status = "NEXT"
        task5.due_date = add_days(nowdate(), 5)
        task5.department = "SALES"
        task5.estimated_hours = 3
        task5.insert(ignore_permissions=True)
        tasks.append(task5.name)

        frappe.db.commit()
        return tasks

    def test_get_next_task_recommendations(self):
        """Test getting next task recommendations for current user."""
        frappe.set_user(self.test_user)

        # Call API
        from workhub_frappe_app.api.recommendations import get_next_task_recommendations
        result = get_next_task_recommendations(limit=3)

        # Assertions
        self.assertTrue(result["success"])
        self.assertEqual(result["user"], self.test_user)
        self.assertGreater(result["count"], 0)
        self.assertLessEqual(result["count"], 3)

        # Check recommendation structure
        rec = result["recommendations"][0]
        self.assertIn("task_id", rec)
        self.assertIn("title", rec)
        self.assertIn("score", rec)
        self.assertIn("confidence", rec)
        self.assertIn("reason", rec)
        self.assertIn("priority", rec)

        # P0 overdue task should be first
        self.assertEqual(rec["priority"], "P0")
        self.assertTrue(rec["is_overdue"])

    def test_get_next_task_recommendations_permission_check(self):
        """Test that users can only see their own recommendations."""
        frappe.set_user(self.test_user)

        from workhub_frappe_app.api.recommendations import get_next_task_recommendations

        # Try to get another user's recommendations - should fail
        with self.assertRaises(frappe.exceptions.ValidationError):
            get_next_task_recommendations(user=self.manager_user)

    def test_get_next_task_recommendations_manager_access(self):
        """Test that managers can see other users' recommendations."""
        frappe.set_user(self.manager_user)

        from workhub_frappe_app.api.recommendations import get_next_task_recommendations
        result = get_next_task_recommendations(user=self.test_user)

        # Manager should be able to see test_user's tasks
        self.assertTrue(result["success"])
        self.assertEqual(result["user"], self.test_user)

    def test_get_at_risk_tasks(self):
        """Test getting at-risk tasks for current user."""
        frappe.set_user(self.test_user)

        from workhub_frappe_app.api.recommendations import get_at_risk_tasks
        result = get_at_risk_tasks(limit=10)

        # Assertions
        self.assertTrue(result["success"])
        self.assertEqual(result["user"], self.test_user)

        # Should have at least blocked and overdue tasks
        self.assertGreater(result["count"], 0)

        # Check at-risk task structure
        if result["count"] > 0:
            task = result["at_risk_tasks"][0]
            self.assertIn("task_id", task)
            self.assertIn("title", task)
            self.assertIn("risk_score", task)
            self.assertIn("risk_level", task)
            self.assertIn("reason", task)

            # Risk score should be between 0 and 1
            self.assertGreaterEqual(task["risk_score"], 0)
            self.assertLessEqual(task["risk_score"], 1)

            # Risk level should be valid
            self.assertIn(task["risk_level"], ["low", "medium", "high", "critical"])

    def test_get_at_risk_tasks_all_users_as_manager(self):
        """Test that managers can see all users' at-risk tasks."""
        frappe.set_user(self.manager_user)

        from workhub_frappe_app.api.recommendations import get_at_risk_tasks
        result = get_at_risk_tasks(user=None)  # None = all users

        # Manager should see at-risk tasks from multiple users
        self.assertTrue(result["success"])
        self.assertIsNone(result["user"])

    def test_get_duration_estimate(self):
        """Test getting AI duration estimate for a task."""
        frappe.set_user(self.test_user)

        # Create historical stats for similar tasks
        stats = frappe.new_doc("WH Task Completion Stats")
        stats.department = "SALES"
        stats.task_type = "urgent critical"
        stats.similar_task_title_pattern = "urgent critical"
        stats.avg_duration_hours = 5.5
        stats.median_duration_hours = 5.0
        stats.completion_count = 10
        stats.insert(ignore_permissions=True)
        frappe.db.commit()

        from workhub_frappe_app.api.recommendations import get_duration_estimate
        result = get_duration_estimate(task_id=self.tasks[0])

        # Assertions
        self.assertTrue(result["success"])
        self.assertEqual(result["task_id"], self.tasks[0])
        self.assertTrue(result["has_estimate"])
        self.assertIsNotNone(result["estimated_hours"])
        self.assertGreater(result["confidence"], 0)

        # Check that task was updated
        task = frappe.get_doc("WH Task", self.tasks[0])
        self.assertIsNotNone(task.estimated_duration_ai)
        self.assertIsNotNone(task.duration_confidence)

    def test_get_duration_estimate_permission_check(self):
        """Test that users can only get estimates for their own tasks."""
        frappe.set_user(self.test_user)

        from workhub_frappe_app.api.recommendations import get_duration_estimate

        # Try to get estimate for manager's task - should fail
        with self.assertRaises(frappe.exceptions.ValidationError):
            get_duration_estimate(task_id=self.tasks[4])

    def test_get_workload_suggestions(self):
        """Test getting workload balance suggestions."""
        frappe.set_user(self.manager_user)

        from workhub_frappe_app.api.recommendations import get_workload_suggestions
        result = get_workload_suggestions(department="SALES")

        # Assertions
        self.assertTrue(result["success"])
        self.assertEqual(result["department"], "SALES")
        self.assertIn("users", result)
        self.assertIn("avg_tasks", result)
        self.assertIn("avg_hours", result)
        self.assertIn("suggestions", result)

        # Should have user workload data
        self.assertGreater(len(result["users"]), 0)

        # Check user data structure
        user = result["users"][0]
        self.assertIn("user", user)
        self.assertIn("task_count", user)
        self.assertIn("total_hours", user)
        self.assertIn("p0_count", user)
        self.assertIn("p1_count", user)
        self.assertIn("p2_count", user)

    def test_get_workload_suggestions_non_manager_denied(self):
        """Test that non-managers cannot access workload suggestions."""
        frappe.set_user(self.test_user)

        from workhub_frappe_app.api.recommendations import get_workload_suggestions

        # Should fail - not a manager
        with self.assertRaises(frappe.exceptions.ValidationError):
            get_workload_suggestions()

    def test_submit_feedback_helpful(self):
        """Test submitting helpful feedback on a recommendation."""
        frappe.set_user(self.test_user)

        # Create a recommendation first
        rec = frappe.new_doc("WH AI Recommendation")
        rec.user = self.test_user
        rec.recommendation_type = "next_task"
        rec.task = self.tasks[0]
        rec.reason = "Test recommendation"
        rec.confidence_score = 0.85
        rec.status = "pending"
        rec.insert(ignore_permissions=True)
        frappe.db.commit()

        from workhub_frappe_app.api.recommendations import submit_feedback
        result = submit_feedback(
            recommendation_id=rec.name,
            feedback_type="helpful",
            comment="This was very useful"
        )

        # Assertions
        self.assertTrue(result["success"])
        self.assertIn("feedback_id", result)
        self.assertEqual(result["recommendation_status"], "accepted")

        # Check feedback record was created
        feedback = frappe.get_doc("WH Recommendation Feedback", result["feedback_id"])
        self.assertEqual(feedback.user, self.test_user)
        self.assertEqual(feedback.feedback_type, "helpful")
        self.assertEqual(feedback.comment, "This was very useful")

        # Check recommendation status updated
        rec.reload()
        self.assertEqual(rec.status, "accepted")

    def test_submit_feedback_not_helpful(self):
        """Test submitting not_helpful feedback."""
        frappe.set_user(self.test_user)

        # Create recommendation
        rec = frappe.new_doc("WH AI Recommendation")
        rec.user = self.test_user
        rec.recommendation_type = "at_risk_alert"
        rec.task = self.tasks[1]
        rec.reason = "Test alert"
        rec.confidence_score = 0.6
        rec.status = "pending"
        rec.insert(ignore_permissions=True)
        frappe.db.commit()

        from workhub_frappe_app.api.recommendations import submit_feedback
        result = submit_feedback(
            recommendation_id=rec.name,
            feedback_type="not_helpful",
            comment="Not relevant"
        )

        # Check recommendation was dismissed
        self.assertEqual(result["recommendation_status"], "dismissed")
        rec.reload()
        self.assertEqual(rec.status, "dismissed")

    def test_submit_feedback_wrong_user(self):
        """Test that users can only submit feedback on their own recommendations."""
        frappe.set_user(self.test_user)

        # Create recommendation for manager
        rec = frappe.new_doc("WH AI Recommendation")
        rec.user = self.manager_user
        rec.recommendation_type = "next_task"
        rec.task = self.tasks[4]
        rec.reason = "Manager recommendation"
        rec.confidence_score = 0.8
        rec.status = "pending"
        rec.insert(ignore_permissions=True)
        frappe.db.commit()

        from workhub_frappe_app.api.recommendations import submit_feedback

        # Should fail - not the user's recommendation
        with self.assertRaises(frappe.exceptions.ValidationError):
            submit_feedback(
                recommendation_id=rec.name,
                feedback_type="helpful",
                comment=""
            )

    def test_dismiss_recommendation(self):
        """Test dismissing a recommendation."""
        frappe.set_user(self.test_user)

        # Create recommendation
        rec = frappe.new_doc("WH AI Recommendation")
        rec.user = self.test_user
        rec.recommendation_type = "priority_change"
        rec.task = self.tasks[2]
        rec.reason = "Test suggestion"
        rec.confidence_score = 0.7
        rec.status = "pending"
        rec.insert(ignore_permissions=True)
        frappe.db.commit()

        from workhub_frappe_app.api.recommendations import dismiss_recommendation
        result = dismiss_recommendation(recommendation_id=rec.name)

        # Assertions
        self.assertTrue(result["success"])
        self.assertEqual(result["status"], "dismissed")

        # Check recommendation status
        rec.reload()
        self.assertEqual(rec.status, "dismissed")

    def test_accept_recommendation(self):
        """Test accepting a recommendation."""
        frappe.set_user(self.test_user)

        # Create recommendation
        rec = frappe.new_doc("WH AI Recommendation")
        rec.user = self.test_user
        rec.recommendation_type = "workload_balance"
        rec.reason = "Rebalancing suggestion"
        rec.confidence_score = 0.75
        rec.status = "pending"
        rec.insert(ignore_permissions=True)
        frappe.db.commit()

        from workhub_frappe_app.api.recommendations import accept_recommendation
        result = accept_recommendation(recommendation_id=rec.name)

        # Assertions
        self.assertTrue(result["success"])
        self.assertEqual(result["status"], "accepted")

        # Check recommendation status
        rec.reload()
        self.assertEqual(rec.status, "accepted")

    def test_get_user_recommendations(self):
        """Test getting all recommendations for a user."""
        frappe.set_user(self.test_user)

        # Create multiple recommendations
        for i in range(3):
            rec = frappe.new_doc("WH AI Recommendation")
            rec.user = self.test_user
            rec.recommendation_type = "next_task"
            rec.task = self.tasks[i] if i < len(self.tasks) else None
            rec.reason = f"Recommendation {i+1}"
            rec.confidence_score = 0.8
            rec.status = "pending" if i < 2 else "accepted"
            rec.insert(ignore_permissions=True)
        frappe.db.commit()

        from workhub_frappe_app.api.recommendations import get_user_recommendations
        result = get_user_recommendations(limit=10)

        # Assertions
        self.assertTrue(result["success"])
        self.assertEqual(result["user"], self.test_user)
        self.assertEqual(result["count"], 3)

        # Check recommendation structure
        rec = result["recommendations"][0]
        self.assertIn("name", rec)
        self.assertIn("recommendation_type", rec)
        self.assertIn("reason", rec)
        self.assertIn("confidence_score", rec)
        self.assertIn("status", rec)

    def test_get_user_recommendations_with_status_filter(self):
        """Test getting recommendations filtered by status."""
        frappe.set_user(self.test_user)

        # Create recommendations with different statuses
        for status in ["pending", "accepted", "dismissed"]:
            rec = frappe.new_doc("WH AI Recommendation")
            rec.user = self.test_user
            rec.recommendation_type = "next_task"
            rec.reason = f"Recommendation {status}"
            rec.confidence_score = 0.8
            rec.status = status
            rec.insert(ignore_permissions=True)
        frappe.db.commit()

        from workhub_frappe_app.api.recommendations import get_user_recommendations
        result = get_user_recommendations(status="pending")

        # Should only return pending recommendations
        self.assertTrue(result["success"])
        self.assertGreater(result["count"], 0)

        for rec in result["recommendations"]:
            self.assertEqual(rec["status"], "pending")

    def test_update_task_ai_data(self):
        """Test manually updating AI data for a task."""
        frappe.set_user("Administrator")

        # Create historical stats
        stats = frappe.new_doc("WH Task Completion Stats")
        stats.department = "SALES"
        stats.task_type = "important task"
        stats.similar_task_title_pattern = "important task"
        stats.avg_duration_hours = 3.0
        stats.median_duration_hours = 2.5
        stats.completion_count = 15
        stats.insert(ignore_permissions=True)
        frappe.db.commit()

        from workhub_frappe_app.api.recommendations import update_task_ai_data
        result = update_task_ai_data(task_id=self.tasks[1])

        # Assertions
        self.assertTrue(result["success"])
        self.assertEqual(result["task_id"], self.tasks[1])

        # Check task was updated
        task = frappe.get_doc("WH Task", self.tasks[1])
        self.assertIsNotNone(task.estimated_duration_ai)
        self.assertIsNotNone(task.duration_confidence)

    def test_api_limit_validation(self):
        """Test that API endpoints validate limit parameters."""
        frappe.set_user(self.test_user)

        from workhub_frappe_app.api.recommendations import get_next_task_recommendations

        # Test with invalid limit (should default to 5)
        result = get_next_task_recommendations(limit=999)
        self.assertLessEqual(result["count"], 5)

        # Test with negative limit (should default to 5)
        result = get_next_task_recommendations(limit=-1)
        self.assertLessEqual(result["count"], 5)

    def test_api_department_validation(self):
        """Test that workload suggestions validate department."""
        frappe.set_user(self.manager_user)

        from workhub_frappe_app.api.recommendations import get_workload_suggestions

        # Valid departments should work
        result = get_workload_suggestions(department="SALES")
        self.assertTrue(result["success"])

        # Invalid department should fail
        with self.assertRaises(frappe.exceptions.ValidationError):
            get_workload_suggestions(department="INVALID")


class TestRecommendationsAPIEdgeCases(unittest.TestCase):
    """Test edge cases and error handling."""

    def setUp(self):
        """Set up for edge case tests."""
        frappe.set_user("Administrator")

    def test_get_recommendations_no_tasks(self):
        """Test recommendations when user has no tasks."""
        # Create user with no tasks
        email = "empty_user@example.com"
        if not frappe.db.exists("User", email):
            user = frappe.new_doc("User")
            user.email = email
            user.first_name = "Empty User"
            user.enabled = 1
            user.send_welcome_email = 0
            user.append("roles", {"role": "System User"})
            user.insert(ignore_permissions=True)
            frappe.db.commit()

        frappe.set_user(email)

        from workhub_frappe_app.api.recommendations import get_next_task_recommendations
        result = get_next_task_recommendations()

        # Should succeed but return empty list
        self.assertTrue(result["success"])
        self.assertEqual(result["count"], 0)

    def test_guest_user_access_denied(self):
        """Test that guest users are denied access."""
        frappe.set_user("Guest")

        from workhub_frappe_app.api.recommendations import get_next_task_recommendations

        # Should fail authentication
        with self.assertRaises(frappe.exceptions.AuthenticationError):
            get_next_task_recommendations()

    def test_invalid_task_id(self):
        """Test API with invalid task ID."""
        frappe.set_user("Administrator")

        from workhub_frappe_app.api.recommendations import get_duration_estimate

        # Should fail with DoesNotExistError
        with self.assertRaises(frappe.exceptions.DoesNotExistError):
            get_duration_estimate(task_id="INVALID-TASK-ID")

    def test_invalid_recommendation_id(self):
        """Test feedback with invalid recommendation ID."""
        frappe.set_user("Administrator")

        from workhub_frappe_app.api.recommendations import submit_feedback

        # Should fail with DoesNotExistError
        with self.assertRaises(frappe.exceptions.DoesNotExistError):
            submit_feedback(
                recommendation_id="INVALID-REC-ID",
                feedback_type="helpful"
            )

    def test_invalid_feedback_type(self):
        """Test submitting feedback with invalid type."""
        frappe.set_user("Administrator")

        # Create test recommendation
        rec = frappe.new_doc("WH AI Recommendation")
        rec.user = "Administrator"
        rec.recommendation_type = "next_task"
        rec.reason = "Test"
        rec.confidence_score = 0.8
        rec.status = "pending"
        rec.insert(ignore_permissions=True)
        frappe.db.commit()

        from workhub_frappe_app.api.recommendations import submit_feedback

        # Should fail validation
        with self.assertRaises(frappe.exceptions.ValidationError):
            submit_feedback(
                recommendation_id=rec.name,
                feedback_type="invalid_type"
            )

    def tearDown(self):
        """Clean up edge case test data."""
        frappe.set_user("Administrator")

        # Clean up test user
        if frappe.db.exists("User", "empty_user@example.com"):
            frappe.delete_doc("User", "empty_user@example.com", force=True, ignore_permissions=True)

        frappe.db.commit()


# Test suite runner
def run_tests():
    """Run all integration test suites."""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestRecommendationsAPI))
    suite.addTests(loader.loadTestsFromTestCase(TestRecommendationsAPIEdgeCases))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return result.wasSuccessful()


if __name__ == "__main__":
    run_tests()
