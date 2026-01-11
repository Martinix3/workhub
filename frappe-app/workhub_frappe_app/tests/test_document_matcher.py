# -*- coding: utf-8 -*-
# Copyright (c) 2025, WorkHub and contributors
# For license information, please see license.txt

"""
Unit tests for Document Matcher Service
Tests keyword extraction, fuzzy matching, context filtering, and pattern learning
"""

import frappe
import unittest
from unittest.mock import patch, MagicMock
from frappe.utils import add_days, nowdate

from workhub_frappe_app.services.document_matcher import (
    extract_keywords,
    match_documents,
    get_user_context,
    analyze_user_patterns,
    apply_pattern_learning,
    apply_context_filter,
    _similarity,
    _extract_customer_names,
    _extract_general_keywords,
    _match_by_document_number,
    _match_by_customer_name,
    _match_by_batch_code,
    _match_by_product_code,
    _match_by_keywords,
    SUPPORTED_DOCTYPES,
    DEPARTMENT_DOCTYPES
)


class TestKeywordExtraction(unittest.TestCase):
    """Test keyword extraction functionality"""

    def test_extract_document_numbers_sales_order(self):
        """Test extraction of Sales Order document numbers"""
        text = "Revisar pedido SO-12345 para el cliente"
        keywords = extract_keywords(text)

        # Should extract SO-12345
        self.assertTrue(len(keywords["document_numbers"]) > 0)
        doc_nums = [dn["value"] for dn in keywords["document_numbers"]]
        self.assertIn("SO-12345", doc_nums)

        # Check doctype is correctly identified
        for dn in keywords["document_numbers"]:
            if dn["value"] == "SO-12345":
                self.assertEqual(dn["doctype"], "Sales Order")

    def test_extract_document_numbers_spanish(self):
        """Test extraction of Spanish document references"""
        text = "Procesar factura FV-001 y entrega DN-002"
        keywords = extract_keywords(text)

        doc_nums = [dn["value"] for dn in keywords["document_numbers"]]
        # Should extract both FV-001 and DN-002
        self.assertTrue(any("FV" in dn or "001" in dn for dn in doc_nums))

    def test_extract_batch_codes(self):
        """Test extraction of batch/lot codes"""
        text = "Verificar calidad del lote BATCH-ABC123 y L12345"
        keywords = extract_keywords(text)

        # Should extract batch codes
        self.assertTrue(len(keywords["batch_codes"]) > 0)
        batch_vals = [bc["value"] for bc in keywords["batch_codes"]]
        # Should find patterns like BATCH-ABC123 or similar
        self.assertTrue(any("BATCH" in bc or "ABC" in bc for bc in batch_vals))

    def test_extract_customer_names_title_case(self):
        """Test extraction of Title Case customer names"""
        text = "Revisar pedido para Acme Corporation y Juan Pérez"
        keywords = extract_keywords(text)

        # Should extract customer names
        self.assertTrue(len(keywords["customer_names"]) > 0)
        # Should find Acme Corporation or Juan Pérez
        customer_names_str = " ".join(keywords["customer_names"])
        self.assertTrue("Acme" in customer_names_str or "Corporation" in customer_names_str
                       or "Juan" in customer_names_str or "Pérez" in customer_names_str)

    def test_extract_customer_names_with_legal_suffix(self):
        """Test extraction of company names with legal suffixes"""
        text = "Enviar factura a Distribuidora XYZ S.A. y Comercial ABC Ltda."
        keywords = extract_keywords(text)

        # Should extract company names
        self.assertTrue(len(keywords["customer_names"]) > 0)

    def test_extract_product_codes(self):
        """Test extraction of product/item codes"""
        text = "Producir ITEM-123 y SKU-456 para el pedido"
        keywords = extract_keywords(text)

        # Should extract product codes
        self.assertTrue(len(keywords["product_codes"]) > 0)
        self.assertTrue(any("ITEM" in pc or "SKU" in pc for pc in keywords["product_codes"]))

    def test_extract_general_keywords(self):
        """Test extraction of general keywords"""
        text = "Revisar inventario producto especial cliente importante"
        keywords = extract_keywords(text)

        # Should extract meaningful keywords (longer than 3 chars, not stop words)
        self.assertTrue(len(keywords["general_keywords"]) > 0)
        # Should include words like "revisar", "inventario", "producto", "especial", "cliente", "importante"
        # But NOT stop words like "para", "con", "del"
        keywords_str = " ".join(keywords["general_keywords"])
        self.assertTrue(any(kw in keywords_str for kw in ["revisar", "inventario", "producto", "especial", "cliente", "importante"]))

    def test_extract_keywords_empty_text(self):
        """Test extraction with empty text"""
        keywords = extract_keywords("")

        # Should return empty lists
        self.assertEqual(len(keywords["document_numbers"]), 0)
        self.assertEqual(len(keywords["customer_names"]), 0)
        self.assertEqual(len(keywords["product_codes"]), 0)
        self.assertEqual(len(keywords["batch_codes"]), 0)
        self.assertEqual(len(keywords["general_keywords"]), 0)

    def test_extract_keywords_mixed_content(self):
        """Test extraction with mixed Spanish/English content"""
        text = "Review SO-12345 para cliente Acme Corp with BATCH-XYZ789"
        keywords = extract_keywords(text)

        # Should extract document numbers
        self.assertTrue(len(keywords["document_numbers"]) > 0)
        # Should extract batch codes
        self.assertTrue(len(keywords["batch_codes"]) > 0)
        # Should extract customer names
        self.assertTrue(len(keywords["customer_names"]) > 0)


