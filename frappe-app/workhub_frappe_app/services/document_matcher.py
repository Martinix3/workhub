# Document Matcher Service for WorkLink Auto-Suggestions
# Extracts keywords from task text and matches against ERP documents

import frappe
from frappe import _
from difflib import SequenceMatcher
import re
from typing import List, Dict, Optional, Tuple


# Supported DocTypes from WorkLink
SUPPORTED_DOCTYPES = [
    "Sales Order",
    "Delivery Note",
    "Sales Invoice",
    "Payment Entry",
    "Purchase Order",
    "Purchase Receipt",
    "Purchase Invoice",
    "Work Order",
    "Stock Entry",
    "Batch",
    "Quality Inspection",
    "Opportunity",
    "Campaign",
    "OpsCase",
    "CalendarEvent",
    "Account"
]

# Document number patterns
# Matches formats like: SO-12345, DN-001, WO-2024-001, BATCH-ABC, etc.
DOC_PATTERNS = {
    "Sales Order": [r'\bSO[-\s]?\d+\b', r'\bpedido[-\s]?\d+\b'],
    "Delivery Note": [r'\bDN[-\s]?\d+\b', r'\bentrega[-\s]?\d+\b'],
    "Sales Invoice": [r'\bSINV[-\s]?\d+\b', r'\bfactura[-\s]?\d+\b', r'\bFV[-\s]?\d+\b'],
    "Payment Entry": [r'\bPE[-\s]?\d+\b', r'\bpago[-\s]?\d+\b'],
    "Purchase Order": [r'\bPO[-\s]?\d+\b', r'\bcompra[-\s]?\d+\b'],
    "Purchase Receipt": [r'\bPR[-\s]?\d+\b', r'\brecepcion[-\s]?\d+\b'],
    "Purchase Invoice": [r'\bPINV[-\s]?\d+\b', r'\bFC[-\s]?\d+\b'],
    "Work Order": [r'\bWO[-\s]?\d+\b', r'\borden[-\s]?\d+\b', r'\bproduccion[-\s]?\d+\b'],
    "Stock Entry": [r'\bSE[-\s]?\d+\b', r'\bstock[-\s]?\d+\b'],
    "Batch": [r'\bBATCH[-\s]?[A-Z0-9]+\b', r'\bLOTE[-\s]?[A-Z0-9]+\b', r'\blote[-\s]?[a-z0-9]+\b'],
    "Quality Inspection": [r'\bQI[-\s]?\d+\b', r'\binspeccion[-\s]?\d+\b'],
    "Opportunity": [r'\bOPP[-\s]?\d+\b', r'\boportunidad[-\s]?\d+\b'],
}


def extract_keywords(text: str) -> Dict[str, List[str]]:
    """
    Extract keywords and document references from task title/description.

    Args:
        text: Combined task title and description

    Returns:
        dict with extracted keywords by category
    """
    if not text or not text.strip():
        return {
            "document_numbers": [],
            "customer_names": [],
            "general_keywords": []
        }

    text = text.strip()
    document_numbers = []

    # Extract document number patterns
    for doctype, patterns in DOC_PATTERNS.items():
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                # Normalize the match (remove spaces, uppercase)
                normalized = re.sub(r'[-\s]+', '-', match.strip().upper())
                document_numbers.append({
                    "value": normalized,
                    "original": match,
                    "doctype": doctype
                })

    # Extract potential customer names (capitalized words, 2+ words together)
    customer_pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b'
    customer_matches = re.findall(customer_pattern, text)
    customer_names = [m.strip() for m in customer_matches if len(m) > 3]

    # Extract general keywords (words longer than 3 chars, excluding common words)
    stop_words = {
        'para', 'con', 'por', 'the', 'and', 'for', 'with', 'from', 'que', 'del', 'las', 'los',
        'una', 'uno', 'this', 'that', 'estos', 'estas', 'task', 'tarea'
    }
    words = re.findall(r'\b\w{4,}\b', text.lower())
    general_keywords = [w for w in words if w not in stop_words]

    return {
        "document_numbers": document_numbers,
        "customer_names": customer_names,
        "general_keywords": list(set(general_keywords))[:10]  # Limit to 10 unique keywords
    }


