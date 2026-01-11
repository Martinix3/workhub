# Scheduled Reports - Manual Testing Plan
## Subtask 10.3 - Testing Documentation

**Date:** 2026-01-11
**Component:** Scheduled Reports System (report_scheduler.py + workhub_reportes_programados.html + schedule_modal.js)
**Tester:** Manual verification required

---

## Test Environment Setup

### Prerequisites
1. Frappe bench running with WorkHub app installed
2. User with System Manager or Report Manager role
3. Browser DevTools open (Console tab for errors)
4. At least 1-2 existing reports created for testing
5. Email server configured (or email queue enabled for testing)
6. Access to email inbox for testing recipient delivery

### Access URLs
- **Scheduled Reports Page:** `/workhub_reportes_programados`
- **Reports Listing:** `/workhub_reportes`
- **Report Builder:** `/workhub_reportes_builder`

### Email Configuration Check
```bash
# Verify email settings in Frappe
bench console
>>> import frappe
>>> print(frappe.conf.mail_server)
>>> print(frappe.conf.mail_login)
# If no email server, enable print mode for testing
>>> frappe.conf.mail_server = None
```

---

## Test Suite 1: Create Scheduled Reports - All Frequencies

### Test 1.1: Create Daily Schedule
**Steps:**
1. Navigate to `/workhub_reportes_programados`
2. Click "Nueva Programación" button
3. In schedule modal:
   - Schedule Name: "Daily Team Report"
   - Select Report: Choose existing report (e.g., "Team Productivity Report")
   - Frequency: "Diario" (Daily)
   - Time: "09:00"
   - Export Format: "PDF"
   - Add Recipients: Add your user and/or email
   - Email Subject: "Daily Team Report - {{date}}"
   - Email Body: "Please find attached the daily team productivity report."
   - Active Status: ✓ Enabled
4. Click "Guardar Programación"

**Expected Results:**
- ✅ Modal opens without errors
- ✅ Report dropdown loads available reports
- ✅ Frequency selection shows "Diario" option
- ✅ Time picker displays correctly (HTML5 time input)
- ✅ Day-of-week selector is HIDDEN (only for weekly)
- ✅ Day-of-month input is HIDDEN (only for monthly)
- ✅ Format dropdown shows PDF/Excel/CSV options
- ✅ Recipients section shows "Add Recipient" button
- ✅ Email subject/body fields accept input
- ✅ Active toggle works
- ✅ Save button creates schedule successfully
- ✅ Success message appears: "Programación creada exitosamente"
- ✅ Page reloads showing new schedule in list
- ✅ Schedule card shows:
  - Name: "Daily Team Report"
  - Frequency: "Diario a las 09:00"
  - Next run: Tomorrow at 09:00 (or today if before 09:00)
  - Status: Active badge (green)
  - Format: PDF badge (red)
  - Recipients: Count badge showing number added
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 1.2: Create Weekly Schedule
**Steps:**
1. Click "Nueva Programación" again
2. Configure weekly schedule:
   - Schedule Name: "Weekly Project Status"
   - Select Report: Different report than Test 1.1
   - Frequency: "Semanal" (Weekly)
   - Time: "14:00"
   - Day of Week: "Lunes" (Monday)
   - Export Format: "Excel"
   - Add 2-3 recipients (mix of users and emails)
   - Active Status: ✓ Enabled
3. Save schedule

**Expected Results:**
- ✅ Frequency "Semanal" selected successfully
- ✅ Day-of-week selector APPEARS when weekly selected
- ✅ Day-of-week dropdown shows: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo
- ✅ Day-of-month input remains HIDDEN
- ✅ Can select "Lunes"
- ✅ Schedule saves successfully
- ✅ List shows:
  - Frequency: "Semanal - Lunes a las 14:00"
  - Next run: Next Monday at 14:00
  - Format: Excel badge (green)
  - Recipients count correct
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 1.3: Create Monthly Schedule
**Steps:**
1. Click "Nueva Programación"
2. Configure monthly schedule:
   - Schedule Name: "Monthly HACCP Compliance"
   - Select Report: HACCP or compliance report
   - Frequency: "Mensual" (Monthly)
   - Time: "08:30"
   - Day of Month: "1" (first day of month)
   - Export Format: "CSV"
   - Add at least 1 recipient
   - Active Status: ✓ Enabled
