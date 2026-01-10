# WH Report Export API
# Export functionality for reports (PDF, Excel, CSV)

import frappe
from frappe import _
from frappe.utils import now_datetime, get_datetime, format_datetime, format_date, cint, flt
from frappe.utils.file_manager import save_file
import json
import os
import tempfile

from workhub_frappe_app.api.utils import require_auth, require_permission


# ========================================
# Formatting Utilities
# ========================================

def format_report_date(date_value, include_time=False):
	"""
	Format a date value for report display

	Args:
		date_value: Date or datetime value to format
		include_time: Whether to include time in the output

	Returns:
		Formatted date string or empty string if None
	"""
	if not date_value:
		return ""

	try:
		if include_time:
			# Format as datetime: "Jan 10, 2026 14:30"
			return format_datetime(get_datetime(date_value), "MMM dd, yyyy HH:mm")
		else:
			# Format as date: "Jan 10, 2026"
			return format_date(date_value, "MMM dd, yyyy")
	except Exception as e:
		frappe.log_error(f"Error formatting date {date_value}: {str(e)}")
		return str(date_value)


def format_report_number(number_value, decimals=2, prefix="", suffix=""):
	"""
	Format a number for report display

	Args:
		number_value: Number to format
		decimals: Number of decimal places (default: 2)
		prefix: String to prepend (e.g., "$", "€")
		suffix: String to append (e.g., "%", "kg")

	Returns:
		Formatted number string
	"""
	if number_value is None:
		return ""

	try:
		# Convert to float and round
		num = flt(number_value, decimals)

		# Format with thousands separator
		if decimals == 0:
			formatted = f"{int(num):,}"
		else:
			formatted = f"{num:,.{decimals}f}"

		# Add prefix and suffix
		return f"{prefix}{formatted}{suffix}"
	except Exception as e:
		frappe.log_error(f"Error formatting number {number_value}: {str(e)}")
		return str(number_value)


def format_report_currency(amount, currency="USD"):
	"""
	Format a currency amount for report display

	Args:
		amount: Amount to format
		currency: Currency code (default: "USD")

	Returns:
		Formatted currency string
	"""
	if amount is None:
		return ""

	# Currency symbol mapping
	currency_symbols = {
		"USD": "$",
		"EUR": "€",
		"GBP": "£",
		"JPY": "¥",
		"MXN": "$",
		"CAD": "C$"
	}

	symbol = currency_symbols.get(currency, currency + " ")

	# Most currencies use 2 decimals, except JPY which uses 0
	decimals = 0 if currency == "JPY" else 2

	return format_report_number(amount, decimals, prefix=symbol)


def format_report_percentage(value, decimals=1):
	"""
	Format a percentage value for report display

	Args:
		value: Percentage value (0-100 or 0-1 depending on context)
		decimals: Number of decimal places (default: 1)

	Returns:
		Formatted percentage string
	"""
	if value is None:
		return ""

	return format_report_number(value, decimals, suffix="%")


def sanitize_filename(filename):
	"""
	Sanitize a filename for safe file system usage

	Args:
		filename: Original filename

	Returns:
		Sanitized filename safe for file systems
	"""
	# Remove or replace unsafe characters
	unsafe_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']

	sanitized = filename
	for char in unsafe_chars:
		sanitized = sanitized.replace(char, '_')

	# Remove leading/trailing spaces and dots
	sanitized = sanitized.strip('. ')

	# Ensure filename is not empty
	if not sanitized:
		sanitized = "report"

	return sanitized


# ========================================
# File Generation & Storage
# ========================================

def get_export_filename(report_title, export_format, timestamp=None):
	"""
	Generate a filename for an exported report

	Args:
		report_title: Report title
		export_format: Export format (PDF/Excel/CSV)
		timestamp: Optional timestamp for uniqueness (default: now)

	Returns:
		Sanitized filename with extension
	"""
	# Sanitize the title
	safe_title = sanitize_filename(report_title)

	# Add timestamp if provided
	if timestamp:
		dt = get_datetime(timestamp)
		timestamp_str = dt.strftime("%Y%m%d_%H%M%S")
		base_name = f"{safe_title}_{timestamp_str}"
	else:
		base_name = safe_title

	# Add appropriate file extension
	extensions = {
		"PDF": ".pdf",
		"Excel": ".xlsx",
		"CSV": ".csv"
	}

	extension = extensions.get(export_format, ".bin")

	return base_name + extension


