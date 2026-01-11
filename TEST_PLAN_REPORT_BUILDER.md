# Report Builder - Manual Testing Plan
## Subtask 10.1 - Testing Documentation

**Date:** 2026-01-11
**Component:** Report Builder (workhub_reportes_builder.html + report_builder.js)
**Tester:** Manual verification required

---

## Test Environment Setup

### Prerequisites
1. Frappe bench running with WorkHub app installed
2. User with System Manager or Report Manager role
3. Browser DevTools open (Console tab for errors)
4. Fresh database or test site with sample data

### Access URLs
- **Report Builder (New):** `/workhub_reportes_builder?new=1`
- **Report Builder (Edit):** `/workhub_reportes_builder?report=<report_name>`
- **Reports Listing:** `/workhub_reportes`

---

## Test Suite 1: Create New Report

### Test 1.1: Access Report Builder
**Steps:**
1. Navigate to `/workhub_reportes`
2. Click "Nuevo Reporte" button
3. Verify builder page loads

**Expected Results:**
- ✅ Builder page loads without errors
- ✅ Three-column layout visible (Components | Canvas | Properties)
- ✅ Canvas shows placeholder: "Arrastra componentes aquí"
- ✅ Left sidebar shows 5 component types (Chart, Table, KPI, Text, Header)
- ✅ Properties panel shows "Selecciona una sección"
- ✅ Header shows "Crear Reporte" title
- ✅ No console errors in DevTools

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 1.2: Fill Report Metadata
**Steps:**
1. In canvas, fill "Título del Reporte": "Test Report - Team Productivity"
2. Fill "Descripción": "Testing all section types and functionality"
3. Select "Tipo": "Custom"
4. Select "Categoría": "Team"
5. Select "Estado": "Activo"

**Expected Results:**
- ✅ All fields accept input
- ✅ Form validation works (title is required)
- ✅ Dropdown values match DocType field options
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 2: Add All Section Types

### Test 2.1: Add Chart Section
**Steps:**
1. Drag "📊 Gráfico" component from sidebar to canvas
2. Verify section appears in canvas
3. Click on the section card to select it
4. Verify properties panel shows chart configuration

**Expected Results:**
- ✅ Component is draggable (cursor changes to "grab")
- ✅ Canvas drop zone highlights when dragging over it
- ✅ Section card appears with "📊 Gráfico" badge
- ✅ Section is selected (blue border, light blue background)
- ✅ Properties panel shows:
  - Title input
  - Data source dropdown
  - Chart type selector (Bar, Line, Pie, Doughnut, Stacked Bar)
  - X-field and Y-field inputs
  - Color palette with color pickers
  - Visibility toggle