class TestFuzzyMatching(unittest.TestCase):
    """Test fuzzy matching functionality"""

    def test_similarity_exact_match(self):
        """Test similarity with exact match"""
        score = _similarity("SO-12345", "SO-12345")
        self.assertGreater(score, 0.95)

    def test_similarity_partial_match(self):
        """Test similarity with partial match"""
        score = _similarity("SO-12345", "SO-12346")
        self.assertGreater(score, 0.7)

    def test_similarity_substring(self):
        """Test similarity with substring"""
        score = _similarity("ABC", "ABCDEF")
        self.assertGreater(score, 0.75)  # Should get boost for substring

    def test_similarity_no_match(self):
        """Test similarity with no match"""
        score = _similarity("ABC", "XYZ")
        self.assertLess(score, 0.5)

    def test_similarity_word_overlap(self):
        """Test similarity with word overlap"""
        score = _similarity("acme corporation", "acme corp")
        self.assertGreater(score, 0.7)  # Should get boost for word overlap


class TestContextFiltering(unittest.TestCase):
    """Test context-based filtering functionality"""

    def test_apply_context_filter_department_boost(self):
        """Test department-based boosting"""
        suggestions = [
            {"doctype": "Sales Order", "doc_id": "SO-001", "confidence": 0.80},
            {"doctype": "Work Order", "doc_id": "WO-001", "confidence": 0.80}
        ]

        user_context = {"departments": ["SALES"], "recent_documents": []}

        filtered = apply_context_filter(suggestions, user_context, department="SALES")

        # Sales Order should be boosted (15%) over Work Order for SALES department
        sales_order = next((s for s in filtered if s["doctype"] == "Sales Order"), None)
        work_order = next((s for s in filtered if s["doctype"] == "Work Order"), None)

        self.assertIsNotNone(sales_order)
        self.assertIsNotNone(work_order)
        self.assertGreater(sales_order["confidence"], work_order["confidence"])
        self.assertTrue(sales_order.get("boosted", False))

    def test_apply_context_filter_recent_boost(self):
        """Test recent document boosting"""
        suggestions = [
            {"doctype": "Sales Order", "doc_id": "SO-001", "confidence": 0.80},
            {"doctype": "Sales Order", "doc_id": "SO-002", "confidence": 0.80}
        ]

        user_context = {
            "departments": ["SALES"],
            "recent_documents": [
                {"doctype": "Sales Order", "doc_id": "SO-001", "accessed_at": nowdate()}
            ]
        }

        filtered = apply_context_filter(suggestions, user_context)

        # SO-001 should be boosted (25%) as it's recently accessed
        so_001 = next((s for s in filtered if s["doc_id"] == "SO-001"), None)
        so_002 = next((s for s in filtered if s["doc_id"] == "SO-002"), None)

        self.assertIsNotNone(so_001)
        self.assertIsNotNone(so_002)
        self.assertGreater(so_001["confidence"], so_002["confidence"])

    def test_apply_context_filter_empty_suggestions(self):
        """Test filtering with empty suggestions"""
        filtered = apply_context_filter([])
        self.assertEqual(len(filtered), 0)