def save_export_file(content, filename, is_private=1):
	"""
	Save exported file to Frappe's file system

	Args:
		content: File content (bytes or string)
		filename: Filename to save as
		is_private: Whether file should be private (default: 1)

	Returns:
		File URL (path to access the file)
	"""
	try:
		# Ensure content is bytes
		if isinstance(content, str):
			content = content.encode('utf-8')

		# Save file using Frappe's file manager
		file_doc = save_file(
			fname=filename,
			content=content,
			dt="WH Generated Report",
			is_private=is_private
		)

		return file_doc.file_url
	except Exception as e:
		frappe.log_error(f"Error saving export file {filename}: {str(e)}")
		frappe.throw(_("Failed to save exported file: {0}").format(str(e)))


def create_temp_file(content, suffix=".tmp"):
	"""
	Create a temporary file for processing

	Args:
		content: Content to write (bytes or string)
		suffix: File suffix/extension (default: ".tmp")

	Returns:
		Tuple of (file_path, file_descriptor)
	"""
	# Create temp file
	fd, temp_path = tempfile.mkstemp(suffix=suffix)

	try:
		# Write content
		if isinstance(content, str):
			os.write(fd, content.encode('utf-8'))
		else:
			os.write(fd, content)

		return temp_path, fd
	except Exception as e:
		os.close(fd)
		if os.path.exists(temp_path):
			os.remove(temp_path)
		raise e


def cleanup_temp_file(file_path, file_descriptor=None):
	"""
	Clean up a temporary file

	Args:
		file_path: Path to temporary file
		file_descriptor: Optional file descriptor to close
	"""
	try:
		if file_descriptor is not None:
			os.close(file_descriptor)

		if file_path and os.path.exists(file_path):
			os.remove(file_path)
	except Exception as e:
		frappe.log_error(f"Error cleaning up temp file {file_path}: {str(e)}")


# ========================================
# Report Data Helpers
# ========================================

def get_report_generation_data(report_id, filters=None):
	"""
	Get report data ready for export
	Uses the generate_report function from reports API

	Args:
		report_id: Report definition ID
		filters: Optional filters to apply

	Returns:
		Complete report data structure
	"""
	from workhub_frappe_app.api.reports import generate_report

	# Generate the report
	report_data = generate_report(report_id, filters=filters)

	if not report_data.get("success"):
		frappe.throw(_("Failed to generate report data"))

	return report_data


def create_generated_report_record(report_id, export_format, data_snapshot=None):
	"""
	Create a WH Generated Report record to track the export

	Args:
		report_id: Report definition ID
		export_format: Export format (PDF/Excel/CSV)
		data_snapshot: Optional data snapshot to store

	Returns:
		WH Generated Report document
	"""
	# Create the generated report record
	doc = frappe.new_doc("WH Generated Report")
	doc.report_definition = report_id
	doc.export_format = export_format
	doc.status = "Pending"

	if data_snapshot:
		if isinstance(data_snapshot, dict):
			doc.data_snapshot = json.dumps(data_snapshot)
		else:
			doc.data_snapshot = data_snapshot

	doc.insert(ignore_permissions=True)
	frappe.db.commit()

	return doc


def update_generated_report_status(generated_report_id, status, file_url=None, error_message=None):
	"""
	Update the status of a generated report

	Args:
		generated_report_id: WH Generated Report ID
		status: New status (Completed/Failed)
		file_url: Optional file URL for completed reports
		error_message: Optional error message for failed reports
	"""
	try:
		doc = frappe.get_doc("WH Generated Report", generated_report_id)

		if status == "Completed":
			doc.mark_completed(file_url)
		elif status == "Failed":
			doc.mark_failed(error_message or "Unknown error")

		doc.save(ignore_permissions=True)
		frappe.db.commit()
	except Exception as e:
		frappe.log_error(f"Error updating generated report {generated_report_id}: {str(e)}")


# ========================================
# Table Data Helpers
# ========================================

def extract_table_data(section_data):
	"""
	Extract table data from a section for export

	Args:
		section_data: Section data with table information

	Returns:
		Tuple of (columns, rows) where:
			- columns: List of column definitions
			- rows: List of row data
	"""
	data = section_data.get("data", [])
	config = section_data.get("config", {})

	# Parse config if it's a string
	if isinstance(config, str):
		try:
			config = json.loads(config)
		except:
			config = {}

	# Get column configuration or infer from data
	if config.get("columns"):
		columns = config["columns"]
	elif data and len(data) > 0:
		# Infer columns from first row
		first_row = data[0]
		columns = [{"field": key, "label": key.replace("_", " ").title()} for key in first_row.keys()]
	else:
		columns = []

	return columns, data


