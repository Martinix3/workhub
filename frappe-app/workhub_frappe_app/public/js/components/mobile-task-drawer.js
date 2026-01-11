/**
 * MobileTaskDrawer Component
 *
 * Bottom sheet UI for creating and editing tasks on mobile.
 * Provides touch-optimized form with all task fields.
 *
 * Features:
 * - Bottom sheet drawer on mobile, modal on desktop
 * - Touch-friendly form inputs with validation
 * - Swipe to dismiss gesture
 * - Status picker with visual feedback
 * - Priority selection
 * - Department assignment
 * - Due date picker
 * - Integrates with Leantime API
 * - Works with mobile-drawer.css and mobile-forms.css
 *
 * Usage:
 *
 * 1. Create new task (standalone):
 *    frappe.workhub.MobileTaskDrawer.openNewTaskDrawer({
 *      onSave: (task) => console.log('Task created:', task)
 *    });
 *
 * 2. Edit existing task (standalone):
 *    frappe.workhub.MobileTaskDrawer.openEditTaskDrawer({
 *      id: '123',
 *      name: 'Task name',
 *      description: 'Description',
 *      status: 'DOING',
 *      priority: 'P1',
 *      department: 'SALES',
 *      dueDate: '2026-01-15',
 *      assignedTo: 'user@example.com'
 *    }, {
 *      onSave: (task) => console.log('Task updated:', task)
 *    });
 *
 * 3. Automatic editing via taskEditor module (recommended):
 *    Simply add data-task-id attribute to task elements and the
 *    taskEditor module in workhub.bundle.js will automatically
 *    handle click events to open this drawer. See taskEditor
 *    module documentation for HTML structure examples.
 *
 * Integration with task lists:
 * The drawer automatically integrates with the taskEditor module
 * which handles click events on task elements. When a user clicks
 * on a task with [data-task-id], the drawer opens in edit mode.
 */

frappe.workhub = frappe.workhub || {};