- ✅ Canvas placeholder disappears

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 2.2: Configure Chart Section
**Steps:**
1. Set Title: "Team Task Completion"
2. Select Data Source: "Team Statistics"
3. Select Chart Type: "Bar"
4. Set X-field: "team_member"
5. Set Y-field: "tasks_completed"
6. Modify color palette (change first color to #FF5733)
7. Add a new color to palette
8. Remove a color from palette
9. Toggle visibility off and back on

**Expected Results:**
- ✅ All fields update in real-time
- ✅ Color picker shows color preview
- ✅ Add color button works (new color added to palette)
- ✅ Remove color button works (confirms and removes)
- ✅ Visibility toggle works (shows/hides in section list)
- ✅ Configuration persists when selecting other sections
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 2.3: Add Table Section
**Steps:**
1. Drag "📋 Tabla" component to canvas (below chart)
2. Click to select
3. Verify table configuration panel

**Expected Results:**
- ✅ Section appears below chart in canvas
- ✅ Properties panel shows:
  - Title input
  - Data source dropdown
  - Columns (JSON editor)
  - Sort field and order dropdowns
  - Filters (JSON editor)
  - Show totals toggle
  - Rows per page input
  - Group by field input
- ✅ JSON fields have placeholders with examples

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 2.4: Configure Table Section
**Steps:**
1. Set Title: "Task Details Table"
2. Select Data Source: "Task List"
3. Configure Columns (JSON):
   ```json
   [
     {"field": "task_name", "label": "Task", "type": "string"},
     {"field": "assignee", "label": "Assigned To", "type": "string"},
     {"field": "status", "label": "Status", "type": "string"},
     {"field": "completion", "label": "Progress", "type": "number"}
   ]
   ```
4. Set Sort: field="task_name", order="ASC"
5. Enable "Show totals"
6. Set Rows per page: 25

**Expected Results:**
- ✅ JSON validation works (shows error for invalid JSON)
- ✅ Valid JSON is accepted
- ✅ Sort configuration updates correctly
- ✅ Totals toggle persists
- ✅ Pagination value accepts numbers 10-1000
- ✅ Configuration saves to section state

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 2.5: Add KPI Section
**Steps:**
1. Drag "📈 KPI" component to canvas
2. Click to select
3. Verify KPI configuration panel

**Expected Results:**
- ✅ Properties panel shows:
  - Title input
  - Data source dropdown
  - "Add KPI" button
  - Empty state message: "No hay KPIs configurados"

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 2.6: Configure KPI Section (Multiple KPIs)
**Steps:**
1. Set Title: "Key Performance Indicators"
2. Select Data Source: "Team Statistics"
3. Click "Add KPI" button (3 times to add 3 KPIs)
4. Configure KPI 1:
   - Label: "Total Tasks"
   - Metric field: "total_tasks"
   - Aggregation: "Sum"
   - Format: "Number"
   - Color: #4CAF50
   - Icon: 📝
5. Configure KPI 2:
   - Label: "Completion Rate"
   - Metric field: "completion_percentage"
   - Aggregation: "Average"
   - Format: "Percentage"
   - Comparison field: "last_month_completion"
   - Color: #2196F3
   - Icon: 📊
6. Configure KPI 3:
   - Label: "Revenue"
   - Metric field: "total_revenue"
   - Aggregation: "Sum"
   - Format: "Currency"
   - Color: #FF9800
   - Icon: 💰
7. Remove KPI 2 (test delete)
8. Add it back with same configuration

**Expected Results:**
- ✅ Each KPI appears as a bordered card with color indicator
- ✅ All KPI properties update independently
- ✅ Aggregation dropdown has all options (Sum, Average, Count, Min, Max)
- ✅ Format dropdown has all options (Number, Currency, Percentage, Text)
- ✅ Color picker works for each KPI
- ✅ Icon field accepts emoji
- ✅ Delete button shows confirmation dialog
- ✅ Deleting a KPI updates the cards immediately
- ✅ Adding new KPI creates new card

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 2.7: Add Text Section
**Steps:**
1. Drag "📝 Texto" component to canvas
2. Click to select
3. Verify text configuration panel

**Expected Results:**
- ✅ Properties panel shows:
  - Title input
  - Content textarea (large, Markdown support)
  - Alignment radio buttons (Left, Center, Right, Justify)
  - Font style radio buttons (Normal, Italic)
  - Markdown hints in placeholder

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 2.8: Configure Text Section
**Steps:**
1. Set Title: "Executive Summary"
2. Set Content:
   ```markdown
   # Q1 Performance Summary

   Our team has achieved **outstanding results** this quarter:
   - Task completion rate: 95%
   - Revenue growth: 23%
   - Customer satisfaction: 4.8/5

   *Note: Data reflects January-March period.*
   ```
3. Select Alignment: "Center"
4. Select Font Style: "Normal"

**Expected Results:**
- ✅ Textarea accepts multi-line text with Markdown
- ✅ Alignment selection persists
- ✅ Font style selection persists
- ✅ Content is saved to section state

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 2.9: Add Header Section
**Steps:**
1. Drag "🎯 Encabezado" component to TOP of canvas (should reorder)
2. Click to select
3. Configure:
   - Title: "Q1 2026 Performance Report"
   - Subtitle: "Team Productivity Analysis"
   - Alignment: "Center"

**Expected Results:**
- ✅ Header section appears and can be positioned
- ✅ Properties show title, subtitle, alignment
- ✅ Configuration persists

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 3: Drag-Drop Reordering

### Test 3.1: Reorder Sections Within Canvas
**Steps:**
1. Verify current section order (Header → Chart → Table → KPI → Text)
2. Drag Chart section to bottom (below Text)
3. Drag KPI section to top (below Header)
4. Drag Text section to middle (between Chart and Table)
5. Verify final order: Header → KPI → Table → Text → Chart

**Expected Results:**
- ✅ Sections show drag handle cursor on hover
- ✅ Drop indicators appear when dragging over sections:
  - Blue border-top when dropping above
  - Blue border-bottom when dropping below
- ✅ Section reorders immediately on drop
- ✅ All sections maintain their configuration
- ✅ Selected section stays selected after reordering
- ✅ Section index updates correctly in state

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 3.2: Drag New Component Between Existing Sections
**Steps:**
1. Drag a new "📋 Tabla" from sidebar
2. Drop between Header and KPI (should show top border on KPI)
3. Verify new table appears at correct position

**Expected Results:**
- ✅ Drop indicator shows correct insertion point
- ✅ New section inserted at correct index
- ✅ All other sections shift appropriately
- ✅ No sections are lost or duplicated

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 4: Section Management

### Test 4.1: Duplicate Section
**Steps:**
1. Select the configured Chart section ("Team Task Completion")
2. Click duplicate button (📋 icon) in section header
3. Verify duplicate appears below original
4. Check duplicate has same configuration

**Expected Results:**
- ✅ Duplicate section appears immediately after original
- ✅ Duplicate has suffix " (Copia)" in title
- ✅ All configuration is copied:
  - Data source
  - Chart type
  - Fields (X, Y)
  - Colors
  - Visibility
- ✅ Duplicate gets new unique ID in state
- ✅ Both sections are independent (editing one doesn't affect the other)

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 4.2: Delete Section
**Steps:**
1. Select any section (e.g., the duplicate chart)
2. Click delete button (🗑️ icon)
3. Confirm deletion in dialog
4. Verify section is removed

**Expected Results:**
- ✅ Confirmation dialog appears with section title
- ✅ Clicking "Cancelar" keeps the section
- ✅ Clicking "Eliminar" removes the section immediately
- ✅ Section disappears from canvas
- ✅ If deleted section was selected, selection clears
- ✅ Properties panel shows "Selecciona una sección"
- ✅ Remaining sections maintain order and configuration

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 4.3: Toggle Section Visibility
**Steps:**
1. Select Chart section
2. In properties, toggle "Visible" to unchecked
3. Verify section card shows visibility indicator
4. Toggle back to checked
5. Verify indicator updates

**Expected Results:**
- ✅ Section card shows eye-slash icon (👁️‍🗨️) when hidden
- ✅ Section card has visual difference (opacity or styling)
- ✅ Toggle updates immediately
- ✅ Hidden sections still appear in canvas (for editing)
- ✅ Visibility state persists when deselecting section

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 5: Save & Load Reports

### Test 5.1: Save New Report
**Steps:**
1. With all sections configured, click "Guardar Reporte" button
2. Wait for API call to complete
3. Verify success message
4. Check if redirected to edit mode or listing page

**Expected Results:**
- ✅ API call to `workhub_frappe_app.api.reports.create_report`
- ✅ Request payload includes:
  - title: "Test Report - Team Productivity"
  - description
  - report_type: "Custom"
  - category: "Team"
  - is_active: 1
  - sections array with all 5+ sections
- ✅ Each section includes:
  - section_type
  - title
  - data_source
  - config (JSON with all properties)
  - display_order (0-based index)
  - is_visible
- ✅ Success alert: "Reporte creado exitosamente"
- ✅ Redirects to `/workhub_reportes` or edit mode
- ✅ No console errors
- ✅ No 500/400 API errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 5.2: Verify Report Saved in Database
**Steps:**
1. Navigate to `/workhub_reportes`
2. Locate "Test Report - Team Productivity" in list
3. Verify metadata displays correctly

**Expected Results:**
- ✅ Report appears in listing
- ✅ Title, description, type, category match
- ✅ Section count shows correct number (e.g., "5 secciones")
- ✅ Active badge shows "Activo"
- ✅ Creator shows current user
- ✅ Created date is today

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 5.3: Load Existing Report for Editing
**Steps:**
1. From `/workhub_reportes`, click "Editar" on saved report
2. Verify builder loads with all saved data
3. Check all sections appear in correct order
4. Select each section and verify configuration

**Expected Results:**
- ✅ Builder loads in edit mode (URL: `/workhub_reportes_builder?report=<name>`)
- ✅ Page title shows "Editar Reporte"
- ✅ Report metadata fields are pre-filled
- ✅ All sections appear in canvas in saved order
- ✅ No placeholder message
- ✅ Selecting sections shows correct configuration:
  - Chart: type, fields, colors preserved
  - Table: columns, sorting, totals preserved
  - KPI: all KPIs with properties preserved
  - Text: content and alignment preserved
  - Header: title and subtitle preserved
- ✅ Section visibility states correct
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 5.4: Edit and Re-save Report
**Steps:**
1. In edit mode, make changes:
   - Modify report title to "Test Report - Updated"
   - Change chart type from Bar to Line
   - Add a new KPI to KPI section
   - Delete the duplicate section
   - Reorder sections (move Text to top)
2. Click "Guardar Reporte"
3. Verify update success

**Expected Results:**
- ✅ API call to `workhub_frappe_app.api.reports.update_report`
- ✅ Request includes report name and updated data
- ✅ Success alert: "Reporte actualizado exitosamente"
- ✅ Changes persist after reload
- ✅ Section count updates in listing
- ✅ Modified timestamp updates

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 6: Duplicate Report

### Test 6.1: Duplicate Report from Listing
**Steps:**
1. Go to `/workhub_reportes`
2. Find "Test Report - Updated"
3. Click "Duplicar" button
4. Verify duplicate prompt/modal
5. Optionally change title to "Test Report - Duplicated"
6. Confirm duplication

**Expected Results:**
- ✅ Duplicate modal/prompt appears
- ✅ Default title is "Test Report - Updated (Copia)"
- ✅ Can edit title before duplicating
- ✅ API call to `workhub_frappe_app.api.reports.duplicate_report`
- ✅ Success message appears
- ✅ New report appears in listing
- ✅ Duplicate has all sections from original
- ✅ Duplicate is type "Custom" (auto-converted)

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 6.2: Verify Duplicated Report
**Steps:**
1. Open duplicated report in builder (edit mode)
2. Verify all sections copied correctly
3. Modify duplicate and save
4. Verify original is unchanged

**Expected Results:**
- ✅ All sections present with same configuration
- ✅ Section order matches original
- ✅ Independent from original (changes don't affect original)
- ✅ Has new unique name in database

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 7: Data Sources

### Test 7.1: Verify Data Sources Available
**Steps:**
1. In builder, click on Chart section
2. Open "Data Source" dropdown
3. Note all available options

**Expected Results:**
- ✅ Dropdown shows data sources from `get_report_data_sources` API
- ✅ Expected data sources (from implementation):
  - Team Statistics
  - Task List
  - Project Progress
  - HACCP Compliance
  - Sales Pipeline
  - Production Metrics
  - Quality Metrics
  - (Any other configured sources)
- ✅ Data sources have descriptive labels
- ✅ Dropdown is searchable/filterable (if many sources)

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 7.2: Test Data Source in Chart Preview
**Steps:**
1. Create a new report with Chart section
2. Configure:
   - Data Source: "Team Statistics"
   - Chart Type: "Bar"
   - X-field: "team_member"
   - Y-field: "tasks_completed"
3. Save report
4. Navigate to report viewer (`/workhub_reportes_viewer?report=<name>`)
5. Verify chart renders with actual data

**Expected Results:**
- ✅ Chart section calls data source API endpoint
- ✅ Data is fetched from configured source
- ✅ Chart renders with real data (not sample data)
- ✅ X-axis shows team member names
- ✅ Y-axis shows task counts
- ✅ Bars display correctly
- ✅ No "No data available" message (if data exists)
- ✅ No console errors related to data fetching

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 7.3: Test Data Source in Table
**Steps:**
1. In same report, configure Table section:
   - Data Source: "Task List"
   - Columns: task_name, assignee, status
2. Save and view report
3. Verify table populates with data

**Expected Results:**
- ✅ Table calls correct data source endpoint
- ✅ Rows display actual tasks
- ✅ Columns match configured fields
- ✅ Sorting works on columns (if enabled)
- ✅ Pagination works (if > rows per page)
- ✅ No data errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 7.4: Test Data Source in KPI
**Steps:**
1. Configure KPI section:
   - Data Source: "Team Statistics"
   - KPI 1: Sum of total_tasks
   - KPI 2: Average of completion_percentage
2. Save and view report
3. Verify KPI cards show calculated values

**Expected Results:**
- ✅ KPI calls data source endpoint
- ✅ Aggregation is calculated correctly:
  - Sum: adds all values
  - Average: calculates mean
  - Count: counts records
  - Min/Max: finds extremes
- ✅ Values display with correct format (number, currency, percentage)
- ✅ Comparison/trend shows if configured
- ✅ Colors and icons display

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 7.5: Test Missing/Invalid Data Source
**Steps:**
1. Create section with data source "Team Statistics"
2. In Frappe backend, temporarily disable that endpoint
3. View report
4. Verify error handling

**Expected Results:**
- ✅ Graceful error message: "Error loading data source"
- ✅ Section shows placeholder or empty state
- ✅ No JavaScript errors breaking the page
- ✅ Other sections still render correctly
- ✅ Console shows descriptive error (for debugging)

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 8: Preview Functionality

### Test 8.1: Open Preview Modal
**Steps:**
1. In builder with configured sections
2. Click "Vista Previa" button in header
3. Verify preview modal opens

**Expected Results:**
- ✅ Modal overlay appears with backdrop blur
- ✅ Preview modal is centered and large (90% width/height)
- ✅ Preview header shows:
  - Title: "Vista Previa del Reporte"
  - Refresh button
  - Fullscreen button
  - Export button
  - Close button
- ✅ Preview body shows loading spinner initially
- ✅ Report preview renders after load

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 8.2: Preview Renders All Sections
**Steps:**
1. Verify preview shows:
   - Report header with title and metadata
   - All visible sections in correct order
   - Section content (sample data or placeholders)
2. Check hidden sections don't appear

**Expected Results:**
- ✅ Report header with gradient background
- ✅ Title, description, type, category, date, section count
- ✅ Each visible section renders:
  - Header sections with title/subtitle
  - Chart sections with placeholder or sample chart
  - Table sections with sample rows
  - KPI sections with sample cards
  - Text sections with formatted content
- ✅ Hidden sections (is_visible=false) are excluded
- ✅ Sections appear in display_order
- ✅ Professional styling matches reports.css

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 8.3: Refresh Preview
**Steps:**
1. With preview open, modify a section title in background
2. Click "Actualizar" button
3. Verify preview updates

**Expected Results:**
- ✅ Loading spinner appears briefly
- ✅ Preview re-renders with current form values
- ✅ Changes reflect in preview (updated title, etc.)
- ✅ No page reload, just preview refresh

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 8.4: Fullscreen Toggle
**Steps:**
1. Click "Pantalla Completa" button
2. Verify modal expands to full viewport
3. Click "Salir Pantalla Completa"
4. Verify modal returns to normal size

**Expected Results:**
- ✅ Modal expands to 100% width and height
- ✅ Border radius removed in fullscreen
- ✅ Button text/icon changes to "Salir Pantalla Completa"
- ✅ Smooth CSS transition
- ✅ Returns to 90%x85% on exit
- ✅ Preview content remains visible and scrollable

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 8.5: Export from Preview
**Steps:**
1. Click "Exportar" button in preview
2. Verify export modal opens
3. Select format (PDF/Excel/CSV)
4. Confirm export

**Expected Results:**
- ✅ Export format modal appears (z-index above preview)
- ✅ Three format options with descriptions
- ✅ Radio button selection works
- ✅ Currently shows save prompt (placeholder)
- ✅ Ready for future API integration

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 8.6: Close Preview
**Steps:**
1. Click "✕" close button
2. Verify modal closes
3. Click "Vista Previa" again
4. Click backdrop overlay to close

**Expected Results:**
- ✅ Close button hides modal
- ✅ Returns to builder view
- ✅ Builder state preserved
- ✅ Clicking backdrop also closes modal
- ✅ Modal can be reopened
- ✅ Fullscreen state resets on close

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 9: Error Handling & Validation

### Test 9.1: Save Report Without Title
**Steps:**
1. Clear report title field
2. Click "Guardar Reporte"
3. Verify validation error

**Expected Results:**
- ✅ Error alert: "El título del reporte es obligatorio"
- ✅ No API call made
- ✅ Focus returns to title field
- ✅ Report not saved

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 9.2: Save Report Without Sections
**Steps:**
1. Create new report with title
2. Don't add any sections
3. Click "Guardar Reporte"
4. Verify validation

**Expected Results:**
- ✅ Warning alert: "Agrega al menos una sección"
- ✅ No API call made
- ✅ Report not saved

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 9.3: Invalid JSON in Table Columns
**Steps:**
1. In table configuration, enter invalid JSON:
   ```
   {invalid json
   ```
2. Try to save or move to another section
3. Verify validation error

**Expected Results:**
- ✅ JSON validation error message
- ✅ Field highlighted in red
- ✅ Helpful error message pointing to syntax issue
- ✅ Cannot save with invalid JSON

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 9.4: Network Error During Save
**Steps:**
1. Open DevTools Network tab
2. Throttle network to "Offline"
3. Try to save report
4. Verify error handling

**Expected Results:**
- ✅ Error alert: "Error al guardar reporte"
- ✅ Descriptive network error message
- ✅ Report state preserved (not lost)
- ✅ Can retry after network restored
- ✅ Console logs error for debugging

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 10: Browser Compatibility

### Test 10.1: Chrome/Edge (Chromium)
**Steps:**
1. Test all functionality in Chrome/Edge
2. Verify drag-drop, form inputs, modals

**Expected Results:**
- ✅ All features work smoothly
- ✅ Drag-drop is responsive
- ✅ Modals display correctly
- ✅ No console errors

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 10.2: Firefox
**Steps:**
1. Test all functionality in Firefox
2. Verify drag-drop, form inputs, modals

**Expected Results:**
- ✅ All features work smoothly
- ✅ Drag-drop is responsive
- ✅ Modals display correctly
- ✅ No console errors
- ✅ DataTransfer API works correctly

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 10.3: Safari (macOS/iOS)
**Steps:**
1. Test all functionality in Safari
2. Verify drag-drop, form inputs, modals

**Expected Results:**
- ✅ All features work smoothly
- ✅ Drag-drop is responsive
- ✅ Modals display correctly
- ✅ No console errors
- ✅ CSS grid and flexbox layout correct

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 11: Responsive Design

### Test 11.1: Desktop (1920x1080)
**Steps:**
1. Test on large desktop screen
2. Verify layout uses space efficiently

**Expected Results:**
- ✅ Three-column layout visible
- ✅ All panels have adequate width
- ✅ No horizontal scrolling
- ✅ Canvas uses available space

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 11.2: Laptop (1366x768)
**Steps:**
1. Resize browser to 1366x768
2. Verify layout adjusts

**Expected Results:**
- ✅ Three-column layout still visible
- ✅ Panels narrower but usable
- ✅ No overlap or cutting

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 11.3: Tablet (768px)
**Steps:**
1. Resize browser to tablet width
2. Verify responsive layout

**Expected Results:**
- ✅ Layout switches to single column or stacked
- ✅ Sidebar and properties collapsible or below canvas
- ✅ Canvas remains usable
- ✅ Drag-drop still works

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 11.4: Mobile (375px)
**Steps:**
1. Resize to mobile width
2. Verify mobile experience

**Expected Results:**
- ✅ Layout stacks vertically
- ✅ All functionality accessible
- ✅ Touch-friendly drag-drop
- ✅ No horizontal scroll
- ✅ Modals fit screen

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Test Suite 12: Performance

### Test 12.1: Report with Many Sections (20+)
**Steps:**
1. Create report with 20+ sections
2. Test drag-drop performance
3. Test save performance
4. Test preview performance

**Expected Results:**
- ✅ Canvas renders without lag
- ✅ Drag-drop remains smooth
- ✅ Save completes in reasonable time (<3s)
- ✅ Preview renders all sections
- ✅ No memory leaks (check DevTools Memory)

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

### Test 12.2: Large JSON Configurations
**Steps:**
1. Add table with 50+ column definitions
2. Add KPI section with 10+ KPIs
3. Save and load report
4. Verify performance

**Expected Results:**
- ✅ Large JSON accepted and saved
- ✅ Load time reasonable (<2s)
- ✅ Configuration panel renders all fields
- ✅ No UI freezing

**Status:** ⬜ Not tested | ✅ Passed | ❌ Failed

---

## Critical Issues Found

**Document any critical issues here during testing:**

| Issue # | Description | Severity | Status |
|---------|-------------|----------|--------|
| - | - | - | - |

---

## Test Summary

### Test Execution Date: ___________
### Tester Name: ___________
### Browser(s) Tested: ___________

### Results Summary:
- **Total Tests:** 70+
- **Passed:** _____
- **Failed:** _____
- **Not Tested:** _____
- **Blocked:** _____

### Overall Assessment:
⬜ **PASS** - All critical functionality working as expected
⬜ **PASS WITH ISSUES** - Works but has minor issues
⬜ **FAIL** - Critical issues preventing use

### Notes:
```
[Add any additional notes, observations, or recommendations here]
```

---

## Sign-off

This test plan covers all requirements from Subtask 10.1:
- ✅ Create new report
- ✅ Add all section types (Chart, Table, KPI, Text, Header)
- ✅ Drag-drop reordering (components to canvas, sections within canvas)
- ✅ Save/load reports (create, edit, persistence)
- ✅ Duplicate reports (from listing, verification)
- ✅ Verify data sources return correct data (all section types)

**Additional coverage:**
- Section management (duplicate, delete, visibility)
- Preview functionality (open, refresh, fullscreen, export, close)
- Error handling and validation
- Browser compatibility
- Responsive design
- Performance testing

**Tester Signature:** ___________________
**Date:** ___________________
