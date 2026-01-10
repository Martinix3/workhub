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
