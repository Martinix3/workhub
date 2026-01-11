# Manual Testing Guide - Smart Notification Digest

**Feature:** Smart Notification Digest (Subtask 6.3)
**Date:** 2026-01-11
**Purpose:** Verify complete flow of notification preferences, routing, and digest emails

---

## Prerequisites

1. **Frappe/ERPNext running** at configured URL (check `.env`)
2. **WorkHub app installed** and migrated (`bench migrate`)
3. **Test user account(s)** available for testing
4. **Email configuration** set up in Frappe (Settings > Email Domain or Email Account)
5. **Access to email inbox** for test user(s)

---

## Test Scenarios

### Scenario 1: Notification Preferences UI

**Objective:** Verify all notification settings are visible and persist correctly

#### Steps:

1. **Navigate to Settings**
   - Log in to WorkHub
   - Go to `/settings`
   - Click on "Notificaciones" tab

2. **Verify All Options are Visible:**
   - [ ] Email notifications toggle (at top)
   - [ ] Frequency selector with 4 options:
     - [ ] Real-time ("Al instante")
     - [ ] Daily digest ("Resumen diario")
     - [ ] Weekly digest ("Resumen semanal")
     - [ ] Off ("Sin emails")
   - [ ] Priority bypass section (amber card with explanation)
   - [ ] Quiet hours section with enable toggle
   - [ ] Quiet hours time pickers (when enabled)
   - [ ] Save button

3. **Test Frequency Selection:**
   - [ ] Click "Real-time" → verify amber border and background (border-amber-500, bg-amber-50)
   - [ ] Click "Daily digest" → verify selection changes, only one selected at a time
   - [ ] Click "Weekly digest" → verify selection changes
   - [ ] Click "Off" → verify selection changes
   - [ ] Verify save button enables when changes made

4. **Test Quiet Hours:**
   - [ ] Toggle quiet hours ON
   - [ ] Verify time pickers appear (two dropdowns for start and end times)
   - [ ] Set start time: 22:00
   - [ ] Set end time: 08:00
   - [ ] Toggle quiet hours OFF
   - [ ] Verify time pickers disappear

5. **Test Priority Bypass:**
   - [ ] Toggle priority bypass OFF
   - [ ] Verify toggle updates
   - [ ] Toggle priority bypass ON
   - [ ] Verify toggle updates

6. **Test Persistence:**
   - [ ] Change frequency to "Daily digest"
   - [ ] Toggle email notifications OFF
   - [ ] Toggle priority bypass OFF
   - [ ] Enable quiet hours, set 22:00 to 08:00
   - [ ] Click "Guardar cambios"
   - [ ] Verify success message: "Notificaciones actualizadas"
   - [ ] Refresh page
   - [ ] Verify all settings persisted correctly

**Expected Result:** ✅ All settings visible, functional, and persist correctly

---

### Scenario 2: Real-time Notifications (Immediate Routing)

**Objective:** Verify immediate notification routing for real-time preference

#### Setup:

1. Set notification preferences:
   - Frequency: **Real-time**
   - Email: **ON**
   - Priority bypass: **ON**
   - Quiet hours: **OFF**

#### Steps:

1. **Trigger a P2 Task Assignment:**
   ```python
   # In Frappe console or via API
   from workhub_frappe_app.api.notifications import notify_task_assigned

   # Create a test task (P2 priority)
   task = frappe.get_doc({
       "doctype": "WH Task",
       "title": "Test Task - Real-time P2",
       "priority": "P2",
       "assigned_to": "test@example.com",
       "status": "NEXT"
   })
   task.insert()

   # Trigger notification
   notify_task_assigned(task.name, "test@example.com")
   ```

2. **Verify Notification Created:**
   - [ ] Check `WH Notification` doctype
   - [ ] Find notification for test user
   - [ ] Verify `queued_for_digest` = 0 (immediate)
   - [ ] Verify `digest_sent_at` is NULL

3. **Verify Immediate Email Sent:**
   - [ ] Check test user's email inbox
   - [ ] Verify email received immediately
   - [ ] Email should contain:
     - [ ] Title: "Test Task - Real-time P2"
     - [ ] Message with task details
     - [ ] Action button (if applicable)
     - [ ] Unsubscribe link
     - [ ] Notification preferences link
     - [ ] Clean, modern HTML design