3. Save schedule

**Expected Results:**
- ✅ Frequency "Mensual" selected successfully
- ✅ Day-of-month input APPEARS when monthly selected
- ✅ Day-of-week selector remains HIDDEN
- ✅ Day-of-month accepts values 1-31
- ✅ Can enter "1" for first day of month
- ✅ Schedule saves successfully
- ✅ List shows:
  - Frequency: "Mensual - Día 1 a las 08:30"
  - Next run: 1st of next month at 08:30 (or this month if before 1st)
  - Format: CSV badge (blue)
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 1.4: Validate Frequency Field Logic
**Steps:**
1. Open schedule modal
2. Select "Diario" → verify day-of-week and day-of-month are hidden
3. Change to "Semanal" → verify day-of-week appears, day-of-month hidden
4. Change to "Mensual" → verify day-of-month appears, day-of-week hidden
5. Change back to "Diario" → verify both extra fields hidden again

**Expected Results:**
- ✅ Conditional field display works correctly for all frequency types
- ✅ Field values are preserved when switching back and forth
- ✅ No flickering or UI issues during frequency changes
- ✅ Form validation adapts to selected frequency

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 2: Recipient Management

### Test 2.1: Add Internal User Recipients
**Steps:**
1. Create/edit a schedule
2. In Recipients section, click "Agregar Destinatario"
3. In add recipient modal:
   - Type: "Usuario" (User)
   - User: Select your user from dropdown
4. Click "Agregar"
5. Verify recipient appears in list
6. Add 2 more internal users (if available)

**Expected Results:**
- ✅ "Agregar Destinatario" button opens modal
- ✅ Recipient type dropdown shows "Usuario" and "Email"
- ✅ When "Usuario" selected:
  - User dropdown appears
  - Email field is hidden
- ✅ User dropdown shows available users (fetched from User DocType)
- ✅ Can select user successfully
- ✅ "Agregar" button adds user to recipients list
- ✅ Recipient list shows:
  - User's full name
  - Email address (fetched from User)
  - "Usuario" badge
  - Delete button (×)
- ✅ Can add multiple users without errors
- ✅ Modal closes after adding
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 2.2: Add External Email Recipients
**Steps:**
1. In same schedule, click "Agregar Destinatario" again
2. In add recipient modal:
   - Type: "Email"
   - Email: "test@example.com"
3. Click "Agregar"
4. Verify email recipient appears in list
5. Try adding invalid email: "invalid-email"
6. Verify validation error appears

**Expected Results:**
- ✅ When "Email" selected:
  - Email input field appears
  - User dropdown is hidden
- ✅ Can type email address
- ✅ Valid email (test@example.com) adds successfully
- ✅ Recipient list shows:
  - Email address
  - "Email" badge
  - Delete button (×)
- ✅ Invalid email shows validation error
- ✅ Cannot add invalid email to list
- ✅ Error message is user-friendly
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 2.3: Remove Recipients
**Steps:**
1. With schedule having 3-4 recipients added
2. Click delete (×) button on second recipient
3. Verify recipient is removed from list
4. Remove all recipients
5. Try to save schedule with no recipients
6. Verify validation error

**Expected Results:**
- ✅ Delete button works for each recipient
- ✅ Recipient is immediately removed from list
- ✅ No confirmation dialog (direct delete)
- ✅ Can remove all recipients
- ✅ Save validation requires at least 1 recipient
- ✅ Error message: "Debe agregar al menos un destinatario"
- ✅ Cannot save empty recipient list
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 2.4: Edit Schedule Recipients
**Steps:**
1. Save a schedule with 2 recipients
2. Later, click "Edit" button on the schedule
3. Verify existing recipients load in modal
4. Add 1 new recipient
5. Remove 1 existing recipient
6. Save changes
7. Verify updated recipient count in schedule list

