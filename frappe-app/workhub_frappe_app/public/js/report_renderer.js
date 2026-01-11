/**
 * WorkHub Report Renderer Module
 *
 * Provides advanced rendering functionality for tables and KPI cards in the reporting system.
 * Complements the chart renderer with interactive tables and rich KPI displays.
 *
 * Features:
 * - Tables: sortable columns, pagination, search/filter
 * - KPI Cards: value display, comparison (vs previous period), trend indicators, sparklines
 *
 * Usage:
 *   const tableRenderer = new ReportTableRenderer();
 *   tableRenderer.renderTable(container, config, data);
 *
 *   const kpiRenderer = new ReportKPIRenderer();
 *   kpiRenderer.renderKPICards(container, config, data);
 */

/**
 * Report Table Renderer
 * Renders interactive data tables with sorting, pagination, and filtering
 */
class ReportTableRenderer {
	constructor(options = {}) {
		this.tables = new Map();
		this.defaultPageSize = options.defaultPageSize || 25;
		this.pageSizeOptions = options.pageSizeOptions || [10, 25, 50, 100];
	}

	/**
	 * Render a table with advanced features
	 *
	 * @param {HTMLElement|string} container - Container element or ID
	 * @param {Object} config - Table configuration
	 * @param {Array} config.columns - Column definitions [{field, label, type, sortable}]
	 * @param {boolean} config.show_totals - Show totals row
	 * @param {number} config.page_size - Rows per page
	 * @param {boolean} config.searchable - Enable search
	 * @param {boolean} config.sortable - Enable sorting (default: true)
	 * @param {Object} config.sort - Initial sort {field, order: 'asc'|'desc'}
	 * @param {Array} data - Array of data objects
	 * @param {string} tableId - Unique ID for table state management
	 * @returns {HTMLElement} Rendered table container
	 */
	renderTable(container, config, data, tableId = 'table-' + Date.now()) {
		// Get container element
		const containerEl = typeof container === 'string'
			? document.getElementById(container)
			: container;

		if (!containerEl) {
			console.error('Table container not found');
			return null;
		}

		// Validate configuration
		if (!config.columns || config.columns.length === 0) {
			containerEl.innerHTML = '<p class="text-muted">No hay columnas configuradas</p>';
			return containerEl;
		}

		// Initialize table state
		const tableState = {
			id: tableId,
			config: config,
			originalData: data || [],
			filteredData: data || [],
			currentPage: 1,
			pageSize: config.page_size || this.defaultPageSize,
			sortField: config.sort?.field || null,
			sortOrder: config.sort?.order || 'asc',
			searchTerm: ''
		};

		this.tables.set(tableId, tableState);

		// Render table
		this._renderTableHTML(containerEl, tableState);

		return containerEl;
	}

	/**
	 * Update table with new data
	 *
	 * @param {string} tableId - Table ID
	 * @param {Array} data - New data array
	 */
	updateTable(tableId, data) {
		const state = this.tables.get(tableId);
		if (!state) {
			console.error('Table not found:', tableId);
			return;
		}

		state.originalData = data || [];
		state.filteredData = this._filterData(data || [], state.searchTerm);
		state.currentPage = 1;

		const container = document.getElementById(tableId + '-container');
		if (container) {
			this._renderTableHTML(container, state);
		}
	}

	/**
	 * Destroy table and clean up state
	 *
	 * @param {string} tableId - Table ID
	 */
	destroyTable(tableId) {
		this.tables.delete(tableId);
	}

