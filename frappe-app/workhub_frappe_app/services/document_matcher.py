# Document Matcher Service for WorkLink Auto-Suggestions
# Extracts keywords from task text and matches against ERP documents

import frappe
from frappe import _
from frappe.utils import add_days, nowdate
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

# Department to DocType mapping for context filtering
DEPARTMENT_DOCTYPES = {
    "SALES": [
        "Sales Order",
        "Sales Invoice",
        "Delivery Note",
        "Payment Entry",
        "Opportunity",
        "Campaign"
    ],
    "OPS": [
        "Work Order",
        "Batch",
        "Stock Entry",
        "Quality Inspection",
        "Purchase Order",
        "Purchase Receipt",
        "Purchase Invoice"
    ],
    "MKT": [
        "Campaign",
        "Opportunity"
    ]
}

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
        dict with extracted keywords by category:
        - document_numbers: List of detected document IDs (SO-xxx, PO-xxx, etc.)
        - customer_names: List of potential customer names
        - product_codes: List of potential product/item codes
        - batch_codes: List of batch/lot codes
        - general_keywords: List of relevant keywords for fuzzy matching
    """
    if not text or not text.strip():
        return {
            "document_numbers": [],
            "customer_names": [],
            "product_codes": [],
            "batch_codes": [],
            "general_keywords": []
        }

    text = text.strip()
    document_numbers = []
    batch_codes = []
    product_codes = []

    # Extract document number patterns
    for doctype, patterns in DOC_PATTERNS.items():
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                # Normalize the match (remove spaces, uppercase)
                normalized = re.sub(r'[-\s]+', '-', match.strip().upper())

                # Separate batch codes from regular document numbers
                if doctype == "Batch":
                    batch_codes.append({
                        "value": normalized,
                        "original": match,
                        "doctype": doctype
                    })
                else:
                    document_numbers.append({
                        "value": normalized,
                        "original": match,
                        "doctype": doctype
                    })

    # Extract additional batch/lot codes (standalone codes without prefix)
    # Matches: ABC123, LOT-2024-001, L12345, etc.
    standalone_batch_patterns = [
        r'\b[A-Z]{2,4}\d{3,6}\b',  # ABC123, ABCD1234
        r'\bL\d{4,6}\b',  # L12345
        r'\b\d{6,8}\b(?!\d)',  # 6-8 digit codes (common for batch numbers)
    ]
    for pattern in standalone_batch_patterns:
        matches = re.findall(pattern, text)
        for match in matches:
            # Avoid duplicates
            if not any(bc["value"] == match for bc in batch_codes):
                batch_codes.append({
                    "value": match,
                    "original": match,
                    "doctype": "Batch"
                })

    # Extract product/item codes
    # Matches: ITEM-123, SKU-456, PRD-789, PROD123, etc.
    product_patterns = [
        r'\b(?:ITEM|SKU|PRD|PROD|PRODUCTO)[-\s]?[A-Z0-9]{2,10}\b',
        r'\b[A-Z]{3,5}-\d{2,5}\b',  # Generic product codes like ABC-123
    ]
    for pattern in product_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            normalized = re.sub(r'[-\s]+', '-', match.strip().upper())
            # Avoid duplicates with document numbers
            if not any(dn["value"] == normalized for dn in document_numbers):
                product_codes.append(normalized)

    # Extract potential customer names with multiple patterns
    customer_names = _extract_customer_names(text)

    # Extract general keywords (words longer than 3 chars, excluding common words)
    general_keywords = _extract_general_keywords(text)

    return {
        "document_numbers": document_numbers,
        "customer_names": customer_names,
        "product_codes": list(set(product_codes)),
        "batch_codes": batch_codes,
        "general_keywords": general_keywords
    }


def _extract_customer_names(text: str) -> List[str]:
    """
    Extract potential customer names from text using multiple patterns.
    Handles both Spanish and English company name formats.

    Args:
        text: Text to extract customer names from

    Returns:
        List of potential customer names
    """
    customer_names = []

    # Pattern 1: Title Case names (Juan Pérez, Acme Corporation)
    title_case_pattern = r'\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)\b'
    title_matches = re.findall(title_case_pattern, text)
    customer_names.extend([m.strip() for m in title_matches if len(m) > 3])

    # Pattern 2: ALL CAPS names (ACME CORP, DISTRIBUIDORA XYZ)
    # Look for 2-5 consecutive capitalized words
    caps_pattern = r'\b([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,}){1,4})\b'
    caps_matches = re.findall(caps_pattern, text)
    for match in caps_matches:
        # Filter out common acronyms and ensure reasonable length
        words = match.split()
        if len(match) >= 6 and not all(len(w) <= 3 for w in words):
            customer_names.append(match)

    # Pattern 3: Mixed case with common company suffixes
    # Matches: Distribuidora ABC, Comercial XYZ, ABC S.A., XYZ Ltda.
    company_pattern = r'\b(?:Distribuidora|Comercial|Importadora|Exportadora|Empresa|Grupo)\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ]\.?[A-Z]\.?)?'
    company_matches = re.findall(company_pattern, text, re.IGNORECASE)
    customer_names.extend([m.strip() for m in company_matches])

    # Pattern 4: Names with legal suffixes (S.A., Ltda., Inc., LLC, Corp.)
    legal_pattern = r'\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*\s+(?:S\.A\.|Ltda\.|Inc\.|LLC|Corp\.|S\.L\.|S\.R\.L\.))'
    legal_matches = re.findall(legal_pattern, text, re.IGNORECASE)
    customer_names.extend([m.strip() for m in legal_matches])

    # Remove duplicates and filter short matches
    unique_names = []
    seen = set()
    for name in customer_names:
        name_lower = name.lower()
        if name_lower not in seen and len(name) > 3:
            seen.add(name_lower)
            unique_names.append(name)

    return unique_names[:5]  # Limit to top 5 customer names


def _extract_general_keywords(text: str) -> List[str]:
    """
    Extract general keywords for fuzzy matching, excluding stop words.

    Args:
        text: Text to extract keywords from

    Returns:
        List of relevant keywords
    """
    # Extended stop words list (Spanish and English)
    stop_words = {
        # Spanish
        'para', 'con', 'por', 'que', 'del', 'las', 'los', 'una', 'uno', 'esta', 'este',
        'estos', 'estas', 'tarea', 'hacer', 'sobre', 'desde', 'hasta', 'entre', 'sin',
        'pero', 'como', 'cuando', 'donde', 'cual', 'cada', 'todo', 'toda', 'todos',
        # English
        'the', 'and', 'for', 'with', 'from', 'this', 'that', 'task', 'about', 'have',
        'been', 'have', 'has', 'had', 'will', 'would', 'should', 'could', 'make',
        'need', 'work', 'want', 'very', 'just', 'also', 'more', 'some', 'than'
    }

    # Extract words longer than 3 chars
    words = re.findall(r'\b\w{4,}\b', text.lower())

    # Filter stop words and common task-related words
    filtered_keywords = [w for w in words if w not in stop_words]

    # Remove duplicates while preserving order
    seen = set()
    unique_keywords = []
    for word in filtered_keywords:
        if word not in seen:
            seen.add(word)
            unique_keywords.append(word)

    return unique_keywords[:10]  # Limit to 10 unique keywords


def get_user_context(user: Optional[str] = None) -> Dict:
    """
    Get user context for filtering suggestions.

    Args:
        user: User email (defaults to current session user)

    Returns:
        dict with:
        - departments: List of user's departments
        - recent_documents: List of recently accessed document types and IDs
        - assigned_projects: List of project IDs the user is assigned to
    """
    if not user:
        user = frappe.session.user

    context = {
        "departments": [],
        "recent_documents": [],
        "assigned_projects": []
    }

    try:
        # Get user departments from roles (reuse logic from settings.py)
        user_roles = set(frappe.get_roles(user))

        # System Manager and Administrator have access to all
        if "System Manager" in user_roles or "Administrator" in user_roles:
            context["departments"] = ["SALES", "OPS", "MKT"]
        else:
            # Check department access based on roles
            department_roles = {
                "SALES": ["Sales Manager", "Sales User", "Sales Master Manager"],
                "OPS": ["Manufacturing Manager", "Manufacturing User", "Stock Manager", "Stock User"],
                "MKT": ["Marketing Manager", "Marketing User"],
            }

            departments = []
            for dept, roles in department_roles.items():
                if any(role in user_roles for role in roles):
                    departments.append(dept)

            context["departments"] = departments if departments else ["SALES", "OPS", "MKT"]

        # Get recent documents from WorkLinks created/modified by this user
        # Look at last 30 days of activity
        recent_worklinks = frappe.get_all(
            "WorkLink",
            filters={
                "modified": [">", add_days(nowdate(), -30)]
            },
            fields=["source_doctype", "source_id", "modified"],
            order_by="modified desc",
            limit=50
        )

        # Build list of recent document references
        recent_docs = []
        seen_docs = set()
        for wl in recent_worklinks:
            key = (wl.source_doctype, wl.source_id)
            if key not in seen_docs:
                seen_docs.add(key)
                recent_docs.append({
                    "doctype": wl.source_doctype,
                    "doc_id": wl.source_id,
                    "accessed_at": wl.modified
                })

        context["recent_documents"] = recent_docs[:20]  # Keep top 20

        # Get assigned projects for the user
        assigned_tasks = frappe.get_all(
            "WH Task",
            filters={
                "assigned_to": user,
                "status": ["!=", "DONE"]
            },
            fields=["project"],
            distinct=True
        )

        context["assigned_projects"] = [t.project for t in assigned_tasks if t.project]

    except Exception as e:
        frappe.log_error(f"Error getting user context for {user}: {str(e)}")

    return context


def analyze_user_patterns(user: Optional[str] = None, days: int = 90) -> Dict:
    """
    Analyze user's past acceptance/dismissal patterns from WorkLink Suggestion Log.

    Args:
        user: User email (defaults to current session user)
        days: Number of days to analyze (default: 90)

    Returns:
        dict with:
        - accepted_doctypes: Dict of doctype -> acceptance count
        - dismissed_doctypes: Dict of doctype -> dismissal count
        - accepted_keywords: Dict of keyword -> occurrence count in accepted suggestions
        - total_accepted: Total number of accepted suggestions
        - total_dismissed: Total number of dismissed suggestions
    """
    if not user:
        user = frappe.session.user

    patterns = {
        "accepted_doctypes": {},
        "dismissed_doctypes": {},
        "accepted_keywords": {},
        "total_accepted": 0,
        "total_dismissed": 0
    }

    try:
        # Get suggestion logs for this user from the last N days
        from frappe.utils import add_days, nowdate

        logs = frappe.get_all(
            "WorkLink Suggestion Log",
            filters={
                "user": user,
                "created_at": [">", add_days(nowdate(), -days)]
            },
            fields=["action", "suggested_doctype", "task_keywords"],
            order_by="created_at desc"
        )

        for log in logs:
            action = log.action
            doctype = log.suggested_doctype
            keywords = log.task_keywords or ""

            if action == "accepted":
                patterns["total_accepted"] += 1

                # Count doctype acceptances
                patterns["accepted_doctypes"][doctype] = patterns["accepted_doctypes"].get(doctype, 0) + 1

                # Extract and count keywords from accepted suggestions
                if keywords:
                    for keyword in keywords.split():
                        keyword_lower = keyword.lower()
                        if len(keyword_lower) > 3:  # Only meaningful keywords
                            patterns["accepted_keywords"][keyword_lower] = \
                                patterns["accepted_keywords"].get(keyword_lower, 0) + 1

            elif action == "dismissed":
                patterns["total_dismissed"] += 1

                # Count doctype dismissals
                patterns["dismissed_doctypes"][doctype] = patterns["dismissed_doctypes"].get(doctype, 0) + 1

    except Exception as e:
        frappe.log_error(f"Error analyzing user patterns for {user}: {str(e)}")

    return patterns


def apply_pattern_learning(
    suggestions: List[Dict],
    task_keywords: Dict[str, List[str]],
    user: Optional[str] = None
) -> List[Dict]:
    """
    Apply pattern learning to boost or deprioritize suggestions based on user history.

    Args:
        suggestions: List of document suggestions
        task_keywords: Extracted keywords from current task (from extract_keywords())
        user: User email (defaults to current session user)

    Returns:
        Suggestions with adjusted confidence scores based on learned patterns
    """
    if not suggestions:
        return []

    # Get user's historical patterns
    patterns = analyze_user_patterns(user)

    # If user has no history, return unchanged
    if patterns["total_accepted"] == 0 and patterns["total_dismissed"] == 0:
        return suggestions

    # Build keyword set from current task (for matching with historical patterns)
    current_keywords = set()
    for keyword_list in task_keywords.values():
        if isinstance(keyword_list, list):
            for item in keyword_list:
                if isinstance(item, dict) and "value" in item:
                    current_keywords.add(item["value"].lower())
                elif isinstance(item, str):
                    current_keywords.add(item.lower())

    adjusted_suggestions = []

    for suggestion in suggestions:
        doctype = suggestion["doctype"]
        confidence = suggestion["confidence"]

        # Calculate doctype pattern boost/penalty
        doctype_boost = 1.0

        # Boost if this doctype has been frequently accepted
        accepted_count = patterns["accepted_doctypes"].get(doctype, 0)
        if accepted_count > 0 and patterns["total_accepted"] > 0:
            acceptance_rate = accepted_count / patterns["total_accepted"]
            # Up to 20% boost for frequently accepted doctypes
            doctype_boost += min(acceptance_rate * 0.4, 0.20)

        # Penalize if this doctype has been frequently dismissed
        dismissed_count = patterns["dismissed_doctypes"].get(doctype, 0)
        if dismissed_count > 0 and patterns["total_dismissed"] > 0:
            dismissal_rate = dismissed_count / patterns["total_dismissed"]
            # Up to 30% penalty for frequently dismissed doctypes
            doctype_boost -= min(dismissal_rate * 0.6, 0.30)

        # Ensure boost is at least 0.5 (don't completely eliminate suggestions)
        doctype_boost = max(doctype_boost, 0.5)

        # Calculate keyword pattern boost
        keyword_boost = 1.0
        matched_keywords = 0

        # Check if current task keywords match historically successful keywords
        for keyword in current_keywords:
            if keyword in patterns["accepted_keywords"]:
                matched_keywords += 1

        if matched_keywords > 0:
            # Up to 15% boost for keyword matches
            keyword_boost = 1.0 + min(matched_keywords * 0.05, 0.15)

        # Apply combined boost
        pattern_boost = doctype_boost * keyword_boost
        adjusted_confidence = min(confidence * pattern_boost, 0.99)

        suggestion["confidence"] = adjusted_confidence
        suggestion["pattern_boosted"] = pattern_boost > 1.0
        suggestion["pattern_penalized"] = pattern_boost < 1.0

        adjusted_suggestions.append(suggestion)

    # Re-sort by adjusted confidence
    adjusted_suggestions.sort(key=lambda x: x["confidence"], reverse=True)

    return adjusted_suggestions


def apply_context_filter(
    suggestions: List[Dict],
    user_context: Optional[Dict] = None,
    department: Optional[str] = None
) -> List[Dict]:
    """
    Filter and boost suggestions based on user context.

    Args:
        suggestions: List of document suggestions
        user_context: User context dict from get_user_context()
        department: Override department (e.g., from task or project)

    Returns:
        Filtered and re-scored suggestions
    """
    if not suggestions:
        return []

    # If no context provided, get it now
    if not user_context:
        user_context = get_user_context()

    # Determine which departments to prioritize
    priority_departments = user_context.get("departments", [])
    if department and department in ["SALES", "OPS", "MKT"]:
        # Task/project department takes precedence
        priority_departments = [department]

    # Build set of recent document keys for fast lookup
    recent_doc_keys = set()
    if user_context.get("recent_documents"):
        for doc in user_context["recent_documents"]:
            recent_doc_keys.add((doc["doctype"], doc["doc_id"]))

    filtered_suggestions = []

    for suggestion in suggestions:
        doctype = suggestion["doctype"]
        doc_id = suggestion["doc_id"]
        confidence = suggestion["confidence"]

        # Apply department boost
        department_boost = 1.0
        for dept in priority_departments:
            if dept in DEPARTMENT_DOCTYPES and doctype in DEPARTMENT_DOCTYPES[dept]:
                department_boost = 1.15  # 15% boost for department match
                break

        # Apply recent document boost
        recent_boost = 1.0
        if (doctype, doc_id) in recent_doc_keys:
            recent_boost = 1.25  # 25% boost for recently accessed documents

        # Calculate adjusted confidence
        adjusted_confidence = min(confidence * department_boost * recent_boost, 0.99)

        suggestion["confidence"] = adjusted_confidence
        suggestion["boosted"] = department_boost > 1.0 or recent_boost > 1.0

        filtered_suggestions.append(suggestion)

    # Re-sort by adjusted confidence
    filtered_suggestions.sort(key=lambda x: x["confidence"], reverse=True)

    return filtered_suggestions


def match_documents(
    task_title: str,
    task_description: str = "",
    department: Optional[str] = None,
    project_id: Optional[str] = None,
    user: Optional[str] = None,
    threshold: float = 0.6,
    limit: int = 5
) -> List[Dict]:
    """
    Match task text against ERP documents using keyword extraction and fuzzy matching.
    Applies context-based filtering to prioritize relevant suggestions.

    Args:
        task_title: Task title
        task_description: Task description (optional)
        department: Task department (SALES, OPS, MKT)
        project_id: Project ID (for additional context)
        user: User email (defaults to current session user)
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

    # 2. Try to match batch/lot codes
    if keywords["batch_codes"]:
        for batch_ref in keywords["batch_codes"]:
            batch_matches = _match_by_batch_code(batch_ref["value"])
            all_suggestions.extend(batch_matches)

    # 3. Try to match product codes
    if keywords["product_codes"]:
        for product_code in keywords["product_codes"]:
            product_matches = _match_by_product_code(product_code, threshold)
            all_suggestions.extend(product_matches)

    # 4. Try to match customer names in customer-related documents
    if keywords["customer_names"]:
        for customer_name in keywords["customer_names"]:
            customer_matches = _match_by_customer_name(customer_name, threshold)
            all_suggestions.extend(customer_matches)

    # 5. Fuzzy match against document names/IDs using general keywords
    if keywords["general_keywords"] and len(all_suggestions) < limit:
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

    # Apply context-based filtering and boosting
    user_context = get_user_context(user)
    filtered_suggestions = apply_context_filter(
        unique_suggestions,
        user_context,
        department
    )

    # Apply pattern learning to further refine suggestions based on user history
    pattern_learned_suggestions = apply_pattern_learning(
        filtered_suggestions,
        keywords,
        user
    )

    return pattern_learned_suggestions[:limit]


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