**Expected Results:**
- ✅ Edit button opens schedule modal with existing data
- ✅ Recipients section shows all existing recipients
- ✅ Can add new recipients in edit mode
- ✅ Can remove existing recipients in edit mode
- ✅ Save updates recipient list successfully
- ✅ Schedule card shows updated recipient count badge
- ✅ No duplicate recipients created
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 3: Email Delivery Testing

### Test 3.1: Manual "Run Now" Execution
**Steps:**
1. From scheduled reports list, find a schedule
2. Click "Ejecutar Ahora" (Run Now) button
3. Confirm execution in dialog
4. Wait for completion (check progress indicator)
5. Check your email inbox
6. Verify email received

**Expected Results:**
- ✅ "Ejecutar Ahora" button visible for all schedules
- ✅ Confirmation dialog appears with schedule details
- ✅ Dialog message: "¿Ejecutar '{schedule_name}' ahora?"
- ✅ Progress indicator shows during execution
- ✅ Success message appears after completion
- ✅ Email is received in inbox within 1-2 minutes
- ✅ Email from address is configured Frappe sender
- ✅ Email to addresses match schedule recipients
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 3.2: Email Subject and Body
**Steps:**
1. Open received email from Test 3.1
2. Verify email subject
3. Verify email body content
4. Check for template rendering

**Expected Results:**
- ✅ Email subject matches configured subject (or default: "Reporte Programado: {report_title}")
- ✅ Email body shows:
  - Professional header with report title and icon
  - Report details card with:
    * Report title
    * Type badge (Standard/Custom)
    * Category badge
    * Generation date/time
    * Export format
    * Generated by user name
  - Attachment notice section
  - Download section with buttons
  - Footer with WorkHub branding
- ✅ Custom email body (if configured) overrides template
- ✅ Email is HTML formatted (not plain text)
- ✅ Professional styling with gradients and colors
- ✅ Spanish localization throughout
- ✅ No broken images or styling

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 3.3: Email Attachments
**Steps:**
1. In same email, locate attachment
2. Verify attachment is present
3. Download attachment
4. Open attachment file
5. Verify file format matches schedule configuration

**Expected Results:**
- ✅ Email has 1 attachment
- ✅ Attachment filename format: "{report_name}_{timestamp}.{format}"
  - Example: "Team_Productivity_Report_20260111_143022.pdf"
- ✅ Attachment file size is reasonable (not 0 bytes)
- ✅ File format matches schedule:
  - PDF schedule → .pdf attachment
  - Excel schedule → .xlsx attachment
  - CSV schedule → .csv attachment
- ✅ Downloaded file opens successfully in appropriate application
- ✅ File contains report data (not empty or corrupted)
- ✅ File formatting matches export format standards from Test 10.2

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 3.4: Multiple Recipients Delivery
**Steps:**
1. Create schedule with 3 recipients:
   - 1 internal user
   - 2 external emails
2. Execute "Run Now"
3. Check all 3 inboxes (or check email queue)

**Expected Results:**
- ✅ All 3 recipients receive email
- ✅ Internal user receives email at their User email address
- ✅ External emails receive at specified addresses
- ✅ Each recipient receives identical email content
- ✅ Each email has same attachment
- ✅ Email queue shows 3 sent emails (or 1 email with 3 recipients)
- ✅ No delivery failures in error log
- ✅ frappe.sendmail() called with correct recipients list

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 3.5: Email Delivery Failure Handling
**Steps:**
1. Create schedule with invalid email: "invalid@nonexistent-domain-12345.com"
2. Execute "Run Now"
3. Wait for completion
4. Check schedule last run status
5. Check error log

