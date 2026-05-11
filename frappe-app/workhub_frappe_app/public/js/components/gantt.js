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
		this.slackTimes = {}; // Slack time for each task (in days)

			// Date range
			this.startDate = null;
			this.endDate = null;
			this.dateColumns = [];

			// State
			this.currentZoom = this.options.zoom;
			this.showCriticalPath = false;
			this.savedScrollPosition = 0;

			// Drag state
			this.dragState = {
				isDragging: false,
				taskId: null,
				startX: 0,
				startLeft: 0,
				columnOffset: 0,
				originalTask: null,
				previewElement: null
			};

			// Resize state
			this.resizeState = {
				isResizing: false,
				taskId: null,
				handle: null, // 'left' or 'right'
				startX: 0,
				startLeft: 0,
				startWidth: 0,
				columnOffset: 0,
				originalTask: null,
				previewElement: null
			};

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

			// Setup keyboard navigation
			this._setupKeyboardNavigation();
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
			const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

			switch (this.currentZoom) {
				case 'day':
					// Show day number and month abbreviation for first day of month
					// Otherwise just day number
					if (date.getDate() === 1) {
						return `${date.getDate()} ${months[date.getMonth()]}`;
					}
					return `${date.getDate()}`;
				case 'week':
					const weekEnd = new Date(date);
					weekEnd.setDate(weekEnd.getDate() + 6);
					// If week spans across months, show both months
					if (date.getMonth() !== weekEnd.getMonth()) {
						return `${date.getDate()} ${months[date.getMonth()]} - ${weekEnd.getDate()} ${months[weekEnd.getMonth()]}`;
					}
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

			// Save scroll position before re-render
			this._saveScrollPosition();

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

			// Restore scroll position after re-render
			this._restoreScrollPosition();
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

		// Slack time badge for non-critical tasks (when critical path is shown)
		if (this.showCriticalPath && !this.criticalPath.includes(task.name)) {
			const slack = this.slackTimes[task.name];
			if (slack !== undefined && slack > 0) {
				const slackBadge = document.createElement('div');
				slackBadge.className = 'gantt-task-bar__slack';
				slackBadge.textContent = `+${slack}d`;
				slackBadge.title = `Holgura: ${slack} días`;
				bar.appendChild(slackBadge);
			}
		}

		// Drag handles (for future drag-and-drop - Phase 4)
		const handleLeft = document.createElement('div');
		handleLeft.className = 'gantt-task-bar__handle gantt-task-bar__handle--left';
		bar.appendChild(handleLeft);

		const handleRight = document.createElement('div');
		handleRight.className = 'gantt-task-bar__handle gantt-task-bar__handle--right';
		bar.appendChild(handleRight);

		// Add drag event listener to task bar (but not resize handles)
		this._setupTaskBarDrag(bar, task);

		// Add resize event listeners to handles
		this._setupResizeHandles(bar, task, handleLeft, handleRight);

		// Add click handler to open task detail sidebar
		this._setupTaskBarClick(bar, task);

		// Add dependency drag connector
		this._setupDependencyDrag(bar, task);

		// Add context menu handler
		this._setupTaskBarContextMenu(bar, task);

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
		const initials = this._getInitials(assignedTo);

		avatar.textContent = initials;
		avatar.title = assignedTo;

		return avatar;
	}

	/**
	 * Get initials from user name or email
	 * @private
	 */
	_getInitials(assignedTo) {
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
		return initials;
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

			// Don't do anything if already at this zoom level
			if (this.currentZoom === zoom) {
				return;
			}

			// Store scroll position (relative to timeline)
			const scrollContainer = this.container.parentElement;
			const scrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;
			const scrollPercentage = scrollContainer
				? scrollLeft / (scrollContainer.scrollWidth - scrollContainer.clientWidth || 1)
				: 0;

			// Update zoom level
			const previousZoom = this.currentZoom;
			this.currentZoom = zoom;
			this.container.setAttribute('data-zoom', zoom);

			// Add transitioning class for smooth animation
			this.container.classList.add('gantt-chart--transitioning');

			// Regenerate date columns and re-render
			this._generateDateColumns();
			this.render();

			// Restore approximate scroll position based on percentage
			if (scrollContainer) {
				// Use requestAnimationFrame to ensure DOM has updated
				requestAnimationFrame(() => {
					const newScrollLeft = scrollPercentage * (scrollContainer.scrollWidth - scrollContainer.clientWidth);
					scrollContainer.scrollLeft = newScrollLeft;

					// Remove transitioning class after animation completes
					setTimeout(() => {
						this.container.classList.remove('gantt-chart--transitioning');
					}, 300);
				});
			} else {
				// Remove transitioning class after animation completes
				setTimeout(() => {
					this.container.classList.remove('gantt-chart--transitioning');
				}, 300);
			}

			// Emit zoom change event for external listeners
			this._emitEvent('zoomChanged', {
				previousZoom,
				currentZoom: zoom
			});
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

			if (todayColumn === -1) {
				// Today is not in visible range
				return;
			}

			// Get the scroll container (parent of gantt-chart)
			const scrollContainer = this._getScrollContainer();
			if (!scrollContainer) return;

			const columnWidth = this._getColumnWidth();
			const taskLabelWidth = 240; // Width of task label column

			// Calculate scroll position to center today's column
			// Account for task label offset and center in viewport
			const todayPosition = taskLabelWidth + (todayColumn * columnWidth);
			const scrollLeft = todayPosition - (scrollContainer.offsetWidth / 2) + (columnWidth / 2);

			scrollContainer.scrollTo({
				left: Math.max(0, scrollLeft),
				behavior: 'smooth'
			});
		}

		/**
		 * Toggle critical path visualization
		 * @param {boolean} show - Whether to show critical path
		 */
		toggleCriticalPath(show) {
			this.showCriticalPath = show;

			if (show) {
				// Call backend API to calculate critical path and slack times
				this._calculateCriticalPath();
			} else {
				// Just re-render without critical path highlighting
				this.render();
			}
		}

		/**
		 * Calculate critical path by calling backend API
		 * @private
		 */
		_calculateCriticalPath() {
			if (!this.project || !this.project.name) {
				frappe.msgprint(__('No se pudo calcular la ruta crítica: proyecto no cargado'));
				return;
			}

			// Show loading indicator
			frappe.freeze(__('Calculando ruta crítica...'));

			// Call API
			frappe.call({
				method: 'workhub_frappe_app.api.gantt.get_critical_path',
				args: {
					project_id: this.project.name
				},
				callback: (response) => {
					frappe.unfreeze();

					if (response.message) {
						// Update critical path and slack times
						this.criticalPath = response.message.critical_path || [];
						this.slackTimes = response.message.slack_times || {};

						// Re-render to show highlighting
						this.render();

						// Show success message with project duration
						const duration = response.message.project_duration || 0;
						const criticalCount = this.criticalPath.length;

						frappe.show_alert({
							message: __(`Ruta crítica calculada: ${criticalCount} tareas críticas, duración del proyecto: ${duration} días`),
							indicator: 'green'
						}, 5);
					}
				},
				error: (error) => {
					frappe.unfreeze();
					frappe.msgprint({
						title: __('Error'),
						message: __('No se pudo calcular la ruta crítica'),
						indicator: 'red'
					});
					if (frappe.boot.developer_mode) {
						console.error('Critical path calculation error:', error);
					}
				}
			});
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
						<span class="gantt-tooltip__value">${this._escapeHtml(milestone.assigned_name || milestone.assigned_to)}</span>
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
		 * Escape HTML to prevent XSS attacks
		 * @private
		 */
		_escapeHtml(text) {
			if (!text) return '';
			const div = document.createElement('div');
			div.textContent = text;
			return div.innerHTML;
		}

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
	 * Emit custom event for external listeners
	 * @private
	 */
	_emitEvent(eventName, data = {}) {
		const event = new CustomEvent(`gantt:${eventName}`, {
			detail: data,
			bubbles: true,
			cancelable: true
		});
		this.container.dispatchEvent(event);
	}

	/**
	 * Get the scroll container element
	 * @private
	 * @returns {HTMLElement|null}
	 */
	_getScrollContainer() {
		// The scroll container is the parent with class 'gantt-container'
		let el = this.container;
		while (el && el.parentElement) {
			if (el.classList.contains('gantt-container')) {
				return el;
			}
			el = el.parentElement;
		}
		// Fallback to container parent
		return this.container.parentElement;
	}

	/**
	 * Save current scroll position
	 * @private
	 */
	_saveScrollPosition() {
		const scrollContainer = this._getScrollContainer();
		if (scrollContainer) {
			this.savedScrollPosition = scrollContainer.scrollLeft;
		}
	}

	/**
	 * Restore saved scroll position
	 * @private
	 */
	_restoreScrollPosition() {
		const scrollContainer = this._getScrollContainer();
		if (scrollContainer && this.savedScrollPosition !== undefined) {
			// Use requestAnimationFrame to ensure DOM has been updated
			requestAnimationFrame(() => {
				scrollContainer.scrollLeft = this.savedScrollPosition;
			});
		}
	}

	/**
	 * Setup keyboard navigation for the Gantt chart
	 * @private
	 */
	_setupKeyboardNavigation() {
		const scrollContainer = this._getScrollContainer();
		if (!scrollContainer) return;

		// Make scroll container focusable
		if (!scrollContainer.hasAttribute('tabindex')) {
			scrollContainer.setAttribute('tabindex', '0');
		}

		// Add keyboard event listener
		scrollContainer.addEventListener('keydown', (e) => {
			const columnWidth = this._getColumnWidth();
			const scrollAmount = columnWidth * 2; // Scroll 2 columns at a time

			switch (e.key) {
				case 'ArrowLeft':
					e.preventDefault();
					scrollContainer.scrollBy({
						left: -scrollAmount,
						behavior: 'smooth'
					});
					break;

				case 'ArrowRight':
					e.preventDefault();
					scrollContainer.scrollBy({
						left: scrollAmount,
						behavior: 'smooth'
					});
					break;

				case 'Home':
					e.preventDefault();
					scrollContainer.scrollTo({
						left: 0,
						behavior: 'smooth'
					});
					break;

				case 'End':
					e.preventDefault();
					scrollContainer.scrollTo({
						left: scrollContainer.scrollWidth,
						behavior: 'smooth'
					});
					break;

				case 't':
				case 'T':
					// Press 't' to scroll to today
					if (!e.ctrlKey && !e.metaKey && !e.altKey) {
						e.preventDefault();
						this.scrollToToday();
					}
					break;
			}
		});
	}

	/**
	 * Setup task bar dragging
	 * @private
	 */
	_setupTaskBarDrag(barElement, task) {
		// Store task reference on element
		barElement._taskData = task;

		// Add mousedown listener to the bar content (not the handles)
		const content = barElement.querySelector('.gantt-task-bar__content');
		if (content) {
			content.addEventListener('mousedown', (e) => {
				// Only left mouse button
				if (e.button !== 0) return;

				// Don't start drag if clicking on handles
				if (e.target.closest('.gantt-task-bar__handle')) return;

				e.preventDefault();
				e.stopPropagation();

				this._startDrag(barElement, task, e);
			});
		}
	}

	/**
	 * Start drag operation
	 * @private
	 */
	_startDrag(barElement, task, event) {
		// Set drag state
		this.dragState.isDragging = true;
		this.dragState.taskId = task.name;
		this.dragState.startX = event.clientX;
		this.dragState.startLeft = parseFloat(barElement.style.left) || 0;
		this.dragState.columnOffset = 0;
		this.dragState.originalTask = { ...task };

		// Add dragging class to bar
		barElement.classList.add('gantt-task-bar--dragging');

		// Create preview tooltip
		this._createDragPreview(task);

		// Add document-level event listeners
		this._onDragMoveHandler = (e) => this._onDragMove(e, barElement, task);
		this._onDragEndHandler = (e) => this._onDragEnd(e, barElement, task);

		document.addEventListener('mousemove', this._onDragMoveHandler);
		document.addEventListener('mouseup', this._onDragEndHandler);

		// Prevent text selection during drag
		document.body.style.userSelect = 'none';
	}

	/**
	 * Handle drag move
	 * @private
	 */
	_onDragMove(event, barElement, task) {
		if (!this.dragState.isDragging) return;

		event.preventDefault();

		// Calculate movement distance
		const deltaX = event.clientX - this.dragState.startX;

		// Calculate new position
		const columnWidth = this._getColumnWidth();
		const newLeft = this.dragState.startLeft + deltaX;

		// Snap to column boundaries
		const columnOffset = Math.round(newLeft / columnWidth);
		const snappedLeft = columnOffset * columnWidth;

		// Update column offset if changed
		if (this.dragState.columnOffset !== columnOffset) {
			this.dragState.columnOffset = columnOffset;

			// Calculate new dates
			const { newStartDate, newDueDate } = this._calculateNewDatesFromDrag(task, columnOffset);

			// Update preview tooltip
			this._updateDragPreview(event, newStartDate, newDueDate);
		}

		// Update visual position (smooth, not snapped)
		barElement.style.left = `${newLeft}px`;
	}

	/**
	 * Handle drag end
	 * @private
	 */
	_onDragEnd(event, barElement, task) {
		if (!this.dragState.isDragging) return;

		event.preventDefault();

		// Remove event listeners
		document.removeEventListener('mousemove', this._onDragMoveHandler);
		document.removeEventListener('mouseup', this._onDragEndHandler);

		// Restore user selection
		document.body.style.userSelect = '';

		// Remove dragging class
		barElement.classList.remove('gantt-task-bar--dragging');

		// Remove preview tooltip
		this._removeDragPreview();

		// Calculate final snapped position
		const columnWidth = this._getColumnWidth();
		const finalColumnOffset = this.dragState.columnOffset;

		// If position changed, update task dates
		if (finalColumnOffset !== 0) {
			const { newStartDate, newDueDate } = this._calculateNewDatesFromDrag(task, finalColumnOffset);

			// Update task data
			task.start_date = this._formatDateForAPI(newStartDate);
			task.due_date = this._formatDateForAPI(newDueDate);

			// Re-render the chart to reflect changes
			this.render();

			// Emit event for external listeners (will be used in Phase 4.3 for API save)
			this._emitEvent('taskDateChanged', {
				taskId: task.name,
				startDate: task.start_date,
				dueDate: task.due_date,
				originalStartDate: this.dragState.originalTask.start_date,
				originalDueDate: this.dragState.originalTask.due_date
			});
		} else {
			// No change, just snap back to original position
			const position = this._calculateTaskBarPosition(task);
			barElement.style.left = `${position.left}px`;
		}

		// Reset drag state
		this.dragState.isDragging = false;
		this.dragState.taskId = null;
		this.dragState.startX = 0;
		this.dragState.startLeft = 0;
		this.dragState.columnOffset = 0;
		this.dragState.originalTask = null;
	}

	/**
	 * Calculate new dates from drag offset
	 * @private
	 */
	_calculateNewDatesFromDrag(task, columnOffset) {
		const startDate = this._parseDate(task.start_date);
		const dueDate = this._parseDate(task.due_date);

		if (!startDate || !dueDate) {
			return { newStartDate: null, newDueDate: null };
		}

		// Calculate offset in days based on zoom level
		let offsetDays = 0;
		switch (this.currentZoom) {
			case 'day':
				offsetDays = columnOffset;
				break;
			case 'week':
				offsetDays = columnOffset * 7;
				break;
			case 'month':
				// Month offset is trickier, approximate with 30 days
				offsetDays = columnOffset * 30;
				break;
			case 'quarter':
				offsetDays = columnOffset * 90;
				break;
		}

		// Create new dates maintaining duration
		const newStartDate = new Date(startDate);
		newStartDate.setDate(newStartDate.getDate() + offsetDays);

		const newDueDate = new Date(dueDate);
		newDueDate.setDate(newDueDate.getDate() + offsetDays);

		return { newStartDate, newDueDate };
	}

	/**
	 * Create drag preview tooltip
	 * @private
	 */
	_createDragPreview(task) {
		const preview = document.createElement('div');
		preview.className = 'gantt-drag-preview';
		preview.style.display = 'none'; // Initially hidden
		this.dragState.previewElement = preview;
		document.body.appendChild(preview);
	}

	/**
	 * Update drag preview tooltip
	 * @private
	 */
	_updateDragPreview(event, newStartDate, newDueDate) {
		if (!this.dragState.previewElement) return;

		// Format dates for display
		const startStr = this._formatDate(this._formatDateForAPI(newStartDate));
		const dueStr = this._formatDate(this._formatDateForAPI(newDueDate));

		// Update content
		this.dragState.previewElement.textContent = `${startStr} - ${dueStr}`;

		// Position near cursor
		this.dragState.previewElement.style.left = `${event.clientX + 15}px`;
		this.dragState.previewElement.style.top = `${event.clientY - 10}px`;
		this.dragState.previewElement.style.display = 'block';
	}

	/**
	 * Remove drag preview tooltip
	 * @private
	 */
	_removeDragPreview() {
		if (this.dragState.previewElement && this.dragState.previewElement.parentNode) {
			this.dragState.previewElement.parentNode.removeChild(this.dragState.previewElement);
			this.dragState.previewElement = null;
		}
	}

	/**
	 * Format date for API (YYYY-MM-DD)
	 * @private
	 */
	_formatDateForAPI(date) {
		if (!date) return '';

		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');

		return `${year}-${month}-${day}`;
	}

	/**
	 * Setup resize handles
	 * @private
	 */
	_setupResizeHandles(barElement, task, handleLeft, handleRight) {
		// Store task reference on element
		barElement._taskData = task;

		// Left handle - adjusts start date
		handleLeft.addEventListener('mousedown', (e) => {
			// Only left mouse button
			if (e.button !== 0) return;

			e.preventDefault();
			e.stopPropagation();

			this._startResize(barElement, task, 'left', e);
		});

		// Right handle - adjusts end date
		handleRight.addEventListener('mousedown', (e) => {
			// Only left mouse button
			if (e.button !== 0) return;

			e.preventDefault();
			e.stopPropagation();

			this._startResize(barElement, task, 'right', e);
		});
	}

	/**
	 * Start resize operation
	 * @private
	 */
	_startResize(barElement, task, handle, event) {
		// Set resize state
		this.resizeState.isResizing = true;
		this.resizeState.taskId = task.name;
		this.resizeState.handle = handle;
		this.resizeState.startX = event.clientX;
		this.resizeState.startLeft = parseFloat(barElement.style.left) || 0;
		this.resizeState.startWidth = parseFloat(barElement.style.width) || 0;
		this.resizeState.columnOffset = 0;
		this.resizeState.originalTask = { ...task };

		// Add resizing class to bar
		barElement.classList.add('gantt-task-bar--resizing');

		// Create preview tooltip
		this._createResizePreview(task);

		// Add document-level event listeners
		this._onResizeMoveHandler = (e) => this._onResizeMove(e, barElement, task);
		this._onResizeEndHandler = (e) => this._onResizeEnd(e, barElement, task);

		document.addEventListener('mousemove', this._onResizeMoveHandler);
		document.addEventListener('mouseup', this._onResizeEndHandler);

		// Prevent text selection during resize
		document.body.style.userSelect = 'none';
	}

	/**
	 * Handle resize move
	 * @private
	 */
	_onResizeMove(event, barElement, task) {
		if (!this.resizeState.isResizing) return;

		event.preventDefault();

		// Calculate movement distance
		const deltaX = event.clientX - this.resizeState.startX;

		// Calculate new dimensions based on which handle is being dragged
		const columnWidth = this._getColumnWidth();
		let newLeft = this.resizeState.startLeft;
		let newWidth = this.resizeState.startWidth;

		if (this.resizeState.handle === 'left') {
			// Left handle: adjust start position and width
			newLeft = this.resizeState.startLeft + deltaX;
			newWidth = this.resizeState.startWidth - deltaX;

			// Snap to column boundaries
			const columnOffset = Math.round(newLeft / columnWidth);
			const snappedLeft = columnOffset * columnWidth;
			const snappedWidth = this.resizeState.startWidth + (this.resizeState.startLeft - snappedLeft);

			// Enforce minimum 1 column width
			if (snappedWidth >= columnWidth) {
				this.resizeState.columnOffset = columnOffset;
				newLeft = snappedLeft;
				newWidth = snappedWidth;

				// Calculate new dates
				const { newStartDate, newDueDate } = this._calculateNewDatesFromResize(task, 'left', columnOffset);

				// Update preview tooltip
				this._updateResizePreview(event, newStartDate, newDueDate);
			} else {
				// Don't allow resize below minimum
				return;
			}
		} else {
			// Right handle: adjust width only
			newWidth = this.resizeState.startWidth + deltaX;

			// Snap to column boundaries
			const columnCount = Math.round(newWidth / columnWidth);
			const snappedWidth = columnCount * columnWidth;

			// Enforce minimum 1 column width
			if (snappedWidth >= columnWidth) {
				this.resizeState.columnOffset = columnCount;
				newWidth = snappedWidth;

				// Calculate new dates
				const { newStartDate, newDueDate } = this._calculateNewDatesFromResize(task, 'right', columnCount);

				// Update preview tooltip
				this._updateResizePreview(event, newStartDate, newDueDate);
			} else {
				// Don't allow resize below minimum
				return;
			}
		}

		// Update visual dimensions
		barElement.style.left = `${newLeft}px`;
		barElement.style.width = `${newWidth}px`;
	}

	/**
	 * Handle resize end
	 * @private
	 */
	_onResizeEnd(event, barElement, task) {
		if (!this.resizeState.isResizing) return;

		event.preventDefault();

		// Remove event listeners
		document.removeEventListener('mousemove', this._onResizeMoveHandler);
		document.removeEventListener('mouseup', this._onResizeEndHandler);

		// Restore user selection
		document.body.style.userSelect = '';

		// Remove resizing class
		barElement.classList.remove('gantt-task-bar--resizing');

		// Remove preview tooltip
		this._removeResizePreview();

		// Calculate final dates
		let hasChanges = false;
		let newStartDate, newDueDate;

		if (this.resizeState.handle === 'left') {
			const result = this._calculateNewDatesFromResize(task, 'left', this.resizeState.columnOffset);
			newStartDate = result.newStartDate;
			newDueDate = result.newDueDate;

			// Check if start date changed
			const originalStart = this._parseDate(this.resizeState.originalTask.start_date);
			if (newStartDate && originalStart && newStartDate.getTime() !== originalStart.getTime()) {
				hasChanges = true;
			}
		} else {
			const result = this._calculateNewDatesFromResize(task, 'right', this.resizeState.columnOffset);
			newStartDate = result.newStartDate;
			newDueDate = result.newDueDate;

			// Check if due date changed
			const originalDue = this._parseDate(this.resizeState.originalTask.due_date);
			if (newDueDate && originalDue && newDueDate.getTime() !== originalDue.getTime()) {
				hasChanges = true;
			}
		}

		// If dates changed, update task data
		if (hasChanges && newStartDate && newDueDate) {
			// Update task data
			task.start_date = this._formatDateForAPI(newStartDate);
			task.due_date = this._formatDateForAPI(newDueDate);

			// Re-render the chart to reflect changes
			this.render();

			// Emit event for external listeners (will be used in Phase 4.3 for API save)
			this._emitEvent('taskDateChanged', {
				taskId: task.name,
				startDate: task.start_date,
				dueDate: task.due_date,
				originalStartDate: this.resizeState.originalTask.start_date,
				originalDueDate: this.resizeState.originalTask.due_date
			});
		} else {
			// No change, snap back to original position
			const position = this._calculateTaskBarPosition(task);
			barElement.style.left = `${position.left}px`;
			barElement.style.width = `${position.width}px`;
		}

		// Reset resize state
		this.resizeState.isResizing = false;
		this.resizeState.taskId = null;
		this.resizeState.handle = null;
		this.resizeState.startX = 0;
		this.resizeState.startLeft = 0;
		this.resizeState.startWidth = 0;
		this.resizeState.columnOffset = 0;
		this.resizeState.originalTask = null;
	}

	/**
	 * Calculate new dates from resize
	 * @private
	 */
	_calculateNewDatesFromResize(task, handle, columnOffsetOrCount) {
		const startDate = this._parseDate(task.start_date);
		const dueDate = this._parseDate(task.due_date);

		if (!startDate || !dueDate) {
			return { newStartDate: null, newDueDate: null };
		}

		let newStartDate, newDueDate;

		if (handle === 'left') {
			// Left handle: adjust start date based on column offset
			const startColumnIndex = this._findColumnIndexForDate(startDate);
			const newStartColumnIndex = columnOffsetOrCount;

			// Calculate offset in days
			let offsetDays = 0;
			switch (this.currentZoom) {
				case 'day':
					offsetDays = (newStartColumnIndex - startColumnIndex);
					break;
				case 'week':
					offsetDays = (newStartColumnIndex - startColumnIndex) * 7;
					break;
				case 'month':
					offsetDays = (newStartColumnIndex - startColumnIndex) * 30;
					break;
				case 'quarter':
					offsetDays = (newStartColumnIndex - startColumnIndex) * 90;
					break;
			}

			newStartDate = new Date(startDate);
			newStartDate.setDate(newStartDate.getDate() + offsetDays);
			newDueDate = new Date(dueDate); // Keep end date same
		} else {
			// Right handle: adjust end date based on column count
			const columnCount = columnOffsetOrCount;

			// Calculate duration in days based on column count and zoom
			let durationDays = 0;
			switch (this.currentZoom) {
				case 'day':
					durationDays = columnCount - 1; // columnCount includes start day
					break;
				case 'week':
					durationDays = (columnCount * 7) - 1;
					break;
				case 'month':
					durationDays = (columnCount * 30) - 1;
					break;
				case 'quarter':
					durationDays = (columnCount * 90) - 1;
					break;
			}

			newStartDate = new Date(startDate); // Keep start date same
			newDueDate = new Date(startDate);
			newDueDate.setDate(newDueDate.getDate() + durationDays);
		}

		return { newStartDate, newDueDate };
	}

	/**
	 * Create resize preview tooltip
	 * @private
	 */
	_createResizePreview(task) {
		const preview = document.createElement('div');
		preview.className = 'gantt-drag-preview'; // Reuse drag preview styles
		preview.style.display = 'none'; // Initially hidden
		this.resizeState.previewElement = preview;
		document.body.appendChild(preview);
	}

	/**
	 * Update resize preview tooltip
	 * @private
	 */
	_updateResizePreview(event, newStartDate, newDueDate) {
		if (!this.resizeState.previewElement) return;

		// Format dates for display
		const startStr = this._formatDate(this._formatDateForAPI(newStartDate));
		const dueStr = this._formatDate(this._formatDateForAPI(newDueDate));

		// Update content
		this.resizeState.previewElement.textContent = `${startStr} - ${dueStr}`;

		// Position near cursor
		this.resizeState.previewElement.style.left = `${event.clientX + 15}px`;
		this.resizeState.previewElement.style.top = `${event.clientY - 10}px`;
		this.resizeState.previewElement.style.display = 'block';
	}

	/**
	 * Remove resize preview tooltip
	 * @private
	 */
	_removeResizePreview() {
		if (this.resizeState.previewElement && this.resizeState.previewElement.parentNode) {
			this.resizeState.previewElement.parentNode.removeChild(this.resizeState.previewElement);
			this.resizeState.previewElement = null;
		}
	}

	/**
	 * Save task date changes to backend via API
	 * @param {Object} eventData - Event data from taskDateChanged event
	 */
	saveTaskDates(eventData) {
		const { taskId, startDate, dueDate, originalStartDate, originalDueDate } = eventData;

		// Find the task in our data
		const task = this.tasks.find(t => t.name === taskId);
		if (!task) return;

		// Show loading indicator
		frappe.freeze('Guardando cambios...');

		// Call API to update task schedule
		frappe.call({
			method: 'workhub_frappe_app.api.gantt.update_task_schedule',
			args: {
				task_id: taskId,
				start_date: startDate,
				due_date: dueDate
			},
			callback: (response) => {
				// Hide loading indicator
				frappe.unfreeze();

				if (response.message && response.message.success) {
					// Show success notification
					frappe.show_alert({
						message: 'Fechas actualizadas correctamente',
						indicator: 'green'
					}, 3);

					// Refresh chart to show propagated dates
					this._refreshChartData();
				} else {
					// Rollback to original dates
					this._rollbackTaskDates(task, originalStartDate, originalDueDate);
				}
			},
			error: (error) => {
				// Hide loading indicator
				frappe.unfreeze();

				// Rollback to original dates
				this._rollbackTaskDates(task, originalStartDate, originalDueDate);

				// Show error message
				frappe.msgprint({
					title: 'Error',
					message: 'No se pudieron guardar los cambios. Por favor intenta de nuevo.',
					indicator: 'red'
				});

				if (frappe.boot.developer_mode) {
				console.error('Error saving task dates:', error);
			}
			}
		});
	}

	/**
	 * Rollback task dates to original values
	 * @private
	 */
	_rollbackTaskDates(task, originalStartDate, originalDueDate) {
		task.start_date = originalStartDate;
		task.due_date = originalDueDate;

		// Re-render chart to show original dates
		this.render();
	}

	/**
	 * Refresh chart data from server to show propagated dates
	 * @private
	 */
	_refreshChartData() {
		if (!this.project || !this.project.name) {
			if (frappe.boot.developer_mode) {
			console.error('No project ID available for refresh');
		}
			return;
		}

		// Show loading
		frappe.freeze('Actualizando dependencias...');

		// Fetch fresh data from server
		frappe.call({
			method: 'workhub_frappe_app.api.gantt.get_gantt_view',
			args: {
				project_id: this.project.name
			},
			callback: (response) => {
				frappe.unfreeze();

				if (response.message) {
					// Update data
					this.setData({
						project: response.message.project,
						tasks: response.message.tasks,
						dependencies: response.message.dependencies,
						milestones: response.message.tasks.filter(t => t.is_milestone),
						criticalPath: response.message.critical_path || []
					});

					// Re-render chart
					this.render();
				}
			},
			error: (error) => {
				frappe.unfreeze();
				if (frappe.boot.developer_mode) {
				console.error('Error refreshing chart data:', error);
			}
			}
		});
	}

	/**
	 * Setup click handler on task bar to open detail sidebar
	 * @private
	 */
	_setupTaskBarClick(barElement, task) {
		let clickStartTime = 0;
		let clickStartX = 0;
		let clickStartY = 0;

		// Track mousedown to detect drag vs click
		barElement.addEventListener('mousedown', (e) => {
			clickStartTime = Date.now();
			clickStartX = e.clientX;
			clickStartY = e.clientY;
		});

		// Use click event to open sidebar
		barElement.addEventListener('click', (e) => {
			// Check if this was a drag (mouse moved significantly or took too long)
			const timeDiff = Date.now() - clickStartTime;
			const distanceX = Math.abs(e.clientX - clickStartX);
			const distanceY = Math.abs(e.clientY - clickStartY);
			const isDrag = timeDiff > 200 || distanceX > 5 || distanceY > 5;

			// Only open if not dragging/resizing
			if (isDrag || this.dragState.isDragging || this.resizeState.isResizing) {
				return;
			}

			// Don't trigger on handle clicks
			if (e.target.closest('.gantt-task-bar__handle')) {
				return;
			}

			this.openTaskDetail(task);
		});
	}

	/**
	 * Open task detail sidebar
	 * @public
	 */
	openTaskDetail(task) {
		const sidebar = document.getElementById('task-detail-sidebar');
		const overlay = document.getElementById('sidebar-overlay');
		const content = document.getElementById('task-detail-content');

		if (!sidebar || !overlay || !content) {
			if (frappe.boot.developer_mode) {
			console.error('Sidebar elements not found');
		}
			return;
		}

		// Populate sidebar content
		content.innerHTML = this._renderTaskDetailContent(task);

		// Setup event listeners
		this._setupTaskDetailListeners(task);

		// Show sidebar
		sidebar.classList.add('open');
		overlay.classList.add('active');
	}

	/**
	 * Close task detail sidebar
	 * @public
	 */
	closeTaskDetail() {
		const sidebar = document.getElementById('task-detail-sidebar');
		const overlay = document.getElementById('sidebar-overlay');

		if (sidebar && overlay) {
			sidebar.classList.remove('open');
			overlay.classList.remove('active');
		}
	}

	/**
	 * Render task detail content HTML
	 * @private
	 */
	_renderTaskDetailContent(task) {
		// Format dates
		const startDate = task.start_date ? this._formatDate(new Date(task.start_date)) : 'Sin definir';
		const dueDate = task.due_date ? this._formatDate(new Date(task.due_date)) : 'Sin definir';

		// Status label
		const statusLabel = this._formatStatus(task.status);

		// Get dependencies for this task
		const predecessors = this.dependencies.filter(d => d.successor === task.name);
		const successors = this.dependencies.filter(d => d.predecessor === task.name);

		// Build HTML
		let html = `
			<div class="task-detail">
				<!-- Task Title -->
				<div class="task-detail__section">
					<h4 class="task-detail__task-title">${this._escapeHtml(task.title || task.name)}</h4>
				</div>

				<!-- Description -->
				${task.description ? `
				<div class="task-detail__section">
					<label class="task-detail__label">Descripción</label>
					<div class="task-detail__value task-detail__description">
						${this._escapeHtml(task.description)}
					</div>
				</div>
				` : ''}

				<!-- Dates -->
				<div class="task-detail__section">
					<label class="task-detail__label">Fechas</label>
					<div class="task-detail__dates">
						<div class="task-detail__date-item">
							<span class="task-detail__date-label">Inicio:</span>
							<span class="task-detail__date-value">${startDate}</span>
						</div>
						<div class="task-detail__date-item">
							<span class="task-detail__date-label">Fin:</span>
							<span class="task-detail__date-value">${dueDate}</span>
						</div>
						${task.duration_days ? `
						<div class="task-detail__date-item">
							<span class="task-detail__date-label">Duración:</span>
							<span class="task-detail__date-value">${task.duration_days} día${task.duration_days !== 1 ? 's' : ''}</span>
						</div>
						` : ''}
					</div>
				</div>

				<!-- Assigned User -->
				${task.assigned_to ? `
				<div class="task-detail__section">
					<label class="task-detail__label">Asignado a</label>
					<div class="task-detail__assigned">
						<div class="task-detail__avatar">
							${this._getInitials(task.assigned_to)}
						</div>
						<span class="task-detail__assigned-name">${this._escapeHtml(task.assigned_name || task.assigned_to)}</span>
					</div>
				</div>
				` : ''}

				<!-- Status with dropdown -->
				<div class="task-detail__section">
					<label class="task-detail__label">Estado</label>
					<select class="task-detail__status-select" id="task-status-select" data-task-id="${task.name}">
						<option value="BACKLOG" ${task.status === 'BACKLOG' ? 'selected' : ''}>Backlog</option>
						<option value="NEXT" ${task.status === 'NEXT' ? 'selected' : ''}>Siguiente</option>
						<option value="DOING" ${task.status === 'DOING' ? 'selected' : ''}>En Curso</option>
						<option value="BLOCKED" ${task.status === 'BLOCKED' ? 'selected' : ''}>Bloqueada</option>
						<option value="DONE" ${task.status === 'DONE' ? 'selected' : ''}>Completada</option>
					</select>
				</div>

				<!-- Priority -->
				${task.priority ? `
				<div class="task-detail__section">
					<label class="task-detail__label">Prioridad</label>
					<div class="task-detail__priority task-detail__priority--${task.priority.toLowerCase()}">
						${task.priority}
					</div>
				</div>
				` : ''}

				<!-- Dependencies -->
				${predecessors.length > 0 || successors.length > 0 ? `
				<div class="task-detail__section">
					<label class="task-detail__label">Dependencias</label>
					<div class="task-detail__dependencies">
						${predecessors.length > 0 ? `
						<div class="task-detail__dep-group">
							<div class="task-detail__dep-type">Predecesoras:</div>
							<ul class="task-detail__dep-list">
								${predecessors.map(d => {
									const predTask = this.tasks.find(t => t.name === d.predecessor);
									return `<li class="task-detail__dep-item">
										${this._escapeHtml(predTask ? predTask.title : d.predecessor)} <span class="task-detail__dep-type-label">(${d.type})</span>
									</li>`;
								}).join('')}
							</ul>
						</div>
						` : ''}
						${successors.length > 0 ? `
						<div class="task-detail__dep-group">
							<div class="task-detail__dep-type">Sucesoras:</div>
							<ul class="task-detail__dep-list">
								${successors.map(d => {
									const succTask = this.tasks.find(t => t.name === d.successor);
									return `<li class="task-detail__dep-item">
										${this._escapeHtml(succTask ? succTask.title : d.successor)} <span class="task-detail__dep-type-label">(${d.type})</span>
									</li>`;
								}).join('')}
							</ul>
						</div>
						` : ''}
					</div>
				</div>
				` : ''}

				<!-- Estimated Hours -->
				${task.estimated_hours ? `
				<div class="task-detail__section">
					<label class="task-detail__label">Horas Estimadas</label>
					<div class="task-detail__value">${task.estimated_hours} horas</div>
				</div>
				` : ''}
			</div>
		`;

		return html;
	}

	/**
	 * Setup event listeners for task detail sidebar
	 * @private
	 */
	_setupTaskDetailListeners(task) {
		// Status change listener
		setTimeout(() => {
			const statusSelect = document.getElementById('task-status-select');
			if (statusSelect) {
				statusSelect.addEventListener('change', (e) => {
					const newStatus = e.target.value;
					this._updateTaskStatus(task.name, newStatus);
				});
			}
		}, 100); // Small delay to ensure DOM is ready
	}

	/**
	 * Update task status via API
	 * @private
	 */
	_updateTaskStatus(taskId, newStatus) {
		// Show loading
		frappe.freeze('Actualizando estado...');

		// Call API
		frappe.call({
			method: 'workhub_frappe_app.api.tasks.update_task',
			args: {
				task_id: taskId,
				data: JSON.stringify({ status: newStatus })
			},
			callback: (response) => {
				frappe.unfreeze();

				if (response.message) {
					// Show success message
					frappe.show_alert({
						message: 'Estado actualizado correctamente',
						indicator: 'green'
					}, 3);

					// Update local task data
					const task = this.tasks.find(t => t.name === taskId);
					if (task) {
						task.status = newStatus;

						// Update progress based on status
						const statusProgress = {
							'BACKLOG': 0,
							'NEXT': 10,
							'DOING': 50,
							'BLOCKED': 50,
							'DONE': 100
						};
						task.progress = statusProgress[newStatus] || 0;
					}

					// Re-render chart to show updated status
					this.render();

					// Close sidebar
					this.closeTaskDetail();
				}
			},
			error: (error) => {
				frappe.unfreeze();
				frappe.msgprint({
					title: 'Error',
					message: 'No se pudo actualizar el estado de la tarea',
					indicator: 'red'
				});
				if (frappe.boot.developer_mode) {
				console.error('Error updating task status:', error);
			}
			}
		});
	}

	/**
	 * Setup dependency drag connector on task bar
	 * Allows dragging from task end to create dependencies
	 * @private
	 */
	_setupDependencyDrag(barElement, task) {
		// Create dependency connector button on right side of task bar
		const connector = document.createElement('div');
		connector.className = 'gantt-task-bar__dependency-connector';
		connector.title = 'Crear dependencia';
		barElement.appendChild(connector);

		// Add mousedown listener to start dependency drag
		connector.addEventListener('mousedown', (e) => {
			// Only left mouse button
			if (e.button !== 0) return;

			e.preventDefault();
			e.stopPropagation();

			this._startDependencyDrag(barElement, task, e);
		});
	}

	/**
	 * Start dependency drag operation
	 * @private
	 */
	_startDependencyDrag(barElement, task, event) {
		// Initialize dependency drag state (inline since we can't modify constructor)
		if (!this.dependencyDragState) {
			this.dependencyDragState = {
				isDragging: false,
				sourceTaskId: null,
				sourceTaskElement: null,
				currentX: 0,
				currentY: 0,
				targetTaskId: null,
				targetTaskElement: null,
				previewLine: null
			};
		}

		// Set state
		this.dependencyDragState.isDragging = true;
		this.dependencyDragState.sourceTaskId = task.name;
		this.dependencyDragState.sourceTaskElement = barElement;
		this.dependencyDragState.currentX = event.clientX;
		this.dependencyDragState.currentY = event.clientY;

		// Create SVG preview line
		this._createDependencyPreviewLine();

		// Add document-level event listeners
		this._onDependencyDragMoveHandler = (e) => this._onDependencyDragMove(e);
		this._onDependencyDragEndHandler = (e) => this._onDependencyDragEnd(e);

		document.addEventListener('mousemove', this._onDependencyDragMoveHandler);
		document.addEventListener('mouseup', this._onDependencyDragEndHandler);

		// Prevent text selection during drag
		document.body.style.userSelect = 'none';
	}

	/**
	 * Create SVG preview line for dependency drag
	 * @private
	 */
	_createDependencyPreviewLine() {
		if (!this.elements.body) return;

		// Create or reuse SVG layer
		if (!this.dependencyDragState.previewLine) {
			const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			svg.setAttribute('class', 'gantt-dependency-preview');
			svg.style.position = 'absolute';
			svg.style.top = '0';
			svg.style.left = '0';
			svg.style.width = '100%';
			svg.style.height = '100%';
			svg.style.pointerEvents = 'none';
			svg.style.zIndex = '10';

			// Create path element
			const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path.setAttribute('class', 'gantt-dependency-preview__line');
			path.setAttribute('stroke', 'var(--primary)');
			path.setAttribute('stroke-width', '3');
			path.setAttribute('stroke-dasharray', '5,5');
			path.setAttribute('fill', 'none');

			svg.appendChild(path);
			this.elements.body.appendChild(svg);

			this.dependencyDragState.previewLine = { svg, path };
		}
	}

	/**
	 * Handle dependency drag move
	 * @private
	 */
	_onDependencyDragMove(event) {
		if (!this.dependencyDragState || !this.dependencyDragState.isDragging) return;

		event.preventDefault();

		// Update current position
		this.dependencyDragState.currentX = event.clientX;
		this.dependencyDragState.currentY = event.clientY;

		// Update preview line
		this._updateDependencyPreviewLine();

		// Check if hovering over a task bar (potential target)
		const targetElement = this._findTaskBarUnderCursor(event.clientX, event.clientY);

		// Update target highlighting
		if (this.dependencyDragState.targetTaskElement &&
			this.dependencyDragState.targetTaskElement !== targetElement) {
			// Remove highlight from previous target
			this.dependencyDragState.targetTaskElement.classList.remove('gantt-task-bar--dependency-target');
		}

		if (targetElement && targetElement !== this.dependencyDragState.sourceTaskElement) {
			// Highlight new target
			targetElement.classList.add('gantt-task-bar--dependency-target');
			this.dependencyDragState.targetTaskElement = targetElement;
			this.dependencyDragState.targetTaskId = targetElement.dataset.taskId;
		} else {
			this.dependencyDragState.targetTaskElement = null;
			this.dependencyDragState.targetTaskId = null;
		}
	}

	/**
	 * Update dependency preview line to follow cursor
	 * @private
	 */
	_updateDependencyPreviewLine() {
		if (!this.dependencyDragState.previewLine || !this.elements.body) return;

		const sourceBar = this.dependencyDragState.sourceTaskElement;
		if (!sourceBar) return;

		// Get source position (right edge of task bar)
		const sourcePos = this._getTaskBarPosition(sourceBar);
		if (!sourcePos) return;

		// Start from right edge of source task
		const startX = sourcePos.right;
		const startY = sourcePos.centerY;

		// End at cursor position (relative to timeline body)
		const bodyRect = this.elements.body.getBoundingClientRect();
		const endX = this.dependencyDragState.currentX - bodyRect.left;
		const endY = this.dependencyDragState.currentY - bodyRect.top;

		// Create simple curved path
		const dx = endX - startX;
		const cpOffset = Math.min(Math.abs(dx) / 2, 50);

		const path = `M ${startX} ${startY} C ${startX + cpOffset} ${startY}, ${endX - cpOffset} ${endY}, ${endX} ${endY}`;

		this.dependencyDragState.previewLine.path.setAttribute('d', path);
	}

	/**
	 * Find task bar element under cursor position
	 * @private
	 */
	_findTaskBarUnderCursor(clientX, clientY) {
		// Temporarily hide the preview line to get element underneath
		if (this.dependencyDragState.previewLine) {
			this.dependencyDragState.previewLine.svg.style.pointerEvents = 'none';
		}

		const element = document.elementFromPoint(clientX, clientY);

		// Restore pointer events
		if (this.dependencyDragState.previewLine) {
			this.dependencyDragState.previewLine.svg.style.pointerEvents = 'none'; // Keep it none
		}

		// Find closest task bar
		if (element) {
			const taskBar = element.closest('.gantt-task-bar');
			return taskBar;
		}

		return null;
	}

	/**
	 * Handle dependency drag end
	 * @private
	 */
	_onDependencyDragEnd(event) {
		if (!this.dependencyDragState || !this.dependencyDragState.isDragging) return;

		event.preventDefault();

		// Remove event listeners
		document.removeEventListener('mousemove', this._onDependencyDragMoveHandler);
		document.removeEventListener('mouseup', this._onDependencyDragEndHandler);

		// Restore user selection
		document.body.style.userSelect = '';

		// Remove preview line
		this._removeDependencyPreviewLine();

		// Remove target highlighting
		if (this.dependencyDragState.targetTaskElement) {
			this.dependencyDragState.targetTaskElement.classList.remove('gantt-task-bar--dependency-target');
		}

		// If dropped on a valid target, create dependency
		if (this.dependencyDragState.targetTaskId &&
			this.dependencyDragState.targetTaskId !== this.dependencyDragState.sourceTaskId) {
			this._createDependency(
				this.dependencyDragState.sourceTaskId,
				this.dependencyDragState.targetTaskId
			);
		}

		// Reset state
		this.dependencyDragState.isDragging = false;
		this.dependencyDragState.sourceTaskId = null;
		this.dependencyDragState.sourceTaskElement = null;
		this.dependencyDragState.targetTaskId = null;
		this.dependencyDragState.targetTaskElement = null;
		this.dependencyDragState.currentX = 0;
		this.dependencyDragState.currentY = 0;
	}

	/**
	 * Remove dependency preview line
	 * @private
	 */
	_removeDependencyPreviewLine() {
		if (this.dependencyDragState && this.dependencyDragState.previewLine) {
			if (this.dependencyDragState.previewLine.svg.parentNode) {
				this.dependencyDragState.previewLine.svg.parentNode.removeChild(
					this.dependencyDragState.previewLine.svg
				);
			}
			this.dependencyDragState.previewLine = null;
		}
	}

	/**
	 * Create dependency via API
	 * @private
	 */
	_createDependency(predecessorId, successorId) {
		// Show loading
		frappe.freeze('Creando dependencia...');

		// Call API
		frappe.call({
			method: 'workhub_frappe_app.api.gantt.add_dependency',
			args: {
				predecessor_id: predecessorId,
				successor_id: successorId,
				dep_type: 'FS', // Default to Finish-to-Start
				lag_days: 0
			},
			callback: (response) => {
				frappe.unfreeze();

				if (response.message && response.message.success) {
					// Show success notification
					frappe.show_alert({
						message: 'Dependencia creada correctamente',
						indicator: 'green'
					}, 3);

					// Refresh chart to show new dependency
					this._refreshChartData();
				} else {
					// Show error message
					const errorMsg = response.message && response.message.message
						? response.message.message
						: 'No se pudo crear la dependencia';

					frappe.msgprint({
						title: 'Error',
						message: errorMsg,
						indicator: 'orange'
					});
				}
			},
			error: (error) => {
				frappe.unfreeze();

				frappe.msgprint({
					title: 'Error',
					message: 'No se pudo crear la dependencia. Por favor intenta de nuevo.',
					indicator: 'red'
				});

				if (frappe.boot.developer_mode) {
				console.error('Error creating dependency:', error);
			}
			}
		});
	}

	/**
	 * Setup context menu for task bar
	 * @private
	 */
	_setupTaskBarContextMenu(barElement, task) {
		barElement.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			e.stopPropagation();

			// Close any existing context menu
			this._closeContextMenu();

			// Show context menu at cursor position
			this._showContextMenu(task, e.clientX, e.clientY);
		});
	}

	/**
	 * Show context menu
	 * @private
	 */
	_showContextMenu(task, x, y) {
		// Create context menu element
		const menu = document.createElement('div');
		menu.className = 'gantt-context-menu';
		menu.id = 'gantt-context-menu';

		// Build menu items
		const items = [
			{
				label: 'Editar tarea',
				icon: '✏️',
				action: () => {
					this.openTaskDetail(task);
					this._closeContextMenu();
				}
			},
			{
				type: 'divider'
			},
			{
				label: 'Cambiar estado',
				icon: '🔄',
				submenu: [
					{ label: 'Backlog', value: 'BACKLOG' },
					{ label: 'Siguiente', value: 'NEXT' },
					{ label: 'En progreso', value: 'DOING' },
					{ label: 'Bloqueada', value: 'BLOCKED' },
					{ label: 'Completada', value: 'DONE' }
				],
				action: null // Handled by submenu items
			},
			{
				type: 'divider'
			},
			{
				label: task.is_milestone ? 'Quitar hito' : 'Marcar como hito',
				icon: task.is_milestone ? '◇' : '◆',
				action: () => {
					this._toggleMilestone(task);
					this._closeContextMenu();
				}
			},
			{
				label: 'Ver dependencias',
				icon: '🔗',
				action: () => {
					this._showDependenciesDialog(task);
					this._closeContextMenu();
				}
			},
			{
				type: 'divider'
			},
			{
				label: 'Eliminar dependencias',
				icon: '🗑️',
				className: 'gantt-context-menu__item--danger',
				action: () => {
					this._removeDependenciesDialog(task);
					this._closeContextMenu();
				}
			}
		];

		// Render menu items
		items.forEach(item => {
			if (item.type === 'divider') {
				const divider = document.createElement('div');
				divider.className = 'gantt-context-menu__divider';
				menu.appendChild(divider);
			} else if (item.submenu) {
				// Status change submenu
				const menuItem = document.createElement('div');
				menuItem.className = 'gantt-context-menu__item';
				if (item.className) {
					menuItem.classList.add(item.className);
				}
				menuItem.innerHTML = `${item.icon} ${item.label} ▸`;

				// Create submenu
				const submenu = document.createElement('div');
				submenu.className = 'gantt-context-menu gantt-context-menu__submenu';
				submenu.style.display = 'none';

				item.submenu.forEach(subItem => {
					const subMenuItem = document.createElement('div');
					subMenuItem.className = 'gantt-context-menu__item';
					subMenuItem.textContent = subItem.label;

					// Highlight current status
					if (subItem.value === task.status) {
						subMenuItem.style.fontWeight = 'bold';
						subMenuItem.style.background = 'var(--surface-2)';
					}

					subMenuItem.addEventListener('click', () => {
						this._updateTaskStatus(task.name, subItem.value);
						this._closeContextMenu();
					});

					submenu.appendChild(subMenuItem);
				});

				// Show/hide submenu on hover
				menuItem.addEventListener('mouseenter', (e) => {
					submenu.style.display = 'block';
					const rect = menuItem.getBoundingClientRect();
					submenu.style.position = 'fixed';
					submenu.style.left = `${rect.right}px`;
					submenu.style.top = `${rect.top}px`;
				});

				menuItem.addEventListener('mouseleave', (e) => {
					// Keep submenu visible if mouse is over it
					setTimeout(() => {
						if (!submenu.matches(':hover')) {
							submenu.style.display = 'none';
						}
					}, 100);
				});

				submenu.addEventListener('mouseleave', () => {
					submenu.style.display = 'none';
				});

				menu.appendChild(menuItem);
				document.body.appendChild(submenu);
			} else {
				// Regular menu item
				const menuItem = document.createElement('div');
				menuItem.className = 'gantt-context-menu__item';
				if (item.className) {
					menuItem.classList.add(item.className);
				}
				menuItem.innerHTML = `${item.icon} ${item.label}`;

				menuItem.addEventListener('click', () => {
					if (item.action) {
						item.action();
					}
				});

				menu.appendChild(menuItem);
			}
		});

		// Position menu at cursor
		menu.style.position = 'fixed';
		menu.style.left = `${x}px`;
		menu.style.top = `${y}px`;

		// Add to document
		document.body.appendChild(menu);

		// Adjust position if menu goes off-screen
		const rect = menu.getBoundingClientRect();
		if (rect.right > window.innerWidth) {
			menu.style.left = `${x - rect.width}px`;
		}
		if (rect.bottom > window.innerHeight) {
			menu.style.top = `${y - rect.height}px`;
		}

		// Store reference
		this.contextMenuState = {
			isVisible: true,
			taskId: task.name,
			element: menu
		};

		// Setup click-outside to close
		setTimeout(() => {
			document.addEventListener('click', this._handleContextMenuClickOutside);
		}, 0);
	}

	/**
	 * Close context menu
	 * @private
	 */
	_closeContextMenu() {
		if (this.contextMenuState && this.contextMenuState.element) {
			// Remove main menu
			this.contextMenuState.element.remove();

			// Remove any submenus
			document.querySelectorAll('.gantt-context-menu__submenu').forEach(submenu => {
				submenu.remove();
			});

			// Remove click listener
			document.removeEventListener('click', this._handleContextMenuClickOutside);

			// Reset state
			this.contextMenuState = {
				isVisible: false,
				taskId: null,
				element: null
			};
		}
	}

	/**
	 * Handle click outside context menu
	 * @private
	 */
	_handleContextMenuClickOutside = (e) => {
		if (this.contextMenuState && this.contextMenuState.isVisible) {
			const menu = this.contextMenuState.element;
			if (menu && !menu.contains(e.target)) {
				this._closeContextMenu();
			}
		}
	}

	/**
	 * Toggle milestone status
	 * @private
	 */
	_toggleMilestone(task) {
		const newValue = !task.is_milestone;

		// Show loading
		frappe.freeze('Actualizando tarea...');

		// Call API
		frappe.call({
			method: 'workhub_frappe_app.api.tasks.update_task',
			args: {
				task_id: task.name,
				data: JSON.stringify({ is_milestone: newValue ? 1 : 0 })
			},
			callback: (response) => {
				frappe.unfreeze();

				if (response.message) {
					// Show success message
					frappe.show_alert({
						message: newValue ? 'Tarea marcada como hito' : 'Hito removido',
						indicator: 'green'
					}, 3);

					// Update local data and re-render
					task.is_milestone = newValue;
					this._refreshChartData();
				}
			},
			error: (error) => {
				frappe.unfreeze();

				frappe.msgprint({
					title: 'Error',
					message: 'No se pudo actualizar la tarea',
					indicator: 'red'
				});

				if (frappe.boot.developer_mode) {
				console.error('Error toggling milestone:', error);
			}
			}
		});
	}

	/**
	 * Show dependencies dialog
	 * @private
	 */
	_showDependenciesDialog(task) {
		// Get dependencies for this task
		const predecessors = this.dependencies.filter(d => d.successor === task.name);
		const successors = this.dependencies.filter(d => d.predecessor === task.name);

		let message = `<h4>${task.title || task.name}</h4><br>`;

		if (predecessors.length > 0) {
			message += '<strong>Predecesoras:</strong><ul>';
			predecessors.forEach(dep => {
				const predTask = this.tasks.find(t => t.name === dep.predecessor);
				const predTitle = predTask ? predTask.title || predTask.name : dep.predecessor;
				message += `<li>${predTitle} (${dep.type})</li>`;
			});
			message += '</ul><br>';
		}

		if (successors.length > 0) {
			message += '<strong>Sucesoras:</strong><ul>';
			successors.forEach(dep => {
				const succTask = this.tasks.find(t => t.name === dep.successor);
				const succTitle = succTask ? succTask.title || succTask.name : dep.successor;
				message += `<li>${succTitle} (${dep.type})</li>`;
			});
			message += '</ul>';
		}

		if (predecessors.length === 0 && successors.length === 0) {
			message += '<p>Esta tarea no tiene dependencias.</p>';
		}

		frappe.msgprint({
			title: 'Dependencias',
			message: message,
			indicator: 'blue'
		});
	}

	/**
	 * Show remove dependencies dialog
	 * @private
	 */
	_removeDependenciesDialog(task) {
		// Get dependencies for this task
		const allDeps = this.dependencies.filter(
			d => d.predecessor === task.name || d.successor === task.name
		);

		if (allDeps.length === 0) {
			frappe.msgprint({
				title: 'Sin dependencias',
				message: 'Esta tarea no tiene dependencias para eliminar.',
				indicator: 'blue'
			});
			return;
		}

		// Build list of dependencies to remove
		let message = '<p>Selecciona las dependencias a eliminar:</p><div>';

		allDeps.forEach(dep => {
			const predTask = this.tasks.find(t => t.name === dep.predecessor);
			const succTask = this.tasks.find(t => t.name === dep.successor);
			const predTitle = predTask ? predTask.title || predTask.name : dep.predecessor;
			const succTitle = succTask ? succTask.title || succTask.name : dep.successor;

			message += `
				<div style="margin: 8px 0;">
					<label style="cursor: pointer;">
						<input type="checkbox" class="dep-checkbox" data-dep-id="${dep.name}" style="margin-right: 8px;">
						${predTitle} → ${succTitle} (${dep.type})
					</label>
				</div>
			`;
		});

		message += '</div>';

		const dialog = frappe.msgprint({
			title: 'Eliminar dependencias',
			message: message,
			indicator: 'orange',
			primary_action: {
				label: 'Eliminar seleccionadas',
				action: () => {
					const checkboxes = dialog.$wrapper.find('.dep-checkbox:checked');
					const depIds = [];

					checkboxes.each(function() {
						depIds.push($(this).data('dep-id'));
					});

					if (depIds.length === 0) {
						frappe.show_alert({
							message: 'No se seleccionaron dependencias',
							indicator: 'orange'
						}, 3);
						return;
					}

					// Remove dependencies
					this._removeDependencies(depIds);
					dialog.hide();
				}
			}
		});
	}

	/**
	 * Remove dependencies by IDs
	 * @private
	 */
	_removeDependencies(depIds) {
		frappe.freeze('Eliminando dependencias...');

		// Remove each dependency via API
		const promises = depIds.map(depId => {
			return new Promise((resolve, reject) => {
				frappe.call({
					method: 'workhub_frappe_app.api.gantt.remove_dependency',
					args: { dependency_id: depId },
					callback: (response) => {
						if (response.message && response.message.success) {
							resolve();
						} else {
							reject();
						}
					},
					error: reject
				});
			});
		});

		Promise.all(promises)
			.then(() => {
				frappe.unfreeze();

				frappe.show_alert({
					message: `${depIds.length} dependencia(s) eliminada(s)`,
					indicator: 'green'
				}, 3);

				// Refresh chart
				this._refreshChartData();
			})
			.catch((error) => {
				frappe.unfreeze();

				frappe.msgprint({
					title: 'Error',
					message: 'No se pudieron eliminar todas las dependencias',
					indicator: 'red'
				});

				if (frappe.boot.developer_mode) {
				console.error('Error removing dependencies:', error);
			}
			});
	}

	/**
	 * Export Gantt chart as PNG
	 * Captures the project header and chart area and downloads as an image
	 */
	async exportAsPNG() {
		// Load html2canvas library if not already loaded
		if (!window.html2canvas) {
			await this._loadHtml2Canvas();
		}

		// Show loading indicator
		frappe.freeze('Generando imagen...');

		try {
			// Find the elements to capture
			const toolbar = document.querySelector('.gantt-toolbar');
			const projectHeader = document.querySelector('.gantt-project-header');
			const ganttContainer = document.querySelector('.gantt-container');

			if (!ganttContainer) {
				throw new Error('No se encontró el contenedor del Gantt');
			}

			// Create a temporary wrapper to capture all elements together
			const wrapper = document.createElement('div');
			wrapper.style.cssText = `
				position: absolute;
				left: -9999px;
				top: 0;
				background: white;
				padding: 20px;
			`;

			// Clone elements
			const toolbarClone = toolbar ? toolbar.cloneNode(true) : null;
			const headerClone = projectHeader ? projectHeader.cloneNode(true) : null;
			const chartClone = ganttContainer.cloneNode(true);

			// Remove toolbar buttons we don't need in export
			if (toolbarClone) {
				const rightButtons = toolbarClone.querySelector('.gantt-toolbar__right');
				if (rightButtons) {
					rightButtons.remove();
				}
				wrapper.appendChild(toolbarClone);
			}

			// Add header and chart
			if (headerClone) {
				wrapper.appendChild(headerClone);
			}

			// Make chart container non-scrollable for export
			chartClone.style.overflow = 'visible';
			chartClone.style.height = 'auto';
			const chartInner = chartClone.querySelector('.gantt-chart');
			if (chartInner) {
				chartInner.style.minHeight = 'auto';
			}

			wrapper.appendChild(chartClone);

			// Add to DOM temporarily
			document.body.appendChild(wrapper);

			// Generate canvas
			const canvas = await html2canvas(wrapper, {
				backgroundColor: '#ffffff',
				scale: 2, // Higher quality
				logging: false,
				useCORS: true,
				allowTaint: true,
				width: wrapper.scrollWidth,
				height: wrapper.scrollHeight
			});

			// Remove temporary wrapper
			document.body.removeChild(wrapper);

			// Convert to blob and download
			canvas.toBlob((blob) => {
				const url = URL.createObjectURL(blob);
				const link = document.createElement('a');
				const projectName = this.project ? this.project.title : 'Timeline';
				const timestamp = new Date().toISOString().split('T')[0];
				link.download = `${projectName}_${timestamp}.png`;
				link.href = url;
				link.click();

				// Clean up
				URL.revokeObjectURL(url);

				frappe.unfreeze();

				// Show success message
				frappe.show_alert({
					message: 'Timeline exportado exitosamente',
					indicator: 'green'
				}, 3);
			}, 'image/png');

		} catch (error) {
			frappe.unfreeze();

			frappe.msgprint({
				title: 'Error',
				message: 'No se pudo exportar el timeline: ' + (error.message || 'Error desconocido'),
				indicator: 'red'
			});

			if (frappe.boot.developer_mode) {
			console.error('Export error:', error);
		}
		}
	}

	/**
	 * Load html2canvas library dynamically
	 * @private
	 */
	_loadHtml2Canvas() {
		return new Promise((resolve, reject) => {
			// Check if already loaded
			if (window.html2canvas) {
				resolve();
				return;
			}

			// Load from CDN
			const script = document.createElement('script');
			script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
			script.integrity = 'sha512-BNaRQnYJYiPSqHHDb58B0yaPfCu+Wgds8Gp/gU33kqBtgNS4tSPHuGibyoeqMV/TJlSKda6FXzoEyYGjTe+vXA==';
			script.crossOrigin = 'anonymous';
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('No se pudo cargar html2canvas'));
			document.head.appendChild(script);
		});
	}

	/**
	 * Print Gantt chart
	 * Opens browser print dialog with print-optimized view
	 */
	printChart() {
		// Save scroll position
		const scrollContainer = this._getScrollContainer();
		const savedScroll = scrollContainer ? scrollContainer.scrollLeft : 0;

		// Add print class to hide interactive elements
		document.body.classList.add('gantt-printing');

		// Print
		window.print();

		// Restore after print
		setTimeout(() => {
			document.body.classList.remove('gantt-printing');
			if (scrollContainer) {
				scrollContainer.scrollLeft = savedScroll;
			}
		}, 100);
	}

	/**
	 * Destroy the component
		 */
		destroy() {
			// Close context menu if open
			this._closeContextMenu();

			// Remove drag preview if exists
			this._removeDragPreview();

			// Remove resize preview if exists
			this._removeResizePreview();

			// Remove dependency preview if exists
			this._removeDependencyPreviewLine();

			// Clear container
			this.container.innerHTML = '';
			this.elements = {};
		}
	};

})();
