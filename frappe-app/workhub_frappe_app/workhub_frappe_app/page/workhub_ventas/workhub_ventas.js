frappe.pages['workhub-ventas'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Dashboard de Ventas',
		single_column: true
	});

	// Store page reference
	this.page = page;

	// Create main container using Frappe's page.main
	let $main = $(page.main);

	$main.html(`
		<div class="workhub-dashboard" style="padding: 15px;">
			<div class="row">
				<div class="col-md-3">
					<div class="frappe-card" style="padding: 15px; margin-bottom: 15px;">
						<div class="text-center">
							<div class="text-muted small">Ventas del Mes</div>
							<div class="h4 font-weight-bold" id="sales-amount">$0</div>
							<div id="sales-growth" class="small text-success"></div>
						</div>
					</div>
				</div>
				<div class="col-md-3">
					<div class="frappe-card" style="padding: 15px; margin-bottom: 15px;">
						<div class="text-center">
							<div class="text-muted small">Pipeline</div>
							<div class="h4 font-weight-bold" id="pipeline-value">$0</div>
						</div>
					</div>
				</div>
				<div class="col-md-3">
					<div class="frappe-card" style="padding: 15px; margin-bottom: 15px;">
						<div class="text-center">
							<div class="text-muted small">Clientes Activos</div>
							<div class="h4 font-weight-bold" id="active-customers">0</div>
						</div>
					</div>
				</div>
				<div class="col-md-3">
					<div class="frappe-card" style="padding: 15px; margin-bottom: 15px;">
						<div class="text-center">
							<div class="text-muted small">Pedidos Pendientes</div>
							<div class="h4 font-weight-bold" id="pending-orders">0</div>
						</div>
					</div>
				</div>
			</div>

			<div class="row">
				<div class="col-md-6">
					<div class="frappe-card" style="padding: 15px; margin-bottom: 15px;">
						<h6 class="text-muted mb-3">Top Clientes</h6>
						<div id="top-customers">
							<p class="text-muted">Cargando...</p>
						</div>
					</div>
				</div>
				<div class="col-md-6">
					<div class="frappe-card" style="padding: 15px; margin-bottom: 15px;">
						<h6 class="text-muted mb-3">Pedidos Recientes</h6>
						<div id="recent-orders">
							<p class="text-muted">Cargando...</p>
						</div>
					</div>
				</div>
			</div>

			<div class="row">
				<div class="col-12">
					<div class="frappe-card" style="padding: 15px;">
						<h6 class="text-muted mb-3">Accesos Rápidos</h6>
						<div class="row">
							<div class="col-md-3 mb-2">
								<a href="/app/opportunity" class="btn btn-default btn-sm btn-block">Pipeline</a>
							</div>
							<div class="col-md-3 mb-2">
								<a href="/app/customer" class="btn btn-default btn-sm btn-block">Clientes</a>
							</div>
							<div class="col-md-3 mb-2">
								<a href="/app/sales-order" class="btn btn-default btn-sm btn-block">Pedidos</a>
							</div>
							<div class="col-md-3 mb-2">
								<a href="/app/customer/new-customer" class="btn btn-primary btn-sm btn-block">+ Nuevo Cliente</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	`);

	// Load data
	loadVentasData();
};

frappe.pages['workhub-ventas'].on_page_show = function() {
	// Refresh data when page is shown
	loadVentasData();
};

function loadVentasData() {
	// Load KPIs
	frappe.call({
		method: 'workhub_frappe_app.api.dashboard.get_sales_kpis',
		callback: function(r) {
			if (r.message) {
				$('#sales-amount').text(format_currency(r.message.sales_this_month || 0));
				$('#pipeline-value').text(format_currency(r.message.pipeline_value || 0));
				$('#active-customers').text(r.message.active_customers || 0);
				$('#pending-orders').text(r.message.pending_orders || 0);

				if (r.message.growth_percent !== undefined) {
					let growth = r.message.growth_percent;
					let color = growth >= 0 ? 'success' : 'danger';
					let sign = growth >= 0 ? '+' : '';
					$('#sales-growth').removeClass('text-success text-danger').addClass('text-' + color);
					$('#sales-growth').text(sign + growth.toFixed(1) + '% vs mes anterior');
				}
			}
		},
		error: function() {
			console.log('Error loading KPIs');
		}
	});

	// Load top customers
	frappe.call({
		method: 'frappe.client.get_list',
		args: {
			doctype: 'Sales Order',
			filters: {docstatus: 1},
			fields: ['customer_name', 'grand_total'],
			order_by: 'grand_total desc',
			limit_page_length: 5
		},
		callback: function(r) {
			if (r.message && r.message.length) {
				let html = '<div class="list-group list-group-flush">';
				r.message.forEach(function(row) {
					html += `<div class="list-group-item d-flex justify-content-between px-0">
						<span>${row.customer_name || 'Sin nombre'}</span>
						<strong>${format_currency(row.grand_total || 0)}</strong>
					</div>`;
				});
				html += '</div>';
				$('#top-customers').html(html);
			} else {
				$('#top-customers').html('<p class="text-muted small">Sin datos de ventas</p>');
			}
		}
	});

	// Load recent orders
	frappe.call({
		method: 'frappe.client.get_list',
		args: {
			doctype: 'Sales Order',
			filters: {docstatus: 1},
			fields: ['name', 'customer_name', 'grand_total', 'transaction_date'],
			order_by: 'creation desc',
			limit_page_length: 5
		},
		callback: function(r) {
			if (r.message && r.message.length) {
				let html = '<div class="list-group list-group-flush">';
				r.message.forEach(function(row) {
					html += `<a href="/app/sales-order/${row.name}" class="list-group-item list-group-item-action px-0">
						<div class="d-flex justify-content-between">
							<span><strong>${row.name}</strong> - ${row.customer_name || ''}</span>
							<span>${format_currency(row.grand_total || 0)}</span>
						</div>
					</a>`;
				});
				html += '</div>';
				$('#recent-orders').html(html);
			} else {
				$('#recent-orders').html('<p class="text-muted small">Sin pedidos recientes</p>');
			}
		}
	});
}
