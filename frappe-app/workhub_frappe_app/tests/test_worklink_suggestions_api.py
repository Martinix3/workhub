# -*- coding: utf-8 -*-
# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

"""
Unit tests for WorkLink Suggestions API
Tests get_suggestions, accept_suggestion, and dismiss_suggestion endpoints
"""

import frappe
import unittest
from unittest.mock import patch, MagicMock
import json

from workhub_frappe_app.api.worklink_suggestions import (
    get_suggestions,
    accept_suggestion,
    dismiss_suggestion,
    _get_document_display_info,
    _record_suggestion_action
)


class TestGetSuggestionsAPI(unittest.TestCase):
    """Test get_suggestions API endpoint"""

    @patch('workhub_frappe_app.api.worklink_suggestions.require_auth')
    @patch('workhub_frappe_app.api.worklink_suggestions.match_documents')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.session')
    def test_get_suggestions_basic(self, mock_session, mock_match_documents, mock_auth):
        """Test basic get_suggestions call"""
        mock_session.user = "test@example.com"
        mock_match_documents.return_value = [
            {
                "doctype": "Sales Order",
                "doc_id": "SO-001",
                "doc_name": "SO-001",
                "confidence": 0.95,
                "match_type": "document_number"
            }
        ]

        result = get_suggestions(title="Revisar pedido SO-001")

        # Should return success response
        self.assertTrue(result["success"])
        self.assertEqual(result["count"], 1)
        self.assertEqual(len(result["suggestions"]), 1)
        self.assertEqual(result["suggestions"][0]["doc_id"], "SO-001")

    @patch('workhub_frappe_app.api.worklink_suggestions.require_auth')
    def test_get_suggestions_empty_title(self, mock_auth):
        """Test get_suggestions with empty title"""
        with self.assertRaises(Exception):
            # Should throw error for empty title
            get_suggestions(title="")

    @patch('workhub_frappe_app.api.worklink_suggestions.require_auth')
    @patch('workhub_frappe_app.api.worklink_suggestions.match_documents')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.session')
    def test_get_suggestions_with_department(self, mock_session, mock_match_documents, mock_auth):
        """Test get_suggestions with department parameter"""
        mock_session.user = "test@example.com"
        mock_match_documents.return_value = []

        result = get_suggestions(title="Test task", department="SALES")

        # Should call match_documents with department
        mock_match_documents.assert_called_once()
        call_kwargs = mock_match_documents.call_args[1]
        self.assertEqual(call_kwargs["department"], "SALES")

    @patch('workhub_frappe_app.api.worklink_suggestions.require_auth')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.throw')
    def test_get_suggestions_invalid_department(self, mock_throw, mock_auth):
        """Test get_suggestions with invalid department"""
        get_suggestions(title="Test task", department="INVALID")

        # Should throw error for invalid department
        mock_throw.assert_called_once()

    @patch('workhub_frappe_app.api.worklink_suggestions.require_auth')
    @patch('workhub_frappe_app.api.worklink_suggestions.match_documents')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.session')
    def test_get_suggestions_with_limit(self, mock_session, mock_match_documents, mock_auth):
        """Test get_suggestions with limit parameter"""
        mock_session.user = "test@example.com"
        mock_match_documents.return_value = []

        result = get_suggestions(title="Test task", limit=3)

        # Should call match_documents with limit=3
        mock_match_documents.assert_called_once()
        call_kwargs = mock_match_documents.call_args[1]
        self.assertEqual(call_kwargs["limit"], 3)

    @patch('workhub_frappe_app.api.worklink_suggestions.require_auth')
    @patch('workhub_frappe_app.api.worklink_suggestions.match_documents')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.session')
    def test_get_suggestions_limit_bounds(self, mock_session, mock_match_documents, mock_auth):
        """Test get_suggestions enforces limit bounds"""
        mock_session.user = "test@example.com"
        mock_match_documents.return_value = []

        # Test upper bound (max 10)
        result = get_suggestions(title="Test task", limit=20)
        call_kwargs = mock_match_documents.call_args[1]
        self.assertEqual(call_kwargs["limit"], 10)

        # Test lower bound (min 1, defaults to 5)
        result = get_suggestions(title="Test task", limit=0)
        call_kwargs = mock_match_documents.call_args[1]
        self.assertEqual(call_kwargs["limit"], 5)

    @patch('workhub_frappe_app.api.worklink_suggestions.require_auth')
    @patch('workhub_frappe_app.api.worklink_suggestions.match_documents')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.session')
    def test_get_suggestions_with_description(self, mock_session, mock_match_documents, mock_auth):
        """Test get_suggestions with description parameter"""
        mock_session.user = "test@example.com"
        mock_match_documents.return_value = []

        result = get_suggestions(
            title="Test task",
            description="Detailed description with keywords"
        )

        # Should pass description to match_documents
        mock_match_documents.assert_called_once()
        call_kwargs = mock_match_documents.call_args[1]
        self.assertEqual(call_kwargs["task_description"], "Detailed description with keywords")

    @patch('workhub_frappe_app.api.worklink_suggestions.require_auth')
    @patch('workhub_frappe_app.api.worklink_suggestions.match_documents')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.session')
    @patch('workhub_frappe_app.api.worklink_suggestions._get_document_display_info')
    def test_get_suggestions_enriches_results(self, mock_display_info, mock_session, mock_match_documents, mock_auth):
        """Test that suggestions are enriched with display info"""
        mock_session.user = "test@example.com"
        mock_match_documents.return_value = [
            {
                "doctype": "Sales Order",
                "doc_id": "SO-001",
                "confidence": 0.95
            }
        ]
        mock_display_info.return_value = {
            "customer": "CUST-001",
            "grand_total": 1000.00
        }

        result = get_suggestions(title="Test task")

        # Should enrich with display info
        self.assertIn("customer", result["suggestions"][0])
        self.assertEqual(result["suggestions"][0]["customer"], "CUST-001")