def _match_by_batch_code(batch_code: str) -> List[Dict]:
    """
    Match batch/lot code against Batch DocType.

    Args:
        batch_code: Batch or lot code

    Returns:
        List of matched batch documents
    """
    try:
        # Try exact match first
        exact_match = frappe.db.get_value(
            "Batch",
            {"name": ["like", f"%{batch_code}%"]},
            ["name", "item"],
            as_dict=True
        )

        if exact_match:
            return [{
                "doctype": "Batch",
                "doc_id": exact_match.name,
                "doc_name": exact_match.name,
                "docstatus": None,
                "confidence": 0.90,
                "match_type": "batch_code",
                "item": exact_match.item
            }]

        # Try fuzzy match
        batches = frappe.get_all(
            "Batch",
            fields=["name", "item"],
            limit=100,
            order_by="modified desc"
        )

        matches = []
        for batch in batches:
            score = _similarity(batch_code.lower(), batch.name.lower())
            if score >= 0.7:
                matches.append({
                    "doctype": "Batch",
                    "doc_id": batch.name,
                    "doc_name": batch.name,
                    "docstatus": None,
                    "confidence": score * 0.85,  # High confidence for batch codes
                    "match_type": "batch_code_fuzzy",
                    "item": batch.item
                })

        return matches

    except Exception as e:
        frappe.log_error(f"Error matching batch code {batch_code}: {str(e)}")
        return []


