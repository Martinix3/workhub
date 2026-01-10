// Copyright (c) 2025, WorkHub and contributors
// For license information, please see license.txt

frappe.ui.form.on('Distributor SELL OUT', {
	refresh: function(frm) {
		// Botón para calcular inventario
		if (frm.doc.distributor && !frm.is_new()) {
			frm.add_custom_button(__('Ver Inventario'), function() {
				frappe.call({
					method: 'workhub_frappe_app.doctype.distributor_sell_out.distributor_sell_out.get_distributor_inventory',
					args: {
						distributor: frm.doc.distributor
					},
					callback: function(r) {
						if (r.message) {
							// Mostrar inventario en un dialog
							show_inventory_dialog(r.message);
						}
					}
				});
			});
		}
	}
});

frappe.ui.form.on('Distributor SELL OUT Item', {
	qty: function(frm, cdt, cdn) {
		calculate_amount(frm, cdt, cdn);
	},
	rate: function(frm, cdt, cdn) {
		calculate_amount(frm, cdt, cdn);
	}
});

function calculate_amount(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	if (row.qty && row.rate) {
		row.amount = row.qty * row.rate;
		frm.refresh_field('items');
	}
}

function show_inventory_dialog(inventory) {
	let html = '<table class="table table-bordered">';
	html += '<thead><tr><th>Producto</th><th>SELL IN</th><th>SELL OUT</th><th>Stock Actual</th></tr></thead>';
	html += '<tbody>';

	inventory.forEach(item => {
		html += `<tr>
			<td>${item.item_name}</td>
			<td>${item.sell_in_qty}</td>
			<td>${item.sell_out_qty}</td>
			<td><strong>${item.current_stock}</strong></td>
		</tr>`;
	});

	html += '</tbody></table>';

	frappe.msgprint({
		title: __('Inventario del Distribuidor'),
		message: html,
		wide: true
	});
}
