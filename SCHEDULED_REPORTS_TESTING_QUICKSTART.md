# Scheduled Reports - Quick Testing Guide
## 15-Minute Validation for Subtask 10.3

**Purpose:** Fast validation of scheduled reports functionality
**Time:** ~15-20 minutes
**Prerequisites:** Frappe bench running, at least 1 report created, email configured

---

## Quick Test Sequence

### Phase 1: Create Schedules (5 minutes)

**Test all three frequencies:**

1. **Daily Schedule**
   - Go to `/workhub_reportes_programados`
   - Click "Nueva Programación"
   - Fill:
     * Name: "Test Daily"
     * Report: Any available report
     * Frequency: Diario
     * Time: Current time + 5 minutes (for quick test)
     * Format: PDF
     * Recipients: Your email
   - Save

2. **Weekly Schedule**
   - Click "Nueva Programación" again
   - Fill:
     * Name: "Test Weekly"
     * Report: Any report
     * Frequency: Semanal
     * Day: Current day of week
     * Time: Current time + 10 minutes
     * Format: Excel
     * Recipients: Your email
   - Save

3. **Monthly Schedule**
   - Click "Nueva Programación" again
   - Fill:
     * Name: "Test Monthly"
     * Report: Any report
     * Frequency: Mensual
     * Day: Current day of month
     * Time: Current time + 15 minutes
     * Format: CSV
     * Recipients: Your email
   - Save

**✅ Checkpoint:** All 3 schedules appear in list with correct frequency descriptions

---

### Phase 2: Email Delivery (5 minutes)

**Test manual execution and email delivery:**

1. **Execute Daily Schedule**
   - Find "Test Daily" in list
   - Click "Ejecutar Ahora"
   - Confirm execution
   - Wait 30-60 seconds

**✅ Checkpoint:** Success message appears

2. **Check Email**
   - Open your email inbox
   - Look for email from Frappe system
   - Verify:
     * Subject: "Reporte Programado: {Report Name}"
     * Body: Professional template with report details
     * Attachment: PDF file
     * File size: > 0 KB

**✅ Checkpoint:** Email received with correct attachment

3. **Download Attachment**
   - Download PDF from email
   - Open PDF file
   - Verify:
     * Cover page with report title
     * Report sections render correctly
     * Data is present (not empty)

**✅ Checkpoint:** PDF opens and contains report data

---

### Phase 3: History & Recipients (5 minutes)

**Test history tracking and recipient management:**

1. **View History**
   - Back in `/workhub_reportes_programados`
   - Find "Test Daily" schedule
   - Click "Ver Historial"
   - Verify:
     * Statistics: 1 execution, 1 successful, 100% success rate
     * Table shows 1 row with:
       - Today's date/time
       - Status: Exitoso (green badge)
       - Format: PDF (red badge)
       - Download button

**✅ Checkpoint:** History shows execution correctly

2. **Download from History**
   - Click "Descargar" button
   - Verify file downloads
   - Compare to emailed attachment (should be identical)

**✅ Checkpoint:** Downloaded file matches email attachment

3. **Edit Recipients**
   - Close history modal
   - Click "Editar" on "Test Weekly"
   - In Recipients section:
     * Add 1 external email (e.g., test@example.com)
     * Verify shows 2 recipients
   - Save changes
   - Verify recipient count badge shows "2"

**✅ Checkpoint:** Recipient management works

4. **Pause/Resume**
   - Find "Test Monthly"
   - Click "Pausar"
   - Confirm
   - Verify status badge changes to "Inactivo" (gray)
   - Click "Reanudar"
   - Confirm
   - Verify status badge changes to "Activo" (green)

**✅ Checkpoint:** Pause/resume functionality works

---

## Command-Line Testing (Alternative)

### Manual Scheduler Execution

```bash
# Open Frappe console
bench console

# Execute scheduler manually
from workhub_frappe_app.api.report_scheduler import process_scheduled_reports
process_scheduled_reports()

# Check results
import frappe
schedules = frappe.get_all('WH Scheduled Report',
    fields=['name', 'schedule_name', 'last_run', 'last_status', 'next_run'],
    filters={'is_active': 1})
for s in schedules:
    print(f"{s.schedule_name}: {s.last_status} at {s.last_run}")
```