def match_documents(
    task_title: str,
    task_description: str = "",
    threshold: float = 0.6,
    limit: int = 5
) -> List[Dict]:
    """
    Match task text against ERP documents using keyword extraction and fuzzy matching.

    Args:
        task_title: Task title
        task_description: Task description (optional)
        threshold: Minimum similarity score (0-1) to consider a match
        limit: Maximum number of suggestions to return

    Returns:
        List of document suggestions with confidence scores, sorted by score descending
    """
    combined_text = f"{task_title} {task_description or ''}".strip()
    keywords = extract_keywords(combined_text)

    all_suggestions = []

    # 1. Try to match document numbers (highest confidence)
    for doc_ref in keywords["document_numbers"]:
        matches = _match_by_document_number(doc_ref["value"], doc_ref["doctype"])
        for match in matches:
            match["confidence"] = 0.95  # High confidence for document number matches
            match["match_type"] = "document_number"
            all_suggestions.append(match)

    # 2. Try to match customer names in customer-related documents
    if keywords["customer_names"]:
        for customer_name in keywords["customer_names"]:
            customer_matches = _match_by_customer_name(customer_name, threshold)
            all_suggestions.extend(customer_matches)

    # 3. Fuzzy match against document names/IDs using general keywords
    if keywords["general_keywords"] and not all_suggestions:
        keyword_matches = _match_by_keywords(keywords["general_keywords"], threshold)
        all_suggestions.extend(keyword_matches)

    # Remove duplicates (same doctype + doc_id combination)
    seen = set()
    unique_suggestions = []
    for suggestion in all_suggestions:
        key = (suggestion["doctype"], suggestion["doc_id"])
        if key not in seen:
            seen.add(key)
            unique_suggestions.append(suggestion)

    # Sort by confidence descending
    unique_suggestions.sort(key=lambda x: x["confidence"], reverse=True)

    return unique_suggestions[:limit]


def _match_by_document_number(doc_number: str, doctype: str) -> List[Dict]:
    """
    Match by exact or fuzzy document number.

    Args:
        doc_number: Normalized document number (e.g., SO-12345)
        doctype: Document type to search in

    Returns:
        List of matched documents
    """
    if doctype not in SUPPORTED_DOCTYPES:
        return []

    try:
        # Try exact match first
        exact_match = frappe.db.get_value(
            doctype,
            {"name": ["like", f"%{doc_number}%"]},
            ["name", "docstatus"],
            as_dict=True
        )

        if exact_match:
            return [{
                "doctype": doctype,
                "doc_id": exact_match.name,
                "doc_name": exact_match.name,
                "docstatus": exact_match.docstatus,
                "confidence": 0.95,
                "match_type": "document_number"
            }]

        # Try fuzzy match on name field
        all_docs = frappe.get_all(
            doctype,
            fields=["name"],
            limit=100,
            order_by="modified desc"
        )

        matches = []
        for doc in all_docs:
            score = _similarity(doc_number.lower(), doc.name.lower())
            if score >= 0.7:
                matches.append({
                    "doctype": doctype,
                    "doc_id": doc.name,
                    "doc_name": doc.name,
                    "docstatus": None,
                    "confidence": score * 0.9,  # Slightly lower for fuzzy
                    "match_type": "document_number_fuzzy"
                })

        return matches

    except Exception as e:
        frappe.log_error(f"Error matching document number {doc_number} in {doctype}: {str(e)}")
        return []


