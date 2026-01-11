/**
 * WorkHub Report Schedule History Module
 *
 * Provides comprehensive delivery history view for scheduled reports.
 * Displays when reports were sent, recipients, delivery status, file downloads,
 * and allows re-sending failed deliveries.
 *
 * Features:
 * - Detailed delivery history table with all execution data
 * - Recipients list for each delivery
 * - Delivery status indicators (Success/Failed/Pending)
 * - Download links for completed reports
 * - Re-send functionality for failed deliveries
 * - View past report details
 *
 * Usage:
 *   const historyUI = new ReportScheduleHistory();
 *   historyUI.renderHistory(container, scheduleId, scheduleName);
 */

class ReportScheduleHistory {
	constructor(options = {}) {
		this.limit = options.limit || 20;
		this.showRecipients = options.showRecipients !== false;
		this.allowResend = options.allowResend !== false;
	}

	/**
	 * Render the delivery history for a scheduled report
	 *
	 * @param {HTMLElement|string} container - Container element or ID
	 * @param {string} scheduleId - WH Scheduled Report ID
	 * @param {string} scheduleName - Schedule name for display
	 * @param {Object} options - Configuration options
	 * @param {number} options.limit - Maximum number of records to show
	 * @param {boolean} options.showStats - Show statistics cards (default: true)
	 * @param {boolean} options.showRecipients - Show recipients column (default: true)
	 * @returns {Promise} Promise that resolves when history is rendered
	 */
	async renderHistory(container, scheduleId, scheduleName, options = {}) {
		const containerEl = typeof container === 'string'
			? document.getElementById(container)
			: container;

		if (!containerEl) {
			console.error('Container element not found');
			return Promise.reject('Container not found');
		}

		if (!scheduleId) {
			console.error('Schedule ID is required');
			return Promise.reject('Schedule ID required');
		}

		// Show loading state
		containerEl.innerHTML = this._getLoadingHtml();

		try {
			// Fetch history data from API
			const response = await this._fetchScheduleHistory(scheduleId, options.limit || this.limit);

			if (!response.success) {
				throw new Error(response.message || 'Failed to fetch history');
			}

			const { history, statistics, schedule } = response;

			// Render the history view
			const html = this._buildHistoryHtml(
				history,
				statistics,
				scheduleName || schedule.schedule_name,
				scheduleId,
				options
			);

			containerEl.innerHTML = html;

			// Attach event listeners
			this._attachEventListeners(containerEl, scheduleId);

			return Promise.resolve(response);

		} catch (error) {
			console.error('Error rendering history:', error);
			containerEl.innerHTML = this._getErrorHtml(error.message);
			return Promise.reject(error);
		}
	}

	/**
	 * Fetch schedule history from API
	 *
	 * @param {string} scheduleId - Schedule ID
	 * @param {number} limit - Max records to fetch
	 * @returns {Promise} API response
	 */
	async _fetchScheduleHistory(scheduleId, limit = 20) {
		return new Promise((resolve, reject) => {
			frappe.call({
				method: 'workhub_frappe_app.api.report_scheduler.get_schedule_history',
				args: {
					schedule_id: scheduleId,
					limit: limit
				},
				callback: (r) => {
					if (r.message && r.message.success) {
						resolve(r.message);
					} else {
						reject(new Error(r.message ? r.message.message : 'Failed to fetch history'));
					}
				},
				error: (err) => {
					reject(err);
				}
			});
		});
	}

	/**
	 * Fetch recipients for a scheduled report
	 *
	 * @param {string} scheduleId - Schedule ID
	 * @returns {Promise} List of recipients
	 */
	async _fetchRecipients(scheduleId) {
		return new Promise((resolve, reject) => {
			frappe.call({
				method: 'frappe.client.get',
				args: {
					doctype: 'WH Scheduled Report',
					name: scheduleId
				},
				callback: (r) => {
					if (r.message && r.message.recipients) {
						resolve(r.message.recipients);
					} else {
						resolve([]);
					}
				},
				error: (err) => {
					console.error('Error fetching recipients:', err);
					resolve([]);
				}
			});
		});
	}