class TestAcceptSuggestionAPI(unittest.TestCase):
    """Test accept_suggestion API endpoint"""

    @patch('workhub_frappe_app.api.worklink_suggestions.require_permission')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.exists')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.get_value')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.new_doc')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.set_value')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.commit')
    @patch('workhub_frappe_app.api.worklink_suggestions._record_suggestion_action')
    def test_accept_suggestion_creates_worklink(
        self, mock_record, mock_commit, mock_set_value, mock_new_doc,
        mock_get_value, mock_exists, mock_require_perm
    ):
        """Test accept_suggestion creates new WorkLink"""
        mock_exists.side_effect = lambda doctype, doc_id: True  # Task and doc exist
        mock_get_value.side_effect = [
            None,  # No existing WorkLink
            "SALES"  # Task department
        ]

        # Mock WorkLink creation
        mock_worklink = MagicMock()
        mock_worklink.name = "WL-001"
        mock_new_doc.return_value = mock_worklink

        result = accept_suggestion(
            task_id="TASK-001",
            doctype="Sales Order",
            doc_id="SO-001"
        )

        # Should create WorkLink
        mock_new_doc.assert_called_once_with("WorkLink")
        mock_worklink.insert.assert_called_once()

        # Should update task
        mock_set_value.assert_called()

        # Should record action
        mock_record.assert_called_once()

        # Should return success
        self.assertTrue(result["success"])
        self.assertEqual(result["worklink_id"], "WL-001")

    @patch('workhub_frappe_app.api.worklink_suggestions.require_permission')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.exists')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.get_value')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.set_value')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.commit')
    @patch('workhub_frappe_app.api.worklink_suggestions._record_suggestion_action')
    def test_accept_suggestion_updates_existing_worklink(
        self, mock_record, mock_commit, mock_set_value, mock_get_value,
        mock_exists, mock_require_perm
    ):
        """Test accept_suggestion updates existing WorkLink"""
        mock_exists.side_effect = lambda doctype, doc_id: True
        mock_get_value.side_effect = [
            "WL-EXISTING",  # Existing WorkLink found
        ]

        result = accept_suggestion(
            task_id="TASK-001",
            doctype="Sales Order",
            doc_id="SO-001"
        )

        # Should update existing WorkLink
        mock_set_value.assert_called()

        # Should return success with existing WorkLink ID
        self.assertTrue(result["success"])
        self.assertEqual(result["worklink_id"], "WL-EXISTING")

    @patch('workhub_frappe_app.api.worklink_suggestions.require_permission')
    def test_accept_suggestion_missing_parameters(self, mock_require_perm):
        """Test accept_suggestion with missing parameters"""
        with self.assertRaises(Exception):
            accept_suggestion(task_id="", doctype="Sales Order", doc_id="SO-001")

        with self.assertRaises(Exception):
            accept_suggestion(task_id="TASK-001", doctype="", doc_id="SO-001")

        with self.assertRaises(Exception):
            accept_suggestion(task_id="TASK-001", doctype="Sales Order", doc_id="")

    @patch('workhub_frappe_app.api.worklink_suggestions.require_permission')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.exists')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.throw')
    def test_accept_suggestion_task_not_found(self, mock_throw, mock_exists, mock_require_perm):
        """Test accept_suggestion with non-existent task"""
        mock_exists.return_value = False

        accept_suggestion(
            task_id="TASK-INVALID",
            doctype="Sales Order",
            doc_id="SO-001"
        )

        # Should throw error
        mock_throw.assert_called()

    @patch('workhub_frappe_app.api.worklink_suggestions.require_permission')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.exists')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.get_value')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.new_doc')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.set_value')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.commit')
    @patch('workhub_frappe_app.api.worklink_suggestions._record_suggestion_action')
    def test_accept_suggestion_with_confidence_score(
        self, mock_record, mock_commit, mock_set_value, mock_new_doc,
        mock_get_value, mock_exists, mock_require_perm
    ):
        """Test accept_suggestion records confidence score"""
        mock_exists.side_effect = lambda doctype, doc_id: True
        mock_get_value.side_effect = [None, "SALES"]

        mock_worklink = MagicMock()
        mock_worklink.name = "WL-001"
        mock_new_doc.return_value = mock_worklink

        result = accept_suggestion(
            task_id="TASK-001",
            doctype="Sales Order",
            doc_id="SO-001",
            confidence_score=0.95
        )

        # Should pass confidence_score to _record_suggestion_action
        mock_record.assert_called_once()
        call_kwargs = mock_record.call_args[1]
        self.assertEqual(call_kwargs["confidence_score"], 0.95)

    @patch('workhub_frappe_app.api.worklink_suggestions.require_permission')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.exists')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.get_value')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.rollback')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.log_error')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.throw')
    def test_accept_suggestion_error_handling(
        self, mock_throw, mock_log_error, mock_rollback,
        mock_get_value, mock_exists, mock_require_perm
    ):
        """Test accept_suggestion error handling with rollback"""
        mock_exists.side_effect = lambda doctype, doc_id: True
        mock_get_value.side_effect = Exception("Database error")

        accept_suggestion(
            task_id="TASK-001",
            doctype="Sales Order",
            doc_id="SO-001"
        )

        # Should rollback on error
        mock_rollback.assert_called_once()

        # Should log error
        mock_log_error.assert_called()

        # Should throw user-friendly error
        mock_throw.assert_called()