def _match_by_customer_name(customer_name: str, threshold: float) -> List[Dict]:
    """
    Match customer name and find related Sales Orders, Invoices, etc.

    Args:
        customer_name: Customer name from task text
        threshold: Minimum similarity score

    Returns:
        List of matched documents
    """
    try:
        # First find matching customers
        customers = frappe.get_all(
            "Customer",
            filters={"disabled": 0},
            fields=["name", "customer_name"],
            limit=100,
            order_by="modified desc"
        )

        matched_customers = []
        for customer in customers:
            score = _similarity(customer_name.lower(), customer.customer_name.lower())
            if score >= threshold:
                matched_customers.append((customer.name, score))

        if not matched_customers:
            return []

        # Get the best matching customer
        matched_customers.sort(key=lambda x: x[1], reverse=True)
        best_customer, customer_score = matched_customers[0]

        # Find recent documents for this customer
        suggestions = []
        customer_doctypes = ["Sales Order", "Sales Invoice", "Delivery Note"]

        for doctype in customer_doctypes:
            try:
                docs = frappe.get_all(
                    doctype,
                    filters={"customer": best_customer},
                    fields=["name", "docstatus"],
                    limit=3,
                    order_by="modified desc"
                )

                for doc in docs:
                    suggestions.append({
                        "doctype": doctype,
                        "doc_id": doc.name,
                        "doc_name": doc.name,
                        "docstatus": doc.docstatus,
                        "confidence": customer_score * 0.8,  # Slightly lower for customer-based match
                        "match_type": "customer_name",
                        "matched_customer": best_customer
                    })
            except Exception:
                # DocType might not exist or have customer field
                continue

        return suggestions

    except Exception as e:
        frappe.log_error(f"Error matching customer name {customer_name}: {str(e)}")
        return []


def _match_by_keywords(keywords: List[str], threshold: float) -> List[Dict]:
    """
    Fuzzy match keywords against document names/IDs.

    Args:
        keywords: List of general keywords from task
        threshold: Minimum similarity score

    Returns:
        List of matched documents
    """
    suggestions = []

    # Focus on most common document types for keyword matching
    common_doctypes = ["Sales Order", "Work Order", "Batch", "Delivery Note"]

    for doctype in common_doctypes:
        if doctype not in SUPPORTED_DOCTYPES:
            continue

        try:
            docs = frappe.get_all(
                doctype,
                fields=["name"],
                limit=50,
                order_by="modified desc"
            )

            for doc in docs:
                # Calculate best keyword match score
                best_score = 0
                for keyword in keywords:
                    score = _similarity(keyword, doc.name.lower())
                    best_score = max(best_score, score)

                if best_score >= threshold:
                    suggestions.append({
                        "doctype": doctype,
                        "doc_id": doc.name,
                        "doc_name": doc.name,
                        "docstatus": None,
                        "confidence": best_score * 0.7,  # Lower confidence for keyword match
                        "match_type": "keyword"
                    })
        except Exception:
            # DocType might not exist
            continue

    return suggestions


def _similarity(a: str, b: str) -> float:
    """
    Calculate string similarity using SequenceMatcher.
    Also considers partial matches for longer strings.

    Args:
        a: First string
        b: Second string

    Returns:
        Similarity score (0-1)
    """
    # Direct ratio
    ratio = SequenceMatcher(None, a, b).ratio()

    # Also check if one string contains the other
    if a in b or b in a:
        ratio = max(ratio, 0.8)

    # Check word overlap
    words_a = set(a.split())
    words_b = set(b.split())
    if words_a and words_b:
        overlap = len(words_a & words_b) / max(len(words_a), len(words_b))
        ratio = max(ratio, overlap * 0.9)

    return ratio


def get_document_info(doctype: str, doc_id: str) -> Optional[Dict]:
    """
    Get detailed information about a document for display.

    Args:
        doctype: Document type
        doc_id: Document ID

    Returns:
        Dict with document details or None if not found
    """
    if doctype not in SUPPORTED_DOCTYPES:
        return None

    try:
        # Get basic fields that most doctypes have
        doc = frappe.get_doc(doctype, doc_id)

        result = {
            "doctype": doctype,
            "doc_id": doc.name,
            "doc_name": doc.name,
            "docstatus": doc.docstatus,
            "creation": doc.creation,
            "modified": doc.modified
        }

        # Add doctype-specific fields
        if hasattr(doc, 'customer'):
            result["customer"] = doc.customer
            result["customer_name"] = doc.customer_name

        if hasattr(doc, 'status'):
            result["status"] = doc.status

        if hasattr(doc, 'grand_total'):
            result["grand_total"] = doc.grand_total
            result["currency"] = doc.currency

        if hasattr(doc, 'item_name'):
            result["item_name"] = doc.item_name

        return result

    except Exception as e:
        frappe.log_error(f"Error getting document info for {doctype} {doc_id}: {str(e)}")
        return None
