# Manual QA Guide - Notification System

## Overview
This guide provides step-by-step instructions for manually testing the notification system implementation through the UI.

## Pre-requisites
- Frappe bench running (`bench start`)
- Two test users configured:
  - **User A** (Test Manager): Has task creation/assignment permissions
  - **User B** (Test Worker): Can be assigned tasks
- At least one Distributor configured with an associated user contact

## Test Environment Setup

1. **Start the development server:**
   ```bash
   cd /Users/martinjaimesamperiz/santabrisa/frappe-bench
   bench start
   ```

2. **Access WorkHub:**
   - Open browser to `http://localhost:8000`
   - Log in with User A credentials

---

## Test Scenario 1: Task Assignment Notification

### Objective
Verify that task assignments create notifications visible in the UI

### Steps
1. Log in as **User A** (Manager)
2. Navigate to **WorkHub > Tasks** (or `/app/wh-task`)
3. Click **New** to create a new task
4. Fill in task details:
   - **Title:** "Test Task Assignment Notification"
   - **Project:** Select any project
   - **Assigned To:** Select **User B**
   - **Status:** NEXT
   - **Priority:** P1
5. Click **Save**

### Expected Results
- ✅ Task is created successfully
- ✅ Log in as **User B** in a different browser/incognito window
- ✅ Check notifications bell icon in top-right corner
- ✅ Should see notification: "Nueva tarea asignada: Test Task Assignment Notification"
- ✅ Notification should have TASK_ASSIGNED type
- ✅ Clicking notification should navigate to the task detail page

### Verification in Backend
```bash
# Run in Frappe console
bench --site <site> console
```
```python
import frappe
notifications = frappe.get_all('WH Notification',
    filters={'user': 'user_b@example.com', 'type': 'TASK_ASSIGNED'},
    fields=['*'],
    order_by='creation desc',
    limit=1)
print(notifications)
```

---

## Test Scenario 2: Task Reassignment Notification

### Objective
Verify that reassigning a task notifies both the old and new assignees

### Steps
1. Log in as **User A** (Manager)
2. Open the task created in Scenario 1
3. Change **Assigned To** from **User B** to **User A** (yourself)
4. Click **Save**

### Expected Results
- ✅ Task is updated successfully
- ✅ **User B** receives notification: "Tarea reasignada: Test Task Assignment Notification"
- ✅ **User A** receives notification: "Nueva tarea asignada: Test Task Assignment Notification"
- ✅ Both notifications should be visible in their respective notification panels

---

## Test Scenario 3: Task Status Change Notification

### Objective
Verify that task status changes create appropriate notifications

### Steps - Part A: Mark Task as DONE
1. Log in as **User A**
2. Open the task from Scenario 1
3. Change **Status** from **NEXT** to **DONE**
4. Click **Save**

### Expected Results (Part A)
- ✅ Task status updated successfully
- ✅ Since User A is both the owner and the one making the change, no notification is created (avoiding self-notification)

### Steps - Part B: Mark Task as BLOCKED
1. Create a new task assigned to **User B**
2. Log in as **User A**
3. Open the newly created task
4. Change **Status** to **BLOCKED**
5. Fill in **Blocked Reason:** "Waiting for client approval"
6. Click **Save**

### Expected Results (Part B)
- ✅ **User B** receives HIGH priority notification
- ✅ Notification message includes: "bloqueada" and blocked reason
- ✅ Notification type should be BLOCKED

---

## Test Scenario 4: Task Completion Unblocks Successor

### Objective
Verify that completing a task notifies successors that were blocked by it

### Steps
1. Log in as **User A**
2. Create **Task 1** assigned to **User A**
   - Title: "Design Phase"
   - Status: DOING
3. Create **Task 2** assigned to **User B**
   - Title: "Implementation Phase"
   - Status: BLOCKED
   - Blocked Reason: "Waiting for design"
   - **Blocked By:** Link to Task 1
4. Go back to **Task 1**
5. Change Status to **DONE**
6. Click **Save**

### Expected Results
- ✅ Task 1 is marked as DONE
- ✅ **User B** receives notification about Task 2
- ✅ Notification message: "La tarea que bloqueaba 'Implementation Phase' ha sido completada"
- ✅ Notification type should be COMPLETED
- ✅ User B should know they can now start working on Task 2

---

## Test Scenario 5: Distributor Order Notifications

### Objective
Verify that distributor order status changes create notifications