	/**
	 * Internal: Render table HTML
	 */
	_renderTableHTML(containerEl, state) {
		const { config, filteredData, currentPage, pageSize, sortField, sortOrder } = state;

		// Calculate pagination
		const totalRows = filteredData.length;
		const totalPages = Math.ceil(totalRows / pageSize);
		const startRow = (currentPage - 1) * pageSize;
		const endRow = Math.min(startRow + pageSize, totalRows);
		const pageData = filteredData.slice(startRow, endRow);

		// Build HTML
		let html = '<div class="report-table-wrapper">';

		// Search bar (if enabled)
		if (config.searchable !== false) {
			html += this._renderSearchBar(state);
		}

		// Table
		html += '<div class="table-responsive">';
		html += '<table class="table table-bordered table-hover report-data-table">';

		// Header
		html += '<thead><tr>';
		config.columns.forEach(col => {
			const isSortable = config.sortable !== false && col.sortable !== false;
			const isSorted = sortField === col.field;
			const sortIcon = isSorted
				? (sortOrder === 'asc' ? ' ↑' : ' ↓')
				: '';

			if (isSortable) {
				html += `<th class="sortable" onclick="window.reportTableRenderer.sortTable('${state.id}', '${col.field}')" style="cursor: pointer;">
					${this._escapeHtml(col.label || col.field)}${sortIcon}
				</th>`;
			} else {
				html += `<th>${this._escapeHtml(col.label || col.field)}</th>`;
			}
		});
		html += '</tr></thead>';

		// Body
		html += '<tbody>';
		if (pageData.length === 0) {
			html += `<tr><td colspan="${config.columns.length}" class="text-center text-muted">
				${state.searchTerm ? 'No se encontraron resultados' : 'No hay datos disponibles'}
			</td></tr>`;
		} else {
			pageData.forEach((row, index) => {
				html += `<tr>`;
				config.columns.forEach(col => {
					const value = row[col.field];
					html += `<td>${this._formatCellValue(value, col.type, col.format)}</td>`;
				});
				html += '</tr>';
			});
		}
		html += '</tbody>';

		// Totals row (if enabled)
		if (config.show_totals && filteredData.length > 0) {
			html += '<tfoot><tr class="table-totals">';
			config.columns.forEach((col, idx) => {
				if (idx === 0) {
					html += '<th>Total</th>';
				} else if (col.type === 'number' || col.type === 'currency') {
					const total = this._calculateColumnTotal(filteredData, col.field);
					html += `<th>${this._formatCellValue(total, col.type, col.format)}</th>`;
				} else {
					html += '<th></th>';
				}
			});
			html += '</tr></tfoot>';
		}

		html += '</table></div>';

		// Pagination controls
		if (totalPages > 1 || totalRows > 10) {
			html += this._renderPaginationControls(state, totalRows, totalPages, startRow, endRow);
		}

		html += '</div>';

		containerEl.innerHTML = html;
		containerEl.id = state.id + '-container';
	}

	/**
	 * Internal: Render search bar
	 */
	_renderSearchBar(state) {
		return `
			<div class="table-search-bar" style="margin-bottom: 15px;">
				<div class="input-group">
					<span class="input-group-text">🔍</span>
					<input
						type="text"
						class="form-control"
						placeholder="Buscar en la tabla..."
						value="${this._escapeHtml(state.searchTerm)}"
						onkeyup="window.reportTableRenderer.searchTable('${state.id}', this.value)"
					/>
				</div>
			</div>
		`;
	}