def format_table_cell_value(value, column_config=None):
	"""
	Format a table cell value based on column configuration

	Args:
		value: Cell value to format
		column_config: Optional column configuration

	Returns:
		Formatted cell value
	"""
	if value is None:
		return ""

	# If no column config, return as string
	if not column_config:
		return str(value)

	# Get field type from config
	field_type = column_config.get("type", "string")

	if field_type == "date":
		return format_report_date(value, include_time=False)
	elif field_type == "datetime":
		return format_report_date(value, include_time=True)
	elif field_type == "number":
		decimals = column_config.get("decimals", 2)
		return format_report_number(value, decimals)
	elif field_type == "currency":
		currency = column_config.get("currency", "USD")
		return format_report_currency(value, currency)
	elif field_type == "percentage":
		decimals = column_config.get("decimals", 1)
		return format_report_percentage(value, decimals)
	elif field_type == "boolean":
		return "Yes" if value else "No"
	else:
		return str(value)


# ========================================
# CSV Export
# ========================================

def export_to_csv(report_id, filters=None):
	"""
	Export report to CSV format

	For table sections, exports as standard CSV.
	For multi-section reports, creates a combined CSV with section headers separating data blocks.

	Args:
		report_id: Report definition ID
		filters: Optional filters to apply

	Returns:
		File URL of the generated CSV file
	"""
	import csv
	from io import StringIO

	# Get report data
	report_data = get_report_generation_data(report_id, filters)

	metadata = report_data.get("metadata", {})
	sections = report_data.get("sections", [])

	# Create CSV output
	csv_output = StringIO()
	csv_writer = csv.writer(csv_output, quoting=csv.QUOTE_MINIMAL)

	# Write report header
	csv_writer.writerow([metadata.get("title", "Report")])
	csv_writer.writerow([f"Generated: {format_report_date(metadata.get('generated_at'), include_time=True)}"])
	csv_writer.writerow([])  # Blank line

	# Process each section
	for section_idx, section in enumerate(sections):
		section_type = section.get("section_type", "")
		section_title = section.get("title", "Untitled Section")

		# Only export sections with tabular data
		if section_type not in ["Table", "KPI"]:
			# For non-table sections, just add a comment line
			csv_writer.writerow([f"# {section_title} ({section_type})"])
			csv_writer.writerow([])
			continue

		# Write section header
		csv_writer.writerow([f"## {section_title}"])
		csv_writer.writerow([])

		# Handle table sections
		if section_type == "Table":
			columns, rows = extract_table_data(section)

			if not columns:
				csv_writer.writerow(["No data available"])
				csv_writer.writerow([])
				continue

			# Write column headers
			column_labels = [col.get("label", col.get("field", "")) for col in columns]
			csv_writer.writerow(column_labels)

			# Write data rows
			for row in rows:
				csv_row = []
				for col in columns:
					field_name = col.get("field", "")
					cell_value = row.get(field_name)
					formatted_value = format_table_cell_value(cell_value, col)
					csv_row.append(formatted_value)
				csv_writer.writerow(csv_row)

			# Blank line after section
			csv_writer.writerow([])

		# Handle KPI sections
		elif section_type == "KPI":
			data = section.get("data", [])

			if not data:
				csv_writer.writerow(["No data available"])
				csv_writer.writerow([])
				continue

			# KPI format: Label, Value
			csv_writer.writerow(["Metric", "Value"])

			for kpi_item in data:
				label = kpi_item.get("label", "")
				value = kpi_item.get("value", "")

				# Format value based on type
				kpi_config = section.get("config", {})
				if isinstance(kpi_config, str):
					try:
						kpi_config = json.loads(kpi_config)
					except:
						kpi_config = {}

				formatted_value = format_table_cell_value(value, kpi_config)
				csv_writer.writerow([label, formatted_value])

			# Blank line after section
			csv_writer.writerow([])

	# Get CSV content
	csv_content = csv_output.getvalue()
	csv_output.close()

	# Generate filename
	filename = get_export_filename(metadata.get("title", "report"), "CSV", timestamp=metadata.get("generated_at"))

	# Create generated report record
	generated_report = create_generated_report_record(
		report_id=report_id,
		export_format="CSV",
		data_snapshot=report_data
	)

	try:
		# Save the file
		file_url = save_export_file(csv_content, filename, is_private=1)

		# Update generated report record
		update_generated_report_status(
			generated_report.name,
			status="Completed",
			file_url=file_url
		)

		return {
			"success": True,
			"file_url": file_url,
			"generated_report_id": generated_report.name,
			"message": _("CSV export completed successfully")
		}

	except Exception as e:
		# Update generated report record with error
		update_generated_report_status(
			generated_report.name,
			status="Failed",
			error_message=str(e)
		)

		frappe.log_error(f"CSV export failed for report {report_id}: {str(e)}")
		frappe.throw(_("Failed to export CSV: {0}").format(str(e)))


# ========================================
# Excel Export
# ========================================

