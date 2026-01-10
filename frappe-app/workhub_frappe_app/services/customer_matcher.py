# Customer Matcher Service for Smart Notepad
# Fuzzy search to find existing customers by name

import frappe
from frappe import _
from difflib import SequenceMatcher


def match_customer(name: str, threshold: float = 0.6) -> dict:
    """
    Find a customer by fuzzy name matching.

    Args:
        name: Customer name extracted from note
        threshold: Minimum similarity score (0-1) to consider a match

    Returns:
        dict with matched customer info or None if not found
    """
    if not name or not name.strip():
        return {
            "matched": False,
            "customer": None,
            "is_new": True,
            "suggestions": []
        }

    name = name.strip().lower()

    # First try exact match (case insensitive)
    exact = frappe.db.get_value(
        "Customer",
        {"customer_name": ["like", name]},
        ["name", "customer_name", "customer_group", "territory"],
        as_dict=True
    )

    if exact:
        return {
            "matched": True,
            "customer": {
                "id": exact.name,
                "name": exact.customer_name,
                "customer_group": exact.customer_group,
                "territory": exact.territory,
                "is_distributor": is_distributor(exact.customer_group)
            },
            "is_new": False,
            "suggestions": []
        }

    # Get all customers for fuzzy matching
    # Limit to recent/active customers for performance
    customers = frappe.get_all(
        "Customer",
        filters={"disabled": 0},
        fields=["name", "customer_name", "customer_group", "territory"],
        limit=500,
        order_by="modified desc"
    )

    # Calculate similarity scores
    matches = []
    for c in customers:
        score = similarity(name, c.customer_name.lower())
        if score >= threshold:
            matches.append({
                "id": c.name,
                "name": c.customer_name,
                "customer_group": c.customer_group,
                "territory": c.territory,
                "is_distributor": is_distributor(c.customer_group),
                "score": score
            })

    # Sort by score descending
    matches.sort(key=lambda x: x["score"], reverse=True)

    if matches:
        # Best match
        best = matches[0]
        return {
            "matched": True,
            "customer": {
                "id": best["id"],
                "name": best["name"],
                "customer_group": best["customer_group"],
                "territory": best["territory"],
                "is_distributor": best["is_distributor"]
            },
            "is_new": False,
            "suggestions": matches[:5]  # Top 5 suggestions
        }

    # No match found
    return {
        "matched": False,
        "customer": None,
        "is_new": True,
        "suggestions": []
    }


def similarity(a: str, b: str) -> float:
    """
    Calculate string similarity using SequenceMatcher.
    Also considers partial matches for longer strings.
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


def is_distributor(customer_group: str) -> bool:
    """
    Determine if customer is a distributor based on customer_group.
    """
    if not customer_group:
        return False

    distributor_keywords = ["distribuidor", "distributor", "mayorista", "wholesale"]
    group_lower = customer_group.lower()

    return any(kw in group_lower for kw in distributor_keywords)


def get_customer_options(search: str = "", limit: int = 20) -> list:
    """
    Get customer options for dropdown/autocomplete.

    Args:
        search: Search term
        limit: Maximum results to return

    Returns:
        List of customer options with id, name, customer_group
    """
    filters = {"disabled": 0}

    if search:
        filters["customer_name"] = ["like", f"%{search}%"]

    customers = frappe.get_all(
        "Customer",
        filters=filters,
        fields=["name", "customer_name", "customer_group", "territory"],
        limit=limit,
        order_by="customer_name asc"
    )

    return [
        {
            "id": c.name,
            "name": c.customer_name,
            "customer_group": c.customer_group,
            "territory": c.territory,
            "is_distributor": is_distributor(c.customer_group)
        }
        for c in customers
    ]


def create_customer(name: str, customer_group: str = None, territory: str = None) -> str:
    """
    Create a new customer from notepad.

    Args:
        name: Customer name
        customer_group: Optional customer group
        territory: Optional territory

    Returns:
        Customer ID (name)
    """
    doc = frappe.new_doc("Customer")
    doc.customer_name = name
    doc.customer_type = "Company"

    if customer_group:
        doc.customer_group = customer_group
    else:
        # Use default customer group
        default_group = frappe.db.get_single_value("Selling Settings", "customer_group")
        if default_group:
            doc.customer_group = default_group

    if territory:
        doc.territory = territory
    else:
        # Use default territory
        default_territory = frappe.db.get_single_value("Selling Settings", "territory")
        if default_territory:
            doc.territory = default_territory

    doc.insert(ignore_permissions=True)

    return doc.name
