# Copyright (c) 2026, Santa Brisa and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime
import json


class WorkLink(Document):
    def validate(self):
        """Validate and sync assignees on save"""
        self.sync_assignees()

    def sync_assignees(self):
        """
        Sync assignees from linked WH Task to this WorkLink and prepare for Leantime sync.
        Updates sync_state if sync fails.
        """
        try:
            # Get assignees from linked WH Task
            if not self.wh_task:
                # No linked task, clear assignees
                self.assignees = None
                return

            # Fetch assignees from WH Task Assignee child table
            task_assignees = frappe.get_all(
                "WH Task Assignee",
                filters={"parent": self.wh_task},
                fields=["user", "role"],
                order_by="role desc, idx"  # Owner first, then by order
            )

            if not task_assignees:
                self.assignees = None
                return

            # Store assignees as JSON array
            assignees_data = [
                {
                    "user": a.user,
                    "role": a.role
                }
                for a in task_assignees
            ]
            self.assignees = json.dumps(assignees_data)

            # Sync to Leantime (if leantime_task_id exists)
            if self.leantime_task_id:
                self._sync_to_leantime(assignees_data)

        except Exception as e:
            # Update sync_state to ERROR and record the error
            self.sync_state = "ERROR"
            self.sync_error = f"Error syncing assignees: {str(e)}"
            frappe.log_error(
                message=f"WorkLink {self.name}: {str(e)}",
                title="WorkLink Assignee Sync Error"
            )

    def _sync_to_leantime(self, assignees_data):
        """
        Sync assignees to Leantime task.
        This is a placeholder for actual Leantime API integration.

        Args:
            assignees_data: List of dicts with 'user' and 'role' keys
        """
        # TODO: Implement actual Leantime API call when Leantime client is available
        # For now, just mark as synced and update timestamp

        # Placeholder logic:
        # 1. Get Leantime API client
        # 2. Call API to update task assignees
        # 3. Handle response and errors

        # For now, just update the timestamp to indicate we attempted sync
        self.assignees_last_synced_at = now_datetime()

        # If Leantime sync fails, this would throw an exception
        # which will be caught by sync_assignees() and update sync_state to ERROR

        # Example future implementation:
        # leantime_client = get_leantime_client()
        # user_ids = [a["user"] for a in assignees_data]
        # leantime_client.update_task_assignees(self.leantime_task_id, user_ids)

    def get_assignees(self):
        """
        Get assignees as Python list.

        Returns:
            List of dicts with 'user' and 'role' keys, or empty list
        """
        if not self.assignees:
            return []

        try:
            return json.loads(self.assignees)
        except (json.JSONDecodeError, TypeError):
            return []