### Verify Email Queue

```bash
# Check if emails were queued
bench console

import frappe
emails = frappe.get_all('Email Queue',
    fields=['name', 'recipients', 'status', 'creation'],
    order_by='creation desc',
    limit=5)
for e in emails:
    print(f"{e.recipients}: {e.status}")
```

### Check Generated Reports

```bash
# Verify generated reports created
bench console

import frappe
reports = frappe.get_all('WH Generated Report',
    fields=['name', 'report_definition', 'scheduled_report', 'status', 'generated_at'],
    filters={'scheduled_report': ['!=', '']},
    order_by='generated_at desc',
    limit=5)
for r in reports:
    print(f"{r.name}: {r.status} - {r.report_definition}")
```

---

## Troubleshooting Common Issues

### Issue: Email not received

**Possible Causes:**
1. Email server not configured
2. Email queue not processing
3. Invalid recipient email

**Debug Steps:**
```bash
# Check email configuration
bench console
>>> import frappe
>>> print(frappe.conf.mail_server)
>>> print(frappe.conf.mail_login)

# Check email queue
>>> emails = frappe.get_all('Email Queue',
        filters={'status': ['in', ['Error', 'Not Sent']]},
        fields=['name', 'error', 'recipients'])
>>> print(emails)

# Process email queue manually
>>> frappe.sendmail_queue()
```

**Solutions:**
- Configure email server in site_config.json
- Enable background jobs: `bench worker --queue default`
- Check spam folder
- Use print mode for testing: Set `frappe.conf.mail_server = None`

---

### Issue: Schedule not executing automatically

**Possible Causes:**
1. Frappe scheduler not running
2. Schedule next_run in future
3. Schedule is paused (is_active = False)

**Debug Steps:**
```bash
# Check scheduler status
bench doctor

# Check schedule details
bench console
>>> import frappe
>>> schedule = frappe.get_doc('WH Scheduled Report', 'SCHED-00001')
>>> print(f"Active: {schedule.is_active}")
>>> print(f"Next run: {schedule.next_run}")
>>> from datetime import datetime
>>> print(f"Now: {datetime.now()}")

# Enable scheduler if disabled
>>> frappe.conf.disable_scheduler = 0
```

**Solutions:**
- Start scheduler: `bench scheduler enable`
- Check next_run is in the past
- Resume paused schedule

---

### Issue: Attachment missing from email

**Possible Causes:**
1. File generation failed
2. File path incorrect
3. Email size limit exceeded

**Debug Steps:**
```bash
# Check generated report file
bench console
>>> import frappe
>>> report = frappe.get_doc('WH Generated Report', 'GEN-RPT-00001')
>>> print(f"File URL: {report.file_url}")
>>> print(f"Status: {report.status}")

# Check file exists
>>> from frappe.utils.file_manager import get_file_path
>>> file_path = get_file_path(report.file_url)
>>> print(f"File path: {file_path}")
>>> import os
>>> print(f"Exists: {os.path.exists(file_path)}")
```

**Solutions:**
- Verify export completed successfully
- Check file permissions
- Reduce report size if too large

---

### Issue: "Run Now" button doesn't work

**Possible Causes:**
1. JavaScript error
2. Permission denied
3. API endpoint not found

**Debug Steps:**
- Open Browser DevTools Console
- Click "Run Now" and check for errors
- Check Network tab for API call
- Verify user has Report Manager or System Manager role

**Solutions:**
- Clear browser cache
- Check console for specific error
- Verify API permissions in report_scheduler.py

---

### Issue: Recipients not receiving email

**Possible Causes:**
1. Recipient email address incorrect
2. User email not set in User DocType
3. External email domain blocking

**Debug Steps:**
```bash
# Check recipient details
bench console
>>> import frappe
>>> schedule = frappe.get_doc('WH Scheduled Report', 'SCHED-00001')
>>> for recipient in schedule.recipients:
>>>     if recipient.recipient_type == 'User':
>>>         user = frappe.get_doc('User', recipient.user)
>>>         print(f"User: {user.full_name}, Email: {user.email}")
>>>     else:
>>>         print(f"External: {recipient.email}")
```

**Solutions:**
- Verify user emails in User DocType
- Check external email spelling
- Test with known working email first

