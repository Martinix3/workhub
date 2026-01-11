# WorkHub Notification System - Test Documentation

## Overview

This directory contains comprehensive tests for the WorkHub notification system.

## Running the Tests

### From Frappe Bench

```bash
cd /path/to/frappe-bench
bench --site <your-site-name> execute workhub_frappe_app.tests.test_notifications.run_all_tests
```

Example:
```bash
bench --site santabrisa.local execute workhub_frappe_app.tests.test_notifications.run_all_tests
```

## Test Coverage

The test suite (`test_notifications.py`) includes **10 comprehensive test cases**:

### 1. Task Assignment Notifications
- **test_task_assignment_notification**: Verifies that assigning a task to a user creates a TASK_ASSIGNED notification
- **test_task_reassignment_notification**: Verifies that reassigning a task notifies both the old and new assignee

### 2. Task Status Change Notifications
- **test_task_status_change_to_done**: Verifies that marking a task as DONE creates a COMPLETED notification for the task owner
- **test_task_status_change_to_blocked**: Verifies that marking a task as BLOCKED creates a HIGH/MEDIUM priority BLOCKED notification
- **test_task_completion_notifies_successors**: Verifies that completing a task notifies users assigned to blocked successor tasks

### 3. Distributor Order Notifications
- **test_order_status_change_to_delivered**: Verifies that marking an order as Delivered creates ORDER_DELIVERED notifications for sales users
- **test_order_status_change_to_issue**: Verifies that marking an order with an Issue creates HIGH priority ORDER_STATUS notifications
- **test_new_order_notification**: Verifies that creating a new order creates ORDER_CREATED notifications for sales team

### 4. Preference Filtering
- **test_preference_filtering_task_assigned**: Verifies that disabling the task_assigned preference blocks TASK_ASSIGNED notifications
- **test_high_priority_bypasses_preferences**: Verifies that HIGH priority notifications bypass user preferences

## Test Output

The test script provides detailed output including:
- ✓/✗ pass/fail status for each test
- Detailed messages explaining test results
- Summary with total, passed, and failed counts
- List of failed tests with error messages

Example output:
```
=== Setting up test data ===
✓ Test data created: users=test_notif_user1@example.com, test_notif_user2@example.com
  Project: PRJ-TEST-001
  Customer: Test Notif Customer

=== Test: Task Assignment Notification ===
✓ PASS: Task Assignment Notification
  Notification created: Nueva tarea: Task for assignment test

...

============================================================
TEST SUMMARY
============================================================
Total Tests: 10
Passed: 10
Failed: 0
============================================================
```

## Test Data Management

The test suite:
- Automatically creates test users, projects, tasks, and orders
- Cleans up all test data after completion
- Uses transaction rollback on errors to prevent data corruption
- Test users: `test_notif_user1@example.com`, `test_notif_user2@example.com`, `test_sales_user@example.com`

## Acceptance Criteria

All acceptance criteria from the implementation plan are met:

✅ **Tests task assignment notifications**
   - Covers initial assignment and reassignment scenarios

✅ **Tests task status change notifications**
   - Covers DONE, BLOCKED, and general status changes
   - Verifies successor unblocking notifications

✅ **Tests distributor order notifications**
   - Covers Delivered, Issue, and new order scenarios
   - Verifies correct notification types and priorities

✅ **Tests preference filtering**
   - Verifies preferences correctly block notifications
   - Verifies HIGH priority notifications bypass preferences

## Troubleshooting

### Tests Fail to Run

1. **Check Frappe bench is running**: `bench start`
2. **Verify site exists**: `bench --site <site> list-apps`
3. **Check workhub_frappe_app is installed**: Should appear in app list
4. **Check database connection**: `bench --site <site> console`

### Notifications Not Created

1. Check that the notification system is properly configured
2. Verify WH Notification DocType exists
3. Check user permissions
4. Review Frappe error logs: `bench --site <site> watch`

### Test Data Cleanup Issues

If test data is not cleaned up properly:
```bash
# Manually delete test users
bench --site <site> console
>>> frappe.delete_doc("User", "test_notif_user1@example.com", force=True)
>>> frappe.delete_doc("User", "test_notif_user2@example.com", force=True)
>>> frappe.delete_doc("User", "test_sales_user@example.com", force=True)
>>> frappe.db.commit()
```

## Next Steps

After running automated tests, proceed to **Manual QA Verification** (subtask 6.2):
- Test notification flows through the UI
- Verify notifications appear in the notification center
- Test preference controls in settings
- Verify email notifications (if configured)