def export_to_excel(report_id, filters=None):
	"""
	Export report to Excel format using openpyxl

	Creates a professional Excel workbook with:
	- Cover sheet with report metadata
	- Separate worksheets per section
	- Formatted tables with headers
	- Styled headers and formatting

	Args:
		report_id: Report definition ID
		filters: Optional filters to apply

	Returns:
		File URL of the generated Excel file
	"""
	try:
		from openpyxl import Workbook
		from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
		from openpyxl.utils import get_column_letter
	except ImportError:
		frappe.throw(_("openpyxl library is required for Excel export. Please install it."))

	# Get report data
	report_data = get_report_generation_data(report_id, filters)

	metadata = report_data.get("metadata", {})
	sections = report_data.get("sections", [])

	# Create workbook
	wb = Workbook()

	# Remove default sheet
	if "Sheet" in wb.sheetnames:
		wb.remove(wb["Sheet"])

	# ========================================
	# Create Cover Sheet
	# ========================================
	cover_sheet = wb.create_sheet("Cover", 0)

	# Define styles for cover sheet
	title_font = Font(name='Arial', size=24, bold=True, color='1F4E78')
	heading_font = Font(name='Arial', size=12, bold=True, color='1F4E78')
	normal_font = Font(name='Arial', size=11)

	# Report title
	cover_sheet['A1'] = metadata.get("title", "Report")
	cover_sheet['A1'].font = title_font
	cover_sheet.row_dimensions[1].height = 35

	# Metadata
	row = 3
	cover_sheet[f'A{row}'] = "Report Information"
	cover_sheet[f'A{row}'].font = heading_font
	row += 1

	# Report details
	details = [
		("Report Type:", metadata.get("report_type", "N/A")),
		("Category:", metadata.get("category", "N/A")),
		("Generated:", format_report_date(metadata.get("generated_at"), include_time=True)),
		("Generated By:", metadata.get("generated_by_info", {}).get("full_name", "N/A")),
		("Description:", metadata.get("description", "N/A"))
	]

	for label, value in details:
		cover_sheet[f'A{row}'] = label
		cover_sheet[f'A{row}'].font = Font(name='Arial', size=11, bold=True)
		cover_sheet[f'B{row}'] = value
		cover_sheet[f'B{row}'].font = normal_font
		row += 1

	# Set column widths for cover sheet
	cover_sheet.column_dimensions['A'].width = 20
	cover_sheet.column_dimensions['B'].width = 50

	# ========================================
	# Create Section Worksheets
	# ========================================

	# Define styles for data sheets
	header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
	header_font = Font(name='Arial', size=11, bold=True, color='FFFFFF')
	header_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

	cell_border = Border(
		left=Side(style='thin', color='D0D0D0'),
		right=Side(style='thin', color='D0D0D0'),
		top=Side(style='thin', color='D0D0D0'),
		bottom=Side(style='thin', color='D0D0D0')
	)

	section_number = 1

	for section_idx, section in enumerate(sections):
		section_type = section.get("section_type", "")
		section_title = section.get("title", "Untitled Section")

		# Only export sections with data (Table, KPI)
		if section_type not in ["Table", "KPI"]:
			continue

		# Create sanitized sheet name (Excel limit: 31 chars)
		sheet_name = sanitize_filename(section_title)[:31]

		# Ensure unique sheet name
		if sheet_name in wb.sheetnames:
			sheet_name = f"{sheet_name[:27]}_{section_number}"

		ws = wb.create_sheet(sheet_name)
		section_number += 1

		# Add section title
		ws['A1'] = section_title
		ws['A1'].font = Font(name='Arial', size=14, bold=True, color='1F4E78')
		ws.row_dimensions[1].height = 25
		ws.merge_cells('A1:D1')

		# ========================================
		# Handle Table Sections
		# ========================================
		if section_type == "Table":
			columns, rows = extract_table_data(section)

			if not columns or not rows:
				ws['A3'] = "No data available"
				ws['A3'].font = Font(italic=True)
				continue

			# Write column headers (row 3)
			for col_idx, col in enumerate(columns, start=1):
				cell = ws.cell(row=3, column=col_idx)
				cell.value = col.get("label", col.get("field", ""))
				cell.font = header_font
				cell.fill = header_fill
				cell.alignment = header_alignment
				cell.border = cell_border

			# Set header row height
			ws.row_dimensions[3].height = 20

			# Write data rows
			for row_idx, row_data in enumerate(rows, start=4):
				for col_idx, col in enumerate(columns, start=1):
					cell = ws.cell(row=row_idx, column=col_idx)
					field_name = col.get("field", "")
					cell_value = row_data.get(field_name)

					# Format value based on column type
					formatted_value = format_table_cell_value(cell_value, col)

					# For numeric types, try to keep as number for Excel
					field_type = col.get("type", "string")
					if field_type in ["number", "currency", "percentage"] and cell_value is not None:
						try:
							cell.value = flt(cell_value)

							# Apply number format
							if field_type == "currency":
								cell.number_format = '$#,##0.00'
							elif field_type == "percentage":
								cell.number_format = '0.0%'
								# If value is > 1, assume it's already a percentage (not decimal)
								if cell.value > 1:
									cell.value = cell.value / 100
							else:
								decimals = col.get("decimals", 2)
								if decimals == 0:
									cell.number_format = '#,##0'
								else:
									cell.number_format = f'#,##0.{"0" * decimals}'
						except:
							cell.value = formatted_value
					else:
						cell.value = formatted_value

					cell.font = Font(name='Arial', size=10)
					cell.border = cell_border
					cell.alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)

			# Auto-size columns
			for col_idx, col in enumerate(columns, start=1):
				column_letter = get_column_letter(col_idx)

				# Calculate max width
				max_width = len(col.get("label", col.get("field", "")))
				for row_idx in range(4, min(4 + len(rows), 100)):  # Check first 100 rows
					cell_value = ws.cell(row=row_idx, column=col_idx).value
					if cell_value:
						max_width = max(max_width, len(str(cell_value)))

				# Set width (max 50, min 10)
				ws.column_dimensions[column_letter].width = min(max(max_width + 2, 10), 50)

		# ========================================
		# Handle KPI Sections
		# ========================================
		elif section_type == "KPI":
			data = section.get("data", [])

			if not data:
				ws['A3'] = "No data available"
				ws['A3'].font = Font(italic=True)
				continue

			# KPI header (row 3)
			ws['A3'] = "Metric"
			ws['A3'].font = header_font
			ws['A3'].fill = header_fill
			ws['A3'].alignment = header_alignment
			ws['A3'].border = cell_border

			ws['B3'] = "Value"
			ws['B3'].font = header_font
			ws['B3'].fill = header_fill
			ws['B3'].alignment = header_alignment
			ws['B3'].border = cell_border

			ws.row_dimensions[3].height = 20

			# KPI data rows
			kpi_config = section.get("config", {})
			if isinstance(kpi_config, str):
				try:
					kpi_config = json.loads(kpi_config)
				except:
					kpi_config = {}

			for row_idx, kpi_item in enumerate(data, start=4):
				# Metric label
				label_cell = ws.cell(row=row_idx, column=1)
				label_cell.value = kpi_item.get("label", "")
				label_cell.font = Font(name='Arial', size=10, bold=True)
				label_cell.border = cell_border
				label_cell.alignment = Alignment(horizontal='left', vertical='center')

				# Metric value
				value_cell = ws.cell(row=row_idx, column=2)
				value = kpi_item.get("value")

				# Try to keep numeric values as numbers
				if isinstance(value, (int, float)):
					value_cell.value = value
					value_cell.number_format = '#,##0.00'
				else:
					formatted_value = format_table_cell_value(value, kpi_config)
					value_cell.value = formatted_value

				value_cell.font = Font(name='Arial', size=10)
				value_cell.border = cell_border
				value_cell.alignment = Alignment(horizontal='right', vertical='center')

			# Set column widths
			ws.column_dimensions['A'].width = 30
			ws.column_dimensions['B'].width = 20

	# ========================================
	# Save Workbook
	# ========================================

	# Generate filename
	filename = get_export_filename(metadata.get("title", "report"), "Excel", timestamp=metadata.get("generated_at"))

	# Create generated report record
	generated_report = create_generated_report_record(
		report_id=report_id,
		export_format="Excel",
		data_snapshot=report_data
	)

	try:
		# Save to temporary file first
		temp_path, temp_fd = create_temp_file(b"", suffix=".xlsx")
		os.close(temp_fd)  # Close immediately, openpyxl will write to it

		# Save workbook to temp file
		wb.save(temp_path)

		# Read the file content
		with open(temp_path, 'rb') as f:
			excel_content = f.read()

		# Clean up temp file
		cleanup_temp_file(temp_path)

		# Save to Frappe file system
		file_url = save_export_file(excel_content, filename, is_private=1)

		# Update generated report record
		update_generated_report_status(
			generated_report.name,
			status="Completed",
			file_url=file_url
		)

		return {
			"success": True,
			"file_url": file_url,
			"generated_report_id": generated_report.name,
			"message": _("Excel export completed successfully")
		}

	except Exception as e:
		# Update generated report record with error
		update_generated_report_status(
			generated_report.name,
			status="Failed",
			error_message=str(e)
		)

		frappe.log_error(f"Excel export failed for report {report_id}: {str(e)}")
		frappe.throw(_("Failed to export Excel: {0}").format(str(e)))


