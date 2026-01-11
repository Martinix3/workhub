/**
 * WorkHub Report Export UI Module
 *
 * Provides reusable export functionality for the reporting system.
 * Handles export dropdown, format selection, progress indication, download handling,
 * and export history display.
 *
 * Features:
 * - Export dropdown with format options (PDF, Excel, CSV)
 * - Progress indicator during generation
 * - Automatic download handling
 * - Export history display with download links
 * - Reusable across viewer, listing, and builder pages
 *
 * Usage:
 *   const exportUI = new ReportExportUI();
 *   exportUI.createExportDropdown(container, reportId, options);
 *   exportUI.exportReport(reportId, format, filters);
 *   exportUI.renderExportHistory(container, reportId);
 */

class ReportExportUI {
	constructor(options = {}) {
		this.defaultFormat = options.defaultFormat || 'PDF';
		this.autoDownload = options.autoDownload !== false;
		this.showHistory = options.showHistory !== false;
		this.exports = new Map(); // Track export jobs
	}

	/**
	 * Create an export dropdown button
	 *
	 * @param {HTMLElement|string} container - Container element or ID
	 * @param {string} reportId - Report definition ID
	 * @param {Object} options - Configuration options
	 * @param {Object} options.filters - Optional filters for report generation
	 * @param {string} options.buttonClass - Additional CSS classes for button
	 * @param {string} options.buttonText - Button text (default: "Exportar")
	 * @param {boolean} options.showIcon - Show download icon (default: true)
	 * @param {Function} options.onSuccess - Callback on successful export
	 * @param {Function} options.onError - Callback on export error
	 * @returns {HTMLElement} Export dropdown button group
	 */
	createExportDropdown(container, reportId, options = {}) {
		const containerEl = typeof container === 'string'
			? document.getElementById(container)
			: container;

		if (!containerEl) {
			console.error('Container element not found');
			return null;
		}

		if (!reportId) {
			console.error('Report ID is required');
			return null;
		}

		const filters = options.filters || {};
		const buttonClass = options.buttonClass || 'btn-primary';
		const buttonText = options.buttonText || 'Exportar';
		const showIcon = options.showIcon !== false;

		// Create dropdown button group
		const btnGroup = document.createElement('div');
		btnGroup.className = 'btn-group';

		// Create main button with dropdown
		const dropdownBtn = document.createElement('button');
		dropdownBtn.className = `btn ${buttonClass} dropdown-toggle`;
		dropdownBtn.setAttribute('data-toggle', 'dropdown');
		dropdownBtn.setAttribute('aria-haspopup', 'true');
		dropdownBtn.setAttribute('aria-expanded', 'false');

		if (showIcon) {
			dropdownBtn.innerHTML = `
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 4px;">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
				</svg>
				${this._escapeHtml(buttonText)}
			`;
		} else {
			dropdownBtn.textContent = buttonText;
		}

		// Create dropdown menu
		const dropdownMenu = document.createElement('div');
		dropdownMenu.className = 'dropdown-menu dropdown-menu-right';

		// Add format options
		const formats = [
			{
				value: 'PDF',
				label: 'PDF',
				icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>`,
				description: 'Formato ejecutivo con diseño profesional'
			},
			{
				value: 'Excel',
				label: 'Excel',
				icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>`,
				description: 'Libro de Excel con hojas por sección'
			},
			{
				value: 'CSV',
				label: 'CSV',
				icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>`,
				description: 'Datos tabulares para análisis'
			}
		];

		formats.forEach(format => {
			const item = document.createElement('button');
			item.className = 'dropdown-item';
			item.innerHTML = `
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px; display: inline-block; margin-right: 8px;">
					${format.icon}
				</svg>
				<strong>${this._escapeHtml(format.label)}</strong>
				<br>
				<small class="text-muted ml-4">${this._escapeHtml(format.description)}</small>
			`;

			item.addEventListener('click', (e) => {
				e.preventDefault();
				this.exportReport(reportId, format.value, filters, options.onSuccess, options.onError);
			});

			dropdownMenu.appendChild(item);
		});

		// Add divider and history link if enabled
		if (this.showHistory) {
			const divider = document.createElement('div');
			divider.className = 'dropdown-divider';
			dropdownMenu.appendChild(divider);

			const historyItem = document.createElement('a');
			historyItem.className = 'dropdown-item';
			historyItem.href = '#';
			historyItem.innerHTML = `
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px; display: inline-block; margin-right: 8px;">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
				Ver historial de exportaciones
			`;
			historyItem.addEventListener('click', (e) => {
				e.preventDefault();
				this._showHistoryModal(reportId);
			});
			dropdownMenu.appendChild(historyItem);
		}

		// Assemble dropdown
		btnGroup.appendChild(dropdownBtn);
		btnGroup.appendChild(dropdownMenu);

		// Append to container
		containerEl.appendChild(btnGroup);

		return btnGroup;
	}

	/**
	 * Export a report in the specified format
	 *
	 * @param {string} reportId - Report definition ID
	 * @param {string} format - Export format (PDF, Excel, CSV)
	 * @param {Object} filters - Optional filters for report generation
	 * @param {Function} onSuccess - Optional success callback
	 * @param {Function} onError - Optional error callback
	 * @returns {Promise} Export promise
	 */
	exportReport(reportId, format = 'PDF', filters = {}, onSuccess = null, onError = null) {
		if (!reportId) {
			console.error('Report ID is required');
			if (onError) onError(new Error('Report ID is required'));
			return Promise.reject(new Error('Report ID is required'));
		}

		// Normalize format
		format = format.toUpperCase();

		// Validate format
		if (!['PDF', 'EXCEL', 'CSV'].includes(format)) {
			console.error('Invalid export format:', format);
			if (onError) onError(new Error('Invalid export format'));
			return Promise.reject(new Error('Invalid export format'));
		}

		// Generate unique job ID
		const jobId = `export-${reportId}-${Date.now()}`;

		// Show progress
		this._showProgress(jobId, format);

		// Track export
		this.exports.set(jobId, {
			reportId,
			format,
			status: 'pending',
			startedAt: new Date()
		});

		// Call export API
		return new Promise((resolve, reject) => {
			frappe.call({
				method: 'workhub_frappe_app.api.report_export.export_report',
				args: {
					report_id: reportId,
					format: format,
					filters: filters
				},
				callback: (r) => {
					this._hideProgress(jobId);

					if (r.message && r.message.success) {
						// Update export status
						const exportData = this.exports.get(jobId);
						if (exportData) {
							exportData.status = 'completed';
							exportData.completedAt = new Date();
							exportData.fileUrl = r.message.file_url;
							exportData.generatedReportId = r.message.generated_report_id;
						}

						// Show success message
						frappe.show_alert({
							message: `Reporte exportado exitosamente a ${format}`,
							indicator: 'green'
						});

						// Auto-download if enabled
						if (this.autoDownload && r.message.file_url) {
							this._downloadFile(r.message.file_url);
						}

						// Call success callback
						if (onSuccess) {
							onSuccess(r.message);
						}

						resolve(r.message);
					} else {
						// Update export status
						const exportData = this.exports.get(jobId);
						if (exportData) {
							exportData.status = 'failed';
							exportData.completedAt = new Date();
							exportData.error = r.message ? r.message.message : 'Error desconocido';
						}

						// Show error message
						const errorMsg = r.message ? r.message.message : 'Error al exportar el reporte';
						frappe.show_alert({
							message: errorMsg,
							indicator: 'red'
						});

						// Call error callback
						if (onError) {
							onError(new Error(errorMsg));
						}

						reject(new Error(errorMsg));
					}
				},
				error: (err) => {
					this._hideProgress(jobId);

					// Update export status
					const exportData = this.exports.get(jobId);
					if (exportData) {
						exportData.status = 'failed';
						exportData.completedAt = new Date();
						exportData.error = err.message || 'Error de red';
					}

					// Show error message
					frappe.show_alert({
						message: 'Error al exportar: ' + (err.message || 'Error de red'),
						indicator: 'red'
					});

					// Call error callback
					if (onError) {
						onError(err);
					}

					reject(err);
				}
			});
		});
	}

	/**
	 * Render export history for a report
	 *
	 * @param {HTMLElement|string} container - Container element or ID
	 * @param {string} reportId - Report definition ID
	 * @param {Object} options - Configuration options
	 * @param {number} options.limit - Number of exports to show (default: 10)
	 * @param {boolean} options.showCard - Wrap in card (default: true)
	 * @param {string} options.title - Card title (default: "Historial de Exportaciones")
	 * @returns {Promise<HTMLElement>} Rendered history container
	 */
	async renderExportHistory(container, reportId, options = {}) {
		const containerEl = typeof container === 'string'
			? document.getElementById(container)
			: container;

		if (!containerEl) {
			console.error('Container element not found');
			return null;
		}

		if (!reportId) {
			console.error('Report ID is required');
			return null;
		}

		const limit = options.limit || 10;
		const showCard = options.showCard !== false;
		const title = options.title || 'Historial de Exportaciones';

		// Show loading state
		containerEl.innerHTML = '<div class="text-center p-3"><div class="spinner-border" role="status"></div></div>';

		try {
			// Fetch export history
			const response = await this._fetchExportHistory(reportId, limit);

			if (!response || !response.success || !response.exports) {
				throw new Error('No se pudo cargar el historial');
			}

			const exports = response.exports;

			// Create container
			let contentEl = containerEl;

			if (showCard) {
				contentEl = document.createElement('div');
				contentEl.className = 'card mt-3';

				const header = document.createElement('div');
				header.className = 'card-header d-flex justify-content-between align-items-center';
				header.innerHTML = `
					<h5 class="mb-0">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 20px; height: 20px; display: inline-block; vertical-align: middle; margin-right: 8px;">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
						${this._escapeHtml(title)}
					</h5>
					<span class="badge badge-secondary">${exports.length} exportaciones</span>
				`;

				const body = document.createElement('div');
				body.className = 'card-body';

				contentEl.appendChild(header);
				contentEl.appendChild(body);

				containerEl.innerHTML = '';
				containerEl.appendChild(contentEl);

				contentEl = body;
			} else {
				contentEl.innerHTML = '';
			}

			// Render exports
			if (exports.length === 0) {
				contentEl.innerHTML = `
					<div class="text-center text-muted p-4">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 48px; height: 48px; margin: 0 auto;">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
						</svg>
						<p class="mt-3">No hay exportaciones recientes</p>
					</div>
				`;
			} else {
				const table = this._createHistoryTable(exports);
				contentEl.appendChild(table);
			}

			return containerEl;
		} catch (err) {
			console.error('Error loading export history:', err);
			containerEl.innerHTML = `
				<div class="alert alert-danger">
					Error al cargar historial: ${this._escapeHtml(err.message)}
				</div>
			`;
			return containerEl;
		}
	}

	/**
	 * Create history table HTML
	 * @private
	 */
	_createHistoryTable(exports) {
		const table = document.createElement('div');
		table.className = 'table-responsive';

		const tableEl = document.createElement('table');
		tableEl.className = 'table table-sm table-hover';

		// Header
		const thead = document.createElement('thead');
		thead.innerHTML = `
			<tr>
				<th>Formato</th>
				<th>Generado</th>
				<th>Usuario</th>
				<th>Estado</th>
				<th class="text-right">Acciones</th>
			</tr>
		`;

		// Body
		const tbody = document.createElement('tbody');

		exports.forEach(exp => {
			const row = document.createElement('tr');

			// Format badge
			const formatColor = exp.export_format === 'PDF' ? 'danger' :
				exp.export_format === 'Excel' ? 'success' : 'info';

			// Status badge
			const statusBadge = exp.status === 'Completed' ?
				'<span class="badge badge-success">Completado</span>' :
				exp.status === 'Failed' ?
					'<span class="badge badge-danger">Fallido</span>' :
					'<span class="badge badge-warning">Pendiente</span>';

			row.innerHTML = `
				<td>
					<span class="badge badge-${formatColor}">${this._escapeHtml(exp.export_format || '-')}</span>
				</td>
				<td>
					<small>${this._formatDate(exp.generated_at)}</small>
				</td>
				<td>
					<small>${this._escapeHtml(exp.generated_by_name || '-')}</small>
				</td>
				<td>${statusBadge}</td>
				<td class="text-right">
					${exp.file_url && exp.status === 'Completed' ? `
						<button class="btn btn-sm btn-outline-primary" onclick="window.open('${this._escapeHtml(exp.file_url)}', '_blank')">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 14px; height: 14px;">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
							</svg>
							Descargar
						</button>
					` : '-'}
				</td>
			`;

			tbody.appendChild(row);
		});

		tableEl.appendChild(thead);
		tableEl.appendChild(tbody);
		table.appendChild(tableEl);

		return table;
	}

	/**
	 * Show export history in a modal
	 * @private
	 */
	async _showHistoryModal(reportId) {
		// Create modal
		const modal = document.createElement('div');
		modal.className = 'modal fade';
		modal.id = 'exportHistoryModal';
		modal.setAttribute('tabindex', '-1');
		modal.setAttribute('role', 'dialog');

		modal.innerHTML = `
			<div class="modal-dialog modal-lg" role="document">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Historial de Exportaciones</h5>
						<button type="button" class="close" data-dismiss="modal">
							<span>&times;</span>
						</button>
					</div>
					<div class="modal-body" id="exportHistoryContent">
						<div class="text-center p-3">
							<div class="spinner-border" role="status"></div>
						</div>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" data-dismiss="modal">Cerrar</button>
					</div>
				</div>
			</div>
		`;

		document.body.appendChild(modal);

		// Show modal
		$(modal).modal('show');

		// Load history
		const contentEl = document.getElementById('exportHistoryContent');
		await this.renderExportHistory(contentEl, reportId, { showCard: false });

		// Remove modal on close
		$(modal).on('hidden.bs.modal', function () {
			modal.remove();
		});
	}

	/**
	 * Fetch export history from API
	 * @private
	 */
	_fetchExportHistory(reportId, limit = 10) {
		return new Promise((resolve, reject) => {
			frappe.call({
				method: 'frappe.client.get_list',
				args: {
					doctype: 'WH Generated Report',
					filters: {
						report_definition: reportId
					},
					fields: ['name', 'export_format', 'generated_at', 'generated_by', 'file_url', 'status'],
					order_by: 'generated_at desc',
					limit: limit
				},
				callback: (r) => {
					if (r.message) {
						// Enrich with user names
						const exports = r.message;

						// Fetch user names
						const userIds = [...new Set(exports.map(e => e.generated_by).filter(Boolean))];

						if (userIds.length > 0) {
							frappe.call({
								method: 'frappe.client.get_list',
								args: {
									doctype: 'User',
									filters: [['name', 'in', userIds]],
									fields: ['name', 'full_name']
								},
								callback: (userResp) => {
									if (userResp.message) {
										const userMap = {};
										userResp.message.forEach(u => {
											userMap[u.name] = u.full_name || u.name;
										});

										exports.forEach(exp => {
											exp.generated_by_name = userMap[exp.generated_by] || exp.generated_by;
										});
									}

									resolve({
										success: true,
										exports: exports
									});
								},
								error: (err) => {
									// Even if user fetch fails, return exports
									exports.forEach(exp => {
										exp.generated_by_name = exp.generated_by;
									});
									resolve({
										success: true,
										exports: exports
									});
								}
							});
						} else {
							resolve({
								success: true,
								exports: exports
							});
						}
					} else {
						reject(new Error('No response from server'));
					}
				},
				error: (err) => {
					reject(err);
				}
			});
		});
	}

	/**
	 * Show progress indicator
	 * @private
	 */
	_showProgress(jobId, format) {
		const message = `Generando ${format}...`;
		frappe.show_progress(message, 0, 100, message);
	}

	/**
	 * Hide progress indicator
	 * @private
	 */
	_hideProgress(jobId) {
		frappe.hide_progress();
	}

	/**
	 * Download file
	 * @private
	 */
	_downloadFile(url) {
		// Open in new tab to trigger download
		window.open(url, '_blank');
	}

	/**
	 * Format date for display
	 * @private
	 */
	_formatDate(dateStr) {
		if (!dateStr) return '-';

		try {
			const date = new Date(dateStr);
			const day = String(date.getDate()).padStart(2, '0');
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const year = date.getFullYear();
			const hours = String(date.getHours()).padStart(2, '0');
			const minutes = String(date.getMinutes()).padStart(2, '0');

			return `${day}/${month}/${year} ${hours}:${minutes}`;
		} catch (e) {
			return dateStr;
		}
	}

	/**
	 * Escape HTML to prevent XSS
	 * @private
	 */
	_escapeHtml(text) {
		if (text === null || text === undefined) return '';

		const div = document.createElement('div');
		div.textContent = String(text);
		return div.innerHTML;
	}

	/**
	 * Get export job status
	 *
	 * @param {string} jobId - Job ID
	 * @returns {Object|null} Job status or null if not found
	 */
	getExportStatus(jobId) {
		return this.exports.get(jobId) || null;
	}

	/**
	 * Clear completed exports from tracking
	 *
	 * @param {number} olderThanMinutes - Clear exports older than N minutes
	 */
	clearCompletedExports(olderThanMinutes = 30) {
		const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);

		for (const [jobId, exportData] of this.exports.entries()) {
			if (exportData.status === 'completed' || exportData.status === 'failed') {
				if (exportData.completedAt && exportData.completedAt < cutoffTime) {
					this.exports.delete(jobId);
				}
			}
		}
	}
}

// Create global instance for easy access
window.reportExportUI = new ReportExportUI();

// Module export for CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
	module.exports = ReportExportUI;
}
