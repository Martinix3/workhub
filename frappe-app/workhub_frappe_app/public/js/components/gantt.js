/**
 * GanttChart Component - Timeline/Gantt View
 * Neobrutalismo Editorial Design System
 *
 * Main component for rendering Gantt chart with tasks, dependencies, and milestones.
 * Handles initialization, data binding, rendering, and basic interactions.
 */

(function() {
	'use strict';

	// Namespace
	if (!frappe.workhub) {
		frappe.workhub = {};
	}

	/**
	 * GanttChart - Main Gantt chart component
	 *
	 * @class
	 * @param {string|HTMLElement} container - Container selector or element
	 * @param {Object} options - Configuration options
	 */
	frappe.workhub.GanttChart = class GanttChart {
		constructor(container, options = {}) {
			// Container element
			this.container = typeof container === 'string'
				? document.querySelector(container)
				: container;

			if (!this.container) {
				throw new Error('GanttChart: Container element not found');
			}

			// Options
			this.options = Object.assign({
				zoom: 'month', // day, week, month, quarter
				showWeekends: true,
				showToday: true,
				minColumnWidth: 40,
				maxColumnWidth: 200,
				rowHeight: 56,
				taskBarHeight: 32,
			}, options);

			// Data
			this.project = null;
			this.tasks = [];
			this.dependencies = [];
			this.milestones = [];
			this.criticalPath = [];

			// Date range
			this.startDate = null;
			this.endDate = null;
			this.dateColumns = [];

			// State
			this.currentZoom = this.options.zoom;
			this.showCriticalPath = false;

			// Elements
			this.elements = {
				timeline: null,
				header: null,
				body: null,
				svg: null
			};

			// Initialize
			this._init();
		}

		/**
		 * Initialize the component
		 * @private
		 */
		_init() {
			// Set zoom data attribute on container
			this.container.setAttribute('data-zoom', this.currentZoom);

			// Clear container
			this.container.innerHTML = '';
		}

		/**
		 * Set data for the Gantt chart
		 * @param {Object} data - Data object containing project, tasks, dependencies, milestones
		 */
		setData(data) {
			this.project = data.project || null;
			this.tasks = data.tasks || [];
			this.dependencies = data.dependencies || [];
			this.milestones = data.milestones || [];
			this.criticalPath = data.criticalPath || [];

			// Calculate date range from tasks
			this._calculateDateRange();
		}

		/**
		 * Calculate date range from task data
		 * @private
		 */
		_calculateDateRange() {
			if (this.tasks.length === 0) {
				// Default to current month if no tasks
				const today = new Date();
				this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
				this.endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
				return;
			}

			// Find earliest start date and latest end date
			let minDate = null;
			let maxDate = null;

			this.tasks.forEach(task => {
				if (task.start_date) {
					const startDate = this._parseDate(task.start_date);
					if (!minDate || startDate < minDate) {
						minDate = startDate;
					}
				}

				if (task.due_date) {
					const dueDate = this._parseDate(task.due_date);
					if (!maxDate || dueDate > maxDate) {
						maxDate = dueDate;
					}
				}
			});

			// Add padding (2 weeks before and after)
			if (minDate && maxDate) {
				this.startDate = new Date(minDate);
				this.startDate.setDate(this.startDate.getDate() - 14);

				this.endDate = new Date(maxDate);
				this.endDate.setDate(this.endDate.getDate() + 14);
			} else {
				// Fallback to current month
				const today = new Date();
				this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
				this.endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
			}

			// Generate date columns based on zoom level
			this._generateDateColumns();
		}

		/**
		 * Generate date columns based on zoom level
		 * @private
		 */
		_generateDateColumns() {
			this.dateColumns = [];

			const current = new Date(this.startDate);

			while (current <= this.endDate) {
				const column = {
					date: new Date(current),
					label: this._formatDateForZoom(current),
					isWeekend: this._isWeekend(current),
					isToday: this._isToday(current)
				};

				this.dateColumns.push(column);

				// Increment based on zoom level
				this._incrementDate(current, this.currentZoom);
			}
		}

		/**
		 * Format date based on zoom level
		 * @private
		 */
		_formatDateForZoom(date) {
			const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

			switch (this.currentZoom) {
				case 'day':
					return `${date.getDate()}`;
				case 'week':
					const weekEnd = new Date(date);
					weekEnd.setDate(weekEnd.getDate() + 6);
					return `${date.getDate()}-${weekEnd.getDate()} ${months[date.getMonth()]}`;
				case 'month':
					return `${months[date.getMonth()]} ${date.getFullYear()}`;
				case 'quarter':
					const quarter = Math.floor(date.getMonth() / 3) + 1;
					return `Q${quarter} ${date.getFullYear()}`;
				default:
					return date.toISOString().split('T')[0];
			}
		}

		/**
		 * Increment date based on zoom level
		 * @private
		 */
		_incrementDate(date, zoom) {
			switch (zoom) {
				case 'day':
					date.setDate(date.getDate() + 1);
					break;
				case 'week':
					date.setDate(date.getDate() + 7);
					break;
				case 'month':
					date.setMonth(date.getMonth() + 1);
					break;
				case 'quarter':
					date.setMonth(date.getMonth() + 3);
					break;
			}
		}

		/**
		 * Render the Gantt chart
		 */
		render() {
			// Check if we have data
			if (!this.startDate || !this.endDate) {
				this._renderEmptyState();
				return;
			}

			// Clear container
			this.container.innerHTML = '';

			// Create timeline structure
			this._createTimelineStructure();

			// Render timeline header
			this._renderHeader();

			// Render task rows
			this._renderTaskRows();
		}

		/**
		 * Create timeline structure
		 * @private
		 */
		_createTimelineStructure() {
			// Create timeline container
			this.elements.timeline = document.createElement('div');
			this.elements.timeline.className = 'gantt-timeline';

			// Create header
			this.elements.header = document.createElement('div');
			this.elements.header.className = 'gantt-timeline__header';
			this.elements.timeline.appendChild(this.elements.header);

			// Create body
			this.elements.body = document.createElement('div');
			this.elements.body.className = 'gantt-timeline__body';
			this.elements.timeline.appendChild(this.elements.body);

			// Append to container
			this.container.appendChild(this.elements.timeline);
		}

		/**
		 * Render timeline header with date columns
		 * @private
		 */
		_renderHeader() {
			// Clear header
			this.elements.header.innerHTML = '';

			// Left header (task label column)
			const headerLeft = document.createElement('div');
			headerLeft.className = 'gantt-timeline__header-left';
			headerLeft.textContent = 'Tareas';
			this.elements.header.appendChild(headerLeft);

			// Date columns
			const headerDates = document.createElement('div');
			headerDates.className = 'gantt-timeline__header-dates';

			this.dateColumns.forEach(column => {
				const dateCell = document.createElement('div');
				dateCell.className = 'gantt-timeline__date-cell';

				if (column.isWeekend) {
					dateCell.classList.add('gantt-timeline__date-cell--weekend');
				}

				if (column.isToday) {
					dateCell.classList.add('gantt-timeline__date-cell--today');
				}

				dateCell.textContent = column.label;
				dateCell.dataset.date = column.date.toISOString().split('T')[0];

				headerDates.appendChild(dateCell);
			});

			this.elements.header.appendChild(headerDates);
		}

		/**
		 * Render task rows with labels
		 * @private
		 */
		_renderTaskRows() {
			// Clear body
			this.elements.body.innerHTML = '';

			// Render each task
			this.tasks.forEach(task => {
				const row = this._createTaskRow(task);
				this.elements.body.appendChild(row);
			});

			// Render today line if enabled
			if (this.options.showToday) {
				this._renderTodayLine();
			}
		}

		/**
		 * Create a task row
		 * @private
		 */
		_createTaskRow(task) {
			const row = document.createElement('div');
			row.className = 'gantt-task-row';
			row.dataset.taskId = task.name;

			// Task label
			const label = document.createElement('div');
			label.className = 'gantt-task-row__label';

			const name = document.createElement('div');
			name.className = 'gantt-task-row__name';
			name.textContent = task.title || task.name;
			name.title = task.title || task.name;

			label.appendChild(name);
			row.appendChild(label);

			// Grid cells
			const grid = document.createElement('div');
			grid.className = 'gantt-task-row__grid';

			this.dateColumns.forEach(column => {
				const cell = document.createElement('div');
				cell.className = 'gantt-task-row__grid-cell';

				if (column.isWeekend) {
					cell.classList.add('gantt-task-row__grid-cell--weekend');
				}

				if (column.isToday) {
					cell.classList.add('gantt-task-row__grid-cell--today');
				}

				grid.appendChild(cell);
			});

			row.appendChild(grid);

			return row;
		}

		/**
		 * Render today line
		 * @private
		 */
		_renderTodayLine() {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			// Find today's column index
			const todayColumnIndex = this.dateColumns.findIndex(col => {
				const colDate = new Date(col.date);
				colDate.setHours(0, 0, 0, 0);

				if (this.currentZoom === 'day') {
					return colDate.getTime() === today.getTime();
				} else if (this.currentZoom === 'week') {
					const weekEnd = new Date(colDate);
					weekEnd.setDate(weekEnd.getDate() + 6);
					return today >= colDate && today <= weekEnd;
				} else if (this.currentZoom === 'month') {
					return colDate.getMonth() === today.getMonth() &&
						   colDate.getFullYear() === today.getFullYear();
				} else if (this.currentZoom === 'quarter') {
					const colQuarter = Math.floor(colDate.getMonth() / 3);
					const todayQuarter = Math.floor(today.getMonth() / 3);
					return colQuarter === todayQuarter &&
						   colDate.getFullYear() === today.getFullYear();
				}
				return false;
			});

			if (todayColumnIndex === -1) {
				return; // Today is not in visible range
			}

			// Calculate position
			const columnWidth = this._getColumnWidth();
			const leftOffset = 240; // Task label width
			const position = leftOffset + (todayColumnIndex * columnWidth) + (columnWidth / 2);

			// Create today line
			const todayLine = document.createElement('div');
			todayLine.className = 'gantt-today-line';
			todayLine.style.left = `${position}px`;

			this.elements.body.appendChild(todayLine);
		}

		/**
		 * Render empty state
		 * @private
		 */
		_renderEmptyState() {
			this.container.innerHTML = `
				<div class="gantt-empty-state">
					<svg class="gantt-empty-state__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
					</svg>
					<div class="gantt-empty-state__title">No hay tareas para mostrar</div>
					<div class="gantt-empty-state__message">
						Agrega tareas con fechas de inicio y fin para ver el cronograma del proyecto.
					</div>
				</div>
			`;
		}

		/**
		 * Change zoom level
		 * @param {string} zoom - Zoom level (day, week, month, quarter)
		 */
		setZoom(zoom) {
			if (!['day', 'week', 'month', 'quarter'].includes(zoom)) {
				throw new Error(`Invalid zoom level: ${zoom}`);
			}

			this.currentZoom = zoom;
			this.container.setAttribute('data-zoom', zoom);

			// Regenerate date columns and re-render
			this._generateDateColumns();
			this.render();
		}

		/**
		 * Get current zoom level
		 * @returns {string}
		 */
		getZoom() {
			return this.currentZoom;
		}

		/**
		 * Get column width based on zoom level
		 * @private
		 * @returns {number}
		 */
		_getColumnWidth() {
			const widths = {
				day: 40,
				week: 80,
				month: 120,
				quarter: 160
			};
			return widths[this.currentZoom] || 120;
		}

		/**
		 * Parse date string to Date object
		 * @private
		 */
		_parseDate(dateStr) {
			if (!dateStr) return null;

			// Handle both ISO format and YYYY-MM-DD
			if (typeof dateStr === 'string') {
				return new Date(dateStr + 'T00:00:00');
			}

			return new Date(dateStr);
		}

		/**
		 * Check if date is weekend
		 * @private
		 */
		_isWeekend(date) {
			const day = date.getDay();
			return day === 0 || day === 6;
		}

		/**
		 * Check if date is today
		 * @private
		 */
		_isToday(date) {
			const today = new Date();
			return date.getDate() === today.getDate() &&
				   date.getMonth() === today.getMonth() &&
				   date.getFullYear() === today.getFullYear();
		}

		/**
		 * Scroll to today
		 */
		scrollToToday() {
			const today = new Date();
			const todayColumn = this.dateColumns.findIndex(col => {
				const colDate = new Date(col.date);
				return this._isToday(colDate);
			});

			if (todayColumn === -1) return;

			const columnWidth = this._getColumnWidth();
			const scrollLeft = (todayColumn * columnWidth) - (this.container.offsetWidth / 2);

			this.container.scrollTo({
				left: scrollLeft,
				behavior: 'smooth'
			});
		}

		/**
		 * Toggle critical path visualization
		 * @param {boolean} show - Whether to show critical path
		 */
		toggleCriticalPath(show) {
			this.showCriticalPath = show;
			// TODO: Implement critical path highlighting in phase 6
			this.render();
		}

		/**
		 * Destroy the component
		 */
		destroy() {
			this.container.innerHTML = '';
			this.elements = {};
		}
	};

})();
