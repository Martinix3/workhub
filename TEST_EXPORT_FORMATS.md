# Export Formats Testing - Comprehensive Test Plan

**Task:** Subtask 10.2 - Test all export formats
**Date:** 2026-01-11
**Tester:** Claude Agent

---

## Test Overview

This document provides comprehensive testing for all three export formats:
- **PDF** - Executive-ready presentation format
- **Excel** - Structured workbook with multiple sheets
- **CSV** - Plain text tabular data

## Test Environment

**Prerequisites:**
- Frappe/ERPNext bench running
- WorkHub app installed and migrated
- At least one test report with multiple section types
- Python dependencies: `openpyxl` for Excel export
- Frappe PDF generation dependencies (wkhtmltopdf)

**Test Data Required:**
- Report with Chart sections
- Report with Table sections
- Report with KPI sections
- Report with Text/Header sections
- Large report (multiple sections, 100+ rows)

---

## Test Suite 1: CSV Export

### Test 1.1: Basic CSV Export
**Objective:** Verify CSV export generates valid CSV file

**Steps:**
1. Navigate to report viewer
2. Click export dropdown
3. Select "CSV" format
4. Wait for generation
5. Download the file

**Expected Results:**
- [ ] CSV file downloads successfully
- [ ] File name format: `{ReportTitle}_{timestamp}.csv`
- [ ] File opens in text editor without errors
- [ ] CSV is properly UTF-8 encoded

**Verification Commands:**
```bash
# Check file encoding
file exported_report.csv

# Verify CSV structure
head -20 exported_report.csv

# Check for proper CSV formatting
python3 -c "import csv;
reader = csv.reader(open('exported_report.csv'));
print(f'Rows: {sum(1 for row in reader)}')"
```

### Test 1.2: CSV Report Header
**Objective:** Verify CSV includes report metadata

**Expected CSV Header:**
```
Report Title
Generated: Jan 11, 2026 10:30

## Section 1 Title
...
```

**Verification:**
- [ ] First row contains report title
- [ ] Second row contains "Generated:" timestamp
- [ ] Blank line separates header from content
- [ ] Each section starts with `## Section Title`

### Test 1.3: CSV Table Section Export
**Objective:** Verify table data exports correctly to CSV

**Expected Structure:**
```
## Table Section Name

Column1,Column2,Column3
Value1,Value2,Value3
Value4,Value5,Value6

```

**Verification:**
- [ ] Column headers are present and correct
- [ ] All rows exported
- [ ] Values properly quoted if they contain commas
- [ ] Numbers formatted with proper separators
- [ ] Dates formatted as "Jan 11, 2026"
- [ ] Currency values include $ symbol
- [ ] Percentages include % symbol
- [ ] Blank line after each section

### Test 1.4: CSV KPI Section Export
**Objective:** Verify KPI data exports as key-value pairs

**Expected Structure:**
```
## KPI Section Name

Metric,Value
Total Sales,$150,000.00
Completion Rate,85.5%
Active Tasks,42

```

**Verification:**
- [ ] Header row: "Metric,Value"
- [ ] Each KPI on separate row
- [ ] Labels correctly exported
- [ ] Values formatted according to type
- [ ] Currency values formatted
- [ ] Percentages formatted

### Test 1.5: CSV Multi-Section Export
**Objective:** Verify multiple sections export correctly

**Verification:**
- [ ] All visible sections included
- [ ] Sections in correct order (display_order)
- [ ] Hidden sections excluded
- [ ] Section headers clearly separate data blocks
- [ ] Non-table sections marked as comments (`# Header (Header)`)

### Test 1.6: CSV Special Characters
**Objective:** Verify special characters handled correctly

**Test Data:** Create report with:
- Commas in text: "Sales, Marketing"
- Quotes: He said "Hello"
- Newlines in cells
- Accented characters: café, niño, über

