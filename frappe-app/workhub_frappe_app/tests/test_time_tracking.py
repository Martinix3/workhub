# Copyright (c) 2024, Vibe and contributors
# For license information, please see license.txt

"""
Unit tests for Time Tracking functionality.

Tests:
- Timer operations (start, stop, pause, resume)
- Manual time entry
- Time reports with filters
- Edge cases and validation
"""

import frappe
import unittest
from datetime import datetime, timedelta
from frappe.utils import nowdate, now_datetime, add_to_date, get_datetime

from workhub_frappe_app.api import time_tracking


class TestTimeTracking(unittest.TestCase):
	"""Test suite for time tracking functionality."""

	@classmethod
	def setUpClass(cls):
		"""Set up test fixtures that are shared across all tests."""
		# Create test user
		cls.test_user = "test_user@example.com"
		if not frappe.db.exists("User", cls.test_user):
			user = frappe.get_doc({
				"doctype": "User",
				"email": cls.test_user,
				"first_name": "Test",
				"last_name": "User",
				"enabled": 1
			})
			user.insert(ignore_permissions=True)

		# Create test project
		if not frappe.db.exists("WH Project", "TEST-PROJ-001"):
			project = frappe.get_doc({
				"doctype": "WH Project",
				"name": "TEST-PROJ-001",
				"title": "Test Project for Time Tracking",
				"department": "OPS",
				"status": "Active"
			})
			project.insert(ignore_permissions=True)

		# Create test tasks
		cls.test_task_1 = cls._create_test_task(
			"TEST-TASK-001",
			"Test Task 1 for Time Tracking",
			"TEST-PROJ-001",
			estimated_hours=8.0
		)
		cls.test_task_2 = cls._create_test_task(
			"TEST-TASK-002",
			"Test Task 2 for Time Tracking",
			"TEST-PROJ-001",
			estimated_hours=4.0
		)

	@classmethod
	def _create_test_task(cls, task_id, title, project, estimated_hours=0):
		"""Helper to create a test task."""
		if not frappe.db.exists("WH Task", task_id):
			task = frappe.get_doc({
				"doctype": "WH Task",
				"name": task_id,
				"title": title,
				"project": project,
				"status": "DOING",
				"priority": "P1",
				"estimated_hours": estimated_hours
			})
			task.insert(ignore_permissions=True)
		return task_id

	def setUp(self):
		"""Set up for each test - set current user and clean up any existing timers."""
		frappe.set_user(self.test_user)
		self._cleanup_timers()
		self._cleanup_work_logs()

	def tearDown(self):
		"""Clean up after each test."""
		self._cleanup_timers()
		frappe.set_user("Administrator")

	def _cleanup_timers(self):
		"""Delete all test timers for the test user."""
		frappe.db.delete("WH Time Timer", {"user": self.test_user})
		frappe.db.commit()

	def _cleanup_work_logs(self):
		"""Delete all work_log entries from test tasks."""
		for task_id in [self.test_task_1, self.test_task_2]:
			if frappe.db.exists("WH Task", task_id):
				task = frappe.get_doc("WH Task", task_id)
				task.work_log = []
				task.save(ignore_permissions=True)
		frappe.db.commit()

	# ============================================================
	# Test: Start Timer
	# ============================================================

	def test_start_timer_success(self):
		"""Test starting a timer on a task."""
		result = time_tracking.start_timer(self.test_task_1)

		self.assertTrue(result["success"])
		self.assertIn("timer", result)
		self.assertEqual(result["timer"]["task"], self.test_task_1)
		self.assertEqual(result["timer"]["user"], self.test_user)
		self.assertEqual(result["timer"]["status"], "Running")
		self.assertEqual(result["timer"]["accumulated_seconds"], 0)
		self.assertIsNotNone(result["timer"]["name"])
		self.assertIsNotNone(result["timer"]["start_time"])

	def test_start_timer_invalid_task(self):
		"""Test starting a timer with invalid task ID."""
		with self.assertRaises(frappe.exceptions.DoesNotExistError):
			time_tracking.start_timer("INVALID-TASK-ID")

	def test_start_timer_no_task_id(self):
		"""Test starting a timer without providing task ID."""
		with self.assertRaises(Exception):
			time_tracking.start_timer(None)

	def test_start_timer_stops_existing_timer(self):
		"""Test that starting a new timer stops the existing one and logs time."""
		# Start first timer
		result1 = time_tracking.start_timer(self.test_task_1)
		timer1_name = result1["timer"]["name"]

		# Wait a moment to ensure some time passes
		frappe.db.commit()

		# Start second timer on different task
		result2 = time_tracking.start_timer(self.test_task_2)
		timer2_name = result2["timer"]["name"]

		# Verify different timers
		self.assertNotEqual(timer1_name, timer2_name)

		# Verify first timer is stopped
		timer1 = frappe.get_doc("WH Time Timer", timer1_name)
		self.assertEqual(timer1.status, "Stopped")

		# Verify work log was created for first task
		task1 = frappe.get_doc("WH Task", self.test_task_1)
		self.assertGreater(len(task1.work_log), 0)

	# ============================================================
	# Test: Stop Timer
	# ============================================================

	def test_stop_timer_success(self):
		"""Test stopping an active timer."""
		# Start timer
		time_tracking.start_timer(self.test_task_1)

		# Wait and stop timer
		frappe.db.commit()
		result = time_tracking.stop_timer(notes="Test work completed")

		self.assertTrue(result["success"])
		self.assertIn("time_entry", result)
		self.assertEqual(result["time_entry"]["task"], self.test_task_1)
		self.assertIn("hours", result["time_entry"])
		self.assertIn("minutes", result["time_entry"])
		self.assertIn("total_seconds", result["time_entry"])

		# Verify work log was created
		task = frappe.get_doc("WH Task", self.test_task_1)
		self.assertGreater(len(task.work_log), 0)
		self.assertEqual(task.work_log[0].notes, "Test work completed")

	def test_stop_timer_no_active_timer(self):
		"""Test stopping timer when no timer is running."""
		with self.assertRaises(Exception):
			time_tracking.stop_timer()

	def test_stop_timer_default_notes(self):
		"""Test stopping timer with default notes."""
		# Start and stop timer without notes
		time_tracking.start_timer(self.test_task_1)
		result = time_tracking.stop_timer()

		# Verify default notes were used
		task = frappe.get_doc("WH Task", self.test_task_1)
		self.assertGreater(len(task.work_log), 0)
		# The notes should contain "Auto-logged" or similar default text
		self.assertIsNotNone(task.work_log[0].notes)

	# ============================================================
	# Test: Pause and Resume Timer
	# ============================================================

	def test_pause_timer_success(self):
		"""Test pausing a running timer."""
		# Start timer
		time_tracking.start_timer(self.test_task_1)

		# Pause timer
		frappe.db.commit()
		result = time_tracking.pause_timer()

		self.assertTrue(result["success"])
		self.assertIn("timer", result)
		self.assertEqual(result["timer"]["status"], "Paused")
		self.assertGreater(result["timer"]["accumulated_seconds"], 0)

	def test_pause_timer_no_running_timer(self):
		"""Test pausing when no timer is running."""
		with self.assertRaises(Exception):
			time_tracking.pause_timer()

	def test_resume_timer_success(self):
		"""Test resuming a paused timer."""
		# Start, pause, then resume
		time_tracking.start_timer(self.test_task_1)
		frappe.db.commit()
		pause_result = time_tracking.pause_timer()
		accumulated = pause_result["timer"]["accumulated_seconds"]

		result = time_tracking.resume_timer()

		self.assertTrue(result["success"])
		self.assertIn("timer", result)
		self.assertEqual(result["timer"]["status"], "Running")
		self.assertEqual(result["timer"]["accumulated_seconds"], accumulated)
		self.assertIsNotNone(result["timer"]["start_time"])

	def test_resume_timer_no_paused_timer(self):
		"""Test resuming when no timer is paused."""
		with self.assertRaises(Exception):
			time_tracking.resume_timer()

	def test_pause_resume_multiple_cycles(self):
		"""Test multiple pause/resume cycles preserve accumulated time."""
		# Start timer
		time_tracking.start_timer(self.test_task_1)
		frappe.db.commit()

		# First pause
		pause1 = time_tracking.pause_timer()
		acc1 = pause1["timer"]["accumulated_seconds"]
		self.assertGreater(acc1, 0)

		# Resume
		time_tracking.resume_timer()
		frappe.db.commit()

		# Second pause
		pause2 = time_tracking.pause_timer()
		acc2 = pause2["timer"]["accumulated_seconds"]
		self.assertGreater(acc2, acc1)  # More time accumulated

		# Stop timer
		result = time_tracking.stop_timer()
		self.assertGreater(result["time_entry"]["total_seconds"], acc1)

	# ============================================================
	# Test: Get Active Timer
	# ============================================================

	def test_get_active_timer_running(self):
		"""Test getting active timer when one is running."""
		# Start timer
		time_tracking.start_timer(self.test_task_1)

		# Get active timer
		result = time_tracking.get_active_timer()

		self.assertTrue(result["success"])
		self.assertIsNotNone(result["active_timer"])
		self.assertEqual(result["active_timer"]["task"], self.test_task_1)
		self.assertEqual(result["active_timer"]["status"], "Running")
		self.assertIn("running_seconds", result["active_timer"])
		self.assertIn("running_hours", result["active_timer"])
		self.assertIn("running_minutes", result["active_timer"])

	def test_get_active_timer_paused(self):
		"""Test getting active timer when one is paused."""
		# Start and pause timer
		time_tracking.start_timer(self.test_task_1)
		frappe.db.commit()
		time_tracking.pause_timer()

		# Get active timer
		result = time_tracking.get_active_timer()

		self.assertTrue(result["success"])
		self.assertIsNotNone(result["active_timer"])
		self.assertEqual(result["active_timer"]["status"], "Paused")

	def test_get_active_timer_none(self):
		"""Test getting active timer when none exists."""
		result = time_tracking.get_active_timer()

		self.assertTrue(result["success"])
		self.assertIsNone(result["active_timer"])

	# ============================================================
	# Test: Manual Time Entry
	# ============================================================

	def test_add_time_entry_success(self):
		"""Test adding manual time entry."""
		result = time_tracking.add_time_entry(
			task_id=self.test_task_1,
			hours=2,
			minutes=30,
			date=nowdate(),
			notes="Manual work entry"
		)

		self.assertTrue(result["success"])
		self.assertIn("time_entry", result)
		self.assertEqual(result["time_entry"]["task"], self.test_task_1)
		self.assertEqual(result["time_entry"]["hours"], 2.0)
		self.assertEqual(result["time_entry"]["minutes"], 30)
		self.assertEqual(result["time_entry"]["duration_hours"], 2.5)
		self.assertEqual(result["time_entry"]["notes"], "Manual work entry")

		# Verify work log was created
		task = frappe.get_doc("WH Task", self.test_task_1)
		self.assertGreater(len(task.work_log), 0)

	def test_add_time_entry_default_date(self):
		"""Test adding time entry with default date (today)."""
		result = time_tracking.add_time_entry(
			task_id=self.test_task_1,
			hours=1,
			minutes=0
		)

		self.assertTrue(result["success"])
		self.assertEqual(result["time_entry"]["date"], nowdate())

	def test_add_time_entry_invalid_task(self):
		"""Test adding time entry with invalid task."""
		with self.assertRaises(frappe.exceptions.DoesNotExistError):
			time_tracking.add_time_entry(
				task_id="INVALID-TASK",
				hours=1,
				minutes=0
			)

	def test_add_time_entry_negative_hours(self):
		"""Test adding time entry with negative hours."""
		with self.assertRaises(Exception):
			time_tracking.add_time_entry(
				task_id=self.test_task_1,
				hours=-1,
				minutes=0
			)

	def test_add_time_entry_invalid_minutes(self):
		"""Test adding time entry with invalid minutes (>= 60)."""
		with self.assertRaises(Exception):
			time_tracking.add_time_entry(
				task_id=self.test_task_1,
				hours=1,
				minutes=60
			)

	def test_add_time_entry_zero_time(self):
		"""Test adding time entry with zero hours and minutes."""
		with self.assertRaises(Exception):
			time_tracking.add_time_entry(
				task_id=self.test_task_1,
				hours=0,
				minutes=0
			)

	def test_add_time_entry_only_minutes(self):
		"""Test adding time entry with only minutes."""
		result = time_tracking.add_time_entry(
			task_id=self.test_task_1,
			hours=0,
			minutes=45
		)

		self.assertTrue(result["success"])
		self.assertEqual(result["time_entry"]["hours"], 0.0)
		self.assertEqual(result["time_entry"]["minutes"], 45)
		self.assertEqual(result["time_entry"]["duration_hours"], 0.75)

	# ============================================================
	# Test: Time Reports
	# ============================================================

	def test_get_time_report_basic(self):
		"""Test getting time report without filters."""
		# Add some time entries
		time_tracking.add_time_entry(self.test_task_1, hours=2, minutes=0)
		time_tracking.add_time_entry(self.test_task_1, hours=1, minutes=30)
		time_tracking.add_time_entry(self.test_task_2, hours=3, minutes=15)

		# Get time report
		result = time_tracking.get_time_report()

		self.assertTrue(result["success"])
		self.assertIn("entries", result)
		self.assertIn("totals", result)
		self.assertEqual(len(result["entries"]), 3)
		self.assertEqual(result["totals"]["entries_count"], 3)
		self.assertEqual(result["totals"]["total_hours"], 6.75)

	def test_get_time_report_filter_by_project(self):
		"""Test getting time report filtered by project."""
		# Add time entries
		time_tracking.add_time_entry(self.test_task_1, hours=2, minutes=0)

		# Get time report for project
		result = time_tracking.get_time_report(project="TEST-PROJ-001")

		self.assertTrue(result["success"])
		self.assertGreater(len(result["entries"]), 0)
		self.assertEqual(result["filters"]["project"], "TEST-PROJ-001")

	def test_get_time_report_filter_by_date_range(self):
		"""Test getting time report filtered by date range."""
		today = nowdate()
		yesterday = add_to_date(today, days=-1)
		tomorrow = add_to_date(today, days=1)

		# Add time entries
		time_tracking.add_time_entry(self.test_task_1, hours=2, minutes=0, date=today)

		# Get time report for date range
		result = time_tracking.get_time_report(
			from_date=yesterday,
			to_date=tomorrow
		)

		self.assertTrue(result["success"])
		self.assertGreater(len(result["entries"]), 0)
		self.assertEqual(result["filters"]["from_date"], yesterday)
		self.assertEqual(result["filters"]["to_date"], tomorrow)

	def test_get_time_report_empty_results(self):
		"""Test getting time report with no matching entries."""
		past_date = add_to_date(nowdate(), days=-365)

		result = time_tracking.get_time_report(
			from_date=past_date,
			to_date=past_date
		)

		self.assertTrue(result["success"])
		self.assertEqual(len(result["entries"]), 0)
		self.assertEqual(result["totals"]["total_hours"], 0)
		self.assertEqual(result["totals"]["entries_count"], 0)

	# ============================================================
	# Test: Project Time Summary
	# ============================================================

	def test_get_project_time_summary_basic(self):
		"""Test getting project time summary."""
		# Add time entries
		time_tracking.add_time_entry(self.test_task_1, hours=5, minutes=0)
		time_tracking.add_time_entry(self.test_task_2, hours=3, minutes=0)

		# Get project summary
		result = time_tracking.get_project_time_summary("TEST-PROJ-001")

		self.assertTrue(result["success"])
		self.assertIn("project", result)
		self.assertIn("summary", result)
		self.assertIn("breakdown_by_user", result)
		self.assertIn("breakdown_by_task", result)

		# Check summary
		self.assertEqual(result["summary"]["total_hours_tracked"], 8.0)
		self.assertEqual(result["summary"]["total_estimated_hours"], 12.0)
		self.assertIsNotNone(result["summary"]["variance_hours"])
		self.assertIsNotNone(result["summary"]["variance_percentage"])

	def test_get_project_time_summary_invalid_project(self):
		"""Test getting project summary with invalid project ID."""
		with self.assertRaises(frappe.exceptions.DoesNotExistError):
			time_tracking.get_project_time_summary("INVALID-PROJECT")

	def test_get_project_time_summary_no_entries(self):
		"""Test getting project summary with no time entries."""
		result = time_tracking.get_project_time_summary("TEST-PROJ-001")

		self.assertTrue(result["success"])
		self.assertEqual(result["summary"]["total_hours_tracked"], 0)
		self.assertEqual(len(result["breakdown_by_user"]), 0)
		self.assertEqual(len(result["breakdown_by_task"]), 0)

	def test_get_project_time_summary_variance_calculation(self):
		"""Test variance calculation in project summary."""
		# Add time that exceeds estimate for task 1 (estimated: 8h)
		time_tracking.add_time_entry(self.test_task_1, hours=10, minutes=0)

		result = time_tracking.get_project_time_summary("TEST-PROJ-001")

		# Find task 1 in breakdown
		task1_data = next(
			(t for t in result["breakdown_by_task"] if t["task_id"] == self.test_task_1),
			None
		)

		self.assertIsNotNone(task1_data)
		self.assertEqual(task1_data["tracked_hours"], 10.0)
		self.assertEqual(task1_data["estimated_hours"], 8.0)
		self.assertEqual(task1_data["variance_hours"], 2.0)
		self.assertEqual(task1_data["variance_percentage"], 25.0)

	# ============================================================
	# Test: User Time Summary
	# ============================================================

	def test_get_user_time_summary_basic(self):
		"""Test getting user time summary."""
		today = nowdate()

		# Add time entries
		time_tracking.add_time_entry(self.test_task_1, hours=2, minutes=0, date=today)
		time_tracking.add_time_entry(self.test_task_2, hours=3, minutes=30, date=today)

		# Get user summary
		result = time_tracking.get_user_time_summary()

		self.assertTrue(result["success"])
		self.assertIn("summary", result)
		self.assertIn("daily_totals", result)
		self.assertIn("breakdown_by_project", result)
		self.assertIn("breakdown_by_task", result)

		# Check summary
		self.assertEqual(result["summary"]["user"], self.test_user)
		self.assertEqual(result["summary"]["total_hours"], 5.5)
		self.assertEqual(result["summary"]["total_entries"], 2)

		# Check daily totals
		self.assertEqual(len(result["daily_totals"]), 1)
		self.assertEqual(result["daily_totals"][0]["date"], today)
		self.assertEqual(result["daily_totals"][0]["hours"], 5.5)

	def test_get_user_time_summary_date_range(self):
		"""Test getting user summary with date range."""
		today = nowdate()
		yesterday = add_to_date(today, days=-1)

		# Add time entries on different days
		time_tracking.add_time_entry(self.test_task_1, hours=2, minutes=0, date=yesterday)
		time_tracking.add_time_entry(self.test_task_1, hours=3, minutes=0, date=today)

		# Get summary for date range
		result = time_tracking.get_user_time_summary(
			from_date=yesterday,
			to_date=today
		)

		self.assertTrue(result["success"])
		self.assertEqual(result["summary"]["total_hours"], 5.0)
		self.assertEqual(len(result["daily_totals"]), 2)

	def test_get_user_time_summary_no_entries(self):
		"""Test getting user summary with no time entries."""
		result = time_tracking.get_user_time_summary()

		self.assertTrue(result["success"])
		self.assertEqual(result["summary"]["total_hours"], 0)
		self.assertEqual(result["summary"]["total_entries"], 0)
		self.assertEqual(len(result["daily_totals"]), 0)

	# ============================================================
	# Test: Edge Cases and Integration
	# ============================================================

	def test_total_hours_calculation(self):
		"""Test that total_hours field on task is calculated correctly."""
		# Add multiple time entries
		time_tracking.add_time_entry(self.test_task_1, hours=2, minutes=30)
		time_tracking.add_time_entry(self.test_task_1, hours=1, minutes=15)
		time_tracking.add_time_entry(self.test_task_1, hours=0, minutes=45)

		# Get task and verify total_hours
		task = frappe.get_doc("WH Task", self.test_task_1)
		self.assertEqual(task.total_hours, 4.5)

	def test_work_log_duration_calculation(self):
		"""Test that duration_hours is calculated correctly in work_log."""
		# Add time entry
		time_tracking.add_time_entry(self.test_task_1, hours=2, minutes=30)

		# Get task work_log
		task = frappe.get_doc("WH Task", self.test_task_1)
		self.assertEqual(len(task.work_log), 1)
		self.assertEqual(task.work_log[0].hours, 2.0)
		self.assertEqual(task.work_log[0].minutes, 30)
		self.assertEqual(task.work_log[0].duration_hours, 2.5)

	def test_timer_one_active_per_user(self):
		"""Test that only one active timer can exist per user."""
		# This is enforced by the start_timer function which stops existing timers
		time_tracking.start_timer(self.test_task_1)
		time_tracking.start_timer(self.test_task_2)

		# Get active timer - should be for task 2
		result = time_tracking.get_active_timer()
		self.assertEqual(result["active_timer"]["task"], self.test_task_2)

		# Verify only one active timer exists
		active_timers = frappe.db.count(
			"WH Time Timer",
			{"user": self.test_user, "status": ["in", ["Running", "Paused"]]}
		)
		self.assertEqual(active_timers, 1)

	def test_stopped_timer_cannot_be_resumed(self):
		"""Test that a stopped timer cannot be resumed."""
		# Start and stop timer
		time_tracking.start_timer(self.test_task_1)
		time_tracking.stop_timer()

		# Try to resume - should fail
		with self.assertRaises(Exception):
			time_tracking.resume_timer()

	def test_timer_with_zero_elapsed_time(self):
		"""Test stopping a timer immediately (zero elapsed time)."""
		# Start and immediately stop timer
		time_tracking.start_timer(self.test_task_1)
		result = time_tracking.stop_timer()

		# Should succeed even with minimal time
		self.assertTrue(result["success"])
		self.assertIn("time_entry", result)

	@classmethod
	def tearDownClass(cls):
		"""Clean up test data after all tests complete."""
		# Delete test timers
		frappe.db.delete("WH Time Timer", {"user": cls.test_user})

		# Delete test tasks
		for task_id in [cls.test_task_1, cls.test_task_2]:
			if frappe.db.exists("WH Task", task_id):
				frappe.delete_doc("WH Task", task_id, force=True, ignore_permissions=True)

		# Delete test project
		if frappe.db.exists("WH Project", "TEST-PROJ-001"):
			frappe.delete_doc("WH Project", "TEST-PROJ-001", force=True, ignore_permissions=True)

		# Delete test user
		if frappe.db.exists("User", cls.test_user):
			frappe.delete_doc("User", cls.test_user, force=True, ignore_permissions=True)

		frappe.db.commit()


def suite():
	"""Return test suite."""
	suite = unittest.TestSuite()
	suite.addTest(unittest.makeSuite(TestTimeTracking))
	return suite