# ========================================
# PDF Export
# ========================================

def export_to_pdf(report_id, filters=None):
	"""
	Export report to PDF format using Frappe's PDF generation

	Creates an executive-ready PDF with:
	- Cover page with report metadata
	- Formatted sections with tables and KPI displays
	- Professional styling with company branding

	Args:
		report_id: Report definition ID
		filters: Optional filters to apply

	Returns:
		File URL of the generated PDF file
	"""
	from frappe.utils.pdf import get_pdf

	# Get report data
	report_data = get_report_generation_data(report_id, filters)

	metadata = report_data.get("metadata", {})
	sections = report_data.get("sections", [])

	# Prepare template context
	context = {
		"metadata": metadata,
		"sections": sections,
		"format_date": format_report_date,
		"format_number": format_report_number,
		"format_currency": format_report_currency,
		"format_percentage": format_report_percentage,
		"extract_table_data": extract_table_data,
		"format_table_cell_value": format_table_cell_value,
		"json": json  # For parsing JSON config
	}

	# Generate filename
	filename = get_export_filename(metadata.get("title", "report"), "PDF", timestamp=metadata.get("generated_at"))

	# Create generated report record
	generated_report = create_generated_report_record(
		report_id=report_id,
		export_format="PDF",
		data_snapshot=report_data
	)

	try:
		# Render HTML template
		html_content = frappe.render_template(
			"workhub_frappe_app/templates/report_pdf_template.html",
			context
		)

		# Convert HTML to PDF
		pdf_content = get_pdf(html_content)

		# Save to Frappe file system
		file_url = save_export_file(pdf_content, filename, is_private=1)

		# Update generated report record
		update_generated_report_status(
			generated_report.name,
			status="Completed",
			file_url=file_url
		)

		return {
			"success": True,
			"file_url": file_url,
			"generated_report_id": generated_report.name,
			"message": _("PDF export completed successfully")
		}

	except Exception as e:
		# Update generated report record with error
		update_generated_report_status(
			generated_report.name,
			status="Failed",
			error_message=str(e)
		)

		frappe.log_error(f"PDF export failed for report {report_id}: {str(e)}")
		frappe.throw(_("Failed to export PDF: {0}").format(str(e)))