**Expected Results:**
- ✅ Schedule execution doesn't crash
- ✅ Report is generated successfully
- ✅ Email sending is attempted
- ✅ Delivery failure is logged
- ✅ Schedule last_status shows "Fallido" (Failed)
- ✅ Error log contains delivery error details
- ✅ User sees error alert: "Error al enviar el reporte"
- ✅ Generated report is still created (WH Generated Report record exists)
- ✅ File is still generated and stored
- ✅ Can retry delivery later

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 4: Automated Scheduler Execution

### Test 4.1: Verify Scheduler Configuration
**Steps:**
1. Check hooks.py configuration
2. Verify cron job is registered

**Expected Results:**
- ✅ hooks.py contains scheduler_events configuration
- ✅ Cron schedule: "*/15 * * * *" (every 15 minutes)
- ✅ Function: workhub_frappe_app.api.report_scheduler.process_scheduled_reports
- ✅ Scheduler is enabled in Frappe (bench scheduler status)

**Verification Command:**
```bash
# Check scheduler status
bench doctor

# Check cron jobs
bench console
>>> import frappe
>>> print(frappe.get_hooks("scheduler_events"))
```

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 4.2: Test Due Schedule Detection
**Steps:**
1. Create a schedule with next_run time in the past:
   - Option A: Edit database directly:
     ```sql
     UPDATE `tabWH Scheduled Report`
     SET next_run = NOW() - INTERVAL 1 HOUR
     WHERE name = 'SCHED-00001';
     ```
   - Option B: Create schedule with time 10 minutes from now, wait
2. Run scheduler manually:
   ```bash
   bench console
   >>> from workhub_frappe_app.api.report_scheduler import process_scheduled_reports
   >>> process_scheduled_reports()
   ```
3. Check execution

**Expected Results:**
- ✅ Scheduler detects schedule is due (next_run <= now)
- ✅ Schedule is executed automatically
- ✅ Report is generated
- ✅ Email is sent to recipients
- ✅ last_run timestamp is updated to execution time
- ✅ next_run is recalculated based on frequency:
  - Daily: next_run = tomorrow at same time
  - Weekly: next_run = next week same day/time
  - Monthly: next_run = next month same day/time
- ✅ last_status is updated to "Exitoso" (Success)
- ✅ No errors in scheduler logs

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 4.3: Test Scheduler Error Recovery
**Steps:**
1. Create 2 schedules (both due)
2. Make first schedule's report invalid (delete the report)
3. Run scheduler manually
4. Verify second schedule still executes