**Expected Result:** ✅ Notification created with queued_for_digest=0, immediate email sent

---

### Scenario 3: Quiet Hours Enforcement

**Objective:** Verify quiet hours block real-time notifications

#### Setup:

1. Set notification preferences:
   - Frequency: **Real-time**
   - Email: **ON**
   - Priority bypass: **OFF** (important!)
   - Quiet hours: **ON** (set to current time ± 1 hour)

#### Steps:

1. **Set Quiet Hours to Current Time:**
   - Calculate current time
   - Set quiet hours: (current_time - 1 hour) to (current_time + 1 hour)
   - Example: If now is 14:00, set 13:00 to 15:00

2. **Trigger P2 Task Assignment:**
   ```python
   from workhub_frappe_app.api.notifications import notify_task_assigned

   task = frappe.get_doc({
       "doctype": "WH Task",
       "title": "Test Task - During Quiet Hours",
       "priority": "P2",
       "assigned_to": "test@example.com",
       "status": "NEXT"
   })
   task.insert()

   notify_task_assigned(task.name, "test@example.com")
   ```

3. **Verify Notification Queued:**
   - [ ] Check `WH Notification` doctype
   - [ ] Verify `queued_for_digest` = 1 (queued, not immediate)
   - [ ] Verify `digest_sent_at` is NULL
   - [ ] Verify NO email sent immediately

**Expected Result:** ✅ Notification queued for digest, no immediate email during quiet hours

---

### Scenario 4: Priority Bypass (P0/P1 Always Immediate)

**Objective:** Verify P0/P1 tasks bypass quiet hours and digest preferences

#### Setup:

1. Set notification preferences:
   - Frequency: **Weekly digest** (not real-time!)
   - Email: **ON**
   - Priority bypass: **ON**
   - Quiet hours: **ON** (current time within range)

#### Steps:

1. **Trigger P0 Task Assignment:**
   ```python
   from workhub_frappe_app.api.notifications import notify_task_assigned

   task = frappe.get_doc({
       "doctype": "WH Task",
       "title": "CRITICAL - P0 Task",
       "priority": "P0",
       "assigned_to": "test@example.com",
       "status": "NEXT"
   })
   task.insert()

   notify_task_assigned(task.name, "test@example.com")
   ```

2. **Verify Immediate Notification:**
   - [ ] Check `WH Notification` doctype
   - [ ] Verify `queued_for_digest` = 0 (immediate, bypassed digest)
   - [ ] Verify email sent immediately (despite weekly digest preference)
   - [ ] Verify email sent (despite quiet hours)

3. **Trigger P1 Task Assignment:**
   ```python
   task = frappe.get_doc({
       "doctype": "WH Task",
       "title": "URGENT - P1 Task",
       "priority": "P1",
       "assigned_to": "test@example.com",
       "status": "NEXT"
   })
   task.insert()

   notify_task_assigned(task.name, "test@example.com")
   ```

4. **Verify P1 Also Bypasses:**
   - [ ] Check `WH Notification` doctype
   - [ ] Verify `queued_for_digest` = 0
   - [ ] Verify email sent immediately

**Expected Result:** ✅ P0/P1 tasks always notify immediately, bypassing all other settings

---

### Scenario 5: Daily Digest Queuing

**Objective:** Verify notifications are queued for daily digest

#### Setup:

1. Set notification preferences:
   - Frequency: **Daily digest**
   - Email: **ON**
   - Priority bypass: **ON**

#### Steps:

1. **Trigger Multiple P2 Notifications:**
   ```python
   from workhub_frappe_app.api.notifications import create_notification

   # Task assigned
   create_notification(
       user="test@example.com",
       notification_type="TASK_ASSIGNED",
       title="Task A assigned to you",
       message="Task A details",
       reference_doctype="WH Task",
       reference_name="TASK-001",
       priority="MEDIUM",
       task_priority="P2"
   )

   # Task completed
   create_notification(
       user="test@example.com",
       notification_type="TASK_COMPLETED",
       title="Task B completed",
       message="Task B is done",
       reference_doctype="WH Task",
       reference_name="TASK-002",
       priority="LOW",
       task_priority="P2"
   )

   # Overdue task
   create_notification(
       user="test@example.com",
       notification_type="OVERDUE",
       title="Task C is overdue",
       message="Task C missed deadline",
       reference_doctype="WH Task",
       reference_name="TASK-003",
       priority="HIGH",
       task_priority="P2"
   )
   ```