# ========================================
# Export API Endpoints
# ========================================

@frappe.whitelist()
def export_report(report_id, format, filters=None):
	"""
	Export a report in the specified format

	Main API endpoint for report exports. Routes to appropriate export function
	based on format parameter.

	Args:
		report_id: Report definition ID
		format: Export format (PDF/Excel/CSV)
		filters: Optional filters to apply (JSON string or dict)

	Returns:
		dict with success flag, file_url, generated_report_id, and message
	"""
	require_auth()

	# Validate inputs
	if not report_id:
		frappe.throw(_("Report ID is required"))

	if not format:
		frappe.throw(_("Export format is required"))

	# Normalize format
	format = format.upper()

	# Validate format
	valid_formats = ["PDF", "EXCEL", "CSV"]
	if format not in valid_formats:
		frappe.throw(_("Invalid export format. Must be one of: {0}").format(", ".join(valid_formats)))

	# Parse filters if string
	if filters and isinstance(filters, str):
		try:
			filters = json.loads(filters)
		except:
			filters = None

	# Route to appropriate export function
	try:
		if format == "PDF":
			result = export_to_pdf(report_id, filters)
		elif format == "EXCEL":
			result = export_to_excel(report_id, filters)
		elif format == "CSV":
			result = export_to_csv(report_id, filters)

		return result

	except Exception as e:
		frappe.log_error(f"Export failed for report {report_id} in format {format}: {str(e)}")
		frappe.throw(_("Export failed: {0}").format(str(e)))


@frappe.whitelist()
def get_export_status(job_id):
	"""
	Get the status of an export job

	Used for checking async export status. Returns the current status
	and file URL if completed.

	Args:
		job_id: WH Generated Report ID (the export job identifier)

	Returns:
		dict with status, file_url, error_message, and metadata
	"""
	require_auth()

	# Validate input
	if not job_id:
		frappe.throw(_("Job ID is required"))

	try:
		# Get the generated report record
		doc = frappe.get_doc("WH Generated Report", job_id)

		# Build response
		response = {
			"success": True,
			"job_id": job_id,
			"status": doc.status,
			"export_format": doc.export_format,
			"generated_at": doc.generated_at,
			"generated_by": doc.generated_by
		}

		# Add file URL if completed
		if doc.status == "Completed" and doc.file_url:
			response["file_url"] = doc.file_url
			response["message"] = _("Export completed successfully")

		# Add error message if failed
		elif doc.status == "Failed":
			# Get error from data_snapshot if available
			error_message = "Export failed"
			if doc.data_snapshot:
				try:
					snapshot = json.loads(doc.data_snapshot) if isinstance(doc.data_snapshot, str) else doc.data_snapshot
					if isinstance(snapshot, dict) and snapshot.get("error"):
						error_message = snapshot["error"]
				except:
					pass

			response["error_message"] = error_message
			response["message"] = _("Export failed")

		# Pending status
		else:
			response["message"] = _("Export is in progress")

		# Add report info
		if doc.report_definition:
			report = frappe.get_doc("WH Report Definition", doc.report_definition)
			response["report_title"] = report.title
			response["report_type"] = report.report_type

		return response

	except frappe.DoesNotExistError:
		frappe.throw(_("Export job not found: {0}").format(job_id))
	except Exception as e:
		frappe.log_error(f"Error getting export status for {job_id}: {str(e)}")
		frappe.throw(_("Failed to get export status: {0}").format(str(e)))