frappe.workhub.MobileTaskDrawer = class MobileTaskDrawer {
	constructor(options = {}) {
		this.options = {
			mode: options.mode || 'create', // 'create' or 'edit'
			taskData: options.taskData || null, // Existing task data for edit mode
			onSave: options.onSave || null, // Callback when task saved
			onCancel: options.onCancel || null, // Callback when cancelled
			...options
		};

		// State
		this.isOpen = false;
		this.isSaving = false;
		this.isDragging = false;
		this.dragStartY = 0;
		this.currentY = 0;

		// DOM references
		this.backdrop = null;
		this.drawer = null;
		this.form = null;

		// Task statuses
		this.statuses = ['BACKLOG', 'NEXT', 'DOING', 'BLOCKED', 'DONE'];

		// Priorities
		this.priorities = ['P0', 'P1', 'P2'];

		// Departments
		this.departments = ['SALES', 'OPS', 'MKT'];

		// Initialize
		this.init();
	}

	/**
	 * Initialize the drawer
	 */
	init() {
		this.createDrawer();
		this.attachEventListeners();
	}

	/**
	 * Create drawer DOM structure
	 */
	createDrawer() {
		// Create backdrop
		this.backdrop = document.createElement('div');
		this.backdrop.className = 'wh-drawer-backdrop';
		this.backdrop.setAttribute('role', 'presentation');
		this.backdrop.setAttribute('aria-hidden', 'true');

		// Create drawer
		this.drawer = document.createElement('div');
		this.drawer.className = 'wh-drawer wh-drawer-lg';
		this.drawer.setAttribute('role', 'dialog');
		this.drawer.setAttribute('aria-modal', 'true');
		this.drawer.setAttribute('aria-labelledby', 'drawer-title');

		// Build drawer content
		const title = this.options.mode === 'create' ? __('New Task') : __('Edit Task');

		this.drawer.innerHTML = `
			<!-- Swipe handle -->
			<div class="wh-drawer-handle">
				<div class="wh-drawer-handle-bar"></div>
			</div>

			<!-- Header -->
			<div class="wh-drawer-header">
				<h2 id="drawer-title" class="wh-drawer-title">${title}</h2>
				<button class="wh-drawer-close" type="button" aria-label="${__('Close')}">
					<svg class="wh-drawer-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>

			<!-- Content -->
			<div class="wh-drawer-content">
				<form class="wh-mobile-form" id="task-form">
					<!-- Task Name -->
					<div class="wh-form-group">
						<label class="wh-form-label wh-form-label-required" for="task-name">
							${__('Task Name')}
						</label>
						<input
							type="text"
							id="task-name"
							name="name"
							class="wh-form-input"
							placeholder="${__('Enter task name...')}"
							required
							autocomplete="off"
						/>
						<div class="wh-form-error" style="display: none;"></div>
					</div>

					<!-- Description -->
					<div class="wh-form-group">
						<label class="wh-form-label wh-form-label-optional" for="task-description">
							${__('Description')}
						</label>
						<textarea
							id="task-description"
							name="description"
							class="wh-form-textarea"
							placeholder="${__('Add task description...')}"
							rows="4"
						></textarea>
					</div>

					<!-- Status -->
					<div class="wh-form-group">
						<label class="wh-form-label" for="task-status">
							${__('Status')}
						</label>
						<div class="wh-form-segmented" role="radiogroup" aria-labelledby="task-status">
							${this.statuses.map((status, index) => `
								<div
									class="wh-form-segmented-option ${index === 0 ? 'active' : ''}"
									data-status="${status}"
									role="radio"
									aria-checked="${index === 0 ? 'true' : 'false'}"
									tabindex="${index === 0 ? '0' : '-1'}"
								>
									${status}
								</div>
							`).join('')}
						</div>
					</div>

					<!-- Priority -->
					<div class="wh-form-group">
						<label class="wh-form-label" for="task-priority">
							${__('Priority')}
						</label>
						<div class="wh-form-priority-group" role="radiogroup" aria-labelledby="task-priority">
							${this.priorities.map((priority, index) => `
								<div
									class="wh-form-priority-option priority-${priority.toLowerCase()} ${index === 2 ? 'active' : ''}"
									data-priority="${priority}"
									role="radio"
									aria-checked="${index === 2 ? 'true' : 'false'}"
									tabindex="${index === 2 ? '0' : '-1'}"
								>
									${priority}
								</div>
							`).join('')}
						</div>
					</div>

					<!-- Department -->
					<div class="wh-form-group">
						<label class="wh-form-label" for="task-department">
							${__('Department')}
						</label>
						<select id="task-department" name="department" class="wh-form-select">
							${this.departments.map((dept, index) => `
								<option value="${dept}" ${index === 0 ? 'selected' : ''}>
									${dept}
								</option>
							`).join('')}
						</select>
					</div>

					<!-- Due Date -->
					<div class="wh-form-group">
						<label class="wh-form-label wh-form-label-optional" for="task-due-date">
							${__('Due Date')}
						</label>
						<input
							type="date"
							id="task-due-date"
							name="dueDate"
							class="wh-form-input"
						/>
					</div>

					<!-- Assigned To -->
					<div class="wh-form-group">
						<label class="wh-form-label wh-form-label-optional" for="task-assigned-to">
							${__('Assigned To')}
						</label>
						<input
							type="text"
							id="task-assigned-to"
							name="assignedTo"
							class="wh-form-input"
							placeholder="${__('Enter user email or name...')}"
							autocomplete="off"
						/>
					</div>
				</form>
			</div>

			<!-- Footer -->
			<div class="wh-drawer-footer">
				<div class="wh-drawer-actions wh-drawer-actions-horizontal">
					<button class="btn btn-secondary drawer-cancel" type="button">
						${__('Cancel')}
					</button>
					<button class="btn btn-primary drawer-save" type="submit">
						${this.options.mode === 'create' ? __('Create Task') : __('Save Changes')}
					</button>
				</div>
			</div>
		`;

		// Append to body
		document.body.appendChild(this.backdrop);
		document.body.appendChild(this.drawer);

		// Store form reference
		this.form = this.drawer.querySelector('#task-form');

		// Populate form if editing
		if (this.options.mode === 'edit' && this.options.taskData) {
			this.populateForm(this.options.taskData);
		}
	}

	/**
	 * Attach event listeners
	 */
	attachEventListeners() {
		// Backdrop click to close
		this.backdrop.addEventListener('click', () => this.close());

		// Close button
		const closeBtn = this.drawer.querySelector('.wh-drawer-close');
		closeBtn.addEventListener('click', () => this.close());

		// Cancel button
		const cancelBtn = this.drawer.querySelector('.drawer-cancel');
		cancelBtn.addEventListener('click', () => this.close());

		// Save button
		const saveBtn = this.drawer.querySelector('.drawer-save');
		saveBtn.addEventListener('click', (e) => {
			e.preventDefault();
			this.handleSave();
		});

		// Form submission
		this.form.addEventListener('submit', (e) => {
			e.preventDefault();
			this.handleSave();
		});

		// Swipe to dismiss gesture (mobile only)
		if ('ontouchstart' in window) {
			const handle = this.drawer.querySelector('.wh-drawer-handle');
			handle.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
			handle.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
			handle.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
		}

		// Segmented control (status picker)
		const statusOptions = this.drawer.querySelectorAll('.wh-form-segmented-option');
		statusOptions.forEach(option => {
			option.addEventListener('click', () => {
				// Remove active state from all options
				statusOptions.forEach(opt => {
					opt.classList.remove('active');
					opt.setAttribute('aria-checked', 'false');
					opt.setAttribute('tabindex', '-1');
				});

				// Set active state on clicked option
				option.classList.add('active');
				option.setAttribute('aria-checked', 'true');
				option.setAttribute('tabindex', '0');

				// Haptic feedback on status change (if available)
				this.triggerHapticFeedback('light');
			});

			// Add keyboard navigation support (arrow keys)
			option.addEventListener('keydown', (e) => {
				if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
					e.preventDefault();
					const nextOption = option.nextElementSibling;
					if (nextOption) {
						nextOption.click();
						nextOption.focus();
					}
				} else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
					e.preventDefault();
					const prevOption = option.previousElementSibling;
					if (prevOption) {
						prevOption.click();
						prevOption.focus();
					}
				} else if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					option.click();
				}
			});
		});

		// Priority picker
		const priorityOptions = this.drawer.querySelectorAll('.wh-form-priority-option');
		priorityOptions.forEach(option => {
			option.addEventListener('click', () => {
				// Remove active state from all options
				priorityOptions.forEach(opt => {
					opt.classList.remove('active');
					opt.setAttribute('aria-checked', 'false');
					opt.setAttribute('tabindex', '-1');
				});

				// Set active state on clicked option
				option.classList.add('active');
				option.setAttribute('aria-checked', 'true');
				option.setAttribute('tabindex', '0');

				// Haptic feedback on priority change (if available)
				this.triggerHapticFeedback('light');
			});

			// Add keyboard navigation support (arrow keys)
			option.addEventListener('keydown', (e) => {
				if (e.key === 'ArrowRight') {
					e.preventDefault();
					const nextOption = option.nextElementSibling;
					if (nextOption) {
						nextOption.click();
						nextOption.focus();
					}
				} else if (e.key === 'ArrowLeft') {
					e.preventDefault();
					const prevOption = option.previousElementSibling;
					if (prevOption) {
						prevOption.click();
						prevOption.focus();
					}
				} else if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					option.click();
				}
			});
		});

		// Escape key to close
		this.handleEscape = (e) => {
			if (e.key === 'Escape' && this.isOpen) {
				this.close();
			}
		};
		document.addEventListener('keydown', this.handleEscape);
	}

	/**
	 * Handle touch start for swipe gesture
	 */
	handleTouchStart(e) {
		if (e.touches.length > 1) return;

		this.isDragging = true;
		this.dragStartY = e.touches[0].clientY;
		this.currentY = this.dragStartY;
		this.drawer.classList.add('dragging');
	}

	/**
	 * Handle touch move for swipe gesture
	 */
	handleTouchMove(e) {
		if (!this.isDragging || e.touches.length > 1) return;

		this.currentY = e.touches[0].clientY;
		const deltaY = this.currentY - this.dragStartY;

		// Only allow downward drag
		if (deltaY > 0) {
			e.preventDefault();
			this.drawer.style.transform = `translateY(${deltaY}px)`;
		}
	}

	/**
	 * Handle touch end for swipe gesture
	 */
	handleTouchEnd(e) {
		if (!this.isDragging) return;

		const deltaY = this.currentY - this.dragStartY;
		const threshold = 100; // px to trigger close

		this.drawer.classList.remove('dragging');
		this.drawer.style.transform = '';

		// Close if dragged down far enough
		if (deltaY > threshold) {
			this.close();
		}

		this.isDragging = false;
		this.dragStartY = 0;
		this.currentY = 0;
	}

	/**
	 * Trigger haptic feedback (if available)
	 */
	triggerHapticFeedback(intensity = 'light') {
		// Check if haptic feedback is supported and enabled
		if (!navigator.vibrate) {
			return;
		}

		// Check user preference for reduced motion
		if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}

		// Check localStorage preference (from SwipeableTask component)
		const hapticEnabled = localStorage.getItem('workhub_haptic_feedback');
		if (hapticEnabled === 'false') {
			return;
		}

		// Vibration patterns for different intensities
		const patterns = {
			light: [10],         // Quick tap
			medium: [15, 10, 15], // Double tap
			heavy: [20, 15, 30]  // Strong feedback
		};

		const pattern = patterns[intensity] || patterns.light;

		try {
			navigator.vibrate(pattern);
		} catch (error) {
			// Silently fail if vibration API throws error
			console.debug('Haptic feedback not available:', error);
		}
	}

	/**
	 * Populate form with existing task data (edit mode)
	 */
	populateForm(taskData) {
		// Task name
		const nameInput = this.form.querySelector('#task-name');
		if (nameInput && taskData.name) {
			nameInput.value = taskData.name;
		}

		// Description
		const descInput = this.form.querySelector('#task-description');
		if (descInput && taskData.description) {
			descInput.value = taskData.description;
		}

		// Status
		if (taskData.status) {
			const statusOption = this.drawer.querySelector(`.wh-form-segmented-option[data-status="${taskData.status}"]`);
			if (statusOption) {
				const allStatusOptions = this.drawer.querySelectorAll('.wh-form-segmented-option');
				allStatusOptions.forEach(opt => {
					opt.classList.remove('active');
					opt.setAttribute('aria-checked', 'false');
				});
				statusOption.classList.add('active');
				statusOption.setAttribute('aria-checked', 'true');
			}
		}

		// Priority
		if (taskData.priority) {
			const priorityOption = this.drawer.querySelector(`.wh-form-priority-option[data-priority="${taskData.priority}"]`);
			if (priorityOption) {
				const allPriorityOptions = this.drawer.querySelectorAll('.wh-form-priority-option');
				allPriorityOptions.forEach(opt => {
					opt.classList.remove('active');
					opt.setAttribute('aria-checked', 'false');
				});
				priorityOption.classList.add('active');
				priorityOption.setAttribute('aria-checked', 'true');
			}
		}

		// Department
		const deptSelect = this.form.querySelector('#task-department');
		if (deptSelect && taskData.department) {
			deptSelect.value = taskData.department;
		}

		// Due date
		const dueDateInput = this.form.querySelector('#task-due-date');
		if (dueDateInput && taskData.dueDate) {
			dueDateInput.value = taskData.dueDate;
		}

		// Assigned to
		const assignedToInput = this.form.querySelector('#task-assigned-to');
		if (assignedToInput && taskData.assignedTo) {
			assignedToInput.value = taskData.assignedTo;
		}
	}

	/**
	 * Get form data
	 */
	getFormData() {
		const formData = new FormData(this.form);

		// Get selected status
		const selectedStatus = this.drawer.querySelector('.wh-form-segmented-option.active');
		const status = selectedStatus ? selectedStatus.dataset.status : 'BACKLOG';

		// Get selected priority
		const selectedPriority = this.drawer.querySelector('.wh-form-priority-option.active');
		const priority = selectedPriority ? selectedPriority.dataset.priority : 'P2';

		return {
			name: formData.get('name'),
			description: formData.get('description') || '',
			status: status,
			priority: priority,
			department: formData.get('department'),
			dueDate: formData.get('dueDate') || null,
			assignedTo: formData.get('assignedTo') || null
		};
	}

	/**
	 * Validate form
	 */
	validateForm() {
		const taskData = this.getFormData();
		const errors = [];

		// Task name is required
		if (!taskData.name || taskData.name.trim() === '') {
			errors.push({
				field: 'task-name',
				message: __('Task name is required')
			});
		}

		// Show errors
		if (errors.length > 0) {
			errors.forEach(error => {
				const input = this.form.querySelector(`#${error.field}`);
				const errorDiv = input.parentElement.querySelector('.wh-form-error');

				if (input && errorDiv) {
					input.classList.add('error');
					errorDiv.textContent = error.message;
					errorDiv.style.display = 'block';
				}
			});
			return false;
		}

		// Clear all errors
		const allInputs = this.form.querySelectorAll('.wh-form-input, .wh-form-textarea');
		allInputs.forEach(input => {
			input.classList.remove('error');
			const errorDiv = input.parentElement.querySelector('.wh-form-error');
			if (errorDiv) {
				errorDiv.style.display = 'none';
			}
		});

		return true;
	}

	/**
	 * Handle save action
	 */
	async handleSave() {
		// Validate form
		if (!this.validateForm()) {
			return;
		}

		// Prevent double submission
		if (this.isSaving) {
			return;
		}

		this.isSaving = true;

		// Add loading state
		this.drawer.classList.add('wh-drawer-loading');
		const saveBtn = this.drawer.querySelector('.drawer-save');
		saveBtn.disabled = true;
		saveBtn.textContent = __('Saving...');

		try {
			const taskData = this.getFormData();

			// Call Leantime API to create/update task
			const method = this.options.mode === 'create'
				? 'workhub_frappe_app.leantime.api.create_task'
				: 'workhub_frappe_app.leantime.api.update_task';

			const args = this.options.mode === 'create'
				? { task_data: taskData }
				: { task_id: this.options.taskData.id, task_data: taskData };

			const response = await frappe.call({
				method: method,
				args: args,
				freeze: false
			});

			if (response && response.message) {
				// Show success message
				frappe.show_alert({
					message: this.options.mode === 'create'
						? __('Task created successfully')
						: __('Task updated successfully'),
					indicator: 'green'
				}, 3);

				// Emit event
				const eventName = this.options.mode === 'create' ? 'task:created' : 'task:updated';
				frappe.ui.trigger_event(eventName, response.message);

				// Call onSave callback
				if (this.options.onSave && typeof this.options.onSave === 'function') {
					this.options.onSave(response.message);
				}

				// Close drawer
				this.close();
			} else {
				throw new Error('Invalid response from server');
			}
		} catch (error) {
			console.error('Failed to save task:', error);

			// Show error message
			frappe.show_alert({
				message: error.message || __('Failed to save task. Please try again.'),
				indicator: 'red'
			}, 5);

			// Remove loading state
			this.drawer.classList.remove('wh-drawer-loading');
			saveBtn.disabled = false;
			saveBtn.textContent = this.options.mode === 'create' ? __('Create Task') : __('Save Changes');
		} finally {
			this.isSaving = false;
		}
	}

	/**
	 * Open the drawer
	 */
	open() {
		if (this.isOpen) return;

		this.isOpen = true;

		// Add body class to prevent scroll
		document.body.classList.add('drawer-open');

		// Show backdrop
		this.backdrop.style.display = 'block';

		// Force reflow for transition
		this.backdrop.offsetHeight;

		// Activate backdrop
		this.backdrop.classList.add('active');

		// Open drawer
		this.drawer.classList.add('open');

		// Focus first input
		setTimeout(() => {
			const firstInput = this.form.querySelector('#task-name');
			if (firstInput) {
				firstInput.focus();
			}
		}, 300);
	}

	/**
	 * Close the drawer
	 */
	close() {
		if (!this.isOpen) return;

		// Call onCancel callback
		if (this.options.onCancel && typeof this.options.onCancel === 'function') {
			this.options.onCancel();
		}

		// Remove open class
		this.drawer.classList.remove('open');
		this.backdrop.classList.remove('active');

		// Wait for animation to complete
		setTimeout(() => {
			this.isOpen = false;

			// Hide backdrop
			this.backdrop.style.display = 'none';

			// Remove body class
			document.body.classList.remove('drawer-open');
		}, 300);
	}

	/**
	 * Destroy the drawer and clean up
	 */
	destroy() {
		// Close if open
		if (this.isOpen) {
			this.close();
		}

		// Wait for close animation
		setTimeout(() => {
			// Remove event listeners
			document.removeEventListener('keydown', this.handleEscape);

			// Remove DOM elements
			if (this.backdrop && this.backdrop.parentNode) {
				this.backdrop.parentNode.removeChild(this.backdrop);
			}
			if (this.drawer && this.drawer.parentNode) {
				this.drawer.parentNode.removeChild(this.drawer);
			}

			// Clear references
			this.backdrop = null;
			this.drawer = null;
			this.form = null;
		}, 300);
	}

	/**
	 * Static method to create and open a new task drawer
	 */
	static openNewTaskDrawer(options = {}) {
		const drawer = new frappe.workhub.MobileTaskDrawer({
			mode: 'create',
			...options
		});
		drawer.open();
		return drawer;
	}

	/**
	 * Static method to create and open an edit task drawer
	 */
	static openEditTaskDrawer(taskData, options = {}) {
		const drawer = new frappe.workhub.MobileTaskDrawer({
			mode: 'edit',
			taskData: taskData,
			...options
		});
		drawer.open();
		return drawer;
	}
};