---

## Performance Benchmarks

### Expected Performance

| Operation | Expected Time | Acceptable Range |
|-----------|---------------|------------------|
| Create schedule | < 1 second | 0.5-2 seconds |
| Load schedules list (20 items) | < 2 seconds | 1-3 seconds |
| Execute schedule manually | 5-30 seconds | Depends on report size |
| Email delivery | 1-2 minutes | Up to 5 minutes |
| View history (50 items) | < 3 seconds | 2-5 seconds |
| Download from history | < 1 second | 0.5-2 seconds |

### Large Dataset Testing

For production readiness, test with:
- **20+ schedules** - List should load in < 3 seconds
- **100+ executions per schedule** - History should be performant
- **10+ recipients per schedule** - Emails should be sent efficiently

---

## Completion Checklist

### Minimum Requirements (Subtask 10.3)

- ✅ **Create schedules for all frequencies**
  - [ ] Daily schedule created and saved
  - [ ] Weekly schedule created with day-of-week selection
  - [ ] Monthly schedule created with day-of-month selection
  - [ ] Conditional fields show/hide correctly

- ✅ **Verify emails sent with correct attachments**
  - [ ] Email received in inbox
  - [ ] Email has professional template
  - [ ] Attachment file present
  - [ ] Attachment format matches schedule (PDF/Excel/CSV)
  - [ ] Attachment opens and contains data

- ✅ **Test recipient management**
  - [ ] Can add internal users as recipients
  - [ ] Can add external emails as recipients
  - [ ] Can remove recipients
  - [ ] Multiple recipients all receive email
  - [ ] Email validation works

- ✅ **Verify history tracking works**
  - [ ] Execution history displays correctly
  - [ ] Statistics accurate (total, successful, success rate)
  - [ ] Can download from history
  - [ ] Can resend failed deliveries (if applicable)
  - [ ] History sorted by date descending

### Additional Validation

- [ ] Pause/resume functionality works
- [ ] Edit schedule updates correctly
- [ ] "Run Now" executes immediately
- [ ] Scheduler detects due schedules
- [ ] next_run recalculates correctly after execution
- [ ] Failed schedules log errors properly
- [ ] Inactive schedules are skipped
- [ ] No console errors during testing

---

## Sign-Off

**Quick Test Completed:** ☐ Yes ☐ No

**Core Functionality Working:** ☐ Yes ☐ No

**Critical Issues:** ☐ None ☐ See full test plan

**Ready for Commit:** ☐ Yes ☐ Needs fixes

**Tested By:** ________________

**Date:** ________________

---

## Next Steps

### If Tests Pass
1. Mark subtask 10.3 as completed
2. Update implementation_plan.json
3. Commit changes
4. Proceed to subtask 10.4

### If Issues Found
1. Document issues in TEST_SCHEDULED_REPORTS.md
2. Fix issues
3. Re-test
4. Update build-progress.txt with notes

### For Full QA
- Use TEST_SCHEDULED_REPORTS.md for comprehensive testing
- Test all 47 test cases
- Verify browser compatibility
- Test edge cases and error handling
- Document all findings

---

## Quick API Reference

### Create Schedule
```javascript
frappe.call({
    method: 'workhub_frappe_app.api.report_scheduler.create_schedule',
    args: {
        report_definition: 'Report Name',
        schedule_name: 'Test Schedule',
        schedule_type: 'Daily',
        schedule_time: '09:00',
        export_format: 'PDF',
        recipients: [
            {recipient_type: 'Email', email: 'test@example.com'}
        ],
        is_active: 1
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

### Execute Schedule
```javascript
frappe.call({
    method: 'workhub_frappe_app.api.report_scheduler.execute_scheduled_report',
    args: {
        schedule_id: 'SCHED-00001'
    },
    callback: function(r) {
        console.log('Execution status:', r.message);
    }
});
```

### Get History
```javascript
frappe.call({
    method: 'workhub_frappe_app.api.report_scheduler.get_schedule_history',
    args: {
        schedule_id: 'SCHED-00001'
    },
    callback: function(r) {
        console.log('History:', r.message);
    }
});
```

---

**Remember:** This is a quick validation guide. For production deployment, complete the full test plan in TEST_SCHEDULED_REPORTS.md.