@frappe.whitelist()
def download_report(generated_report_id):
	"""
	Get download URL for a generated report

	Returns the file URL for direct download of a previously generated report.

	Args:
		generated_report_id: WH Generated Report ID

	Returns:
		dict with success flag, file_url, and report metadata
	"""
	require_auth()

	# Validate input
	if not generated_report_id:
		frappe.throw(_("Generated report ID is required"))

	try:
		# Get the generated report record
		doc = frappe.get_doc("WH Generated Report", generated_report_id)

		# Check if report is completed
		if doc.status != "Completed":
			frappe.throw(_("Report generation is not complete. Current status: {0}").format(doc.status))

		# Check if file exists
		if not doc.file_url:
			frappe.throw(_("Report file not found"))

		# Build response with metadata
		response = {
			"success": True,
			"generated_report_id": generated_report_id,
			"file_url": doc.file_url,
			"export_format": doc.export_format,
			"generated_at": doc.generated_at,
			"generated_by": doc.generated_by
		}

		# Add report info
		if doc.report_definition:
			report = frappe.get_doc("WH Report Definition", doc.report_definition)
			response["report_title"] = report.title
			response["report_type"] = report.report_type
			response["category"] = report.category

		# Add user info
		if doc.generated_by:
			user_data = frappe.db.get_value("User", doc.generated_by,
				["full_name", "email"], as_dict=True)
			if user_data:
				response["generated_by_name"] = user_data.full_name
				response["generated_by_email"] = user_data.email

		return response

	except frappe.DoesNotExistError:
		frappe.throw(_("Generated report not found: {0}").format(generated_report_id))
	except Exception as e:
		frappe.log_error(f"Error downloading report {generated_report_id}: {str(e)}")
		frappe.throw(_("Failed to download report: {0}").format(str(e)))


