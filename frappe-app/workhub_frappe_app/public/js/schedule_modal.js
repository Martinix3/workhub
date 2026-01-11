/**
 * WorkHub Schedule Configuration Modal
 *
 * Provides UI for creating and editing scheduled report configurations:
 * - Frequency selection (daily/weekly/monthly)
 * - Time picker
 * - Day-of-week/month selection
 * - Recipient management (users/emails)
 * - Format selection (PDF/Excel/CSV)
 */

frappe.workhub = frappe.workhub || {};
frappe.workhub.scheduleModal = {};

(function() {
	'use strict';

	// ==========================================
	// STATE MANAGEMENT
	// ==========================================

	const state = {
		mode: 'create', // 'create' or 'edit'
		scheduleId: null,
		reportId: null,
		reportTitle: null,
		recipients: [],
		formData: {
			schedule_name: '',
			schedule_type: 'Daily',
			schedule_time: '09:00',
			day_of_week: '1',
			day_of_month: 1,
			export_format: 'PDF',
			include_charts: true,
			is_active: true,
			email_subject: '',
			email_body: ''
		}
	};

	// ==========================================
	// PUBLIC API
	// ==========================================

	/**
	 * Show modal to create a new schedule
	 * @param {string} reportId - Report Definition ID
	 * @param {string} reportTitle - Report title for display
	 */
	frappe.workhub.scheduleModal.create = function(reportId, reportTitle) {
		state.mode = 'create';
		state.scheduleId = null;
		state.reportId = reportId;
		state.reportTitle = reportTitle;
		state.recipients = [];

		// Reset form data to defaults
		state.formData = {
			schedule_name: `${reportTitle} - Programación`,
			schedule_type: 'Daily',
			schedule_time: '09:00',
			day_of_week: '1',
			day_of_month: 1,
			export_format: 'PDF',
			include_charts: true,
			is_active: true,
			email_subject: `Reporte Programado: ${reportTitle}`,
			email_body: ''
		};

		showModal();
	};

	/**
	 * Show modal to edit an existing schedule
	 * @param {string} scheduleId - WH Scheduled Report ID
	 */
	frappe.workhub.scheduleModal.edit = function(scheduleId) {
		state.mode = 'edit';
		state.scheduleId = scheduleId;

		// Load schedule data
		loadScheduleData(scheduleId);
	};

	/**
	 * Close the modal
	 */
	frappe.workhub.scheduleModal.close = function() {
		hideModal();
	};

	// ==========================================
	// MODAL DISPLAY
	// ==========================================

	/**
	 * Show the schedule modal
	 */
	function showModal() {
		ensureModalExists();
		renderModalContent();
		$('#scheduleConfigModal').modal('show');
	}

	/**
	 * Hide the schedule modal
	 */
	function hideModal() {
		$('#scheduleConfigModal').modal('hide');
	}

	/**
	 * Ensure modal structure exists in DOM
	 */
	function ensureModalExists() {
		if ($('#scheduleConfigModal').length === 0) {
			const modalHtml = `
				<div class="modal fade" id="scheduleConfigModal" tabindex="-1" role="dialog">
					<div class="modal-dialog modal-lg" role="document">
						<div class="modal-content">
							<div class="modal-header">
								<h5 class="modal-title" id="scheduleModalTitle"></h5>
								<button type="button" class="close" data-dismiss="modal">
									<span>&times;</span>
								</button>
							</div>
							<div class="modal-body" id="scheduleModalBody">
								<!-- Content rendered dynamically -->
							</div>
							<div class="modal-footer">
								<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
								<button type="button" class="btn btn-primary" id="saveScheduleBtn">
									Guardar Programación
								</button>
							</div>
						</div>
					</div>
				</div>
			`;
			$('body').append(modalHtml);

			// Bind save button
			$('#saveScheduleBtn').on('click', saveSchedule);
		}
	}

	/**
	 * Render modal content based on current state
	 */
	function renderModalContent() {
		const title = state.mode === 'create' ? '⏰ Nueva Programación' : '⏰ Editar Programación';
		$('#scheduleModalTitle').text(title);

		const bodyHtml = `
			<div class="schedule-config-form">
				<!-- Report Info (create mode only) -->
				${state.mode === 'create' ? `
				<div class="alert alert-info">
					<strong>📊 Reporte:</strong> ${escapeHtml(state.reportTitle)}
				</div>
				` : ''}

				<!-- Schedule Name -->
				<div class="form-group">
					<label for="scheduleName">Nombre de la Programación *</label>
					<input type="text"
						   class="form-control"
						   id="scheduleName"
						   placeholder="Ej: Reporte Semanal de Productividad"
						   value="${escapeHtml(state.formData.schedule_name)}">
					<small class="form-text text-muted">Nombre descriptivo para identificar esta programación</small>
				</div>

				<!-- Schedule Configuration -->
				<div class="card mb-3">
					<div class="card-header">
						<h6 class="mb-0">📅 Configuración de Frecuencia</h6>
					</div>
					<div class="card-body">
						<div class="row">
							<!-- Schedule Type -->
							<div class="col-md-4">
								<div class="form-group">
									<label for="scheduleType">Frecuencia *</label>
									<select class="form-control" id="scheduleType">
										<option value="Daily" ${state.formData.schedule_type === 'Daily' ? 'selected' : ''}>Diaria</option>
										<option value="Weekly" ${state.formData.schedule_type === 'Weekly' ? 'selected' : ''}>Semanal</option>
										<option value="Monthly" ${state.formData.schedule_type === 'Monthly' ? 'selected' : ''}>Mensual</option>
									</select>
								</div>
							</div>

							<!-- Schedule Time -->
							<div class="col-md-4">
								<div class="form-group">
									<label for="scheduleTime">Hora *</label>
									<input type="time"
										   class="form-control"
										   id="scheduleTime"
										   value="${state.formData.schedule_time}">
								</div>
							</div>

							<!-- Day of Week (conditional) -->
							<div class="col-md-4" id="dayOfWeekContainer" style="display: ${state.formData.schedule_type === 'Weekly' ? 'block' : 'none'};">
								<div class="form-group">
									<label for="dayOfWeek">Día de la Semana *</label>
									<select class="form-control" id="dayOfWeek">
										<option value="1" ${state.formData.day_of_week === '1' ? 'selected' : ''}>Lunes</option>
										<option value="2" ${state.formData.day_of_week === '2' ? 'selected' : ''}>Martes</option>
										<option value="3" ${state.formData.day_of_week === '3' ? 'selected' : ''}>Miércoles</option>
										<option value="4" ${state.formData.day_of_week === '4' ? 'selected' : ''}>Jueves</option>
										<option value="5" ${state.formData.day_of_week === '5' ? 'selected' : ''}>Viernes</option>
										<option value="6" ${state.formData.day_of_week === '6' ? 'selected' : ''}>Sábado</option>
										<option value="7" ${state.formData.day_of_week === '7' ? 'selected' : ''}>Domingo</option>
									</select>
								</div>
							</div>

							<!-- Day of Month (conditional) -->
							<div class="col-md-4" id="dayOfMonthContainer" style="display: ${state.formData.schedule_type === 'Monthly' ? 'block' : 'none'};">
								<div class="form-group">
									<label for="dayOfMonth">Día del Mes *</label>
									<input type="number"
										   class="form-control"
										   id="dayOfMonth"
										   min="1"
										   max="31"
										   value="${state.formData.day_of_month}">
									<small class="form-text text-muted">1-31</small>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Export Configuration -->
				<div class="card mb-3">
					<div class="card-header">
						<h6 class="mb-0">📄 Configuración de Exportación</h6>
					</div>
					<div class="card-body">
						<div class="row">
							<!-- Export Format -->
							<div class="col-md-6">
								<div class="form-group">
									<label for="exportFormat">Formato de Exportación *</label>
									<select class="form-control" id="exportFormat">
										<option value="PDF" ${state.formData.export_format === 'PDF' ? 'selected' : ''}>PDF (Presentación ejecutiva)</option>
										<option value="Excel" ${state.formData.export_format === 'Excel' ? 'selected' : ''}>Excel (Hojas de cálculo)</option>
										<option value="CSV" ${state.formData.export_format === 'CSV' ? 'selected' : ''}>CSV (Datos tabulares)</option>
									</select>
								</div>
							</div>

							<!-- Include Charts (PDF only) -->
							<div class="col-md-6" id="includeChartsContainer" style="display: ${state.formData.export_format === 'PDF' ? 'block' : 'none'};">
								<div class="form-group">
									<label>&nbsp;</label>
									<div class="custom-control custom-checkbox" style="padding-top: 8px;">
										<input type="checkbox"
											   class="custom-control-input"
											   id="includeCharts"
											   ${state.formData.include_charts ? 'checked' : ''}>
										<label class="custom-control-label" for="includeCharts">
											Incluir gráficos en PDF
										</label>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Recipients -->
				<div class="card mb-3">
					<div class="card-header d-flex justify-content-between align-items-center">
						<h6 class="mb-0">👥 Destinatarios</h6>
						<button type="button" class="btn btn-sm btn-outline-primary" onclick="frappe.workhub.scheduleModal.addRecipient()">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 14px; height: 14px; margin-right: 4px;">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
							</svg>
							Agregar Destinatario
						</button>
					</div>
					<div class="card-body">
						<div id="recipientsList">
							${renderRecipientsList()}
						</div>
					</div>
				</div>

				<!-- Email Configuration -->
				<div class="card mb-3">
					<div class="card-header">
						<h6 class="mb-0">✉️ Configuración de Email</h6>
					</div>
					<div class="card-body">
						<div class="form-group">
							<label for="emailSubject">Asunto del Email</label>
							<input type="text"
								   class="form-control"
								   id="emailSubject"
								   placeholder="Reporte Programado: [Nombre del Reporte]"
								   value="${escapeHtml(state.formData.email_subject)}">
							<small class="form-text text-muted">Dejar vacío para usar el asunto predeterminado</small>
						</div>
						<div class="form-group">
							<label for="emailBody">Mensaje del Email (opcional)</label>
							<textarea class="form-control"
									  id="emailBody"
									  rows="3"
									  placeholder="Mensaje personalizado que se incluirá en el email...">${escapeHtml(state.formData.email_body)}</textarea>
							<small class="form-text text-muted">Dejar vacío para usar la plantilla predeterminada</small>
						</div>
					</div>
				</div>

				<!-- Active Status -->
				<div class="form-group">
					<div class="custom-control custom-checkbox">
						<input type="checkbox"
							   class="custom-control-input"
							   id="isActive"
							   ${state.formData.is_active ? 'checked' : ''}>
						<label class="custom-control-label" for="isActive">
							<strong>Activar programación inmediatamente</strong>
						</label>
					</div>
					<small class="form-text text-muted">Si está desactivado, la programación se creará pero no se ejecutará hasta que la actives</small>
				</div>
			</div>
		`;

		$('#scheduleModalBody').html(bodyHtml);

		// Setup event listeners
		setupEventListeners();
	}

	/**
	 * Render recipients list HTML
	 */
	function renderRecipientsList() {
		if (state.recipients.length === 0) {
			return `
				<div class="text-center text-muted py-3">
					<p class="mb-0">No hay destinatarios configurados</p>
					<small>Haz clic en "Agregar Destinatario" para añadir uno</small>
				</div>
			`;
		}

		let html = '<div class="recipients-list">';
		state.recipients.forEach((recipient, index) => {
			const displayValue = recipient.recipient_type === 'User'
				? recipient.user
				: recipient.email;
			const icon = recipient.recipient_type === 'User' ? '👤' : '✉️';

			html += `
				<div class="recipient-item d-flex justify-content-between align-items-center mb-2">
					<div class="recipient-info">
						<span class="recipient-icon">${icon}</span>
						<strong>${recipient.recipient_type}:</strong> ${escapeHtml(displayValue)}
					</div>
					<button type="button"
							class="btn btn-sm btn-outline-danger"
							onclick="frappe.workhub.scheduleModal.removeRecipient(${index})">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 14px; height: 14px;">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
						</svg>
					</button>
				</div>
			`;
		});
		html += '</div>';

		return html;
	}

	/**
	 * Setup event listeners for form controls
	 */
	function setupEventListeners() {
		// Schedule type change - show/hide day of week/month
		$('#scheduleType').on('change', function() {
			const scheduleType = $(this).val();

			if (scheduleType === 'Weekly') {
				$('#dayOfWeekContainer').show();
				$('#dayOfMonthContainer').hide();
			} else if (scheduleType === 'Monthly') {
				$('#dayOfWeekContainer').hide();
				$('#dayOfMonthContainer').show();
			} else {
				$('#dayOfWeekContainer').hide();
				$('#dayOfMonthContainer').hide();
			}
		});

		// Export format change - show/hide include charts
		$('#exportFormat').on('change', function() {
			const exportFormat = $(this).val();

			if (exportFormat === 'PDF') {
				$('#includeChartsContainer').show();
			} else {
				$('#includeChartsContainer').hide();
			}
		});
	}

	// ==========================================
	// RECIPIENT MANAGEMENT
	// ==========================================

	/**
	 * Add a new recipient
	 */
	frappe.workhub.scheduleModal.addRecipient = function() {
		// Show recipient type selection dialog
		const dialogHtml = `
			<div class="recipient-add-dialog">
				<div class="form-group">
					<label>Tipo de Destinatario</label>
					<select class="form-control" id="newRecipientType">
						<option value="User">Usuario del Sistema</option>
						<option value="Email">Email Externo</option>
					</select>
				</div>
				<div class="form-group" id="newRecipientUserContainer">
					<label>Seleccionar Usuario *</label>
					<select class="form-control" id="newRecipientUser">
						<option value="">Cargando usuarios...</option>
					</select>
				</div>
				<div class="form-group" id="newRecipientEmailContainer" style="display: none;">
					<label>Email *</label>
					<input type="email"
						   class="form-control"
						   id="newRecipientEmail"
						   placeholder="ejemplo@empresa.com">
				</div>
			</div>
		`;

		// Create temporary modal for adding recipient
		if ($('#addRecipientModal').length === 0) {
			const addModalHtml = `
				<div class="modal fade" id="addRecipientModal" tabindex="-1" role="dialog">
					<div class="modal-dialog" role="document">
						<div class="modal-content">
							<div class="modal-header">
								<h5 class="modal-title">Agregar Destinatario</h5>
								<button type="button" class="close" data-dismiss="modal">
									<span>&times;</span>
								</button>
							</div>
							<div class="modal-body" id="addRecipientModalBody"></div>
							<div class="modal-footer">
								<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
								<button type="button" class="btn btn-primary" id="confirmAddRecipient">Agregar</button>
							</div>
						</div>
					</div>
				</div>
			`;
			$('body').append(addModalHtml);
		}

		$('#addRecipientModalBody').html(dialogHtml);
		$('#addRecipientModal').modal('show');

		// Load users
		loadUsers();

		// Setup event listeners
		$('#newRecipientType').on('change', function() {
			const type = $(this).val();
			if (type === 'User') {
				$('#newRecipientUserContainer').show();
				$('#newRecipientEmailContainer').hide();
			} else {
				$('#newRecipientUserContainer').hide();
				$('#newRecipientEmailContainer').show();
			}
		});

		// Bind confirm button
		$('#confirmAddRecipient').off('click').on('click', function() {
			const recipientType = $('#newRecipientType').val();
			const user = $('#newRecipientUser').val();
			const email = $('#newRecipientEmail').val();

			// Validate
			if (recipientType === 'User' && !user) {
				frappe.show_alert({message: 'Por favor selecciona un usuario', indicator: 'red'});
				return;
			}
			if (recipientType === 'Email' && !email) {
				frappe.show_alert({message: 'Por favor ingresa un email válido', indicator: 'red'});
				return;
			}

			// Add recipient
			const newRecipient = {
				recipient_type: recipientType,
				user: recipientType === 'User' ? user : null,
				email: recipientType === 'Email' ? email : null
			};

			state.recipients.push(newRecipient);

			// Refresh recipients list
			$('#recipientsList').html(renderRecipientsList());

			// Close modal
			$('#addRecipientModal').modal('hide');

			frappe.show_alert({message: 'Destinatario agregado', indicator: 'green'});
		});
	};

	/**
	 * Remove a recipient by index
	 */
	frappe.workhub.scheduleModal.removeRecipient = function(index) {
		if (confirm('¿Seguro que deseas eliminar este destinatario?')) {
			state.recipients.splice(index, 1);
			$('#recipientsList').html(renderRecipientsList());
			frappe.show_alert({message: 'Destinatario eliminado', indicator: 'orange'});
		}
	};

	// ==========================================
	// DATA LOADING
	// ==========================================

	/**
	 * Load users from Frappe
	 */
	function loadUsers() {
		frappe.call({
			method: 'frappe.client.get_list',
			args: {
				doctype: 'User',
				filters: {
					enabled: 1,
					user_type: 'System User'
				},
				fields: ['name', 'full_name', 'email'],
				limit_page_length: 500,
				order_by: 'full_name asc'
			},
			callback: function(r) {
				if (r.message) {
					const users = r.message;
					let options = '<option value="">-- Seleccionar Usuario --</option>';
					users.forEach(user => {
						const displayName = user.full_name || user.name;
						options += `<option value="${escapeHtml(user.name)}">${escapeHtml(displayName)} (${escapeHtml(user.email)})</option>`;
					});
					$('#newRecipientUser').html(options);
				}
			},
			error: function(err) {
				frappe.show_alert({message: 'Error al cargar usuarios', indicator: 'red'});
			}
		});
	}

	/**
	 * Load existing schedule data for editing
	 */
	function loadScheduleData(scheduleId) {
		frappe.call({
			method: 'frappe.client.get',
			args: {
				doctype: 'WH Scheduled Report',
				name: scheduleId
			},
			callback: function(r) {
				if (r.message) {
					const schedule = r.message;

					// Update state
					state.reportId = schedule.report_definition;
					state.reportTitle = schedule.report_definition; // Will be enriched later

					// Update form data
					state.formData = {
						schedule_name: schedule.schedule_name || '',
						schedule_type: schedule.schedule_type || 'Daily',
						schedule_time: schedule.schedule_time ? schedule.schedule_time.substring(0, 5) : '09:00',
						day_of_week: schedule.day_of_week || '1',
						day_of_month: schedule.day_of_month || 1,
						export_format: schedule.export_format || 'PDF',
						include_charts: schedule.include_charts !== undefined ? schedule.include_charts : true,
						is_active: schedule.is_active !== undefined ? schedule.is_active : true,
						email_subject: schedule.email_subject || '',
						email_body: schedule.email_body || ''
					};

					// Load recipients
					state.recipients = (schedule.recipients || []).map(r => ({
						recipient_type: r.recipient_type,
						user: r.user,
						email: r.email
					}));

					// Get report title
					frappe.call({
						method: 'frappe.client.get_value',
						args: {
							doctype: 'WH Report Definition',
							filters: {name: schedule.report_definition},
							fieldname: 'title'
						},
						callback: function(r2) {
							if (r2.message) {
								state.reportTitle = r2.message.title;
								showModal();
							} else {
								showModal();
							}
						}
					});
				}
			},
			error: function(err) {
				frappe.show_alert({message: 'Error al cargar la programación', indicator: 'red'});
			}
		});
	}

	// ==========================================
	// SAVE SCHEDULE
	// ==========================================

	/**
	 * Save the schedule (create or update)
	 */
	function saveSchedule() {
		// Collect form data
		const formData = {
			report_definition: state.reportId,
			schedule_name: $('#scheduleName').val(),
			schedule_type: $('#scheduleType').val(),
			schedule_time: $('#scheduleTime').val() + ':00', // Add seconds
			export_format: $('#exportFormat').val(),
			is_active: $('#isActive').is(':checked') ? 1 : 0,
			email_subject: $('#emailSubject').val(),
			email_body: $('#emailBody').val(),
			recipients: state.recipients
		};

		// Conditional fields
		if (formData.schedule_type === 'Weekly') {
			formData.day_of_week = $('#dayOfWeek').val();
		}
		if (formData.schedule_type === 'Monthly') {
			formData.day_of_month = parseInt($('#dayOfMonth').val());
		}
		if (formData.export_format === 'PDF') {
			formData.include_charts = $('#includeCharts').is(':checked') ? 1 : 0;
		}

		// Validate
		if (!formData.schedule_name) {
			frappe.show_alert({message: 'Por favor ingresa un nombre para la programación', indicator: 'red'});
			return;
		}

		if (state.recipients.length === 0) {
			frappe.show_alert({message: 'Por favor agrega al menos un destinatario', indicator: 'red'});
			return;
		}

		// Disable save button
		$('#saveScheduleBtn').prop('disabled', true).text('Guardando...');

		// Call API
		const method = state.mode === 'create'
			? 'workhub_frappe_app.api.report_scheduler.create_schedule'
			: 'workhub_frappe_app.api.report_scheduler.update_schedule';

		const args = state.mode === 'create'
			? {data: JSON.stringify(formData)}
			: {schedule_id: state.scheduleId, data: JSON.stringify(formData)};

		frappe.call({
			method: method,
			args: args,
			callback: function(r) {
				if (r.message && r.message.success) {
					frappe.show_alert({
						message: state.mode === 'create'
							? 'Programación creada exitosamente'
							: 'Programación actualizada exitosamente',
						indicator: 'green'
					});

					// Close modal
					hideModal();

					// Reload page after a short delay
					setTimeout(function() {
						window.location.reload();
					}, 1000);
				} else {
					frappe.show_alert({
						message: r.message ? r.message.message : 'Error al guardar la programación',
						indicator: 'red'
					});
					$('#saveScheduleBtn').prop('disabled', false).text('Guardar Programación');
				}
			},
			error: function(err) {
				frappe.show_alert({message: 'Error al guardar la programación', indicator: 'red'});
				$('#saveScheduleBtn').prop('disabled', false).text('Guardar Programación');
			}
		});
	}

	// ==========================================
	// UTILITIES
	// ==========================================

	/**
	 * Escape HTML to prevent XSS
	 */
	function escapeHtml(text) {
		if (!text) return '';
		const map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};
		return text.toString().replace(/[&<>"']/g, function(m) { return map[m]; });
	}

})();