### Steps - Part A: Create New Order
1. Log in as **User A** (Sales User)
2. Navigate to **WorkHub > Distributor Sell Out Order** (or `/app/distributor-sell-out-order`)
3. Click **New**
4. Fill in order details:
   - **Customer:** Select a customer
   - **Distributor:** Select a distributor (with linked user)
   - **Order Date:** Today
   - **Status:** Pending
   - **Amount:** 5000
5. Click **Save**

### Expected Results (Part A)
- ✅ Order is created successfully
- ✅ **Sales Team members** receive notification about new order
- ✅ Notification type: ORDER_CREATED
- ✅ Notification includes customer and distributor names

### Steps - Part B: Mark Order as Delivered
1. Open the order from Part A
2. Change **Status** to **Delivered**
3. Click **Save**

### Expected Results (Part B)
- ✅ **Sales Team** receives LOW priority notification
- ✅ **Distributor User** receives MEDIUM priority notification
- ✅ Notification type: ORDER_DELIVERED
- ✅ Both notifications include order details and amount

### Steps - Part C: Mark Order with Issue
1. Create another order (follow Part A steps)
2. Change **Status** to **Issue**
3. Fill in **Issue Notes:** "Wrong product shipped"
4. Click **Save**

### Expected Results (Part C)
- ✅ **Sales Team** receives HIGH priority notification
- ✅ **Distributor User** receives HIGH priority notification
- ✅ Notification type: ORDER_STATUS
- ✅ Notifications include issue notes
- ✅ High priority ensures immediate attention

---

## Test Scenario 6: Notification Preferences Filtering

### Objective
Verify that user preferences correctly filter notifications

### Steps - Part A: Disable Task Assignment Notifications
1. Log in as **User B**
2. Navigate to **Settings** (profile icon > Settings)
3. Go to **Notifications** tab
4. **Disable** the toggle for **"Task Assignments"** (task_assigned)
5. Click **Save Preferences**

### Expected Results (Part A)
- ✅ Settings saved successfully
- ✅ Confirmation message displayed

### Steps - Part B: Test Filtered Notification
1. Log in as **User A**
2. Create a new task assigned to **User B**
3. Save the task

### Expected Results (Part B)
- ✅ Task is created successfully
- ✅ **User B does NOT receive notification** (preference is disabled)
- ✅ Verify in backend that no TASK_ASSIGNED notification was created for User B

### Steps - Part C: Re-enable Preference
1. Log in as **User B**
2. Go to Settings > Notifications
3. **Enable** the toggle for **"Task Assignments"**
4. Click **Save Preferences**

### Expected Results (Part C)
- ✅ Settings saved successfully
- ✅ Create another task for User B and verify notification IS received this time

---

## Test Scenario 7: High Priority Bypass

### Objective
Verify that HIGH priority notifications bypass user preferences

### Steps
1. Log in as **User B**
2. Disable **all notification types** in Settings > Notifications
3. Save preferences
4. Log in as **User A**
5. Create a task assigned to **User B** with Status **BLOCKED**
6. Fill in Blocked Reason
7. Save the task

### Expected Results
- ✅ **User B DOES receive the notification** despite having notifications disabled
- ✅ HIGH priority notifications always go through
- ✅ Notification type: BLOCKED
- ✅ This ensures critical alerts are never missed

---

## Test Scenario 8: Notification UI Interactions

### Objective
Verify the notification panel works correctly in the UI

### Steps
1. Log in as any user with existing notifications
2. Click the **notification bell icon** in the top-right corner
3. Observe the notification panel that appears

### Expected Results
- ✅ Panel shows list of recent notifications (most recent first)
- ✅ Each notification displays:
  - Icon based on notification type
  - Title/message
  - Timestamp (relative time, e.g., "2 minutes ago")
  - Read/unread indicator
- ✅ Clicking a notification:
  - Marks it as read
  - Navigates to the related resource (task/order)
  - Closes the notification panel
- ✅ "Mark all as read" option works
- ✅ Unread count badge on bell icon is accurate

---

## Test Scenario 9: Daily Digest Email (Optional)

### Objective
Verify that daily digest emails are sent according to user preferences

### Note
This test requires waiting for the scheduled job to run or manually triggering it.

### Steps
1. Log in as **User A**
2. Go to Settings > Notifications
3. Set **Digest Frequency** to **Daily**
4. Save preferences
5. Ensure User A has:
   - At least one overdue task
   - At least one task due today
   - At least one upcoming task (next 7 days)
6. Trigger the daily digest job manually:
   ```bash
   bench --site <site> execute workhub_frappe_app.api.notifications.send_daily_emails
   ```

### Expected Results
- ✅ Email is sent to User A's email address
- ✅ Email includes:
  - Section for overdue tasks (with count)
  - Section for tasks due today
  - Section for upcoming tasks
  - If user has Sales role: Distributor order summary section