@frappe.whitelist()
def send_report_email(report_id, recipients, export_format="PDF", filters=None,
					  email_subject=None, email_body=None):
	"""
	Generate a report and send it via email to specified recipients
	This is a general-purpose function for ad-hoc report sharing

	Args:
		report_id: ID of the WH Report Definition to generate
		recipients: List of email addresses or User IDs (JSON array or comma-separated string)
		export_format: Format to export (PDF, Excel, CSV) - default PDF
		filters: Optional filters to apply to the report (JSON object)
		email_subject: Optional custom email subject
		email_body: Optional custom email body (HTML supported)

	Returns:
		Dict with success status, generated report ID, file URL, and delivery details
	"""
	require_auth()

	try:
		# Parse recipients
		if isinstance(recipients, str):
			# Try to parse as JSON first
			try:
				recipients_list = json.loads(recipients)
			except json.JSONDecodeError:
				# If not JSON, treat as comma-separated string
				recipients_list = [r.strip() for r in recipients.split(",") if r.strip()]
		elif isinstance(recipients, list):
			recipients_list = recipients
		else:
			frappe.throw(_("Recipients must be a list or comma-separated string"))

		if not recipients_list:
			frappe.throw(_("At least one recipient is required"))

		# Parse filters if provided
		if filters and isinstance(filters, str):
			filters = json.loads(filters)

		# Normalize format
		export_format = export_format.upper()
		if export_format not in ["PDF", "EXCEL", "CSV"]:
			frappe.throw(_("Invalid export format. Must be PDF, Excel, or CSV"))

		frappe.logger().info(f"Generating and emailing report {report_id} to {len(recipients_list)} recipients")

		# Verify report exists and is active
		if not frappe.db.exists("WH Report Definition", report_id):
			frappe.throw(_("Report not found: {0}").format(report_id))

		report_def = frappe.get_doc("WH Report Definition", report_id)
		if not report_def.is_active:
			frappe.throw(_("Report '{0}' is not active").format(report_def.title))

		# Generate the report data
		frappe.logger().info(f"Generating report data for: {report_id}")
		report_data = get_report_generation_data(report_id, filters=filters)

		# Create generated report record
		generated_report_id = create_generated_report_record(
			report_id=report_id,
			export_format=export_format,
			data_snapshot=report_data
		)

		# Export the report in the specified format
		frappe.logger().info(f"Exporting report in {export_format} format")

		export_result = None
		if export_format == "PDF":
			export_result = export_to_pdf(
				report_id=report_id,
				filters=filters,
				generated_report_id=generated_report_id
			)
		elif export_format == "EXCEL":
			export_result = export_to_excel(
				report_id=report_id,
				filters=filters,
				generated_report_id=generated_report_id
			)
		elif export_format == "CSV":
			export_result = export_to_csv(
				report_id=report_id,
				filters=filters,
				generated_report_id=generated_report_id
			)

		if not export_result.get("success"):
			error_message = export_result.get("message", "Export failed")
			frappe.throw(_("Failed to export report: {0}").format(error_message))

		file_url = export_result.get("file_url")
		frappe.logger().info(f"Report exported successfully: {file_url}")

		# Resolve recipients to email addresses
		email_addresses = []
		for recipient in recipients_list:
			# Check if it's a User ID (starts with alphanumeric pattern typical of Frappe IDs)
			# or if it looks like an email address
			if "@" in recipient:
				# Direct email address
				email_addresses.append(recipient)
			else:
				# Assume it's a User ID, try to get email
				user_email = frappe.db.get_value("User", recipient, "email")
				if user_email:
					email_addresses.append(user_email)
				else:
					frappe.logger().warning(f"Could not resolve recipient '{recipient}' to email address, skipping")

		if not email_addresses:
			frappe.throw(_("No valid email addresses found in recipients list"))

		frappe.logger().info(f"Resolved to {len(email_addresses)} email addresses: {', '.join(email_addresses)}")

		# Build email subject
		if not email_subject:
			email_subject = f"Report: {report_def.title}"

		# Build email body
		if not email_body:
			# Default email body
			email_body = f"""
			<h2>Report: {report_def.title}</h2>
			<p>A report has been generated and is attached to this email.</p>

			<h3>Report Details</h3>
			<ul>
				<li><strong>Report:</strong> {report_def.title}</li>
				<li><strong>Type:</strong> {report_def.report_type}</li>
				<li><strong>Category:</strong> {report_def.category}</li>
				<li><strong>Generated:</strong> {format_datetime(now_datetime(), "MMM dd, yyyy HH:mm")}</li>
				<li><strong>Format:</strong> {export_format}</li>
			</ul>

			<p>The report is attached to this email for your review.</p>

			<p><em>This email was sent from WorkHub Reporting System.</em></p>
			"""

		# Get the file document to attach
		file_doc = None
		if file_url:
			try:
				file_doc = frappe.get_doc("File", {"file_url": file_url})
			except Exception as e:
				frappe.logger().warning(f"Could not find file document for {file_url}: {str(e)}")

		# Prepare attachments
		attachments = []
		if file_doc:
			# Get the physical file path
			from frappe.utils import get_site_path

			if file_doc.is_private:
				file_path = os.path.join(get_site_path(), "private", "files", file_doc.file_name)
			else:
				file_path = os.path.join(get_site_path(), "public", "files", file_doc.file_name)

			# Check if file exists
			if os.path.exists(file_path):
				attachments.append({
					"fname": file_doc.file_name,
					"fcontent": open(file_path, "rb").read()
				})
			else:
				frappe.logger().warning(f"File not found at path: {file_path}")
				frappe.throw(_("Generated report file not found"))

		# Send email
		frappe.sendmail(
			recipients=email_addresses,
			subject=email_subject,
			message=email_body,
			attachments=attachments if attachments else None,
			reference_doctype="WH Generated Report",
			reference_name=generated_report_id
		)

		frappe.logger().info(f"Email sent successfully to {len(email_addresses)} recipients")

		# Log the delivery in the generated report's data snapshot
		try:
			gen_report = frappe.get_doc("WH Generated Report", generated_report_id)
			snapshot = json.loads(gen_report.data_snapshot) if gen_report.data_snapshot else {}
			snapshot["email_delivery"] = {
				"sent_at": str(now_datetime()),
				"recipients": email_addresses,
				"subject": email_subject,
				"success": True
			}
			gen_report.data_snapshot = json.dumps(snapshot)
			gen_report.save(ignore_permissions=True)
		except Exception as e:
			frappe.logger().warning(f"Could not log email delivery to generated report: {str(e)}")

		return {
			"success": True,
			"message": _("Report generated and sent to {0} recipient(s)").format(len(email_addresses)),
			"generated_report_id": generated_report_id,
			"file_url": file_url,
			"recipients_sent": len(email_addresses),
			"recipients": email_addresses
		}

	except Exception as e:
		error_message = f"Error sending report email: {str(e)}"
		frappe.log_error(error_message, "Report Email Send Error")
		frappe.throw(_("Failed to send report: {0}").format(str(e)))