**Verification:**
- [ ] Commas in values trigger CSV quoting
- [ ] Quotes escaped as double quotes ("")
- [ ] UTF-8 characters display correctly
- [ ] No data corruption

### Test 1.7: CSV Large Report
**Objective:** Verify large reports export successfully

**Test Data:** Report with 500+ rows

**Verification:**
- [ ] Export completes without timeout
- [ ] All rows present in CSV
- [ ] File size appropriate (check with `ls -lh`)
- [ ] No memory errors in Frappe logs

---

## Test Suite 2: Excel Export

### Test 2.1: Basic Excel Export
**Objective:** Verify Excel export generates valid .xlsx file

**Steps:**
1. Navigate to report viewer
2. Click export dropdown
3. Select "Excel" format
4. Wait for generation
5. Download the file

**Expected Results:**
- [ ] Excel file downloads successfully
- [ ] File name format: `{ReportTitle}_{timestamp}.xlsx`
- [ ] File opens in Excel/LibreOffice without errors
- [ ] No corruption warnings

**Verification:**
```bash
# Check file type
file exported_report.xlsx

# Verify it's a valid ZIP (xlsx is ZIP format)
unzip -t exported_report.xlsx

# Check file size
ls -lh exported_report.xlsx
```

### Test 2.2: Excel Cover Sheet
**Objective:** Verify cover sheet contains report metadata

**Expected Cover Sheet Structure:**
- **Cell A1:** Report title (Large, bold, blue font)
- **Row 3:** "Report Information" heading
- **Rows 4+:** Metadata table
  - Report Type: {type}
  - Category: {category}
  - Generated: {datetime}
  - Generated By: {user name}
  - Description: {description}

**Verification:**
- [ ] Cover sheet named "Cover"
- [ ] Cover sheet is first sheet (index 0)
- [ ] Title in A1 with proper styling
- [ ] All metadata fields present
- [ ] Date formatted correctly
- [ ] User full name displayed (not ID)
- [ ] Column widths: A=20, B=50

**Manual Check:**
```
Open Excel file → Check "Cover" sheet → Verify:
- Title font: Arial 24pt, bold, blue (#1F4E78)
- Heading font: Arial 12pt, bold
- Metadata labels: bold
- Layout is professional and readable
```

### Test 2.3: Excel Section Worksheets
**Objective:** Verify separate worksheets created for each data section