	/**
	 * Re-send a failed delivery
	 *
	 * @param {string} generatedReportId - WH Generated Report ID
	 * @param {string} scheduleId - WH Scheduled Report ID
	 * @returns {Promise} Result of re-send operation
	 */
	async resendDelivery(generatedReportId, scheduleId) {
		if (!confirm('¿Seguro que deseas reenviar este reporte?\n\nSe enviará nuevamente a todos los destinatarios configurados.')) {
			return Promise.resolve({ cancelled: true });
		}

		// Show progress indicator
		frappe.show_alert({
			message: 'Reenviando reporte...',
			indicator: 'blue'
		});

		try {
			const response = await new Promise((resolve, reject) => {
				frappe.call({
					method: 'workhub_frappe_app.api.report_scheduler.resend_report',
					args: {
						generated_report_id: generatedReportId,
						schedule_id: scheduleId
					},
					callback: (r) => {
						if (r.message && r.message.success) {
							resolve(r.message);
						} else {
							reject(new Error(r.message ? r.message.message : 'Failed to resend report'));
						}
					},
					error: (err) => {
						reject(err);
					}
				});
			});

			// Show success message
			frappe.show_alert({
				message: response.message || 'Reporte reenviado exitosamente',
				indicator: 'green'
			});

			return Promise.resolve(response);

		} catch (error) {
			console.error('Error resending delivery:', error);

			// Show error message
			frappe.show_alert({
				message: `Error al reenviar: ${error.message}`,
				indicator: 'red'
			});

			return Promise.reject(error);
		}
	}

	/**
	 * View delivery details in a modal
	 *
	 * @param {string} generatedReportId - WH Generated Report ID
	 * @param {string} scheduleId - WH Scheduled Report ID
	 */
	async viewDeliveryDetails(generatedReportId, scheduleId) {
		try {
			// Fetch generated report details
			const reportData = await new Promise((resolve, reject) => {
				frappe.call({
					method: 'frappe.client.get',
					args: {
						doctype: 'WH Generated Report',
						name: generatedReportId
					},
					callback: (r) => {
						if (r.message) {
							resolve(r.message);
						} else {
							reject(new Error('Failed to fetch report details'));
						}
					},
					error: reject
				});
			});

			// Fetch recipients
			const recipients = await this._fetchRecipients(scheduleId);

			// Build details HTML
			const detailsHtml = this._buildDeliveryDetailsHtml(reportData, recipients);

			// Create or update modal
			this._showDetailsModal(detailsHtml);

		} catch (error) {
			console.error('Error viewing delivery details:', error);
			frappe.show_alert({
				message: `Error al cargar detalles: ${error.message}`,
				indicator: 'red'
			});
		}
	}

	/**
	 * Build the main history HTML
	 *
	 * @param {Array} history - History records
	 * @param {Object} statistics - Stats object
	 * @param {string} scheduleName - Schedule name
	 * @param {string} scheduleId - Schedule ID
	 * @param {Object} options - Display options
	 * @returns {string} HTML content
	 */
	_buildHistoryHtml(history, statistics, scheduleName, scheduleId, options = {}) {
		const showStats = options.showStats !== false;
		const showRecipients = options.showRecipients !== false;

		let html = `<h6 class="mb-3">${this._escapeHtml(scheduleName)}</h6>`;

		// Statistics cards
		if (showStats && statistics) {
			html += `
				<div class="row mb-3">
					<div class="col-md-4">
						<div class="card">
							<div class="card-body text-center py-2">
								<small class="text-muted">Total Ejecuciones</small>
								<h4 class="mb-0">${statistics.total_executions || 0}</h4>
							</div>
						</div>
					</div>
					<div class="col-md-4">
						<div class="card">
							<div class="card-body text-center py-2">
								<small class="text-muted">Exitosas</small>
								<h4 class="mb-0 text-success">${statistics.successful || 0}</h4>
							</div>
						</div>
					</div>
					<div class="col-md-4">
						<div class="card">
							<div class="card-body text-center py-2">
								<small class="text-muted">Tasa de Éxito</small>
								<h4 class="mb-0 text-info">${statistics.success_rate || 0}%</h4>
							</div>
						</div>
					</div>
				</div>
			`;
		}

		// History table
		if (history && history.length > 0) {
			html += `
				<div class="table-responsive">
					<table class="table table-sm table-hover schedule-history-table">
						<thead>
							<tr>
								<th style="width: 18%;">Fecha y Hora</th>
								<th style="width: 10%;">Estado</th>
								<th style="width: 10%;">Formato</th>
								${showRecipients ? '<th style="width: 15%;">Destinatarios</th>' : ''}
								<th style="width: 15%;">Usuario</th>
								<th style="width: 15%;">Archivo</th>
								<th style="width: ${showRecipients ? '17%' : '32%'};">Acciones</th>
							</tr>
						</thead>
						<tbody>
			`;

			history.forEach(item => {
				html += this._buildHistoryRowHtml(item, scheduleId, showRecipients);
			});

			html += `
					</tbody>
				</table>
			</div>
			`;
		} else {
			html += `
				<div class="alert alert-info">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 20px; height: 20px; display: inline-block; vertical-align: middle; margin-right: 8px;">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
					</svg>
					No hay ejecuciones registradas para esta programación.
				</div>
			`;
		}

		return html;
	}