**Expected Results:**
- ✅ Scheduler processes first schedule
- ✅ First schedule fails (report not found)
- ✅ Error is logged for first schedule
- ✅ First schedule last_status = "Fallido"
- ✅ Scheduler continues to second schedule (doesn't crash)
- ✅ Second schedule executes successfully
- ✅ Second schedule last_status = "Exitoso"
- ✅ Both schedules have next_run updated
- ✅ Error log contains details for failed schedule
- ✅ Successful schedule's email is sent

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 4.4: Verify Inactive Schedules Skipped
**Steps:**
1. Create schedule and set is_active = False (paused)
2. Set next_run to past time
3. Run scheduler
4. Verify schedule is NOT executed

**Expected Results:**
- ✅ Scheduler skips inactive schedules
- ✅ Paused schedule is not executed
- ✅ No report generated for paused schedule
- ✅ No email sent for paused schedule
- ✅ last_run remains unchanged
- ✅ next_run remains unchanged
- ✅ Scheduler logs show schedule was skipped
- ✅ Active schedules still execute normally

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 5: History Tracking

### Test 5.1: View Schedule Execution History
**Steps:**
1. From scheduled reports list, find a schedule that has been executed at least once
2. Click "Ver Historial" (View History) button
3. Examine history modal

**Expected Results:**
- ✅ "Ver Historial" button visible for all schedules
- ✅ Modal opens with title: "Historial de '{schedule_name}'"
- ✅ Statistics cards display:
  - Total Executions: Correct count
  - Successful: Count of successful deliveries
  - Success Rate: Percentage (successful/total × 100%)
- ✅ History table shows:
  - Generation Date/Time (formatted dd/mm/yyyy HH:MM)
  - Status badge (Exitoso/Fallido/Pendiente)
  - Format badge (PDF/Excel/CSV)
  - Generated By user name
  - Actions: Download button (if completed)
- ✅ Table sorted by date descending (most recent first)
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 5.2: Download from History
**Steps:**
1. In history modal, locate a completed execution
2. Click "Descargar" (Download) button
3. Verify file downloads

**Expected Results:**
- ✅ Download button visible for completed executions
- ✅ Download button disabled/hidden for failed executions
- ✅ Clicking download triggers file download
- ✅ File downloads successfully
- ✅ Downloaded file matches original export format
- ✅ File opens and contains report data
- ✅ File is identical to emailed attachment
- ✅ No errors during download

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 5.3: Re-send Failed Delivery
**Steps:**
1. In history modal, locate a failed execution
2. Click "Reenviar" (Resend) button
3. Confirm resend action
4. Wait for completion
5. Check email inbox

**Expected Results:**
- ✅ "Reenviar" button visible for failed executions
- ✅ Confirmation dialog appears
- ✅ Dialog message: "¿Reenviar el reporte a los destinatarios actuales?"
- ✅ Progress indicator shows during resend
- ✅ Email is sent to current schedule recipients (not original recipients)
- ✅ Email received successfully
- ✅ Generated report status updated from "Fallido" to "Completado"
- ✅ Success message: "Reporte reenviado exitosamente"
- ✅ History refreshes showing updated status
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 5.4: History Pagination and Filtering
**Steps:**
1. Execute same schedule 15+ times (use "Run Now" repeatedly or wait for automated runs)
2. View history
3. Check for pagination/scrolling
4. Verify all executions visible

**Expected Results:**
- ✅ History shows all executions (default limit: 10, expandable)
- ✅ Pagination or "Load More" available if > 10 executions
- ✅ Statistics cards reflect all executions (not just visible page)
- ✅ Table scrolls if too many rows
- ✅ Can view older executions
- ✅ Date sorting maintained across pages
- ✅ No performance issues with many rows

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 5.5: Verify WH Generated Report Linking
**Steps:**
1. Execute a scheduled report
2. Navigate to WH Generated Report DocType list
3. Find the generated report
4. Verify scheduled_report field is populated

**Expected Results:**
- ✅ WH Generated Report record created
- ✅ scheduled_report field links to WH Scheduled Report
- ✅ report_definition field links to WH Report Definition
- ✅ generated_by shows executing user (or System)
- ✅ export_format matches schedule configuration
- ✅ file_url contains generated file
- ✅ status is "Completed"
- ✅ data_snapshot contains report data
- ✅ Can navigate from Generated Report to Schedule

**Verification Query:**
```sql
SELECT
  name,
  report_definition,
  scheduled_report,
  export_format,
  status,
  generated_at
FROM `tabWH Generated Report`
WHERE scheduled_report IS NOT NULL
ORDER BY generated_at DESC
LIMIT 10;
```

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 6: Schedule Management Actions

### Test 6.1: Pause Schedule
**Steps:**
1. From scheduled reports list, find active schedule
2. Click "Pausar" (Pause) button
3. Confirm pause action
4. Verify schedule is paused

**Expected Results:**
- ✅ "Pausar" button visible for active schedules
- ✅ Confirmation dialog appears
- ✅ Dialog message: "¿Pausar la programación '{schedule_name}'?"
- ✅ After confirmation, schedule is deactivated
- ✅ Success message: "Programación pausada exitosamente"
- ✅ Schedule card updates:
  - Status badge changes to "Inactivo" (gray)
  - Button changes to "Reanudar" (Resume)
- ✅ is_active field set to False in database
- ✅ Schedule will NOT execute on next_run time
- ✅ Page refreshes showing updated status
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 6.2: Resume Schedule
**Steps:**
1. With paused schedule from Test 6.1
2. Click "Reanudar" (Resume) button
3. Confirm resume action
4. Verify schedule is active again

**Expected Results:**
- ✅ "Reanudar" button visible for inactive schedules
- ✅ Confirmation dialog appears
- ✅ Dialog message: "¿Reanudar la programación '{schedule_name}'?"
- ✅ After confirmation, schedule is activated
- ✅ Success message: "Programación reanudada exitosamente"
- ✅ Schedule card updates:
  - Status badge changes to "Activo" (green)
  - Button changes to "Pausar" (Pause)
- ✅ is_active field set to True in database
- ✅ next_run is recalculated to next due time
- ✅ Schedule WILL execute on next_run time
- ✅ Page refreshes showing updated status
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 6.3: Edit Schedule
**Steps:**
1. Click "Editar" button on existing schedule
2. Modify schedule:
   - Change frequency (e.g., Daily → Weekly)
   - Change time
   - Change export format
   - Add/remove recipients
3. Save changes
4. Verify updates

**Expected Results:**
- ✅ "Editar" button opens schedule modal
- ✅ Modal populated with existing schedule data:
  - Schedule name
  - Selected report
  - Current frequency, time, day settings
  - Current export format
  - Existing recipients list
  - Current email subject/body
  - Current active status
- ✅ Can modify all fields
- ✅ Frequency change updates conditional fields correctly
- ✅ Save updates schedule successfully
- ✅ Schedule list reflects changes:
  - Updated frequency description
  - Updated next_run (recalculated)
  - Updated format badge
  - Updated recipient count
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 6.4: Delete Schedule (Future Enhancement)
**Note:** Delete functionality may not be implemented yet. Test if available.

**Steps:**
1. Look for delete button on schedule
2. If available, click delete
3. Confirm deletion
4. Verify schedule removed

**Expected Results:**
- ⬜ Delete button available (may be placeholder)
- ⬜ Confirmation dialog with warning
- ⬜ Schedule deleted from database
- ⬜ Schedule removed from list
- ⬜ Generated reports history preserved
- ⬜ Or: Delete button shows "Coming soon" message

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed | ⚠️ Not Implemented

---

## Test Suite 7: Edge Cases and Error Handling

### Test 7.1: Schedule with Deleted Report
**Steps:**
1. Create schedule linked to a report
2. Delete the underlying report
3. Wait for scheduled execution or run manually
4. Check error handling

**Expected Results:**
- ✅ Schedule execution fails gracefully
- ✅ Error message: "Report not found" or similar
- ✅ last_status = "Fallido"
- ✅ Error logged with details
- ✅ No crash or system error
- ✅ Other schedules continue to work
- ✅ User can edit schedule to select different report

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 7.2: Schedule at Exact Midnight
**Steps:**
1. Create daily schedule with time "00:00"
2. Verify schedule is created
3. Check next_run calculation

**Expected Results:**
- ✅ Can create schedule with 00:00 time
- ✅ next_run calculated correctly (tomorrow at midnight)
- ✅ Schedule executes at midnight
- ✅ No timezone issues
- ✅ Date rollover handled correctly

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 7.3: Monthly Schedule on Day 31
**Steps:**
1. Create monthly schedule with day_of_month = 31
2. Verify behavior in months with fewer days (Feb, Apr, Jun, Sep, Nov)

**Expected Results:**
- ✅ Schedule accepts day_of_month = 31
- ✅ In 30-day months, schedule runs on last day (30th)
- ✅ In February, schedule runs on last day (28th/29th)
- ✅ In 31-day months, schedule runs on 31st
- ✅ next_run calculation handles month boundaries
- ✅ No errors on month transitions

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 7.4: Concurrent Schedule Executions
**Steps:**
1. Create 5 schedules all due at same time
2. Run scheduler
3. Verify all execute successfully

**Expected Results:**
- ✅ Scheduler processes all due schedules
- ✅ All 5 schedules execute (may be sequential)
- ✅ All reports generated correctly
- ✅ All emails sent
- ✅ No race conditions or conflicts
- ✅ All next_run times updated
- ✅ No performance degradation

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 7.5: Schedule with Empty/Invalid Email Body
**Steps:**
1. Create schedule with empty email_body
2. Execute schedule
3. Verify default template is used

**Expected Results:**
- ✅ Empty email_body is acceptable
- ✅ Default email template renders
- ✅ Email contains professional template from scheduled_report.html
- ✅ All template variables populated correctly
- ✅ Email is readable and professional
- ✅ No template rendering errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 8: UI/UX and Performance

### Test 8.1: Scheduled Reports List Performance
**Steps:**
1. Create 20+ schedules
2. Load `/workhub_reportes_programados`
3. Test filtering and search

**Expected Results:**
- ✅ Page loads within 2 seconds
- ✅ All schedules display correctly
- ✅ KPI cards show correct counts
- ✅ Search filters work quickly
- ✅ No lag when interacting with list
- ✅ Responsive design maintained
- ✅ No console errors or warnings

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 8.2: Schedule Modal Responsiveness
**Steps:**
1. Test schedule modal on different screen sizes:
   - Desktop (1920x1080)
   - Tablet (768px)
   - Mobile (375px)

**Expected Results:**
- ✅ Modal displays correctly on all screen sizes
- ✅ Form fields stack properly on mobile
- ✅ Recipient list scrolls on small screens
- ✅ Buttons accessible on all devices
- ✅ Time picker works on mobile
- ✅ Day-of-week dropdown fits on screen
- ✅ No horizontal scroll on mobile

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 8.3: History Modal with Large Dataset
**Steps:**
1. Schedule with 50+ executions
2. View history
3. Check performance

**Expected Results:**
- ✅ History loads within 3 seconds
- ✅ Statistics calculated correctly
- ✅ Table scrolls smoothly
- ✅ No browser freezing
- ✅ Can download files from any row
- ✅ No memory leaks
- ✅ Modal close button always accessible

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 9: Integration Testing

### Test 9.1: End-to-End Schedule Lifecycle
**Steps:**
1. Create new report in builder
2. Create schedule for that report
3. Execute "Run Now"
4. Verify email delivery
5. View history
6. Download from history
7. Pause schedule
8. Resume schedule
9. Edit schedule (change time)
10. Wait for automated execution

**Expected Results:**
- ✅ All steps complete without errors
- ✅ Data flows correctly through all components
- ✅ Report → Schedule → Generated Report → Email → History
- ✅ All UI interactions work smoothly
- ✅ No data loss or corruption
- ✅ Automated execution works after edits

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 9.2: Navigation Flow
**Steps:**
1. Start at `/workhub_reportes`
2. Click "Programados" button → verify redirects to `/workhub_reportes_programados`
3. Click "Nueva Programación" → modal opens
4. Click "Volver a Reportes" → redirects back to `/workhub_reportes`
5. From reports list, click "Schedule" on a report
6. Verify modal pre-selects that report

**Expected Results:**
- ✅ All navigation links work correctly
- ✅ URLs are correct
- ✅ Back buttons return to previous page
- ✅ Context preserved across navigation
- ✅ No broken links
- ✅ Breadcrumbs/navigation clear

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Browser Compatibility Testing

### Test 10.1: Chrome/Edge
**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

### Test 10.2: Firefox
**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

### Test 10.3: Safari
**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Testing Summary

### Overall Statistics
- **Total Test Cases:** 47
- **Passed:** ___
- **Failed:** ___
- **Not Tested:** ___
- **Not Implemented:** ___

### Critical Issues Found
| Issue | Severity | Test | Description | Status |
|-------|----------|------|-------------|--------|
| | | | | |

### Test Sign-Off

**Overall Assessment:**
- ⬜ All critical tests passed
- ⬜ All frequencies work correctly (daily, weekly, monthly)
- ⬜ Email delivery works with attachments
- ⬜ Recipient management functions properly
- ⬜ History tracking is accurate
- ⬜ No critical bugs found
- ⬜ Ready for production

**Tester Name:** ________________
**Date:** ________________
**Signature:** ________________

---

## Notes and Observations

(Add any additional notes, observations, or recommendations here)