	/**
	 * Internal: Render pagination controls
	 */
	_renderPaginationControls(state, totalRows, totalPages, startRow, endRow) {
		const { currentPage, pageSize } = state;

		let html = '<div class="table-pagination" style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">';

		// Info
		html += `<div class="pagination-info text-muted">
			Mostrando ${startRow + 1} - ${endRow} de ${totalRows} registros
		</div>`;

		// Page size selector
		html += '<div class="page-size-selector">';
		html += '<select class="form-select form-select-sm" style="width: auto; display: inline-block;" ';
		html += `onchange="window.reportTableRenderer.changePageSize('${state.id}', this.value)">`;
		this.pageSizeOptions.forEach(size => {
			const selected = size === pageSize ? 'selected' : '';
			html += `<option value="${size}" ${selected}>${size} por página</option>`;
		});
		html += '</select></div>';

		// Page buttons
		html += '<div class="pagination-buttons">';
		html += '<div class="btn-group btn-group-sm" role="group">';

		// Previous button
		const prevDisabled = currentPage === 1 ? 'disabled' : '';
		html += `<button type="button" class="btn btn-outline-secondary" ${prevDisabled}
			onclick="window.reportTableRenderer.goToPage('${state.id}', ${currentPage - 1})">
			« Anterior
		</button>`;

		// Page numbers (show max 5 pages)
		const pageRange = this._getPageRange(currentPage, totalPages);
		pageRange.forEach(page => {
			if (page === '...') {
				html += '<button type="button" class="btn btn-outline-secondary" disabled>...</button>';
			} else {
				const active = page === currentPage ? 'active' : '';
				html += `<button type="button" class="btn btn-outline-secondary ${active}"
					onclick="window.reportTableRenderer.goToPage('${state.id}', ${page})">
					${page}
				</button>`;
			}
		});

		// Next button
		const nextDisabled = currentPage === totalPages ? 'disabled' : '';
		html += `<button type="button" class="btn btn-outline-secondary" ${nextDisabled}
			onclick="window.reportTableRenderer.goToPage('${state.id}', ${currentPage + 1})">
			Siguiente »
		</button>`;

		html += '</div></div>';
		html += '</div>';

		return html;
	}

	/**
	 * Public: Sort table by field
	 */
	sortTable(tableId, field) {
		const state = this.tables.get(tableId);
		if (!state) return;

		// Toggle sort order if same field, otherwise default to asc
		if (state.sortField === field) {
			state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			state.sortField = field;
			state.sortOrder = 'asc';
		}

		// Sort filtered data
		state.filteredData.sort((a, b) => {
			const aVal = a[field];
			const bVal = b[field];

			// Handle null/undefined
			if (aVal == null && bVal == null) return 0;
			if (aVal == null) return 1;
			if (bVal == null) return -1;

			// Compare values
			let comparison = 0;
			if (typeof aVal === 'number' && typeof bVal === 'number') {
				comparison = aVal - bVal;
			} else {
				comparison = String(aVal).localeCompare(String(bVal), 'es-ES');
			}

			return state.sortOrder === 'asc' ? comparison : -comparison;
		});

		// Re-render
		const container = document.getElementById(tableId + '-container');
		if (container) {
			this._renderTableHTML(container, state);
		}
	}

	/**
	 * Public: Search/filter table
	 */
	searchTable(tableId, searchTerm) {
		const state = this.tables.get(tableId);
		if (!state) return;

		state.searchTerm = searchTerm;
		state.filteredData = this._filterData(state.originalData, searchTerm);
		state.currentPage = 1; // Reset to first page

		const container = document.getElementById(tableId + '-container');
		if (container) {
			this._renderTableHTML(container, state);
		}
	}

	/**
	 * Public: Go to specific page
	 */
	goToPage(tableId, page) {
		const state = this.tables.get(tableId);
		if (!state) return;

		const totalPages = Math.ceil(state.filteredData.length / state.pageSize);
		if (page < 1 || page > totalPages) return;

		state.currentPage = page;

		const container = document.getElementById(tableId + '-container');
		if (container) {
			this._renderTableHTML(container, state);
		}
	}

	/**
	 * Public: Change page size
	 */
	changePageSize(tableId, size) {
		const state = this.tables.get(tableId);
		if (!state) return;

		state.pageSize = parseInt(size);
		state.currentPage = 1; // Reset to first page

		const container = document.getElementById(tableId + '-container');
		if (container) {
			this._renderTableHTML(container, state);
		}
	}