	/**
	 * Build a single history row HTML
	 *
	 * @param {Object} item - History record
	 * @param {string} scheduleId - Schedule ID
	 * @param {boolean} showRecipients - Show recipients column
	 * @returns {string} Row HTML
	 */
	_buildHistoryRowHtml(item, scheduleId, showRecipients = true) {
		const date = new Date(item.generated_at);
		const dateStr = this._formatDate(date);
		const timeStr = this._formatTime(date);

		// Status badge
		let statusBadge = '';
		let statusClass = '';
		if (item.status === 'Completed') {
			statusBadge = '<span class="badge badge-success">Exitoso</span>';
			statusClass = 'success-row';
		} else if (item.status === 'Failed') {
			statusBadge = '<span class="badge badge-danger">Fallido</span>';
			statusClass = 'failed-row';
		} else {
			statusBadge = '<span class="badge badge-secondary">Pendiente</span>';
			statusClass = 'pending-row';
		}

		// Format badge
		let formatBadge = '';
		if (item.export_format === 'PDF') {
			formatBadge = '<span class="badge badge-danger">PDF</span>';
		} else if (item.export_format === 'Excel') {
			formatBadge = '<span class="badge badge-success">Excel</span>';
		} else if (item.export_format === 'CSV') {
			formatBadge = '<span class="badge badge-primary">CSV</span>';
		} else {
			formatBadge = `<span class="badge badge-secondary">${this._escapeHtml(item.export_format)}</span>`;
		}

		// Recipients badge (will be loaded async)
		const recipientsBadge = showRecipients
			? `<span class="badge badge-pill badge-info recipients-badge" data-schedule-id="${this._escapeHtml(scheduleId)}">
					<span class="spinner-border spinner-border-sm" role="status"></span>
				</span>`
			: '';

		// User name
		const userName = item.generated_by_name || item.generated_by || '-';

		// File info
		let fileInfo = '-';
		if (item.file_url) {
			const fileName = item.file_name || 'Descargar';
			const fileSize = item.file_size ? this._formatFileSize(item.file_size) : '';
			fileInfo = `
				<a href="${this._escapeHtml(item.file_url)}" class="btn btn-sm btn-outline-primary" download>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
					</svg>
					${this._escapeHtml(fileName)}
				</a>
				${fileSize ? `<br><small class="text-muted">${fileSize}</small>` : ''}
			`;
		}

		// Action buttons
		let actionButtons = `
			<button class="btn btn-sm btn-outline-info view-details-btn"
				data-report-id="${this._escapeHtml(item.name)}"
				data-schedule-id="${this._escapeHtml(scheduleId)}"
				title="Ver detalles">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 14px; height: 14px;">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
				</svg>
				Detalles
			</button>
		`;

		// Add resend button for failed deliveries
		if (item.status === 'Failed' && this.allowResend) {
			actionButtons += `
				<button class="btn btn-sm btn-outline-warning ml-1 resend-btn"
					data-report-id="${this._escapeHtml(item.name)}"
					data-schedule-id="${this._escapeHtml(scheduleId)}"
					title="Reenviar">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 14px; height: 14px;">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
					</svg>
					Reenviar
				</button>
			`;
		}

		return `
			<tr class="${statusClass}" data-report-id="${this._escapeHtml(item.name)}">
				<td>
					<small>
						<strong>${dateStr}</strong><br>
						<span class="text-muted">${timeStr}</span>
					</small>
				</td>
				<td>${statusBadge}</td>
				<td>${formatBadge}</td>
				${showRecipients ? `<td class="recipients-cell">${recipientsBadge}</td>` : ''}
				<td><small>${this._escapeHtml(userName)}</small></td>
				<td>${fileInfo}</td>
				<td>${actionButtons}</td>
			</tr>
		`;
	}

