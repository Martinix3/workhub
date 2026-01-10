frappe.pages["workhub-crm"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("CRM Lite"),
		single_column: true,
	});

	page.main.addClass("workhub-crm-lite");

	page.main.html(`
		<style>
			.workhub-crm-lite .wh-section-title { font-size: 13px; font-weight: 700; color: var(--text-muted); margin: 12px 0 8px; text-transform: uppercase; letter-spacing: .03em; }
			.workhub-crm-lite .wh-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
			.workhub-crm-lite .wh-card { border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; background: var(--card-bg, var(--fg-color)); }
			.workhub-crm-lite .wh-card h3 { font-size: 16px; margin: 0 0 6px; }
			.workhub-crm-lite .wh-card p { margin: 0 0 12px; color: var(--text-muted); }
			.workhub-crm-lite .wh-actions { display: flex; flex-wrap: wrap; gap: 8px; }
			.workhub-crm-lite .wh-actions .btn { border-radius: 10px; padding: 10px 12px; font-weight: 600; }
			.workhub-crm-lite .wh-wide { width: 100%; justify-content: center; }
		</style>

		<div class="wh-section-title">${__("Crear")}</div>
		<div class="wh-grid">
			<div class="wh-card">
				<h3>${__("Nuevo cliente")}</h3>
				<p>${__("Crear un Customer (cuenta/cliente).")}</p>
				<div class="wh-actions">
					<button class="btn btn-primary wh-wide" data-action="new" data-doctype="Customer">${__("Crear cliente")}</button>
				</div>
			</div>
			<div class="wh-card">
				<h3>${__("Nuevo lead")}</h3>
				<p>${__("Capturar un lead rápido (mínimos campos).")}</p>
				<div class="wh-actions">
					<button class="btn btn-primary wh-wide" data-action="new" data-doctype="Lead">${__("Crear lead")}</button>
				</div>
			</div>
			<div class="wh-card">
				<h3>${__("Nueva oportunidad")}</h3>
				<p>${__("Crear una Opportunity y asignarla.")}</p>
				<div class="wh-actions">
					<button class="btn btn-primary wh-wide" data-action="new" data-doctype="Opportunity">${__("Crear oportunidad")}</button>
				</div>
			</div>
		</div>

		<div class="wh-section-title" style="margin-top:18px">${__("Ver")}</div>
		<div class="wh-grid">
			<div class="wh-card">
				<h3>${__("Mis oportunidades")}</h3>
				<p>${__("Ver lista filtrada por propietario.")}</p>
				<div class="wh-actions">
					<button class="btn btn-default wh-wide" data-action="mine" data-doctype="Opportunity">${__("Abrir lista")}</button>
				</div>
			</div>
			<div class="wh-card">
				<h3>${__("Mis leads")}</h3>
				<p>${__("Ver lista filtrada por propietario.")}</p>
				<div class="wh-actions">
					<button class="btn btn-default wh-wide" data-action="mine" data-doctype="Lead">${__("Abrir lista")}</button>
				</div>
			</div>
			<div class="wh-card">
				<h3>${__("Clientes")}</h3>
				<p>${__("Explorar la lista de clientes.")}</p>
				<div class="wh-actions">
					<button class="btn btn-default wh-wide" data-action="list" data-doctype="Customer">${__("Abrir lista")}</button>
				</div>
			</div>
		</div>
	`);

	const routeToNew = (doctype) => frappe.set_route("Form", doctype, "new");
	const routeToList = (doctype) => frappe.set_route("List", doctype);
	const routeToMine = (doctype) => {
		frappe.route_options = { owner: frappe.session.user };
		frappe.set_route("List", doctype);
	};

	page.main.on("click", "button[data-action]", (ev) => {
		const el = ev.currentTarget;
		const action = el.getAttribute("data-action");
		const doctype = el.getAttribute("data-doctype");
		if (!doctype) return;

		if (action === "new") return routeToNew(doctype);
		if (action === "list") return routeToList(doctype);
		if (action === "mine") return routeToMine(doctype);
	});
};

