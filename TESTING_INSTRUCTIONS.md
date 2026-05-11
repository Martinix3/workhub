# Report Builder Testing Instructions
## Subtask 10.1 - Quick Start Guide

This document provides quick instructions for executing the manual tests in `TEST_PLAN_REPORT_BUILDER.md`.

---

## Prerequisites

### 1. Start Frappe Bench
```bash
cd /Users/martinjaimesamperiz/santabrisa/frappe-bench
bench start
```

### 2. Access WorkHub
- **URL:** http://localhost:8000
- **Login:** Use admin credentials or test user with Report Manager role

### 3. Required Setup
- Ensure sample data exists in the system:
  - Users/Team members
  - Tasks with various statuses
  - WorkLinks (if testing HACCP reports)
- If no data exists, create sample records first

---

## Quick Test Sequence

### Phase 1: Basic Functionality (15 minutes)
1. **Create New Report**
   - Go to: http://localhost:8000/workhub_reportes
   - Click "Nuevo Reporte"
   - Fill metadata: Title, Description, Type=Custom, Category=Team

2. **Add Section Types**
   - Drag each component from sidebar to canvas:
     - 📊 Chart
     - 📋 Table
     - 📈 KPI
     - 📝 Text
     - 🎯 Header
   - Verify each appears in canvas

3. **Configure Sections**
   - Click each section
   - Fill properties panel:
     - Chart: Set data source, chart type, fields, colors
     - Table: Set columns JSON, sorting
     - KPI: Add 2-3 KPIs with different aggregations
     - Text: Add Markdown content
     - Header: Set title and subtitle

4. **Save & Load**
   - Click "Guardar Reporte"
   - Verify success message
   - Go back to listing, click "Editar"
   - Verify all sections loaded correctly

### Phase 2: Advanced Features (15 minutes)
5. **Drag-Drop Reordering**
   - Drag sections within canvas to reorder
   - Verify drop indicators appear
   - Verify order updates correctly

6. **Duplicate & Delete**
   - Duplicate a section (📋 button)
   - Verify copy appears with "(Copia)" suffix
   - Delete a section (🗑️ button)
   - Confirm deletion

7. **Preview**
   - Click "Vista Previa" button
   - Verify modal opens with rendered report
   - Test Refresh, Fullscreen, Export buttons
   - Close preview

8. **Duplicate Report**
   - From listing page, click "Duplicar"
   - Enter new title
   - Verify duplicate created

### Phase 3: Data Sources (10 minutes)
9. **Test Data Sources**
   - Save report from Phase 1
   - Go to: http://localhost:8000/workhub_reportes_viewer?report=<report_name>
   - Verify:
     - Chart renders with actual data
     - Table populates with rows
     - KPI cards show calculated values
   - Check console for errors

10. **Error Handling**
    - Try saving report without title → should show error
    - Try saving without sections → should show warning
    - Enter invalid JSON in table columns → should show validation error

---

## Test Data Setup (if needed)

### Create Sample Data via Frappe Console

```bash
bench console
```

```python
# Create sample users (if needed)
from frappe import get_doc

users = ["test.user1@workhub.local", "test.user2@workhub.local"]
for email in users:
    if not frappe.db.exists("User", email):
        user = get_doc({
            "doctype": "User",
            "email": email,
            "first_name": email.split("@")[0],
            "enabled": 1
        })
        user.insert(ignore_permissions=True)

# Note: Task and WorkLink creation depends on your DocType structure
# Adjust based on actual WorkHub data models
```

---

## Data Source API Verification

### Test Data Source Endpoints

Use browser DevTools Network tab or curl:

```bash
# Get available data sources
curl -X POST http://localhost:8000/api/method/workhub_frappe_app.api.reports.get_report_data_sources \
  -H "Content-Type: application/json" \
  -b cookies.txt

# Test specific data source (example)
curl -X POST http://localhost:8000/api/method/workhub_frappe_app.api.standard_reports.get_team_statistics \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"filters": {}}'
```

### Expected Data Source Endpoints (from implementation)
- `workhub_frappe_app.api.standard_reports.get_team_statistics`
- `workhub_frappe_app.api.standard_reports.get_task_list`
- `workhub_frappe_app.api.standard_reports.get_project_progress`
- `workhub_frappe_app.api.standard_reports.get_haccp_compliance`
- Additional custom data sources as configured

---

## Checklist for Sign-off

Before marking subtask as complete, verify:

- [ ] Can create new report with metadata
- [ ] All 5 section types can be added (Chart, Table, KPI, Text, Header)
- [ ] Each section type has functional configuration panel
- [ ] Drag-drop works from sidebar to canvas
- [ ] Drag-drop reordering works within canvas
- [ ] Sections can be duplicated
- [ ] Sections can be deleted
- [ ] Section visibility can be toggled
- [ ] Report can be saved (creates new record)
- [ ] Report can be loaded for editing
- [ ] Report can be updated (saves changes)
- [ ] Report can be duplicated from listing
- [ ] Preview modal opens and renders report
- [ ] Preview refresh, fullscreen, close work
- [ ] Data sources appear in dropdowns
- [ ] Chart section fetches and displays data
- [ ] Table section fetches and displays data
- [ ] KPI section calculates aggregations correctly
- [ ] Validation works (title required, sections required, JSON validation)
- [ ] No console errors during normal operation
- [ ] Works in primary browser (Chrome/Firefox)

---

## Common Issues & Troubleshooting

### Issue: "Data source not found" error
**Solution:** Verify data source endpoint exists in `api/standard_reports.py` and is whitelisted with `@frappe.whitelist()`

### Issue: Drag-drop not working
**Solution:**
- Check browser console for JavaScript errors
- Verify `report_builder.js` is loaded (check Network tab)
- Try hard refresh (Ctrl+Shift+R)

### Issue: Sections not saving
**Solution:**
- Check Network tab for API errors (500/400)
- Verify DocType permissions for "WH Report Definition"
- Check Frappe logs: `tail -f /path/to/frappe-bench/logs/web.error.log`

### Issue: Preview not showing data
**Solution:**
- Preview uses sample data, not real data
- Real data appears in Viewer page: `/workhub_reportes_viewer?report=<name>`
- Check that report is saved before viewing

### Issue: JSON validation errors
**Solution:**
- Use online JSON validator to check syntax
- Common errors: missing quotes, trailing commas, unescaped characters
- Example valid JSON for table columns:
  ```json
  [
    {"field": "name", "label": "Name", "type": "string"},
    {"field": "value", "label": "Value", "type": "number"}
  ]
  ```

---

## Browser DevTools Tips

### Console Tab
- Watch for JavaScript errors (red messages)
- Filter by "Error" level for critical issues
- Warnings (yellow) are usually safe to ignore

### Network Tab
- Filter by "Fetch/XHR" to see API calls
- Look for failed requests (red, 400/500 status)
- Click request to see payload and response
- Check "Preserve log" to keep history across page loads

### Elements Tab
- Inspect modal overlays (they're at end of `<body>`)
- Check computed styles if layout looks wrong
- Verify z-index if modals are behind other elements

---

## Performance Notes

### Expected Performance Benchmarks
- **Page Load:** < 2 seconds
- **Add Section:** Immediate (< 100ms)
- **Drag-Drop:** Smooth, no lag
- **Save Report:** < 3 seconds for 10 sections
- **Load Report:** < 2 seconds for 10 sections
- **Preview Render:** < 1 second for 10 sections

### If Performance is Slow
- Check browser extensions (disable ad blockers)
- Clear browser cache
- Check Frappe bench is not under heavy load
- Reduce number of sections for testing (< 10)
- Check database query performance in Frappe logs

---

## Test Evidence

### Recommended Screenshots/Screen Recordings
For documentation purposes, capture:
1. Builder page with all section types added
2. Configuration panel for each section type
3. Drag-drop reordering in action
4. Preview modal with rendered report
5. Reports listing showing saved reports
6. Viewer page with actual data

### Tools
- Built-in OS screenshot tools (Cmd+Shift+4 on Mac, Win+Shift+S on Windows)
- Screen recording: QuickTime (Mac), OBS Studio (cross-platform)
- Browser screenshot: Right-click → "Capture Screenshot" (Firefox)

---

## Completion Criteria

This subtask (10.1) is complete when:
1. All test suites in `TEST_PLAN_REPORT_BUILDER.md` are executed
2. All critical tests pass (marked ✅ in test plan)
3. Any failures are documented in "Critical Issues Found" section
4. Test summary is filled out with results
5. Overall assessment is PASS or PASS WITH ISSUES
6. This file and test plan are committed to git

---

## Next Steps After Testing

If tests pass:
1. Update implementation_plan.json (mark subtask 10.1 as completed)
2. Commit with message: "auto-claude: 10.1 - Test report builder: create new report, add all se"
3. Move to subtask 10.2 (test export functionality)

If tests fail:
1. Document failures in test plan
2. Create GitHub issues for bugs found
3. Assign priority (P0/P1/P2)
4. Fix critical issues before proceeding
5. Re-test after fixes

---

## Support & References

- **Test Plan:** `TEST_PLAN_REPORT_BUILDER.md` (detailed test cases)
- **Implementation:**
  - Builder UI: `frappe-app/workhub_frappe_app/www/workhub_reportes_builder.html`
  - Builder JS: `frappe-app/workhub_frappe_app/public/js/report_builder.js`
  - API: `frappe-app/workhub_frappe_app/api/reports.py`
- **Frappe Docs:** https://frappeframework.com/docs
- **WorkHub Rules:** `../../skills/guardrails/GLOBAL_RULES.md`

---

**Happy Testing! 🧪**