2. **Verify All Queued:**
   - [ ] Check `WH Notification` doctype
   - [ ] Verify all 3 notifications have `queued_for_digest` = 1
   - [ ] Verify all have `digest_sent_at` = NULL
   - [ ] Verify NO emails sent immediately

**Expected Result:** ✅ All P2 notifications queued for digest, no immediate emails

---

### Scenario 6: Digest Email Content and Grouping

**Objective:** Verify digest email groups notifications by project and type

#### Setup:

1. Use notifications from Scenario 5 (queued notifications)
2. Manually trigger digest email or wait for scheduled job

#### Steps:

1. **Manually Send Digest:**
   ```python
   from workhub_frappe_app.api.notifications import send_digest_email

   result = send_digest_email("test@example.com", digest_type='daily')
   print(result)
   ```

2. **Verify Digest Email Received:**
   - [ ] Check test user's email inbox
   - [ ] Verify email subject: "Tu resumen diario de WorkHub - 3 notificaciones"
   - [ ] Verify email content structure:
     - [ ] Header with user name and digest type
     - [ ] Total notification count
     - [ ] Notifications grouped by project
     - [ ] Within each project, grouped by type:
       - [ ] 📋 Tareas Asignadas
       - [ ] ⚠️ Vencidas
       - [ ] 🚧 Bloqueadas
       - [ ] ✅ Completadas
       - [ ] 🔗 Dependencias
       - [ ] ⚡ Riesgos
       - [ ] 💬 Menciones
       - [ ] 📧 Email
     - [ ] Priority badges (P0/P1/P2) with color coding
     - [ ] Direct links to notification action URLs
     - [ ] Footer with settings/unsubscribe links

3. **Verify Notifications Marked as Sent:**
   - [ ] Check `WH Notification` doctype
   - [ ] Verify all 3 notifications now have `digest_sent_at` populated
   - [ ] Verify timestamp is recent (just sent)

4. **Verify No Duplicate Digests:**
   ```python
   # Try to send digest again
   result = send_digest_email("test@example.com", digest_type='daily')
   print(result)
   # Should return: {'sent': False, 'count': 0, 'reason': 'No pending notifications'}
   ```
   - [ ] Verify no email sent (already sent)

**Expected Result:** ✅ Digest email sent with proper grouping, notifications marked as sent, no duplicates

---

### Scenario 7: Weekly Digest

**Objective:** Verify weekly digest works similarly to daily

#### Setup:

1. Set notification preferences:
   - Frequency: **Weekly digest**
   - Email: **ON**

#### Steps:

1. **Create Queued Notifications:**
   ```python
   # Create several notifications over time
   for i in range(5):
       create_notification(
           user="test@example.com",
           notification_type="TASK_ASSIGNED",
           title=f"Weekly Task {i+1}",
           message=f"Task {i+1} details",
           priority="MEDIUM",
           task_priority="P2"
       )
   ```

2. **Send Weekly Digest:**
   ```python
   from workhub_frappe_app.api.notifications import send_digest_email

   result = send_digest_email("test@example.com", digest_type='weekly')
   print(result)
   ```

3. **Verify Weekly Digest Email:**
   - [ ] Email subject: "Tu resumen semanal de WorkHub - 5 notificaciones"
   - [ ] Same grouping structure as daily
   - [ ] All notifications included

**Expected Result:** ✅ Weekly digest works correctly with all queued notifications

---

### Scenario 8: Frequency "Off" (No Emails, In-App Only)

**Objective:** Verify "off" frequency creates notifications but sends no emails

#### Setup:

1. Set notification preferences:
   - Frequency: **Off**
   - Email: **ON** (should be ignored)

#### Steps:

