// Copyright (c) 2026, Santa Brisa and contributors
// For license information, please see license.txt

frappe.ui.form.on('WH Project', {
	refresh: function(frm) {
		// Add Timeline view button if project has tasks with dates
		if (!frm.is_new()) {
			add_timeline_button(frm);
		}
	}
});

function add_timeline_button(frm) {
	// Check if project has tasks suitable for Gantt view
	frappe.call({
		method: 'workhub_frappe_app.api.projects.get_project',
		args: {
			project_id: frm.doc.name
		},
		callback: function(r) {
			if (r.message && r.message.has_gantt_view) {
				// Add button to view Timeline/Gantt chart
				frm.add_custom_button(__('Timeline'), function() {
					// Navigate to Gantt view page
					window.open('/workhub-projects-gantt?project=' + encodeURIComponent(frm.doc.name), '_blank');
				}, __('Ver'));
			}
		}
	});
}