	/**
	 * Internal: Filter data by search term
	 */
	_filterData(data, searchTerm) {
		if (!searchTerm || searchTerm.trim() === '') {
			return data;
		}

		const term = searchTerm.toLowerCase();
		return data.filter(row => {
			return Object.values(row).some(value => {
				if (value == null) return false;
				return String(value).toLowerCase().includes(term);
			});
		});
	}

	/**
	 * Internal: Calculate column total
	 */
	_calculateColumnTotal(data, field) {
		return data.reduce((sum, row) => {
			const value = parseFloat(row[field]) || 0;
			return sum + value;
		}, 0);
	}

	/**
	 * Internal: Get page range for pagination buttons
	 */
	_getPageRange(currentPage, totalPages) {
		const maxButtons = 5;
		const pages = [];

		if (totalPages <= maxButtons) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			// Always show first page
			pages.push(1);

			// Calculate range around current page
			let start = Math.max(2, currentPage - 1);
			let end = Math.min(totalPages - 1, currentPage + 1);

			// Add ellipsis if needed
			if (start > 2) {
				pages.push('...');
			}

			// Add middle pages
			for (let i = start; i <= end; i++) {
				pages.push(i);
			}

			// Add ellipsis if needed
			if (end < totalPages - 1) {
				pages.push('...');
			}

			// Always show last page
			pages.push(totalPages);
		}

		return pages;
	}

	/**
	 * Internal: Format cell value based on type
	 */
	_formatCellValue(value, type, format) {
		if (value === null || value === undefined || value === '') {
			return '<span class="text-muted">-</span>';
		}

		switch (type) {
			case 'currency':
				const num = parseFloat(value);
				return new Intl.NumberFormat('es-ES', {
					style: 'currency',
					currency: format?.currency || 'EUR'
				}).format(num);

			case 'number':
				return new Intl.NumberFormat('es-ES', {
					minimumFractionDigits: format?.decimals || 0,
					maximumFractionDigits: format?.decimals || 2
				}).format(parseFloat(value));

			case 'percentage':
				return `${parseFloat(value).toFixed(format?.decimals || 1)}%`;

			case 'date':
				const date = new Date(value);
				return date.toLocaleDateString('es-ES', {
					year: 'numeric',
					month: format?.month || 'short',
					day: 'numeric'
				});

			case 'datetime':
				const datetime = new Date(value);
				return datetime.toLocaleString('es-ES', {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				});

			default:
				return this._escapeHtml(String(value));
		}
	}

	/**
	 * Internal: Escape HTML to prevent XSS
	 */
	_escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
}


/**
 * Report KPI Renderer
 * Renders KPI cards with comparisons, trends, and sparklines
 */
class ReportKPIRenderer {
	constructor(options = {}) {
		this.defaultColors = options.defaultColors || {
			primary: '#667eea',
			success: '#43e97b',
			warning: '#fee140',
			danger: '#fa709a',
			info: '#4facfe'
		};
	}

	/**
	 * Render KPI cards
	 *
	 * @param {HTMLElement|string} container - Container element or ID
	 * @param {Object} config - KPI configuration
	 * @param {Array} config.kpis - KPI definitions
	 * @param {Array} data - Current period data
	 * @param {Array} comparisonData - Previous period data (optional)
	 * @returns {HTMLElement} Rendered container
	 */
	renderKPICards(container, config, data, comparisonData = null) {
		// Get container element
		const containerEl = typeof container === 'string'
			? document.getElementById(container)
			: container;

		if (!containerEl) {
			console.error('KPI container not found');
			return null;
		}

		const kpis = config.kpis || [];
		if (kpis.length === 0) {
			containerEl.innerHTML = '<p class="text-muted">No hay KPIs configurados</p>';
			return containerEl;
		}

		// Render KPI grid
		let html = '<div class="kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">';

		kpis.forEach((kpi, index) => {
			html += this._renderKPICard(kpi, data, comparisonData, index);
		});

		html += '</div>';
		containerEl.innerHTML = html;

		// Render sparklines if enabled
		this._renderSparklines(containerEl, kpis, data);

		return containerEl;
	}