1. **Trigger Notification:**
   ```python
   create_notification(
       user="test@example.com",
       notification_type="TASK_ASSIGNED",
       title="Task with frequency OFF",
       message="Should be in-app only",
       priority="MEDIUM",
       task_priority="P2"
   )
   ```

2. **Verify Notification Created:**
   - [ ] Check `WH Notification` doctype
   - [ ] Notification exists
   - [ ] `queued_for_digest` = 1

3. **Verify No Email:**
   - [ ] No immediate email sent
   - [ ] No digest email will include this (frequency=off)

4. **Verify In-App Notification:**
   - [ ] Log in to WorkHub
   - [ ] Check notifications bell/dropdown
   - [ ] Verify notification appears in-app

**Expected Result:** ✅ Notification created for in-app, no emails sent

---

### Scenario 9: Scheduled Jobs

**Objective:** Verify scheduler sends digests at correct times

#### Steps:

1. **Check Scheduler Configuration:**
   ```python
   # Check hooks.py configuration
   from workhub_frappe_app import hooks
   print(hooks.scheduler_events)
   ```
   - [ ] Verify `daily` includes `send_daily_digests` at 8am
   - [ ] Verify `weekly` includes `send_weekly_digests` on Monday at 8am

2. **Manually Trigger Scheduled Functions:**
   ```python
   from workhub_frappe_app.api.notifications import send_daily_digests, send_weekly_digests

   # Trigger daily digests
   send_daily_digests()

   # Trigger weekly digests (on Monday)
   send_weekly_digests()
   ```

3. **Check Logs:**
   - [ ] Verify logs show successful execution
   - [ ] Check for any errors
   - [ ] Verify count of emails sent

**Expected Result:** ✅ Scheduler functions execute correctly, send digests to all users

---

## Edge Cases to Test

### Edge Case 1: Overnight Quiet Hours
- Set quiet hours: 22:00 to 06:00 (spans midnight)
- Trigger notification at 23:00
- Verify it's queued (within quiet hours)
- Trigger notification at 07:00
- Verify it's sent immediately (outside quiet hours)

### Edge Case 2: Priority Bypass Disabled
- Disable priority bypass
- Trigger P0 task with daily digest preference
- Verify P0 is queued for digest (not immediate)

### Edge Case 3: Email Disabled
- Disable email notifications
- Set frequency to real-time
- Trigger notification
- Verify notification created but no email sent

### Edge Case 4: Empty Digest
- User has no queued notifications
- Trigger digest send
- Verify no email sent (empty digest)

### Edge Case 5: Multiple Projects Grouping
- Create notifications for different projects
- Send digest
- Verify proper grouping by project name

---

## Verification Checklist

### Acceptance Criteria:

- [x] Users can configure notification frequency (real-time, daily digest, weekly digest, off)
- [x] Digest emails group notifications by type/project
- [x] High-priority items (P0/P1) always notify immediately regardless of preference
- [x] Users can set quiet hours (no notifications during certain times)

### Additional Verification:

- [ ] All UI components render correctly
- [ ] Settings persist across sessions
- [ ] Routing logic works for all scenarios
- [ ] Emails have proper formatting and links
- [ ] Digest grouping is logical and clear
- [ ] Scheduler jobs execute on schedule
- [ ] No duplicate emails sent
- [ ] Error handling works (invalid settings, failed emails, etc.)

---

## Known Issues / Notes

(Document any issues found during testing here)

- Issue 1: [Description]
  - Severity: [Low/Medium/High]
  - Steps to reproduce:
  - Expected vs Actual:
  - Fix required:

---

## Test Results Summary

**Tester:** [Your Name]
**Date:** [Test Date]
**Environment:** [Frappe version, WorkHub version, Browser]

**Results:**
- Total Scenarios: 9
- Passed: __
- Failed: __
- Skipped: __

**Overall Status:** [PASS / FAIL / PARTIAL]

**Notes:**
[Any additional observations or recommendations]

---

## Next Steps

After successful manual testing:

1. Document any bugs found and create fixes
2. Update E2E tests if needed
3. Update build-progress.txt
4. Mark subtask 6.3 as completed in implementation_plan.json
5. Commit changes with message: "auto-claude: 6.3 - Test complete flow: change preferences, trigger no"
6. Move to QA sign-off (update_qa_status)