**Verification:**
- [ ] Each Table section has its own worksheet
- [ ] Each KPI section has its own worksheet
- [ ] Text/Header sections excluded (no data)
- [ ] Sheet names match section titles (max 31 chars)
- [ ] Sheet names sanitized (no /\:*?"<>| chars)
- [ ] Sheets numbered if duplicate names

### Test 2.4: Excel Table Section Formatting
**Objective:** Verify table sections formatted professionally

**Expected Formatting:**

**Row 1:** Section title (merged cells, large font, blue)
- Font: Arial 14pt, bold, blue (#1F4E78)
- Height: 25

**Row 3:** Column headers
- Font: Arial 11pt, bold, white
- Background: Blue fill (#4472C4)
- Alignment: Center, wrap text
- Border: Thin border all sides
- Height: 20

**Row 4+:** Data rows
- Font: Arial 10pt
- Border: Thin border all sides (#D0D0D0)
- Alignment: Left, top, wrap text

**Verification:**
- [ ] Section title in row 1, merged cells
- [ ] Headers in row 3 with blue background
- [ ] Data starts in row 4
- [ ] All cells have borders
- [ ] Headers are white text on blue
- [ ] Data is black text on white

### Test 2.5: Excel Column Formatting
**Objective:** Verify columns auto-sized and data formatted correctly

**Verification:**
- [ ] Column widths auto-sized (10-50 char range)
- [ ] Number columns: Format `#,##0.00` (thousands separator)
- [ ] Currency columns: Format `$#,##0.00`
- [ ] Percentage columns: Format `0.0%`
- [ ] Integer columns: Format `#,##0` (no decimals)
- [ ] Date columns: Display formatted text
- [ ] Text columns: Left-aligned, wrap text

**Manual Check:**
```
For each column type:
- Click cell with number → Check format in toolbar
- Verify thousands separators display
- Verify currency symbols display
- Verify percentages display correctly
- Check decimal places match column config
```

### Test 2.6: Excel KPI Section Formatting
**Objective:** Verify KPI sections formatted as two-column table

**Expected Structure:**

**Row 1:** Section title (merged, styled)
**Row 3:** Headers
- A3: "Metric" (blue background, white text)
- B3: "Value" (blue background, white text)

**Row 4+:** KPI rows
- Column A: Metric label (bold)
- Column B: Metric value (right-aligned)

**Verification:**
- [ ] Two columns: Metric, Value
- [ ] Headers styled consistently
- [ ] Metric labels bold
- [ ] Values right-aligned
- [ ] Numeric values formatted as numbers (not text)
- [ ] Column widths: A=30, B=20

### Test 2.7: Excel Large Report
**Objective:** Verify large reports export without performance issues

**Test Data:** Report with:
- 10+ sections
- 500+ total rows across sections
- Multiple data types

**Verification:**
- [ ] Export completes within 30 seconds
- [ ] All sections present as worksheets
- [ ] No data truncation
- [ ] File opens quickly in Excel
- [ ] File size reasonable (< 5MB for 500 rows)
- [ ] No Frappe error logs

**Performance Benchmark:**
```bash
time curl -X POST "http://localhost:7312/api/method/workhub_frappe_app.api.report_export.export_report" \
  -H "Authorization: token XXX" \
  -d "report_id=REPORT_ID&format=Excel"
```

Expected: < 30 seconds for 500 rows

### Test 2.8: Excel Styling Consistency
**Objective:** Verify consistent styling across all worksheets

**Verification Checklist:**
- [ ] All section titles use same style (Arial 14pt, bold, blue)
- [ ] All headers use same style (Arial 11pt, bold, white on blue)
- [ ] All data uses same font (Arial 10pt)
- [ ] All borders consistent (thin, #D0D0D0)
- [ ] All sheets have same general layout

---

## Test Suite 3: PDF Export

### Test 3.1: Basic PDF Export
**Objective:** Verify PDF export generates valid PDF file

**Steps:**
1. Navigate to report viewer
2. Click export dropdown
3. Select "PDF" format
4. Wait for generation
5. Download the file

**Expected Results:**
- [ ] PDF file downloads successfully
- [ ] File name format: `{ReportTitle}_{timestamp}.pdf`
- [ ] File opens in PDF reader without errors
- [ ] PDF version is 1.4+ (widely compatible)

**Verification:**
```bash
# Check file type
file exported_report.pdf

# Check PDF version
head -1 exported_report.pdf

# Check file size
ls -lh exported_report.pdf

# Verify PDF is not corrupted
pdfinfo exported_report.pdf  # If available
```

### Test 3.2: PDF Cover Page
**Objective:** Verify PDF has professional cover page

**Expected Cover Page Elements:**
1. Report title (large, prominent)
2. Report description
3. Metadata block:
   - Report Type
   - Category
   - Generated date/time
   - Generated by (user name)
4. Optional: Company logo/branding
5. Optional: Table of contents

**Verification:**
- [ ] Cover page is page 1
- [ ] Title is clearly visible and large
- [ ] All metadata present and readable
- [ ] Professional layout (not cluttered)
- [ ] Branding elements present (if configured)

**Manual Check:**
```
Open PDF → Check page 1 → Verify:
- Title font size > 18pt
- Metadata clearly formatted
- Layout is executive-ready
- Professional appearance
```

### Test 3.3: PDF Section Rendering
**Objective:** Verify all section types render correctly

**Test Each Section Type:**

**Chart Sections:**
- [ ] Chart image renders (not placeholder)
- [ ] Chart is legible and sized appropriately
- [ ] Chart title above chart
- [ ] Legend visible if applicable
- [ ] Colors render correctly

**Table Sections:**
- [ ] Table has visible borders
- [ ] Headers styled distinctly (bold/colored)
- [ ] All columns visible
- [ ] Data rows clearly separated
- [ ] Long tables span multiple pages correctly
- [ ] Headers repeat on each page (if multi-page)

**KPI Sections:**
- [ ] KPIs displayed as cards or table
- [ ] Labels and values clearly visible
- [ ] Visual hierarchy (labels vs values)
- [ ] Formatted values (currency, percentage)
- [ ] Icons/colors preserved

**Text Sections:**
- [ ] Markdown rendered to HTML
- [ ] Headings styled appropriately
- [ ] Lists formatted correctly
- [ ] Line breaks preserved
- [ ] Links underlined/colored

**Header Sections:**
- [ ] Large title text
- [ ] Optional subtitle
- [ ] Horizontal separator/styling
- [ ] Page break if configured

### Test 3.4: PDF Table Formatting
**Objective:** Verify tables formatted professionally in PDF

**Expected Table Styling:**
- Border: 1px solid #ddd
- Header background: Blue or gray
- Header text: White or bold
- Alternating row colors (optional)
- Cell padding: 8-10px
- Font: Sans-serif, 10-11pt

**Verification:**
- [ ] Table borders visible
- [ ] Headers clearly distinguished
- [ ] Rows aligned properly
- [ ] Text doesn't overflow cells
- [ ] Numbers right-aligned
- [ ] Text left-aligned
- [ ] Dates formatted consistently

### Test 3.5: PDF Page Layout
**Objective:** Verify professional page layout and formatting

**Page Properties:**
- Paper size: A4 or Letter
- Margins: 0.75-1 inch on all sides
- Orientation: Portrait (default) or Landscape (configurable)
- Page numbers: Footer, right-aligned
- Header: Optional company name/report title

**Verification:**
- [ ] Consistent margins throughout
- [ ] Page numbers on all pages (except cover)
- [ ] Content doesn't overflow page width
- [ ] Sections don't awkwardly split across pages
- [ ] Professional spacing between sections

### Test 3.6: PDF Multi-Page Handling
**Objective:** Verify long reports paginate correctly

**Test Data:** Report with content spanning 5+ pages

**Verification:**
- [ ] Page breaks at logical points
- [ ] Tables split gracefully (headers repeat)
- [ ] Charts don't split mid-image
- [ ] Page numbers sequential
- [ ] Consistent header/footer across pages
- [ ] No orphaned lines (single line at top/bottom)

### Test 3.7: PDF Special Characters and Fonts
**Objective:** Verify character encoding and fonts

**Test Data:** Content with:
- Accented characters: á, é, í, ó, ú, ñ
- Symbols: €, £, ¥, ©, ®, ™
- Math symbols: ±, ×, ÷, ≥, ≤
- Emojis (if supported)

**Verification:**
- [ ] All characters render correctly
- [ ] No � (replacement characters)
- [ ] Fonts embedded in PDF
- [ ] Text selectable (not images)
- [ ] Copy/paste works correctly

**Font Verification:**
```bash
# Extract fonts from PDF (if pdffonts available)
pdffonts exported_report.pdf

# Should show embedded fonts like Arial, sans-serif
```

### Test 3.8: PDF File Size and Performance
**Objective:** Verify PDF generation is efficient

**Test Scenarios:**

**Small Report (1-2 pages, no charts):**
- [ ] Generates in < 5 seconds
- [ ] File size < 100KB

**Medium Report (5-10 pages, 2-3 charts):**
- [ ] Generates in < 15 seconds
- [ ] File size < 500KB

**Large Report (20+ pages, 10+ charts, large tables):**
- [ ] Generates in < 60 seconds
- [ ] File size < 5MB
- [ ] No timeout errors

**Performance Test:**
```bash
# Time PDF generation
time curl -X POST "http://localhost:7312/api/method/workhub_frappe_app.api.report_export.export_report" \
  -H "Authorization: token XXX" \
  -d "report_id=REPORT_ID&format=PDF"
```

### Test 3.9: PDF Print Quality
**Objective:** Verify PDF prints correctly on paper

**Manual Print Test:**
1. Open PDF in reader
2. Print preview
3. Print to physical/virtual printer

**Verification:**
- [ ] All content visible in print preview
- [ ] No content cut off at edges
- [ ] Colors print correctly (if color printer)
- [ ] Grayscale legible (if B&W printer)
- [ ] Text crisp and readable
- [ ] Charts/images print clearly

---

## Test Suite 4: Cross-Format Validation

### Test 4.1: Data Consistency Across Formats
**Objective:** Verify same data in all three formats

**Test Process:**
1. Export same report to PDF, Excel, CSV
2. Compare data values

**Verification:**
- [ ] Same number of sections in all formats
- [ ] Same row counts in table sections
- [ ] Same KPI values
- [ ] Same date formatting (within format constraints)
- [ ] Same number formatting
- [ ] No data loss or corruption

### Test 4.2: Format-Specific Features
**Objective:** Verify each format uses appropriate features

**CSV:**
- [ ] Plain text, no styling
- [ ] Universally compatible
- [ ] Smallest file size

**Excel:**
- [ ] Multiple worksheets
- [ ] Styled headers and formatting
- [ ] Native Excel formulas/numbers
- [ ] Color coding

**PDF:**
- [ ] Executive presentation quality
- [ ] Page layout and design
- [ ] Print-ready
- [ ] Non-editable

### Test 4.3: Filename Consistency
**Objective:** Verify consistent naming across formats

**Expected Pattern:**
```
{ReportTitle}_{timestamp}.{ext}
Team_Productivity_Report_20260111_103045.csv
Team_Productivity_Report_20260111_103045.xlsx
Team_Productivity_Report_20260111_103045.pdf
```

**Verification:**
- [ ] Base filename same across formats
- [ ] Timestamp in YYYYMMDD_HHMMSS format
- [ ] Appropriate extension (.csv, .xlsx, .pdf)
- [ ] Special characters sanitized
- [ ] No spaces in filename (replaced with _)

---

## Test Suite 5: Error Handling and Edge Cases

### Test 5.1: Empty Report Export
**Objective:** Verify handling of report with no data

**Test Data:** Report with sections but no data returned

**Expected Behavior:**
- [ ] Export succeeds (doesn't fail)
- [ ] File contains report metadata
- [ ] Sections show "No data available" message
- [ ] File is valid (opens without errors)

### Test 5.2: Missing Data Source
**Objective:** Verify handling of missing/invalid data source

**Test Data:** Report with data_source that returns error

**Expected Behavior:**
- [ ] Export doesn't crash
- [ ] Error logged in Frappe
- [ ] Section shows error message or skipped
- [ ] Other sections still export

### Test 5.3: Large Data Volume
**Objective:** Verify handling of very large datasets

**Test Data:**
- Table with 10,000+ rows
- Report with 50+ sections

**Verification:**
- [ ] Export doesn't timeout
- [ ] Memory usage reasonable (< 500MB)
- [ ] File generates successfully
- [ ] File size reasonable
- [ ] Can open file without hanging

**If timeout occurs:**
- Consider pagination
- Consider async processing
- Consider data limits

### Test 5.4: Special Characters in Report Title
**Objective:** Verify filename sanitization

**Test Data:** Reports with titles:
- "Q4/2025 Report"
- "Report: Sales & Marketing"
- "Report <Executive>"
- "Report?Questions!"

**Verification:**
- [ ] Filenames valid (no illegal chars)
- [ ] Slashes replaced with _
- [ ] Colons replaced with _
- [ ] Angle brackets replaced with _
- [ ] Question marks replaced with _
- [ ] Ampersands preserved or replaced

### Test 5.5: Concurrent Exports
**Objective:** Verify multiple simultaneous exports

**Test Process:**
1. Trigger 5 exports simultaneously
2. Check all complete successfully

**Verification:**
- [ ] All exports complete
- [ ] No file corruption
- [ ] No race conditions
- [ ] Separate WH Generated Report records
- [ ] Unique filenames (timestamps prevent collision)

### Test 5.6: Permission Handling
**Objective:** Verify export respects permissions

**Test Scenarios:**

**Authenticated User:**
- [ ] Can export reports

**Unauthenticated User:**
- [ ] Gets auth error
- [ ] No file generated

**User without report access:**
- [ ] Gets permission error (if applicable)

---

## Test Suite 6: Integration Tests

### Test 6.1: WH Generated Report Record
**Objective:** Verify export creates tracking record

**Verification:**
1. Export report
2. Check WH Generated Report DocType

**Expected Fields:**
- [ ] Record created with format GEN-RPT-#####
- [ ] report_definition: Links to source report
- [ ] export_format: Matches requested format
- [ ] generated_at: Current timestamp
- [ ] generated_by: Current user
- [ ] status: "Completed"
- [ ] file_url: Valid file path
- [ ] data_snapshot: Contains report data JSON

### Test 6.2: File Storage
**Objective:** Verify files stored correctly in Frappe

**Verification:**
```bash
# Check private files directory
ls -la ./sites/{site}/private/files/ | grep -i report

# Check file permissions
stat ./sites/{site}/private/files/{report_file}
```

**Expected:**
- [ ] Files saved in private/files/
- [ ] Files are private (is_private=1)
- [ ] File doc created in File DocType
- [ ] File linked to WH Generated Report
- [ ] File accessible via file_url

### Test 6.3: Export History Display
**Objective:** Verify exports show in history

**Steps:**
1. Export report multiple times
2. Check export history in UI

**Verification:**
- [ ] All exports listed
- [ ] Format badges correct (PDF=red, Excel=green, CSV=blue)
- [ ] Timestamps correct
- [ ] Download buttons work
- [ ] Status shows "Completed"

### Test 6.4: Download Previously Exported Report
**Objective:** Verify can re-download old exports

**Steps:**
1. Export report
2. Wait 5 minutes
3. Click download in history

**Verification:**
- [ ] Same file downloads
- [ ] File not regenerated
- [ ] Download immediate (cached)

---

## Automated Testing Script

```python
#!/usr/bin/env python3
"""
Automated export format testing script
Run from Frappe bench directory: bench execute apps/workhub/test_exports.py
"""

import frappe
from frappe.utils import now_datetime
import os
import csv
from openpyxl import load_workbook
import PyPDF2  # For PDF validation

def test_all_exports():
    """Test all export formats"""

    # Find or create test report
    test_report = create_test_report()
    report_id = test_report.name

    print(f"\n{'='*60}")
    print(f"Testing Export Formats for Report: {test_report.title}")
    print(f"{'='*60}\n")

    results = {
        "CSV": test_csv_export(report_id),
        "Excel": test_excel_export(report_id),
        "PDF": test_pdf_export(report_id)
    }

    # Print summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    for format, result in results.items():
        status = "✓ PASS" if result["success"] else "✗ FAIL"
        print(f"{format}: {status}")
        if not result["success"]:
            print(f"  Error: {result['error']}")
    print(f"{'='*60}\n")

    return results

def create_test_report():
    """Create a test report with all section types"""

    # Check if test report exists
    if frappe.db.exists("WH Report Definition", {"title": "Export Test Report"}):
        return frappe.get_doc("WH Report Definition", {"title": "Export Test Report"})

    # Create new test report
    doc = frappe.new_doc("WH Report Definition")
    doc.title = "Export Test Report"
    doc.description = "Test report for export format validation"
    doc.report_type = "Custom"
    doc.category = "Custom"
    doc.is_active = 1

    # Add sections
    sections = [
        {
            "section_type": "Header",
            "title": "Test Report Header",
            "display_order": 1,
            "is_visible": 1
        },
        {
            "section_type": "Table",
            "title": "Sample Data Table",
            "data_source": "team_statistics",
            "display_order": 2,
            "is_visible": 1,
            "config": '{"columns": [{"field": "name", "label": "Name"}, {"field": "count", "label": "Count", "type": "number"}]}'
        },
        {
            "section_type": "KPI",
            "title": "Key Metrics",
            "data_source": "team_statistics",
            "display_order": 3,
            "is_visible": 1,
            "config": '{"kpis": [{"label": "Total Items", "field": "count", "aggregation": "sum", "format": "number"}]}'
        }
    ]

    for section in sections:
        doc.append("sections", section)

    doc.insert()
    frappe.db.commit()

    return doc

def test_csv_export(report_id):
    """Test CSV export"""
    print("Testing CSV Export...")

    try:
        from workhub_frappe_app.api.report_export import export_to_csv

        result = export_to_csv(report_id)

        if not result.get("success"):
            return {"success": False, "error": "Export failed"}

        file_url = result.get("file_url")
        print(f"  ✓ CSV generated: {file_url}")

        # Validate CSV file
        file_path = frappe.get_site_path("private", "files", file_url.split("/")[-1])

        if not os.path.exists(file_path):
            return {"success": False, "error": "File not found"}

        print(f"  ✓ File exists")

        # Read and validate CSV
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            rows = list(reader)

        print(f"  ✓ CSV has {len(rows)} rows")

        # Check for report title in first row
        if rows and rows[0]:
            print(f"  ✓ Report title: {rows[0][0]}")

        return {"success": True, "file_url": file_url, "rows": len(rows)}

    except Exception as e:
        return {"success": False, "error": str(e)}

def test_excel_export(report_id):
    """Test Excel export"""
    print("Testing Excel Export...")

    try:
        from workhub_frappe_app.api.report_export import export_to_excel

        result = export_to_excel(report_id)

        if not result.get("success"):
            return {"success": False, "error": "Export failed"}

        file_url = result.get("file_url")
        print(f"  ✓ Excel generated: {file_url}")

        # Validate Excel file
        file_path = frappe.get_site_path("private", "files", file_url.split("/")[-1])

        if not os.path.exists(file_path):
            return {"success": False, "error": "File not found"}

        print(f"  ✓ File exists")

        # Open and validate workbook
        wb = load_workbook(file_path)
        sheet_names = wb.sheetnames

        print(f"  ✓ Workbook has {len(sheet_names)} sheets: {', '.join(sheet_names)}")

        # Check cover sheet
        if "Cover" in sheet_names:
            print(f"  ✓ Cover sheet present")
            cover = wb["Cover"]
            title = cover["A1"].value
            print(f"  ✓ Cover title: {title}")

        return {"success": True, "file_url": file_url, "sheets": len(sheet_names)}

    except Exception as e:
        return {"success": False, "error": str(e)}

def test_pdf_export(report_id):
    """Test PDF export"""
    print("Testing PDF Export...")

    try:
        from workhub_frappe_app.api.report_export import export_to_pdf

        result = export_to_pdf(report_id)

        if not result.get("success"):
            return {"success": False, "error": "Export failed"}

        file_url = result.get("file_url")
        print(f"  ✓ PDF generated: {file_url}")

        # Validate PDF file
        file_path = frappe.get_site_path("private", "files", file_url.split("/")[-1])

        if not os.path.exists(file_path):
            return {"success": False, "error": "File not found"}

        print(f"  ✓ File exists")

        # Get file size
        file_size = os.path.getsize(file_path)
        print(f"  ✓ File size: {file_size / 1024:.2f} KB")

        # Try to open PDF (basic validation)
        try:
            with open(file_path, 'rb') as f:
                header = f.read(5)
                if header == b'%PDF-':
                    print(f"  ✓ Valid PDF header")
                else:
                    return {"success": False, "error": "Invalid PDF file"}
        except Exception as e:
            return {"success": False, "error": f"Cannot read PDF: {str(e)}"}

        return {"success": True, "file_url": file_url, "size_kb": file_size / 1024}

    except Exception as e:
        return {"success": False, "error": str(e)}

# Run tests
if __name__ == "__main__":
    test_all_exports()
```

---

## Manual Testing Checklist

### Pre-Test Setup
- [ ] Frappe bench running
- [ ] WorkHub app migrated
- [ ] openpyxl installed: `pip install openpyxl`
- [ ] wkhtmltopdf installed for PDF generation
- [ ] Test report created with all section types

### CSV Export Tests
- [ ] Test 1.1: Basic CSV export
- [ ] Test 1.2: CSV report header
- [ ] Test 1.3: CSV table section
- [ ] Test 1.4: CSV KPI section
- [ ] Test 1.5: CSV multi-section
- [ ] Test 1.6: CSV special characters
- [ ] Test 1.7: CSV large report

### Excel Export Tests
- [ ] Test 2.1: Basic Excel export
- [ ] Test 2.2: Excel cover sheet
- [ ] Test 2.3: Excel section worksheets
- [ ] Test 2.4: Excel table formatting
- [ ] Test 2.5: Excel column formatting
- [ ] Test 2.6: Excel KPI formatting
- [ ] Test 2.7: Excel large report
- [ ] Test 2.8: Excel styling consistency

### PDF Export Tests
- [ ] Test 3.1: Basic PDF export
- [ ] Test 3.2: PDF cover page
- [ ] Test 3.3: PDF section rendering
- [ ] Test 3.4: PDF table formatting
- [ ] Test 3.5: PDF page layout
- [ ] Test 3.6: PDF multi-page handling
- [ ] Test 3.7: PDF special characters
- [ ] Test 3.8: PDF file size and performance
- [ ] Test 3.9: PDF print quality

### Cross-Format Tests
- [ ] Test 4.1: Data consistency
- [ ] Test 4.2: Format-specific features
- [ ] Test 4.3: Filename consistency

### Error Handling Tests
- [ ] Test 5.1: Empty report
- [ ] Test 5.2: Missing data source
- [ ] Test 5.3: Large data volume
- [ ] Test 5.4: Special characters in title
- [ ] Test 5.5: Concurrent exports
- [ ] Test 5.6: Permission handling

### Integration Tests
- [ ] Test 6.1: Generated report record
- [ ] Test 6.2: File storage
- [ ] Test 6.3: Export history display
- [ ] Test 6.4: Download previously exported

---

## Test Results

### CSV Export Results
**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

**Notes:**


### Excel Export Results
**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

**Notes:**


### PDF Export Results
**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

**Notes:**


---

## Issues Found

| # | Format | Severity | Description | Status |
|---|--------|----------|-------------|--------|
| 1 |        |          |             |        |

---

## Test Sign-Off

**Date:** _______________

**Tester:** _______________

**Overall Status:** ⬜ All Tests Passed ⬜ Issues Found ⬜ Blocked

**Comments:**


---

## Next Steps

After testing completion:
1. ✅ All tests passed → Mark subtask 10.2 as completed
2. ❌ Issues found → Document in build-progress.txt, create fixes
3. ⚠️ Blocked → Escalate and document blockers

**Ready for Production:** ⬜ Yes ⬜ No ⬜ With Caveats