	/**
	 * Internal: Render single KPI card
	 */
	_renderKPICard(kpi, data, comparisonData, index) {
		const color = kpi.color || this.defaultColors.primary;
		const gradientColor = this._adjustColor(color, -20);
		const icon = kpi.icon || '📊';

		// Calculate current value
		const currentValue = this._calculateKPIValue(kpi, data);
		const formattedValue = this._formatKPIValue(currentValue, kpi.format);

		// Calculate comparison if available
		let comparisonHtml = '';
		if (comparisonData && kpi.comparison_field) {
			const previousValue = this._calculateKPIValue(kpi, comparisonData);
			comparisonHtml = this._renderComparison(currentValue, previousValue, kpi.format);
		}

		// Sparkline placeholder
		const sparklineHtml = kpi.show_sparkline
			? `<canvas id="kpi-sparkline-${index}" class="kpi-sparkline" width="120" height="30"></canvas>`
			: '';

		return `
			<div class="kpi-card" style="
				background: linear-gradient(135deg, ${color} 0%, ${gradientColor} 100%);
				border-radius: 12px;
				padding: 20px;
				color: white;
				box-shadow: 0 4px 6px rgba(0,0,0,0.1);
				transition: transform 0.2s;
			" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
				<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
					<div class="kpi-icon" style="font-size: 32px; opacity: 0.9;">${icon}</div>
					${comparisonHtml}
				</div>
				<div class="kpi-label" style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">
					${this._escapeHtml(kpi.label || '')}
				</div>
				<div class="kpi-value" style="font-size: 32px; font-weight: bold; margin-bottom: 5px;">
					${formattedValue}
				</div>
				${kpi.subtitle ? `<div class="kpi-subtitle" style="font-size: 12px; opacity: 0.8;">
					${this._escapeHtml(kpi.subtitle)}
				</div>` : ''}
				${sparklineHtml}
			</div>
		`;
	}

	/**
	 * Internal: Render comparison indicator
	 */
	_renderComparison(currentValue, previousValue, format) {
		if (previousValue === 0 || previousValue === null) {
			return '';
		}

		const change = currentValue - previousValue;
		const percentChange = (change / previousValue) * 100;
		const isPositive = change >= 0;
		const arrow = isPositive ? '↑' : '↓';
		const changeClass = isPositive ? 'positive' : 'negative';

		return `
			<div class="kpi-comparison" style="
				display: flex;
				flex-direction: column;
				align-items: flex-end;
				font-size: 12px;
			">
				<div class="trend-indicator" style="
					background: rgba(255,255,255,0.2);
					padding: 4px 8px;
					border-radius: 6px;
					font-weight: bold;
				">
					${arrow} ${Math.abs(percentChange).toFixed(1)}%
				</div>
				<div class="comparison-label" style="opacity: 0.8; margin-top: 4px;">
					vs período anterior
				</div>
			</div>
		`;
	}

	/**
	 * Internal: Render sparklines for KPIs
	 */
	_renderSparklines(containerEl, kpis, data) {
		kpis.forEach((kpi, index) => {
			if (!kpi.show_sparkline) return;

			const canvas = containerEl.querySelector(`#kpi-sparkline-${index}`);
			if (!canvas) return;

			// Extract sparkline data (last N values from time series)
			const sparklineData = this._extractSparklineData(kpi, data);
			if (sparklineData.length < 2) return;

			this._drawSparkline(canvas, sparklineData, kpi.color || this.defaultColors.primary);
		});
	}