def _match_by_product_code(product_code: str, threshold: float) -> List[Dict]:
    """
    Match product code against Item DocType and find related documents.

    Args:
        product_code: Product or item code
        threshold: Minimum similarity score

    Returns:
        List of matched documents related to the product
    """
    try:
        # First, try to match against Item
        items = frappe.get_all(
            "Item",
            fields=["name", "item_code", "item_name"],
            limit=100,
            order_by="modified desc"
        )

        matched_items = []
        for item in items:
            # Check against both item code and name
            code_score = _similarity(product_code.lower(), (item.item_code or "").lower())
            name_score = _similarity(product_code.lower(), item.name.lower())
            best_score = max(code_score, name_score)

            if best_score >= threshold:
                matched_items.append((item.name, best_score))

        if not matched_items:
            return []

        # Get the best matching item
        matched_items.sort(key=lambda x: x[1], reverse=True)
        best_item, item_score = matched_items[0]

        # Find recent documents related to this item
        suggestions = []

        # Check Work Orders for this item
        try:
            work_orders = frappe.get_all(
                "Work Order",
                filters={"production_item": best_item},
                fields=["name", "docstatus"],
                limit=3,
                order_by="modified desc"
            )

            for wo in work_orders:
                suggestions.append({
                    "doctype": "Work Order",
                    "doc_id": wo.name,
                    "doc_name": wo.name,
                    "docstatus": wo.docstatus,
                    "confidence": item_score * 0.75,
                    "match_type": "product_code",
                    "matched_item": best_item
                })
        except Exception:
            pass

        # Check Batches for this item
        try:
            batches = frappe.get_all(
                "Batch",
                filters={"item": best_item},
                fields=["name"],
                limit=3,
                order_by="modified desc"
            )

            for batch in batches:
                suggestions.append({
                    "doctype": "Batch",
                    "doc_id": batch.name,
                    "doc_name": batch.name,
                    "docstatus": None,
                    "confidence": item_score * 0.75,
                    "match_type": "product_code",
                    "matched_item": best_item
                })
        except Exception:
            pass

        return suggestions

    except Exception as e:
        frappe.log_error(f"Error matching product code {product_code}: {str(e)}")
        return []


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
