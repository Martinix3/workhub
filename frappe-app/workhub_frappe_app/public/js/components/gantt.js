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

			// Render milestones
			this._renderMilestones();

			// Render dependency arrows
			this._renderDependencies();
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

		// Render task bar if task has dates
		if (task.start_date && task.due_date) {
			const taskBar = this._createTaskBar(task);
			grid.appendChild(taskBar);
		}

		row.appendChild(grid);

		return row;
	}

	/**
	 * Create a task bar element
	 * @private
	 */
	_createTaskBar(task) {
		const bar = document.createElement('div');
		bar.className = 'gantt-task-bar';
		bar.dataset.taskId = task.name;

		// Add status class
		const status = (task.status || 'backlog').toLowerCase();
		bar.classList.add(`gantt-task-bar--${status}`);

		// Add critical path class if applicable
		if (this.showCriticalPath && this.criticalPath.includes(task.name)) {
			bar.classList.add('gantt-task-bar--critical');
		}

		// Calculate position and width
		const position = this._calculateTaskBarPosition(task);
		bar.style.left = `${position.left}px`;
		bar.style.width = `${position.width}px`;

		// Priority indicator
		if (task.priority) {
			const priority = document.createElement('div');
			priority.className = 'gantt-task-bar__priority';
			priority.classList.add(`gantt-task-bar__priority--${task.priority.toLowerCase()}`);
			bar.appendChild(priority);
		}

		// Task bar content
		const content = document.createElement('div');
		content.className = 'gantt-task-bar__content';

		// Task title
		const title = document.createElement('div');
		title.className = 'gantt-task-bar__title';
		title.textContent = task.title || task.name;
		title.title = task.title || task.name;
		content.appendChild(title);

		// Assigned user avatar
		if (task.assigned_to) {
			const avatar = this._createUserAvatar(task.assigned_to);
			content.appendChild(avatar);
		}

		bar.appendChild(content);

		// Progress overlay if task has progress
		if (task.progress && task.progress > 0) {
			const progressOverlay = document.createElement('div');
			progressOverlay.className = 'gantt-task-bar__progress';
			progressOverlay.style.width = `${task.progress}%`;
			bar.appendChild(progressOverlay);
		}

		// Drag handles (for future drag-and-drop - Phase 4)
		const handleLeft = document.createElement('div');
		handleLeft.className = 'gantt-task-bar__handle gantt-task-bar__handle--left';
		bar.appendChild(handleLeft);

		const handleRight = document.createElement('div');
		handleRight.className = 'gantt-task-bar__handle gantt-task-bar__handle--right';
		bar.appendChild(handleRight);

		return bar;
	}

	/**
	 * Calculate task bar position and width
	 * @private
	 */
	_calculateTaskBarPosition(task) {
		const startDate = this._parseDate(task.start_date);
		const dueDate = this._parseDate(task.due_date);

		if (!startDate || !dueDate) {
			return { left: 0, width: 0 };
		}

		const columnWidth = this._getColumnWidth();

		// Find the column index for start date
		let startColumnIndex = this._findColumnIndexForDate(startDate);
		let endColumnIndex = this._findColumnIndexForDate(dueDate);

		// If dates are outside visible range, clamp them
		if (startColumnIndex < 0) startColumnIndex = 0;
		if (endColumnIndex < 0) endColumnIndex = 0;
		if (startColumnIndex >= this.dateColumns.length) startColumnIndex = this.dateColumns.length - 1;
		if (endColumnIndex >= this.dateColumns.length) endColumnIndex = this.dateColumns.length - 1;

		// Calculate position and width
		const left = startColumnIndex * columnWidth;
		const width = Math.max((endColumnIndex - startColumnIndex + 1) * columnWidth, columnWidth);

		return { left, width };
	}

	/**
	 * Find column index for a given date
	 * @private
	 */
	_findColumnIndexForDate(date) {
		if (!date) return -1;

		const targetDate = new Date(date);
		targetDate.setHours(0, 0, 0, 0);

		for (let i = 0; i < this.dateColumns.length; i++) {
			const columnDate = new Date(this.dateColumns[i].date);
			columnDate.setHours(0, 0, 0, 0);

			if (this.currentZoom === 'day') {
				// Exact day match
				if (columnDate.getTime() === targetDate.getTime()) {
					return i;
				}
				// If target is before first column, return first column
				if (targetDate < columnDate && i === 0) {
					return 0;
				}
				// If target is between this and next column, return this
				if (i < this.dateColumns.length - 1) {
					const nextColumnDate = new Date(this.dateColumns[i + 1].date);
					nextColumnDate.setHours(0, 0, 0, 0);
					if (targetDate >= columnDate && targetDate < nextColumnDate) {
						return i;
					}
				}
			} else if (this.currentZoom === 'week') {
				// Check if date falls within this week
				const weekEnd = new Date(columnDate);
				weekEnd.setDate(weekEnd.getDate() + 6);
				weekEnd.setHours(23, 59, 59, 999);
				if (targetDate >= columnDate && targetDate <= weekEnd) {
					return i;
				}
			} else if (this.currentZoom === 'month') {
				// Check if date is in this month
				if (columnDate.getMonth() === targetDate.getMonth() &&
					columnDate.getFullYear() === targetDate.getFullYear()) {
					return i;
				}
			} else if (this.currentZoom === 'quarter') {
				// Check if date is in this quarter
				const colQuarter = Math.floor(columnDate.getMonth() / 3);
				const targetQuarter = Math.floor(targetDate.getMonth() / 3);
				if (colQuarter === targetQuarter &&
					columnDate.getFullYear() === targetDate.getFullYear()) {
					return i;
				}
			}
		}

		// If date is after all columns, return last column
		if (targetDate > new Date(this.dateColumns[this.dateColumns.length - 1].date)) {
			return this.dateColumns.length - 1;
		}

		return -1;
	}

	/**
	 * Create user avatar element
	 * @private
	 */
	_createUserAvatar(assignedTo) {
		const avatar = document.createElement('div');
		avatar.className = 'gantt-task-bar__avatar';

		// Extract initials from assigned user
		let initials = '?';
		if (assignedTo) {
			// If it's an email, use first letter
			if (assignedTo.includes('@')) {
				initials = assignedTo.charAt(0).toUpperCase();
			} else {
				// If it's a name, use first letters of first and last name
				const parts = assignedTo.trim().split(/\s+/);
				if (parts.length >= 2) {
					initials = parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase();
				} else {
					initials = parts[0].substring(0, 2).toUpperCase();
				}
			}
		}

		avatar.textContent = initials;
		avatar.title = assignedTo;

		return avatar;
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
		 * Render milestones on the timeline
		 * @private
		 */
		_renderMilestones() {
			if (!this.milestones || this.milestones.length === 0) {
				return;
			}

			// Render each milestone
			this.milestones.forEach(milestone => {
				if (milestone.due_date) {
					const milestoneElement = this._createMilestone(milestone);
					if (milestoneElement) {
						this.elements.body.appendChild(milestoneElement);
					}
				}
			});
		}

		/**
		 * Create a milestone diamond marker
		 * @private
		 */
		_createMilestone(milestone) {
			const dueDate = this._parseDate(milestone.due_date);
			if (!dueDate) {
				return null;
			}

			// Find the column index for the due date
			const columnIndex = this._findColumnIndexForDate(dueDate);
			if (columnIndex === -1) {
				return null; // Milestone is outside visible range
			}

			// Calculate position
			const columnWidth = this._getColumnWidth();
			const leftOffset = 240; // Task label width
			const position = leftOffset + (columnIndex * columnWidth) + (columnWidth / 2) - 10; // Center the 20px diamond

			// Create milestone element
			const milestoneEl = document.createElement('div');
			milestoneEl.className = 'gantt-milestone';
			milestoneEl.dataset.milestoneId = milestone.name;
			milestoneEl.style.left = `${position}px`;

			// Add status class
			const status = (milestone.status || 'backlog').toLowerCase();
			milestoneEl.classList.add(`gantt-milestone--${status}`);

			// Add critical path class if applicable
			if (this.showCriticalPath && this.criticalPath.includes(milestone.name)) {
				milestoneEl.classList.add('gantt-milestone--critical');
			}

			// Add tooltip on hover
			this._addMilestoneTooltip(milestoneEl, milestone);

			return milestoneEl;
		}

		/**
		 * Add tooltip to milestone
		 * @private
		 */
		_addMilestoneTooltip(milestoneEl, milestone) {
			let tooltip = null;

			// Show tooltip on mouse enter
			milestoneEl.addEventListener('mouseenter', (e) => {
				// Create tooltip element
				tooltip = document.createElement('div');
				tooltip.className = 'gantt-tooltip';

				// Tooltip title
				const title = document.createElement('div');
				title.className = 'gantt-tooltip__title';
				title.textContent = milestone.title || milestone.name;
				tooltip.appendChild(title);

				// Due date
				const dueDateItem = document.createElement('div');
				dueDateItem.className = 'gantt-tooltip__item';
				dueDateItem.innerHTML = `
					<span class="gantt-tooltip__label">Fecha:</span>
					<span class="gantt-tooltip__value">${this._formatDate(milestone.due_date)}</span>
				`;
				tooltip.appendChild(dueDateItem);

				// Status
				const statusItem = document.createElement('div');
				statusItem.className = 'gantt-tooltip__item';
				statusItem.innerHTML = `
					<span class="gantt-tooltip__label">Estado:</span>
					<span class="gantt-tooltip__value">${this._formatStatus(milestone.status)}</span>
				`;
				tooltip.appendChild(statusItem);

				// Assigned to
				if (milestone.assigned_to) {
					const assignedItem = document.createElement('div');
					assignedItem.className = 'gantt-tooltip__item';
					assignedItem.innerHTML = `
						<span class="gantt-tooltip__label">Asignado:</span>
						<span class="gantt-tooltip__value">${milestone.assigned_name || milestone.assigned_to}</span>
					`;
					tooltip.appendChild(assignedItem);
				}

				// Position tooltip near cursor
				const rect = milestoneEl.getBoundingClientRect();
				tooltip.style.left = `${rect.left + 30}px`;
				tooltip.style.top = `${rect.top}px`;

				// Add to body
				document.body.appendChild(tooltip);
			});

			// Hide tooltip on mouse leave
			milestoneEl.addEventListener('mouseleave', () => {
				if (tooltip && tooltip.parentNode) {
					tooltip.parentNode.removeChild(tooltip);
					tooltip = null;
				}
			});
		}

		/**
		 * Format date for display
		 * @private
		 */
		_formatDate(dateStr) {
			if (!dateStr) return '';

			const date = this._parseDate(dateStr);
			if (!date) return '';

			const day = date.getDate();
			const month = date.getMonth() + 1;
			const year = date.getFullYear();

			return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
		}

		/**
		 * Format status for display
		 * @private
		 */
		_formatStatus(status) {
			const statusMap = {
				'backlog': 'Backlog',
				'next': 'Próximo',
				'doing': 'En curso',
				'blocked': 'Bloqueado',
				'done': 'Completado'
			};

			return statusMap[status.toLowerCase()] || status;
		}

		/**
	/**
	 * Render dependency arrows between tasks
	 * @private
	 */
	_renderDependencies() {
		if (!this.dependencies || this.dependencies.length === 0) {
			return;
		}

		// Create or get SVG layer
		if (!this.elements.svg) {
			this.elements.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			this.elements.svg.setAttribute('class', 'gantt-dependencies');
			this.elements.svg.style.position = 'absolute';
			this.elements.svg.style.top = '0';
			this.elements.svg.style.left = '0';
			this.elements.svg.style.width = '100%';
			this.elements.svg.style.height = '100%';
			this.elements.svg.style.pointerEvents = 'none';
			this.elements.svg.style.zIndex = '5';
		} else {
			// Clear existing paths
			this.elements.svg.innerHTML = '';
		}

		// Define arrowhead marker
		const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

		// Normal arrowhead
		const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
		marker.setAttribute('id', 'arrowhead');
		marker.setAttribute('markerWidth', '10');
		marker.setAttribute('markerHeight', '10');
		marker.setAttribute('refX', '9');
		marker.setAttribute('refY', '3');
		marker.setAttribute('orient', 'auto');

		const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
		arrowPath.setAttribute('points', '0 0, 10 3, 0 6');
		arrowPath.setAttribute('class', 'gantt-dependency__arrow');
		marker.appendChild(arrowPath);
		defs.appendChild(marker);

		// Critical path arrowhead
		const markerCritical = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
		markerCritical.setAttribute('id', 'arrowhead-critical');
		markerCritical.setAttribute('markerWidth', '10');
		markerCritical.setAttribute('markerHeight', '10');
		markerCritical.setAttribute('refX', '9');
		markerCritical.setAttribute('refY', '3');
		markerCritical.setAttribute('orient', 'auto');

		const arrowPathCritical = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
		arrowPathCritical.setAttribute('points', '0 0, 10 3, 0 6');
		arrowPathCritical.setAttribute('class', 'gantt-dependency__arrow');
		arrowPathCritical.style.fill = 'var(--danger)';
		markerCritical.appendChild(arrowPathCritical);
		defs.appendChild(markerCritical);

		this.elements.svg.appendChild(defs);

		// Render each dependency
		this.dependencies.forEach(dep => {
			const path = this._createDependencyArrow(dep);
			if (path) {
				this.elements.svg.appendChild(path);
			}
		});

		// Add SVG to timeline body if not already added
		if (!this.elements.svg.parentNode) {
			this.elements.body.appendChild(this.elements.svg);
		}
	}

	/**
	 * Create SVG path for a dependency arrow
	 * @private
	 */
	_createDependencyArrow(dependency) {
		// Find predecessor and successor task bar elements
		const predBar = this._getTaskBarElement(dependency.predecessor);
		const succBar = this._getTaskBarElement(dependency.successor);

		if (!predBar || !succBar) {
			return null; // One or both tasks not rendered
		}

		// Get task bar positions
		const predPos = this._getTaskBarPosition(predBar);
		const succPos = this._getTaskBarPosition(succBar);

		if (!predPos || !succPos) {
			return null;
		}

		// Calculate dependency path based on type
		const pathData = this._calculateDependencyPath(dependency.type || 'FS', predPos, succPos);

		if (!pathData) {
			return null;
		}

		// Create SVG path element
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', pathData);
		path.setAttribute('class', 'gantt-dependency');

		// Add dependency type class
		const depType = (dependency.type || 'FS').toLowerCase();
		path.classList.add(`gantt-dependency--${depType}`);

		// Add critical path class if applicable
		if (dependency.is_critical || (this.showCriticalPath && dependency.is_critical)) {
			path.classList.add('gantt-dependency--critical');
			path.setAttribute('marker-end', 'url(#arrowhead-critical)');
		} else {
			path.setAttribute('marker-end', 'url(#arrowhead)');
		}

		path.dataset.dependencyId = dependency.name;
		path.dataset.predecessor = dependency.predecessor;
		path.dataset.successor = dependency.successor;

		return path;
	}

	/**
	 * Get task bar DOM element by task ID
	 * @private
	 */
	_getTaskBarElement(taskId) {
		return this.elements.body.querySelector(`.gantt-task-bar[data-task-id="${taskId}"]`);
	}

	/**
	 * Get task bar position and dimensions
	 * @private
	 */
	_getTaskBarPosition(taskBarElement) {
		if (!taskBarElement || !this.elements.body) {
			return null;
		}

		const barRect = taskBarElement.getBoundingClientRect();
		const bodyRect = this.elements.body.getBoundingClientRect();

		// Calculate position relative to timeline body
		return {
			left: barRect.left - bodyRect.left,
			top: barRect.top - bodyRect.top,
			right: barRect.right - bodyRect.left,
			bottom: barRect.bottom - bodyRect.top,
			width: barRect.width,
			height: barRect.height,
			centerX: (barRect.left - bodyRect.left) + (barRect.width / 2),
			centerY: (barRect.top - bodyRect.top) + (barRect.height / 2)
		};
	}

	/**
	 * Calculate SVG path for dependency based on type
	 * @private
	 */
	_calculateDependencyPath(type, predPos, succPos) {
		let startX, startY, endX, endY;

		// Determine start and end points based on dependency type
		switch (type.toUpperCase()) {
			case 'FS': // Finish-to-Start (default)
				startX = predPos.right;
				startY = predPos.centerY;
				endX = succPos.left;
				endY = succPos.centerY;
				break;

			case 'SS': // Start-to-Start
				startX = predPos.left;
				startY = predPos.centerY;
				endX = succPos.left;
				endY = succPos.centerY;
				break;

			case 'FF': // Finish-to-Finish
				startX = predPos.right;
				startY = predPos.centerY;
				endX = succPos.right;
				endY = succPos.centerY;
				break;

			case 'SF': // Start-to-Finish
				startX = predPos.left;
				startY = predPos.centerY;
				endX = succPos.right;
				endY = succPos.centerY;
				break;

			default:
				// Default to FS
				startX = predPos.right;
				startY = predPos.centerY;
				endX = succPos.left;
				endY = succPos.centerY;
		}

		// Calculate path with bezier curve for smooth arrows
		// Use horizontal offset for control points to create smooth curves
		const dx = endX - startX;
		const dy = endY - startY;
		const absDx = Math.abs(dx);
		const absDy = Math.abs(dy);

		// Control point offset (horizontal)
		const cpOffset = Math.min(absDx / 2, 50);

		// Build path
		// For simple cases, use straight line with right angles
		// For complex cases, use bezier curves
		let path;

		if (absDy < 10 && dx > 0) {
			// Tasks on same row, moving forward - straight line
			path = `M ${startX} ${startY} L ${endX} ${endY}`;
		} else if (dx > 30) {
			// Forward dependency with vertical offset - smooth S curve
			const cp1X = startX + cpOffset;
			const cp1Y = startY;
			const cp2X = endX - cpOffset;
			const cp2Y = endY;
			path = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
		} else {
			// Backward or tight dependency - use right-angle path
			const midX = startX + 20;
			const midY1 = startY;
			const midY2 = endY;
			const minX = endX - 20;

			// Go right, down/up, left, then to end
			path = `M ${startX} ${startY}
					L ${midX} ${midY1}
					L ${midX} ${midY2}
					L ${minX} ${midY2}
					L ${endX} ${endY}`;
		}

		return path;
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
