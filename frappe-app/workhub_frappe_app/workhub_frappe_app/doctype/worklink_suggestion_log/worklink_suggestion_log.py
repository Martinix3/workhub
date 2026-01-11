# Copyright (c) 2026, WorkHub and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class WorkLinkSuggestionLog(Document):
    """
    DocType for logging WorkLink suggestion acceptance/rejection patterns.
    Used for pattern learning to improve future suggestions.
    """

    def before_insert(self):
        """Set created_at timestamp if not already set"""
        if not self.created_at:
            self.created_at = frappe.utils.now()