	/**
	 * Build delivery details modal content
	 *
	 * @param {Object} reportData - Generated report data
	 * @param {Array} recipients - Recipients list
	 * @returns {string} Modal content HTML
	 */
	_buildDeliveryDetailsHtml(reportData, recipients) {
		const date = new Date(reportData.generated_at);
		const dateStr = this._formatDate(date);
		const timeStr = this._formatTime(date);

		let html = `
			<div class="delivery-details">
				<div class="row mb-3">
					<div class="col-md-6">
						<strong>Estado:</strong>
						${this._getStatusBadge(reportData.status)}
					</div>
					<div class="col-md-6">
						<strong>Formato:</strong>
						${this._getFormatBadge(reportData.export_format)}
					</div>
				</div>
				<div class="row mb-3">
					<div class="col-md-6">
						<strong>Fecha de Envío:</strong><br>
						<span class="text-muted">${dateStr} ${timeStr}</span>
					</div>
					<div class="col-md-6">
						<strong>Generado Por:</strong><br>
						<span class="text-muted">${this._escapeHtml(reportData.generated_by || '-')}</span>
					</div>
				</div>
		`;

		// Recipients section
		if (recipients && recipients.length > 0) {
			html += `
				<div class="mb-3">
					<strong>Destinatarios (${recipients.length}):</strong>
					<ul class="list-unstyled mt-2 ml-3">
			`;

			recipients.forEach(recipient => {
				let recipientInfo = '';
				if (recipient.recipient_type === 'User') {
					// Fetch user email (will show user link)
					recipientInfo = `
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 4px;">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
						</svg>
						Usuario: ${this._escapeHtml(recipient.user || '-')}
					`;
				} else if (recipient.recipient_type === 'Email') {
					recipientInfo = `
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 4px;">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
						</svg>
						Email: ${this._escapeHtml(recipient.email || '-')}
					`;
				}
				html += `<li class="mb-1">${recipientInfo}</li>`;
			});

			html += `
					</ul>
				</div>
			`;
		} else {
			html += `
				<div class="mb-3">
					<strong>Destinatarios:</strong><br>
					<span class="text-muted">No hay destinatarios configurados</span>
				</div>
			`;
		}

		// File info
		if (reportData.file_url) {
			html += `
				<div class="mb-3">
					<strong>Archivo Generado:</strong><br>
					<a href="${this._escapeHtml(reportData.file_url)}" class="btn btn-sm btn-primary mt-1" download>
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 4px;">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
						</svg>
						Descargar Archivo
					</a>
				</div>
			`;
		}

		html += `</div>`;

		return html;
	}

	/**
	 * Show delivery details modal
	 *
	 * @param {string} contentHtml - Modal content HTML
	 */
	_showDetailsModal(contentHtml) {
		// Create or update modal
		let modal = document.getElementById('deliveryDetailsModal');

		if (!modal) {
			const modalHtml = `
				<div class="modal fade" id="deliveryDetailsModal" tabindex="-1">
					<div class="modal-dialog">
						<div class="modal-content">
							<div class="modal-header">
								<h5 class="modal-title">Detalles de Entrega</h5>
								<button type="button" class="close" data-dismiss="modal">
									<span>&times;</span>
								</button>
							</div>
							<div class="modal-body" id="deliveryDetailsContent">
							</div>
							<div class="modal-footer">
								<button type="button" class="btn btn-secondary" data-dismiss="modal">Cerrar</button>
							</div>
						</div>
					</div>
				</div>
			`;
			document.body.insertAdjacentHTML('beforeend', modalHtml);
			modal = document.getElementById('deliveryDetailsModal');
		}

		// Update content
		document.getElementById('deliveryDetailsContent').innerHTML = contentHtml;

		// Show modal
		$(modal).modal('show');
	}

	/**
	 * Attach event listeners to history table
	 *
	 * @param {HTMLElement} container - Container element
	 * @param {string} scheduleId - Schedule ID
	 */
	_attachEventListeners(container, scheduleId) {
		// View details buttons
		container.querySelectorAll('.view-details-btn').forEach(btn => {
			btn.addEventListener('click', (e) => {
				e.preventDefault();
				const reportId = btn.dataset.reportId;
				const schedId = btn.dataset.scheduleId;
				this.viewDeliveryDetails(reportId, schedId);
			});
		});

		// Resend buttons
		container.querySelectorAll('.resend-btn').forEach(btn => {
			btn.addEventListener('click', async (e) => {
				e.preventDefault();
				const reportId = btn.dataset.reportId;
				const schedId = btn.dataset.scheduleId;

				try {
					await this.resendDelivery(reportId, schedId);
					// Reload history after successful resend
					setTimeout(() => {
						window.location.reload();
					}, 1500);
				} catch (error) {
					console.error('Resend failed:', error);
				}
			});
		});

		// Load recipients count for each row
		this._loadRecipientsCount(container, scheduleId);
	}