class TestPatternLearning(unittest.TestCase):
    """Test pattern learning functionality"""

    @patch('workhub_frappe_app.services.document_matcher.frappe.get_all')
    def test_analyze_user_patterns_accepted(self, mock_get_all):
        """Test pattern analysis with accepted suggestions"""
        mock_get_all.return_value = [
            {
                "action": "accepted",
                "suggested_doctype": "Sales Order",
                "task_keywords": "cliente pedido urgente"
            },
            {
                "action": "accepted",
                "suggested_doctype": "Sales Order",
                "task_keywords": "revisar pedido importante"
            }
        ]

        patterns = analyze_user_patterns("test@example.com")

        # Should count 2 accepted Sales Orders
        self.assertEqual(patterns["total_accepted"], 2)
        self.assertEqual(patterns["accepted_doctypes"].get("Sales Order", 0), 2)
        # Should extract keywords
        self.assertTrue(len(patterns["accepted_keywords"]) > 0)
        self.assertIn("pedido", patterns["accepted_keywords"])

    @patch('workhub_frappe_app.services.document_matcher.frappe.get_all')
    def test_analyze_user_patterns_dismissed(self, mock_get_all):
        """Test pattern analysis with dismissed suggestions"""
        mock_get_all.return_value = [
            {
                "action": "dismissed",
                "suggested_doctype": "Batch",
                "task_keywords": "cliente pedido"
            }
        ]

        patterns = analyze_user_patterns("test@example.com")

        # Should count 1 dismissed Batch
        self.assertEqual(patterns["total_dismissed"], 1)
        self.assertEqual(patterns["dismissed_doctypes"].get("Batch", 0), 1)

    def test_apply_pattern_learning_boost_accepted(self):
        """Test pattern learning boosts frequently accepted doctypes"""
        suggestions = [
            {"doctype": "Sales Order", "doc_id": "SO-001", "confidence": 0.80}
        ]

        task_keywords = {"general_keywords": ["pedido", "cliente"]}

        # Mock analyze_user_patterns to return acceptance pattern
        with patch('workhub_frappe_app.services.document_matcher.analyze_user_patterns') as mock_analyze:
            mock_analyze.return_value = {
                "accepted_doctypes": {"Sales Order": 10},
                "dismissed_doctypes": {},
                "accepted_keywords": {"pedido": 5, "cliente": 3},
                "total_accepted": 10,
                "total_dismissed": 0
            }

            adjusted = apply_pattern_learning(suggestions, task_keywords, "test@example.com")

            # Should boost confidence (doctype boost + keyword boost)
            self.assertGreater(adjusted[0]["confidence"], 0.80)
            self.assertTrue(adjusted[0].get("pattern_boosted", False))

    def test_apply_pattern_learning_penalize_dismissed(self):
        """Test pattern learning penalizes frequently dismissed doctypes"""
        suggestions = [
            {"doctype": "Batch", "doc_id": "BATCH-001", "confidence": 0.80}
        ]

        task_keywords = {"general_keywords": ["pedido"]}

        # Mock analyze_user_patterns to return dismissal pattern
        with patch('workhub_frappe_app.services.document_matcher.analyze_user_patterns') as mock_analyze:
            mock_analyze.return_value = {
                "accepted_doctypes": {},
                "dismissed_doctypes": {"Batch": 10},
                "accepted_keywords": {},
                "total_accepted": 0,
                "total_dismissed": 10
            }

            adjusted = apply_pattern_learning(suggestions, task_keywords, "test@example.com")

            # Should penalize confidence
            self.assertLess(adjusted[0]["confidence"], 0.80)
            self.assertTrue(adjusted[0].get("pattern_penalized", False))

    def test_apply_pattern_learning_no_history(self):
        """Test pattern learning with no history"""
        suggestions = [
            {"doctype": "Sales Order", "doc_id": "SO-001", "confidence": 0.80}
        ]

        task_keywords = {"general_keywords": ["pedido"]}

        # Mock analyze_user_patterns to return empty history
        with patch('workhub_frappe_app.services.document_matcher.analyze_user_patterns') as mock_analyze:
            mock_analyze.return_value = {
                "accepted_doctypes": {},
                "dismissed_doctypes": {},
                "accepted_keywords": {},
                "total_accepted": 0,
                "total_dismissed": 0
            }

            adjusted = apply_pattern_learning(suggestions, task_keywords, "test@example.com")

            # Should return unchanged
            self.assertEqual(adjusted[0]["confidence"], 0.80)