class TestDismissSuggestionAPI(unittest.TestCase):
    """Test dismiss_suggestion API endpoint"""

    @patch('workhub_frappe_app.api.worklink_suggestions.require_auth')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.exists')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.commit')
    @patch('workhub_frappe_app.api.worklink_suggestions._record_suggestion_action')
    def test_dismiss_suggestion_basic(
        self, mock_record, mock_commit, mock_exists, mock_auth
    ):
        """Test basic dismiss_suggestion call"""
        mock_exists.return_value = True

        result = dismiss_suggestion(
            task_id="TASK-001",
            doctype="Sales Order",
            doc_id="SO-001",
            reason="Not relevant"
        )

        # Should record dismissal
        mock_record.assert_called_once()
        call_kwargs = mock_record.call_args[1]
        self.assertEqual(call_kwargs["action"], "dismissed")
        self.assertEqual(call_kwargs["notes"], "Not relevant")

        # Should return success
        self.assertTrue(result["success"])

    @patch('workhub_frappe_app.api.worklink_suggestions.require_auth')
    def test_dismiss_suggestion_missing_parameters(self, mock_auth):
        """Test dismiss_suggestion with missing parameters"""
        with self.assertRaises(Exception):
            dismiss_suggestion(task_id="", doctype="Sales Order", doc_id="SO-001")

    @patch('workhub_frappe_app.api.worklink_suggestions.require_auth')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.exists')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.throw')
    def test_dismiss_suggestion_task_not_found(self, mock_throw, mock_exists, mock_auth):
        """Test dismiss_suggestion with non-existent task"""
        mock_exists.return_value = False

        dismiss_suggestion(
            task_id="TASK-INVALID",
            doctype="Sales Order",
            doc_id="SO-001"
        )

        # Should throw error
        mock_throw.assert_called()

    @patch('workhub_frappe_app.api.worklink_suggestions.require_auth')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.exists')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.commit')
    @patch('workhub_frappe_app.api.worklink_suggestions._record_suggestion_action')
    def test_dismiss_suggestion_with_confidence(
        self, mock_record, mock_commit, mock_exists, mock_auth
    ):
        """Test dismiss_suggestion with confidence score"""
        mock_exists.return_value = True

        result = dismiss_suggestion(
            task_id="TASK-001",
            doctype="Batch",
            doc_id="BATCH-001",
            confidence_score=0.75
        )

        # Should pass confidence score to record function
        mock_record.assert_called_once()
        call_kwargs = mock_record.call_args[1]
        self.assertEqual(call_kwargs["confidence_score"], 0.75)

    @patch('workhub_frappe_app.api.worklink_suggestions.require_auth')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.db.exists')
    @patch('workhub_frappe_app.api.worklink_suggestions._record_suggestion_action')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.log_error')
    def test_dismiss_suggestion_error_handling(
        self, mock_log_error, mock_record, mock_exists, mock_auth
    ):
        """Test dismiss_suggestion handles errors gracefully"""
        mock_exists.return_value = True
        mock_record.side_effect = Exception("Recording error")

        result = dismiss_suggestion(
            task_id="TASK-001",
            doctype="Sales Order",
            doc_id="SO-001"
        )

        # Should log error but not throw
        mock_log_error.assert_called()

        # Should return failure gracefully
        self.assertFalse(result["success"])