- ✅ Email is well-formatted and readable
- ✅ Links in email work correctly

### Steps - Weekly Digest
1. Change **Digest Frequency** to **Weekly**
2. Run the job on a non-Monday day
3. Verify **no email** is sent
4. Run the job on a Monday
5. Verify email **is sent**

### Steps - No Digest
1. Change **Digest Frequency** to **None**
2. Run the job
3. Verify **no email** is sent regardless of day

---

## Test Scenario 10: Sales User Distributor Order Digest

### Objective
Verify that sales users receive distributor order summaries in digest emails

### Pre-requisites
- User must have "Sales User" role
- At least one pending order
- At least one order with issues

### Steps
1. Ensure test user has "Sales User" role
2. Create 2-3 orders with status "Pending"
3. Create 1-2 orders with status "Issue" and issue notes
4. Set digest preference to "Daily"
5. Trigger digest:
   ```bash
   bench --site <site> execute workhub_frappe_app.api.notifications.send_daily_emails
   ```

### Expected Results
- ✅ Email includes "Ordenes de Distribuidores" section
- ✅ "Pendientes" subsection shows count and list of pending orders
- ✅ Each pending order shows: order number, customer, distributor, amount, order date
- ✅ "Con Incidencias" subsection (in red) shows issue orders
- ✅ Each issue order shows: order number, customer, distributor, amount, issue notes
- ✅ Link to view all orders is present
- ✅ Non-sales users do NOT see this section

---

## Acceptance Criteria Verification

After completing all test scenarios, verify the following acceptance criteria are met:

- ✅ **Users receive notifications when assigned to a task**
  - Verified in Scenarios 1, 2, 6

- ✅ **Users receive notifications when task status changes on tasks they own**
  - Verified in Scenarios 3, 4

- ✅ **Daily digest email with overdue and upcoming tasks**
  - Verified in Scenario 9

- ✅ **Distributor sell-out orders trigger appropriate notifications**
  - Verified in Scenario 5

- ✅ **Users can configure notification preferences**
  - Verified in Scenarios 6, 7

---

## Troubleshooting

### Notifications Not Appearing
1. Check browser console for JavaScript errors
2. Verify WebSocket connection is active (if using real-time notifications)
3. Refresh the page and check again
4. Verify notification was created in backend:
   ```python
   import frappe
   frappe.get_all('WH Notification',
       filters={'user': 'user@example.com'},
       fields=['*'],
       order_by='creation desc',
       limit=5)
   ```

### Emails Not Sending
1. Check email configuration in Frappe:
   ```bash
   bench --site <site> console
   ```
   ```python
   import frappe
   print(frappe.get_doc('Email Account', 'default'))
   ```
2. Check email queue:
   ```python
   frappe.get_all('Email Queue', fields=['*'], limit=10)
   ```
3. Verify SMTP settings are correct

### Preferences Not Saving
1. Check browser console for API errors
2. Verify user has permission to update their own settings
3. Check backend settings storage:
   ```python
   import frappe
   user = frappe.get_doc('User', 'user@example.com')
   print(user.workhub_notifications)
   ```

---

## Test Results Documentation

### Test Execution Date: _____________

### Tester: _____________

### Results Summary

| Test Scenario | Status | Notes |
|---------------|--------|-------|
| 1. Task Assignment | ☐ Pass ☐ Fail | |
| 2. Task Reassignment | ☐ Pass ☐ Fail | |
| 3. Task Status Change | ☐ Pass ☐ Fail | |
| 4. Task Completion Unblocks | ☐ Pass ☐ Fail | |
| 5. Distributor Order Notifications | ☐ Pass ☐ Fail | |
| 6. Preferences Filtering | ☐ Pass ☐ Fail | |
| 7. High Priority Bypass | ☐ Pass ☐ Fail | |
| 8. Notification UI | ☐ Pass ☐ Fail | |
| 9. Daily Digest Email | ☐ Pass ☐ Fail | |
| 10. Sales Order Digest | ☐ Pass ☐ Fail | |

### Issues Found

| Issue # | Description | Severity | Steps to Reproduce |
|---------|-------------|----------|-------------------|
| | | | |

### Overall Assessment

☐ **PASS** - All test scenarios passed, ready for production
☐ **PASS WITH MINOR ISSUES** - Minor issues found but not blocking
☐ **FAIL** - Critical issues found, requires fixes before deployment

---

## Sign-off

**QA Tester:** _____________________________ **Date:** _____________

**Tech Lead:** _____________________________ **Date:** _____________