	/**
	 * Load and display recipients count for all rows
	 *
	 * @param {HTMLElement} container - Container element
	 * @param {string} scheduleId - Schedule ID
	 */
	async _loadRecipientsCount(container, scheduleId) {
		try {
			const recipients = await this._fetchRecipients(scheduleId);
			const count = recipients.length;

			// Update all recipient badges
			container.querySelectorAll('.recipients-badge').forEach(badge => {
				if (badge.dataset.scheduleId === scheduleId) {
					badge.innerHTML = count.toString();
					badge.title = `${count} destinatario${count !== 1 ? 's' : ''}`;
				}
			});
		} catch (error) {
			console.error('Error loading recipients count:', error);
			// Show error indicator
			container.querySelectorAll('.recipients-badge').forEach(badge => {
				if (badge.dataset.scheduleId === scheduleId) {
					badge.innerHTML = '?';
					badge.className = 'badge badge-pill badge-secondary';
				}
			});
		}
	}

	// ========================================
	// Helper Methods
	// ========================================

	/**
	 * Get status badge HTML
	 *
	 * @param {string} status - Status value
	 * @returns {string} Badge HTML
	 */
	_getStatusBadge(status) {
		if (status === 'Completed') {
			return '<span class="badge badge-success">Exitoso</span>';
		} else if (status === 'Failed') {
			return '<span class="badge badge-danger">Fallido</span>';
		} else {
			return '<span class="badge badge-secondary">Pendiente</span>';
		}
	}

	/**
	 * Get format badge HTML
	 *
	 * @param {string} format - Export format
	 * @returns {string} Badge HTML
	 */
	_getFormatBadge(format) {
		if (format === 'PDF') {
			return '<span class="badge badge-danger">PDF</span>';
		} else if (format === 'Excel') {
			return '<span class="badge badge-success">Excel</span>';
		} else if (format === 'CSV') {
			return '<span class="badge badge-primary">CSV</span>';
		} else {
			return `<span class="badge badge-secondary">${this._escapeHtml(format)}</span>`;
		}
	}

	/**
	 * Format date to localized string
	 *
	 * @param {Date} date - Date object
	 * @returns {string} Formatted date
	 */
	_formatDate(date) {
		return date.toLocaleDateString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	/**
	 * Format time to localized string
	 *
	 * @param {Date} date - Date object
	 * @returns {string} Formatted time
	 */
	_formatTime(date) {
		return date.toLocaleTimeString('es-ES', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	/**
	 * Format file size to human-readable string
	 *
	 * @param {number} bytes - File size in bytes
	 * @returns {string} Formatted file size
	 */
	_formatFileSize(bytes) {
		if (!bytes || bytes === 0) return '0 B';

		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}

	/**
	 * Escape HTML to prevent XSS
	 *
	 * @param {string} str - String to escape
	 * @returns {string} Escaped string
	 */
	_escapeHtml(str) {
		if (!str) return '';
		const div = document.createElement('div');
		div.textContent = str;
		return div.innerHTML;
	}

	/**
	 * Get loading HTML
	 *
	 * @returns {string} Loading HTML
	 */
	_getLoadingHtml() {
		return `
			<div class="text-center py-4">
				<div class="spinner-border text-primary" role="status">
					<span class="sr-only">Cargando...</span>
				</div>
				<p class="text-muted mt-2">Cargando historial de entregas...</p>
			</div>
		`;
	}

	/**
	 * Get error HTML
	 *
	 * @param {string} message - Error message
	 * @returns {string} Error HTML
	 */
	_getErrorHtml(message) {
		return `
			<div class="alert alert-danger">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 20px; height: 20px; display: inline-block; vertical-align: middle; margin-right: 8px;">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
				<strong>Error:</strong> ${this._escapeHtml(message)}
			</div>
		`;
	}
}

// ========================================
// Global Instance and Module Export
// ========================================

// Create global instance for easy access
if (typeof window !== 'undefined') {
	window.reportScheduleHistory = new ReportScheduleHistory();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
	module.exports = ReportScheduleHistory;
}