class TestHelperFunctions(unittest.TestCase):
    """Test helper functions"""

    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.get_doc')
    def test_get_document_display_info_sales_order(self, mock_get_doc):
        """Test _get_document_display_info for Sales Order"""
        mock_doc = MagicMock()
        mock_doc.customer = "CUST-001"
        mock_doc.customer_name = "Acme Corp"
        mock_doc.status = "To Deliver"
        mock_doc.grand_total = 1000.00
        mock_doc.currency = "USD"
        mock_doc.transaction_date = "2025-01-11"
        mock_get_doc.return_value = mock_doc

        info = _get_document_display_info("Sales Order", "SO-001")

        # Should extract relevant fields
        self.assertEqual(info["customer"], "CUST-001")
        self.assertEqual(info["customer_name"], "Acme Corp")
        self.assertEqual(info["status"], "To Deliver")
        self.assertEqual(info["grand_total"], 1000.00)
        self.assertEqual(info["date"], "2025-01-11")

    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.get_doc')
    def test_get_document_display_info_work_order(self, mock_get_doc):
        """Test _get_document_display_info for Work Order"""
        mock_doc = MagicMock()
        mock_doc.production_item = "ITEM-001"
        mock_doc.item_name = "Product A"
        mock_doc.status = "In Process"
        # No customer or grand_total for Work Order
        delattr(type(mock_doc), 'customer')
        delattr(type(mock_doc), 'grand_total')

        mock_get_doc.return_value = mock_doc

        info = _get_document_display_info("Work Order", "WO-001")

        # Should extract manufacturing fields
        self.assertEqual(info["production_item"], "ITEM-001")
        self.assertEqual(info["item_name"], "Product A")
        # Should not have customer fields
        self.assertNotIn("customer", info)

    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.get_doc')
    def test_get_document_display_info_error_handling(self, mock_get_doc):
        """Test _get_document_display_info handles errors"""
        mock_get_doc.side_effect = Exception("Document not found")

        info = _get_document_display_info("Sales Order", "SO-INVALID")

        # Should return empty dict on error
        self.assertEqual(info, {})

    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.get_doc')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.new_doc')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.session')
    def test_record_suggestion_action_accepted(
        self, mock_session, mock_new_doc, mock_get_doc
    ):
        """Test _record_suggestion_action for accepted suggestion"""
        mock_session.user = "test@example.com"

        mock_task = MagicMock()
        mock_task.title = "Revisar pedido SO-001 urgente"
        mock_task.description = "Cliente importante"
        mock_task.department = "SALES"
        mock_get_doc.return_value = mock_task

        mock_log = MagicMock()
        mock_new_doc.return_value = mock_log

        _record_suggestion_action(
            task_id="TASK-001",
            doctype="Sales Order",
            doc_id="SO-001",
            action="accepted",
            notes="Good match",
            confidence_score=0.95
        )

        # Should create suggestion log
        mock_new_doc.assert_called_once_with("WorkLink Suggestion Log")

        # Should set fields
        self.assertEqual(mock_log.user, "test@example.com")
        self.assertEqual(mock_log.department, "SALES")
        self.assertEqual(mock_log.task_id, "TASK-001")
        self.assertEqual(mock_log.action, "accepted")
        self.assertEqual(mock_log.confidence_score, 0.95)
        self.assertEqual(mock_log.notes, "Good match")

        # Should extract keywords
        self.assertIsNotNone(mock_log.task_keywords)

        # Should insert log
        mock_log.insert.assert_called_once()

    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.get_doc')
    @patch('workhub_frappe_app.api.worklink_suggestions.frappe.log_error')
    def test_record_suggestion_action_error_handling(
        self, mock_log_error, mock_get_doc
    ):
        """Test _record_suggestion_action handles errors gracefully"""
        mock_get_doc.side_effect = Exception("Task not found")

        # Should not raise exception
        try:
            _record_suggestion_action(
                task_id="TASK-INVALID",
                doctype="Sales Order",
                doc_id="SO-001",
                action="accepted"
            )
        except Exception:
            self.fail("_record_suggestion_action raised exception")

        # Should log error
        mock_log_error.assert_called()


# Test runner function for manual execution
def run_tests():
    """Run all tests"""
    suite = unittest.TestSuite()

    # Add all test classes
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestGetSuggestionsAPI))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestAcceptSuggestionAPI))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestDismissSuggestionAPI))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestHelperFunctions))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return result.wasSuccessful()


if __name__ == "__main__":
    # Run tests when executed directly
    success = run_tests()
    exit(0 if success else 1)
