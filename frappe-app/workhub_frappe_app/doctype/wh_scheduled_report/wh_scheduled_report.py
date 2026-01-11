# Copyright (c) 2026, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from datetime import datetime, timedelta
from frappe.utils import now_datetime, get_datetime, add_days, add_months, getdate


class WHScheduledReport(Document):
	def before_insert(self):
		"""Set created_by and calculate next_run on first save"""
		if not self.created_by:
			self.created_by = frappe.session.user

		# Calculate next run time on creation
		if not self.next_run:
			self.next_run = self.calculate_next_run()

	def validate(self):
		"""Validation before saving"""
		# Validate schedule configuration based on type
		if self.schedule_type == "Weekly" and not self.day_of_week:
			frappe.throw("Day of Week is required for Weekly schedules")

		if self.schedule_type == "Monthly":
			if not self.day_of_month:
				frappe.throw("Day of Month is required for Monthly schedules")
			if self.day_of_month < 1 or self.day_of_month > 31:
				frappe.throw("Day of Month must be between 1 and 31")

		# Validate that report definition exists and is active
		if self.report_definition:
			report_def = frappe.get_doc("WH Report Definition", self.report_definition)
			if not report_def.is_active:
				frappe.msgprint(
					f"Warning: Report Definition '{self.report_definition}' is not active",
					indicator="orange"
				)

		# Set default email subject if not provided
		if not self.email_subject and self.report_definition:
			self.email_subject = f"Scheduled Report: {self.report_definition}"

		# Recalculate next_run if schedule parameters changed
		if self.has_value_changed("schedule_type") or \
		   self.has_value_changed("schedule_time") or \
		   self.has_value_changed("day_of_week") or \
		   self.has_value_changed("day_of_month"):
			self.next_run = self.calculate_next_run()

	def calculate_next_run(self, from_datetime=None):
		"""
		Calculate the next run datetime based on schedule configuration

		Args:
			from_datetime: Calculate next run from this datetime (defaults to now)

		Returns:
			datetime: The next scheduled run time
		"""
		if not from_datetime:
			from_datetime = now_datetime()

		# Get the time component
		if not self.schedule_time:
			self.schedule_time = "09:00:00"

		# Parse time components
		time_parts = str(self.schedule_time).split(":")
		target_hour = int(time_parts[0])
		target_minute = int(time_parts[1])
		target_second = int(time_parts[2]) if len(time_parts) > 2 else 0

		if self.schedule_type == "Daily":
			# Schedule for today or tomorrow
			next_run = from_datetime.replace(
				hour=target_hour,
				minute=target_minute,
				second=target_second,
				microsecond=0
			)

			# If the time has already passed today, schedule for tomorrow
			if next_run <= from_datetime:
				next_run = add_days(next_run, 1)

			return next_run

		elif self.schedule_type == "Weekly":
			# Find next occurrence of the specified day of week
			current_day = from_datetime.isoweekday()  # 1=Monday, 7=Sunday
			target_day = int(self.day_of_week)

			# Calculate days until target day
			days_ahead = target_day - current_day
			if days_ahead < 0:  # Target day already happened this week
				days_ahead += 7
			elif days_ahead == 0:  # Target day is today
				# Check if time has passed
				next_run = from_datetime.replace(
					hour=target_hour,
					minute=target_minute,
					second=target_second,
					microsecond=0
				)
				if next_run <= from_datetime:
					days_ahead = 7  # Schedule for next week
				else:
					return next_run

			next_run = from_datetime.replace(
				hour=target_hour,
				minute=target_minute,
				second=target_second,
				microsecond=0
			)
			next_run = add_days(next_run, days_ahead)

			return next_run

		elif self.schedule_type == "Monthly":
			# Find next occurrence of the specified day of month
			target_day = int(self.day_of_month)
			current_date = from_datetime.date()

			# Try current month first
			try:
				next_run = from_datetime.replace(
					day=target_day,
					hour=target_hour,
					minute=target_minute,
					second=target_second,
					microsecond=0
				)

				# If that date has passed, or if it's today but time has passed, go to next month
				if next_run <= from_datetime:
					# Move to next month
					next_run = add_months(next_run, 1)

					# Handle case where target day doesn't exist in next month (e.g., day 31 in February)
					# Frappe's add_months should handle this, but let's be safe
					max_day = self._get_max_day_in_month(next_run.year, next_run.month)
					if target_day > max_day:
						next_run = next_run.replace(day=max_day)

				return next_run

			except ValueError:
				# Day doesn't exist in current month (e.g., day 31 in February)
				# Move to next month and try again
				next_month = add_months(from_datetime, 1)
				max_day = self._get_max_day_in_month(next_month.year, next_month.month)
				actual_day = min(target_day, max_day)

				next_run = next_month.replace(
					day=actual_day,
					hour=target_hour,
					minute=target_minute,
					second=target_second,
					microsecond=0
				)

				return next_run

		# Fallback to tomorrow
		return add_days(from_datetime, 1)

	def _get_max_day_in_month(self, year, month):
		"""Get the maximum day in a given month"""
		import calendar
		return calendar.monthrange(year, month)[1]

	def update_next_run(self):
		"""Update next_run field after a scheduled execution"""
		self.last_run = now_datetime()
		self.next_run = self.calculate_next_run(from_datetime=self.last_run)
		self.save(ignore_permissions=True)

	def mark_success(self):
		"""Mark the last execution as successful"""
		self.last_status = "Success"
		self.error_log = None
		self.update_next_run()

	def mark_failed(self, error_message):
		"""Mark the last execution as failed"""
		self.last_status = "Failed"
		self.error_log = error_message
		self.update_next_run()
