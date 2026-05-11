#!/usr/bin/env python3
"""
Export Formats Testing Script
Automated testing for PDF, Excel, and CSV exports

Usage:
    bench execute apps/workhub/scripts/test_export_formats.py

Or from bench console:
    bench console
    >>> from apps.workhub.scripts.test_export_formats import run_tests
    >>> run_tests()
"""

import frappe
from frappe.utils import now_datetime, format_datetime
import os
import csv
import json


class ExportTester:
    """Automated testing for report exports"""

    def __init__(self):
        self.test_report = None
        self.results = {
            "CSV": {"tests": [], "passed": 0, "failed": 0},
            "Excel": {"tests": [], "passed": 0, "failed": 0},
            "PDF": {"tests": [], "passed": 0, "failed": 0}
        }

    def run_all_tests(self):
        """Run all export format tests"""
        print("\n" + "="*70)
        print("EXPORT FORMATS TESTING - AUTOMATED TEST SUITE")
        print("="*70)

        # Setup
        print("\n[SETUP] Creating test report...")
        self.test_report = self.create_or_get_test_report()
        print(f"✓ Test report: {self.test_report.name}")

        # Run tests
        print("\n" + "-"*70)
        self.test_csv_export()

        print("\n" + "-"*70)
        self.test_excel_export()

        print("\n" + "-"*70)
        self.test_pdf_export()

        # Print summary
        self.print_summary()

        return self.results

    def create_or_get_test_report(self):
        """Create or retrieve test report"""
        report_name = "Automated Export Test Report"

        # Check if exists
        if frappe.db.exists("WH Report Definition", {"title": report_name}):
            doc = frappe.get_doc("WH Report Definition", {"title": report_name})
            # Update to ensure it's active
            doc.is_active = 1
            doc.save()
            frappe.db.commit()
            return doc

        # Create new report
        doc = frappe.new_doc("WH Report Definition")
        doc.title = report_name
        doc.description = "Automated test report for export format validation"
        doc.report_type = "Custom"
        doc.category = "Custom"
        doc.is_active = 1

        # Add various section types
        sections = [
            {
                "section_type": "Header",
                "title": "Test Report Header",
                "display_order": 1,
                "is_visible": 1,
                "config": '{"subtitle": "Automated Testing"}'
            },
            {
                "section_type": "Text",
                "title": "Introduction",
                "display_order": 2,
                "is_visible": 1,
                "config": '{"content": "This is a **test report** for export validation.\\n\\n- Test CSV\\n- Test Excel\\n- Test PDF"}'
            },
            {
                "section_type": "KPI",
                "title": "Key Metrics",
                "data_source": "team_statistics",
                "display_order": 3,
                "is_visible": 1,
                "config": '{"kpis": [{"label": "Total Teams", "field": "name", "aggregation": "count", "format": "number"}]}'
            },
            {
                "section_type": "Table",
                "title": "Team Data",
                "data_source": "team_statistics",
                "display_order": 4,
                "is_visible": 1,
                "config": '{"columns": [{"field": "name", "label": "Team Name", "type": "string"}, {"field": "tasks_total", "label": "Total Tasks", "type": "number"}]}'
            },
            {
                "section_type": "Chart",
                "title": "Team Performance",
                "data_source": "team_statistics",
                "display_order": 5,
                "is_visible": 1,
                "config": '{"chart_type": "bar", "x_field": "name", "y_fields": ["tasks_total"]}'
            }
        ]

        for section in sections:
            doc.append("sections", section)

        doc.insert()
        frappe.db.commit()

        return doc

    def test_csv_export(self):
        """Test CSV export functionality"""
        print("\n[CSV EXPORT TESTS]")
        format_name = "CSV"

        # Test 1: Basic CSV generation
        test_name = "CSV - Basic Export"
        try:
            from workhub_frappe_app.api.report_export import export_to_csv

            result = export_to_csv(self.test_report.name)

            if not result.get("success"):
                raise Exception(f"Export failed: {result.get('message')}")

            file_url = result.get("file_url")
            self.record_pass(format_name, test_name, f"File: {file_url}")

        except Exception as e:
            self.record_fail(format_name, test_name, str(e))
            return

        # Test 2: File exists and is valid
        test_name = "CSV - File Validation"
        try:
            file_path = self.get_file_path(file_url)

            if not os.path.exists(file_path):
                raise Exception(f"File not found: {file_path}")

            file_size = os.path.getsize(file_path)
            if file_size == 0:
                raise Exception("File is empty")

            self.record_pass(format_name, test_name, f"Size: {file_size} bytes")

        except Exception as e:
            self.record_fail(format_name, test_name, str(e))
            return

        # Test 3: CSV structure validation
        test_name = "CSV - Structure Validation"
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                rows = list(reader)

            if not rows:
                raise Exception("CSV has no rows")

            # Check first row has report title
            if not rows[0] or not rows[0][0]:
                raise Exception("Missing report title in first row")

            # Check for "Generated:" row
            has_generated = any("Generated:" in str(row) for row in rows[:5])
            if not has_generated:
                raise Exception("Missing 'Generated:' timestamp")

            # Check for section headers (##)
            has_sections = any(any("##" in str(cell) for cell in row) for row in rows)
            if not has_sections:
                raise Exception("Missing section headers (##)")

            self.record_pass(format_name, test_name, f"Rows: {len(rows)}")

        except Exception as e:
            self.record_fail(format_name, test_name, str(e))

        # Test 4: UTF-8 encoding
        test_name = "CSV - UTF-8 Encoding"
        try:
            # Try to read as UTF-8 (already done above, but verify)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Check for common UTF-8 markers
            if len(content) == 0:
                raise Exception("Empty content")

            self.record_pass(format_name, test_name, f"Chars: {len(content)}")

        except Exception as e:
            self.record_fail(format_name, test_name, str(e))

    def test_excel_export(self):
        """Test Excel export functionality"""
        print("\n[EXCEL EXPORT TESTS]")
        format_name = "Excel"

        # Test 1: Basic Excel generation
        test_name = "Excel - Basic Export"
        try:
            from workhub_frappe_app.api.report_export import export_to_excel

            result = export_to_excel(self.test_report.name)

            if not result.get("success"):
                raise Exception(f"Export failed: {result.get('message')}")

            file_url = result.get("file_url")
            self.record_pass(format_name, test_name, f"File: {file_url}")

        except Exception as e:
            self.record_fail(format_name, test_name, str(e))
            return

        # Test 2: File exists and is valid
        test_name = "Excel - File Validation"
        try:
            file_path = self.get_file_path(file_url)

            if not os.path.exists(file_path):
                raise Exception(f"File not found: {file_path}")

            file_size = os.path.getsize(file_path)
            if file_size == 0:
                raise Exception("File is empty")

            self.record_pass(format_name, test_name, f"Size: {file_size} bytes")

        except Exception as e:
            self.record_fail(format_name, test_name, str(e))
            return

        # Test 3: Workbook structure
        test_name = "Excel - Workbook Structure"
        try:
            from openpyxl import load_workbook

            wb = load_workbook(file_path)
            sheet_names = wb.sheetnames

            if not sheet_names:
                raise Exception("Workbook has no sheets")

            # Check for Cover sheet
            if "Cover" not in sheet_names:
                raise Exception("Missing 'Cover' sheet")

            self.record_pass(format_name, test_name, f"Sheets: {len(sheet_names)} - {', '.join(sheet_names)}")

        except Exception as e:
            self.record_fail(format_name, test_name, str(e))
            return

        # Test 4: Cover sheet content
        test_name = "Excel - Cover Sheet Content"
        try:
            cover = wb["Cover"]

            # Check title in A1
            title = cover["A1"].value
            if not title:
                raise Exception("Missing title in A1")

            # Check metadata section
            has_metadata = False
            for row in range(1, 10):
                cell_value = str(cover[f"A{row}"].value)
                if "Report Type:" in cell_value or "Category:" in cell_value or "Generated:" in cell_value:
                    has_metadata = True
                    break

            if not has_metadata:
                raise Exception("Missing metadata section")

            self.record_pass(format_name, test_name, f"Title: {title}")

        except Exception as e:
            self.record_fail(format_name, test_name, str(e))

        # Test 5: Data sheet formatting
        test_name = "Excel - Data Sheet Formatting"
        try:
            # Find a data sheet (not Cover)
            data_sheets = [s for s in sheet_names if s != "Cover"]

            if not data_sheets:
                raise Exception("No data sheets found")

            # Check first data sheet
            ws = wb[data_sheets[0]]

            # Check for section title in row 1
            title = ws["A1"].value
            if not title:
                raise Exception("Missing section title")

            # Check for headers in row 3
            has_headers = False
            for col in range(1, 10):
                cell = ws.cell(row=3, column=col)
                if cell.value:
                    has_headers = True
                    # Check if header has styling
                    if cell.fill and cell.fill.start_color:
                        pass  # Has fill color
                    break

            if not has_headers:
                raise Exception("Missing headers in row 3")

            self.record_pass(format_name, test_name, f"Data sheet: {data_sheets[0]}")

        except Exception as e:
            self.record_fail(format_name, test_name, str(e))

    def test_pdf_export(self):
        """Test PDF export functionality"""
        print("\n[PDF EXPORT TESTS]")
        format_name = "PDF"

        # Test 1: Basic PDF generation
        test_name = "PDF - Basic Export"
        try:
            from workhub_frappe_app.api.report_export import export_to_pdf

            result = export_to_pdf(self.test_report.name)

            if not result.get("success"):
                raise Exception(f"Export failed: {result.get('message')}")

            file_url = result.get("file_url")
            self.record_pass(format_name, test_name, f"File: {file_url}")

        except Exception as e:
            self.record_fail(format_name, test_name, str(e))
            return

        # Test 2: File exists and is valid
        test_name = "PDF - File Validation"
        try:
            file_path = self.get_file_path(file_url)

            if not os.path.exists(file_path):
                raise Exception(f"File not found: {file_path}")

            file_size = os.path.getsize(file_path)
            if file_size == 0:
                raise Exception("File is empty")

            self.record_pass(format_name, test_name, f"Size: {file_size} bytes")

        except Exception as e:
            self.record_fail(format_name, test_name, str(e))
            return

        # Test 3: PDF header validation
        test_name = "PDF - Header Validation"
        try:
            with open(file_path, 'rb') as f:
                header = f.read(8)

            # Check PDF magic bytes
            if not header.startswith(b'%PDF-'):
                raise Exception("Invalid PDF header (missing %PDF-)")

            # Extract PDF version
            pdf_version = header.decode('latin-1', errors='ignore').strip()

            self.record_pass(format_name, test_name, f"Version: {pdf_version}")

        except Exception as e:
            self.record_fail(format_name, test_name, str(e))

        # Test 4: PDF file size check
        test_name = "PDF - Size Check"
        try:
            # PDF should be larger than minimal size (5KB)
            min_size = 5 * 1024  # 5KB

            if file_size < min_size:
                raise Exception(f"PDF too small ({file_size} bytes), may be corrupted")

            # PDF should not be excessively large (> 10MB for test report)
            max_size = 10 * 1024 * 1024  # 10MB

            if file_size > max_size:
                raise Exception(f"PDF too large ({file_size} bytes), possible issue")

            size_kb = file_size / 1024
            self.record_pass(format_name, test_name, f"Size: {size_kb:.2f} KB")

        except Exception as e:
            self.record_fail(format_name, test_name, str(e))

    def get_file_path(self, file_url):
        """Get physical file path from file URL"""
        # Extract filename from URL
        filename = file_url.split("/")[-1]

        # Construct path
        site_path = frappe.get_site_path()
        file_path = os.path.join(site_path, "private", "files", filename)

        return file_path

    def record_pass(self, format_name, test_name, details=""):
        """Record a passed test"""
        self.results[format_name]["tests"].append({
            "name": test_name,
            "status": "PASS",
            "details": details
        })
        self.results[format_name]["passed"] += 1
        print(f"  ✓ {test_name}")
        if details:
            print(f"    → {details}")

    def record_fail(self, format_name, test_name, error):
        """Record a failed test"""
        self.results[format_name]["tests"].append({
            "name": test_name,
            "status": "FAIL",
            "error": error
        })
        self.results[format_name]["failed"] += 1
        print(f"  ✗ {test_name}")
        print(f"    → ERROR: {error}")

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)

        total_passed = 0
        total_failed = 0

        for format_name, data in self.results.items():
            passed = data["passed"]
            failed = data["failed"]
            total = passed + failed

            total_passed += passed
            total_failed += failed

            status_icon = "✓" if failed == 0 else "✗"
            print(f"\n{status_icon} {format_name} Export: {passed}/{total} tests passed")

            if failed > 0:
                print(f"  Failed tests:")
                for test in data["tests"]:
                    if test["status"] == "FAIL":
                        print(f"    - {test['name']}: {test['error']}")

        print("\n" + "-"*70)
        total_tests = total_passed + total_failed
        overall_status = "✓ ALL TESTS PASSED" if total_failed == 0 else f"✗ {total_failed} TESTS FAILED"

        print(f"OVERALL: {total_passed}/{total_tests} tests passed - {overall_status}")
        print("="*70 + "\n")

        # Save results to file
        self.save_results()

    def save_results(self):
        """Save test results to file"""
        results_file = frappe.get_site_path("export_test_results.json")

        test_results = {
            "timestamp": str(now_datetime()),
            "report_id": self.test_report.name,
            "results": self.results,
            "summary": {
                "total_passed": sum(r["passed"] for r in self.results.values()),
                "total_failed": sum(r["failed"] for r in self.results.values())
            }
        }

        with open(results_file, 'w') as f:
            json.dump(test_results, f, indent=2)

        print(f"Results saved to: {results_file}")


def run_tests():
    """Main entry point for running tests"""
    tester = ExportTester()
    results = tester.run_all_tests()
    return results


# Allow running from command line
if __name__ == "__main__":
    run_tests()