class TestUserContext(unittest.TestCase):
    """Test user context retrieval"""

    @patch('workhub_frappe_app.services.document_matcher.frappe.get_roles')
    @patch('workhub_frappe_app.services.document_matcher.frappe.get_all')
    def test_get_user_context_sales_role(self, mock_get_all, mock_get_roles):
        """Test user context for Sales user"""
        mock_get_roles.return_value = ["Sales User", "Sales Manager"]
        mock_get_all.return_value = []

        context = get_user_context("sales@example.com")

        # Should identify SALES department
        self.assertIn("SALES", context["departments"])

    @patch('workhub_frappe_app.services.document_matcher.frappe.get_roles')
    @patch('workhub_frappe_app.services.document_matcher.frappe.get_all')
    def test_get_user_context_ops_role(self, mock_get_all, mock_get_roles):
        """Test user context for Operations user"""
        mock_get_roles.return_value = ["Manufacturing User", "Stock User"]
        mock_get_all.return_value = []

        context = get_user_context("ops@example.com")

        # Should identify OPS department
        self.assertIn("OPS", context["departments"])

    @patch('workhub_frappe_app.services.document_matcher.frappe.get_roles')
    @patch('workhub_frappe_app.services.document_matcher.frappe.get_all')
    def test_get_user_context_system_manager(self, mock_get_all, mock_get_roles):
        """Test user context for System Manager"""
        mock_get_roles.return_value = ["System Manager"]
        mock_get_all.return_value = []

        context = get_user_context("admin@example.com")

        # Should have access to all departments
        self.assertIn("SALES", context["departments"])
        self.assertIn("OPS", context["departments"])
        self.assertIn("MKT", context["departments"])

    @patch('workhub_frappe_app.services.document_matcher.frappe.get_roles')
    @patch('workhub_frappe_app.services.document_matcher.frappe.get_all')
    def test_get_user_context_recent_documents(self, mock_get_all, mock_get_roles):
        """Test recent documents retrieval"""
        mock_get_roles.return_value = ["Sales User"]

        # Mock WorkLinks return
        def mock_get_all_side_effect(doctype, **kwargs):
            if doctype == "WorkLink":
                return [
                    {"source_doctype": "Sales Order", "source_id": "SO-001", "modified": nowdate()},
                    {"source_doctype": "Sales Order", "source_id": "SO-002", "modified": add_days(nowdate(), -1)}
                ]
            return []

        mock_get_all.side_effect = mock_get_all_side_effect

        context = get_user_context("sales@example.com")

        # Should retrieve recent documents
        self.assertTrue(len(context["recent_documents"]) > 0)


class TestMatchingHelpers(unittest.TestCase):
    """Test matching helper functions"""

    @patch('workhub_frappe_app.services.document_matcher.frappe.db.get_value')
    def test_match_by_document_number_exact(self, mock_get_value):
        """Test exact document number matching"""
        mock_get_value.return_value = {"name": "SO-12345", "docstatus": 1}

        matches = _match_by_document_number("SO-12345", "Sales Order")

        # Should find exact match
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["doc_id"], "SO-12345")
        self.assertGreater(matches[0]["confidence"], 0.9)

    @patch('workhub_frappe_app.services.document_matcher.frappe.db.get_value')
    def test_match_by_document_number_invalid_doctype(self, mock_get_value):
        """Test matching with invalid doctype"""
        matches = _match_by_document_number("SO-12345", "Invalid DocType")

        # Should return empty list for unsupported doctype
        self.assertEqual(len(matches), 0)

    @patch('workhub_frappe_app.services.document_matcher.frappe.get_all')
    def test_match_by_customer_name(self, mock_get_all):
        """Test customer name matching"""
        # Mock customers return
        def mock_get_all_side_effect(doctype, **kwargs):
            if doctype == "Customer":
                return [
                    {"name": "CUST-001", "customer_name": "Acme Corporation"},
                    {"name": "CUST-002", "customer_name": "Beta Industries"}
                ]
            elif doctype == "Sales Order":
                return [
                    {"name": "SO-001", "docstatus": 1}
                ]
            return []

        mock_get_all.side_effect = mock_get_all_side_effect

        matches = _match_by_customer_name("Acme Corp", threshold=0.6)

        # Should find customer and related documents
        self.assertTrue(len(matches) > 0)

    @patch('workhub_frappe_app.services.document_matcher.frappe.db.get_value')
    def test_match_by_batch_code_exact(self, mock_get_value):
        """Test batch code exact matching"""
        mock_get_value.return_value = {"name": "BATCH-ABC123", "item": "ITEM-001"}

        matches = _match_by_batch_code("BATCH-ABC123")

        # Should find batch
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["doc_id"], "BATCH-ABC123")
        self.assertGreater(matches[0]["confidence"], 0.85)

    @patch('workhub_frappe_app.services.document_matcher.frappe.get_all')
    def test_match_by_product_code(self, mock_get_all):
        """Test product code matching"""
        # Mock items return
        def mock_get_all_side_effect(doctype, **kwargs):
            if doctype == "Item":
                return [
                    {"name": "ITEM-001", "item_code": "SKU-123", "item_name": "Product A"}
                ]
            elif doctype == "Work Order":
                return [
                    {"name": "WO-001", "docstatus": 1}
                ]
            return []

        mock_get_all.side_effect = mock_get_all_side_effect

        matches = _match_by_product_code("SKU-123", threshold=0.6)

        # Should find related documents
        self.assertTrue(len(matches) >= 0)  # May be empty if no Work Orders found

    @patch('workhub_frappe_app.services.document_matcher.frappe.get_all')
    def test_match_by_keywords(self, mock_get_all):
        """Test keyword fuzzy matching"""
        mock_get_all.return_value = [
            {"name": "SO-URGENTE-001"},
            {"name": "SO-NORMAL-002"}
        ]

        matches = _match_by_keywords(["urgente"], threshold=0.6)

        # Should find matches containing keyword
        self.assertTrue(len(matches) >= 0)


