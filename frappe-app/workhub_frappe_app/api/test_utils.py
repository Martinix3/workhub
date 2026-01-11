# -*- coding: utf-8 -*-
# Copyright (c) 2024, WorkHub and contributors
# For license information, please see license.txt

"""
Unit tests for workhub_frappe_app.api.utils module
Tests the sanitize_search_term function for SQL LIKE pattern safety
"""

import unittest
from workhub_frappe_app.api.utils import sanitize_search_term


class TestSanitizeSearchTerm(unittest.TestCase):
	"""Test cases for sanitize_search_term function"""

	def test_normal_string_passes_through(self):
		"""Test that normal alphanumeric strings pass through unchanged"""
		test_cases = [
			"hello",
			"test123",
			"user name",
			"Product-Name",
			"item.code",
			"Test@Email.com"
		]
		for test_input in test_cases:
			result = sanitize_search_term(test_input)
			self.assertEqual(result, test_input,
				f"Normal string '{test_input}' should pass through unchanged")

	def test_percent_is_escaped(self):
		"""Test that % character is escaped to \\%"""
		test_cases = [
			("%", "\\%"),
			("50%", "50\\%"),
			("%discount", "\\%discount"),
			("50% off", "50\\% off"),
			("%%", "\\%\\%")
		]
		for test_input, expected in test_cases:
			result = sanitize_search_term(test_input)
			self.assertEqual(result, expected,
				f"Input '{test_input}' should escape % to \\%")

	def test_underscore_is_escaped(self):
		"""Test that _ character is escaped to \\_"""
		test_cases = [
			("_", "\\_"),
			("_test", "\\_test"),
			("test_", "test\\_"),
			("test_name", "test\\_name"),
			("__", "\\_\\_")
		]
		for test_input, expected in test_cases:
			result = sanitize_search_term(test_input)
			self.assertEqual(result, expected,
				f"Input '{test_input}' should escape _ to \\_")

	def test_backslash_is_escaped(self):
		"""Test that backslash character is escaped to \\\\"""
		test_cases = [
			("\\", "\\\\"),
			("path\\to\\file", "path\\\\to\\\\file"),
			("test\\", "test\\\\"),
			("\\test", "\\\\test"),
			("\\\\", "\\\\\\\\")
		]
		for test_input, expected in test_cases:
			result = sanitize_search_term(test_input)
			self.assertEqual(result, expected,
				f"Input '{test_input}' should escape \\ to \\\\")

	def test_none_returns_empty(self):
		"""Test that None input returns empty string"""
		result = sanitize_search_term(None)
		self.assertEqual(result, "",
			"None should return empty string")

	def test_empty_string_returns_empty(self):
		"""Test that empty string returns empty string"""
		result = sanitize_search_term("")
		self.assertEqual(result, "",
			"Empty string should return empty string")

	def test_combined_special_characters(self):
		"""Test that multiple special characters are all escaped correctly"""
		test_cases = [
			("test%name", "test\\%name"),
			("user_id%", "user\\_id\\%"),
			("path\\file%name", "path\\\\file\\%name"),
			("_test_%value", "\\_test\\_\\%value"),
			("%_\\", "\\%\\_\\\\"),
			("\\%_combined", "\\\\\\%\\_combined"),
			("file\\path_with%special", "file\\\\path\\_with\\%special"),
		]
		for test_input, expected in test_cases:
			result = sanitize_search_term(test_input)
			self.assertEqual(result, expected,
				f"Input '{test_input}' should escape all special characters correctly")

	def test_escaping_order_prevents_double_escaping(self):
		"""Test that escaping order (backslash first) prevents double-escaping"""
		# If we escape % before backslash, "%" -> "\%" -> "\\\%" (wrong)
		# By escaping backslash first, "%" -> "%" -> "\%" (correct)
		test_input = "%"
		result = sanitize_search_term(test_input)
		# Should be \% not \\%
		self.assertEqual(result, "\\%",
			"Percent sign should be escaped to \\% not \\\\%")

		# Verify backslash followed by % works correctly
		test_input = "\\%"
		result = sanitize_search_term(test_input)
		# Should be \\% (escaped backslash + escaped percent)
		self.assertEqual(result, "\\\\\\%",
			"Backslash percent should be escaped to \\\\\\%")


def run_tests():
	"""Helper function to run all tests"""
	suite = unittest.TestLoader().loadTestsFromTestCase(TestSanitizeSearchTerm)
	runner = unittest.TextTestRunner(verbosity=2)
	return runner.run(suite)


if __name__ == "__main__":
	unittest.main()