	/**
	 * Internal: Extract sparkline data from dataset
	 */
	_extractSparklineData(kpi, data) {
		if (!Array.isArray(data) || data.length === 0) {
			return [];
		}

		// If data has time series field, use it
		if (kpi.time_field && kpi.metric_field) {
			return data
				.sort((a, b) => new Date(a[kpi.time_field]) - new Date(b[kpi.time_field]))
				.map(row => parseFloat(row[kpi.metric_field]) || 0)
				.slice(-10); // Last 10 data points
		}

		// Otherwise, aggregate by metric field
		const values = data
			.map(row => parseFloat(row[kpi.metric_field]) || 0)
			.filter(v => !isNaN(v))
			.slice(-10);

		return values;
	}

	/**
	 * Internal: Draw sparkline on canvas
	 */
	_drawSparkline(canvas, data, color) {
		const ctx = canvas.getContext('2d');
		const width = canvas.width;
		const height = canvas.height;
		const padding = 2;

		// Clear canvas
		ctx.clearRect(0, 0, width, height);

		if (data.length < 2) return;

		// Calculate scale
		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;

		// Draw line
		ctx.beginPath();
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
		ctx.lineWidth = 2;
		ctx.lineJoin = 'round';

		const stepX = (width - padding * 2) / (data.length - 1);

		data.forEach((value, index) => {
			const x = padding + index * stepX;
			const y = height - padding - ((value - min) / range) * (height - padding * 2);

			if (index === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		});

		ctx.stroke();

		// Draw area fill
		ctx.lineTo(width - padding, height - padding);
		ctx.lineTo(padding, height - padding);
		ctx.closePath();
		ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
		ctx.fill();
	}

	/**
	 * Internal: Calculate KPI value from data
	 */
	_calculateKPIValue(kpi, data) {
		if (!data || data.length === 0) {
			return 0;
		}

		const field = kpi.metric_field || '';
		const aggregation = kpi.aggregation || 'sum';

		// Count aggregation
		if (aggregation === 'count') {
			return data.length;
		}

		// Extract numeric values
		const values = data
			.map(row => parseFloat(row[field]) || 0)
			.filter(v => !isNaN(v));

		if (values.length === 0) return 0;

		// Calculate based on aggregation type
		switch (aggregation) {
			case 'sum':
				return values.reduce((a, b) => a + b, 0);
			case 'avg':
				return values.reduce((a, b) => a + b, 0) / values.length;
			case 'min':
				return Math.min(...values);
			case 'max':
				return Math.max(...values);
			default:
				return values[0];
		}
	}

	/**
	 * Internal: Format KPI value based on format type
	 */
	_formatKPIValue(value, format) {
		if (value === null || value === undefined) {
			return '---';
		}

		switch (format) {
			case 'currency':
				return new Intl.NumberFormat('es-ES', {
					style: 'currency',
					currency: 'EUR',
					minimumFractionDigits: 0,
					maximumFractionDigits: 0
				}).format(value);

			case 'percentage':
				return `${value.toFixed(1)}%`;

			case 'number':
				if (value >= 1000000) {
					return (value / 1000000).toFixed(1) + 'M';
				} else if (value >= 1000) {
					return (value / 1000).toFixed(1) + 'K';
				}
				return new Intl.NumberFormat('es-ES', {
					minimumFractionDigits: 0,
					maximumFractionDigits: 1
				}).format(value);

			default:
				return String(value);
		}
	}

	/**
	 * Internal: Adjust color brightness
	 */
	_adjustColor(color, amount) {
		// Convert hex to RGB
		const hex = color.replace('#', '');
		const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
		const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
		const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));

		return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
	}

	/**
	 * Internal: Escape HTML to prevent XSS
	 */
	_escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
}


// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { ReportTableRenderer, ReportKPIRenderer };
}

// Make available globally for inline scripts
if (typeof window !== 'undefined') {
	window.ReportTableRenderer = ReportTableRenderer;
	window.ReportKPIRenderer = ReportKPIRenderer;

	// Create global instances for convenience
	window.reportTableRenderer = new ReportTableRenderer();
	window.reportKPIRenderer = new ReportKPIRenderer();
}