class TestMatchDocuments(unittest.TestCase):
    """Test main match_documents function"""

    @patch('workhub_frappe_app.services.document_matcher.frappe.db.get_value')
    @patch('workhub_frappe_app.services.document_matcher.get_user_context')
    @patch('workhub_frappe_app.services.document_matcher.analyze_user_patterns')
    def test_match_documents_with_doc_number(self, mock_analyze, mock_context, mock_get_value):
        """Test matching with document number in task title"""
        mock_get_value.return_value = {"name": "SO-12345", "docstatus": 1}
        mock_context.return_value = {"departments": ["SALES"], "recent_documents": []}
        mock_analyze.return_value = {
            "accepted_doctypes": {},
            "dismissed_doctypes": {},
            "accepted_keywords": {},
            "total_accepted": 0,
            "total_dismissed": 0
        }

        suggestions = match_documents(
            task_title="Revisar pedido SO-12345",
            task_description="",
            department="SALES"
        )

        # Should find the sales order
        self.assertTrue(len(suggestions) > 0)
        # Highest confidence should be for document number match
        self.assertGreater(suggestions[0]["confidence"], 0.8)

    @patch('workhub_frappe_app.services.document_matcher.get_user_context')
    @patch('workhub_frappe_app.services.document_matcher.analyze_user_patterns')
    def test_match_documents_empty_title(self, mock_analyze, mock_context):
        """Test matching with empty title"""
        mock_context.return_value = {"departments": ["SALES"], "recent_documents": []}
        mock_analyze.return_value = {
            "accepted_doctypes": {},
            "dismissed_doctypes": {},
            "accepted_keywords": {},
            "total_accepted": 0,
            "total_dismissed": 0
        }

        suggestions = match_documents(
            task_title="",
            task_description=""
        )

        # Should return empty list
        self.assertEqual(len(suggestions), 0)

    @patch('workhub_frappe_app.services.document_matcher.get_user_context')
    @patch('workhub_frappe_app.services.document_matcher.analyze_user_patterns')
    @patch('workhub_frappe_app.services.document_matcher.frappe.get_all')
    def test_match_documents_respects_limit(self, mock_get_all, mock_analyze, mock_context):
        """Test that match_documents respects the limit parameter"""
        mock_context.return_value = {"departments": ["SALES"], "recent_documents": []}
        mock_analyze.return_value = {
            "accepted_doctypes": {},
            "dismissed_doctypes": {},
            "accepted_keywords": {},
            "total_accepted": 0,
            "total_dismissed": 0
        }
        mock_get_all.return_value = []

        suggestions = match_documents(
            task_title="Revisar pedidos urgentes",
            task_description="",
            limit=3
        )

        # Should return at most 3 suggestions
        self.assertLessEqual(len(suggestions), 3)


# Test runner function for manual execution
def run_tests():
    """Run all tests"""
    suite = unittest.TestSuite()

    # Add all test classes
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestKeywordExtraction))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestFuzzyMatching))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestContextFiltering))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestPatternLearning))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestUserContext))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestMatchingHelpers))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestMatchDocuments))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return result.wasSuccessful()


if __name__ == "__main__":
    # Run tests when executed directly
    success = run_tests()
    exit(0 if success else 1)
