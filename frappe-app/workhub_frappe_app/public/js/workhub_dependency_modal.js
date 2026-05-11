/**
 * WorkHub Dependency Modal - Dependency Management UI
 *
 * Modal component for viewing, adding, and removing task dependencies
 * with task search/selection functionality.
 */

// Namespace for dependency modal functionality
frappe.workhub = frappe.workhub || {};
frappe.workhub.dependencyModal = {
	currentTaskId: null,
	searchResults: [],
	selectedType: 'blocked_by', // 'blocked_by' or 'blocks'

	/**
	 * Open the dependency management modal for a task
	 * @param {string} taskId - The task ID to manage dependencies for
	 * @param {string} taskTitle - The task title for display
	 */
	open(taskId, taskTitle) {
		this.currentTaskId = taskId;
		this.selectedType = 'blocked_by';
		this.searchResults = [];

		// Close any existing modal
		this.close();

		// Create modal backdrop
		const backdrop = document.createElement('div');
		backdrop.className = 'dependency-modal-backdrop';
		backdrop.addEventListener('click', (e) => {
			if (e.target === backdrop) {
				this.close();
			}
		});

		// Create modal container
		const modal = document.createElement('div');
		modal.className = 'dependency-modal';
		modal.innerHTML = this._renderModalContent(taskTitle);

		backdrop.appendChild(modal);
		document.body.appendChild(backdrop);

		// Load current dependencies
		this._loadDependencies();

		// Attach event listeners
		this._attachEventListeners();

		// Force reflow to enable transition
		backdrop.offsetHeight;
		backdrop.classList.add('is-open');
	},

	/**
	 * Close the dependency modal
	 */
	close() {
		const backdrop = document.querySelector('.dependency-modal-backdrop');
		if (backdrop) {
			backdrop.classList.remove('is-open');
			setTimeout(() => {
				backdrop.remove();
			}, 200);
		}
		this.currentTaskId = null;
		this.searchResults = [];
	},

	/**
	 * Render modal content HTML
	 * @param {string} taskTitle - The task title
	 * @returns {string} HTML string
	 */
	_renderModalContent(taskTitle) {
		return `
			<div class="dependency-modal__header">
				<h3 class="dependency-modal__title">Manage Dependencies</h3>
				<p class="dependency-modal__subtitle">${this._escapeHtml(taskTitle)}</p>
				<button class="dependency-modal__close" data-action="close">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"/>
						<line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>

			<div class="dependency-modal__body">
				<!-- Type Selector -->
				<div class="dependency-modal__type-selector">
					<button class="dependency-modal__type-btn active" data-type="blocked_by">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10"/>
							<line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
						</svg>
						<span>Blocked By</span>
					</button>
					<button class="dependency-modal__type-btn" data-type="blocks">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
							<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
						</svg>
						<span>Blocking</span>
					</button>
				</div>

				<!-- Current Dependencies Section -->
				<div class="dependency-modal__section">
					<div class="dependency-modal__section-header">
						<h4 class="dependency-modal__section-title">Current Dependencies</h4>
					</div>
					<div class="dependency-modal__current-list" data-list="current">
						<div class="dependency-modal__loading">
							<div class="dependency-modal__spinner"></div>
							<span>Loading dependencies...</span>
						</div>
					</div>
				</div>

				<!-- Add Dependency Section -->
				<div class="dependency-modal__section">
					<div class="dependency-modal__section-header">
						<h4 class="dependency-modal__section-title">Add Dependency</h4>
					</div>

					<!-- Search Input -->
					<div class="dependency-modal__search">
						<svg class="dependency-modal__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="11" cy="11" r="8"/>
							<path d="m21 21-4.35-4.35"/>
						</svg>
						<input
							type="text"
							class="dependency-modal__search-input"
							placeholder="Search tasks..."
							data-input="search"
						/>
					</div>

					<!-- Search Results -->
					<div class="dependency-modal__search-results" data-list="search">
						<div class="dependency-modal__empty">
							Type to search for tasks
						</div>
					</div>
				</div>
			</div>

			<div class="dependency-modal__footer">
				<button class="dependency-modal__btn dependency-modal__btn--secondary" data-action="close">
					Close
				</button>
			</div>
		`;
	},

	/**
	 * Attach event listeners to modal elements
	 */
	_attachEventListeners() {
		const modal = document.querySelector('.dependency-modal');
		if (!modal) return;

		// Close button
		modal.querySelectorAll('[data-action="close"]').forEach(btn => {
			btn.addEventListener('click', () => this.close());
		});

		// Type selector buttons
		modal.querySelectorAll('[data-type]').forEach(btn => {
			btn.addEventListener('click', (e) => {
				const type = e.currentTarget.dataset.type;
				this._switchType(type);
			});
		});

		// Search input
		const searchInput = modal.querySelector('[data-input="search"]');
		if (searchInput) {
			let searchTimeout;
			searchInput.addEventListener('input', (e) => {
				clearTimeout(searchTimeout);
				const query = e.target.value.trim();
				if (query.length >= 2) {
					searchTimeout = setTimeout(() => {
						this._searchTasks(query);
					}, 300);
				} else {
					this._clearSearchResults();
				}
			});
		}

		// ESC to close
		const handleEsc = (e) => {
			if (e.key === 'Escape') {
				this.close();
				document.removeEventListener('keydown', handleEsc);
			}
		};
		document.addEventListener('keydown', handleEsc);
	},

	/**
	 * Switch between blocked_by and blocks type
	 * @param {string} type - 'blocked_by' or 'blocks'
	 */
	_switchType(type) {
		if (this.selectedType === type) return;

		this.selectedType = type;

		// Update button states
		const modal = document.querySelector('.dependency-modal');
		modal.querySelectorAll('[data-type]').forEach(btn => {
			if (btn.dataset.type === type) {
				btn.classList.add('active');
			} else {
				btn.classList.remove('active');
			}
		});

		// Reload dependencies for new type
		this._loadDependencies();

		// Clear search
		this._clearSearchResults();
		const searchInput = modal.querySelector('[data-input="search"]');
		if (searchInput) searchInput.value = '';
	},

	/**
	 * Load current dependencies from API
	 */
	_loadDependencies() {
		const listContainer = document.querySelector('[data-list="current"]');
		if (!listContainer) return;

		listContainer.innerHTML = `
			<div class="dependency-modal__loading">
				<div class="dependency-modal__spinner"></div>
				<span>Loading dependencies...</span>
			</div>
		`;

		frappe.call({
			method: 'workhub_frappe_app.api.tasks.get_task_dependencies',
			args: { task_id: this.currentTaskId },
			callback: (r) => {
				if (r.message) {
					const dependencies = this.selectedType === 'blocked_by'
						? r.message.predecessors
						: r.message.successors;
					this._renderCurrentDependencies(dependencies);
				}
			},
			error: () => {
				listContainer.innerHTML = `
					<div class="dependency-modal__empty dependency-modal__empty--error">
						Error loading dependencies
					</div>
				`;
			}
		});
	},

	/**
	 * Render current dependencies list
	 * @param {Array} dependencies - Array of dependency objects
	 */
	_renderCurrentDependencies(dependencies) {
		const listContainer = document.querySelector('[data-list="current"]');
		if (!listContainer) return;

		if (!dependencies || dependencies.length === 0) {
			const emptyMessage = this.selectedType === 'blocked_by'
				? 'This task is not blocked by any tasks'
				: 'This task is not blocking any tasks';
			listContainer.innerHTML = `
				<div class="dependency-modal__empty">${emptyMessage}</div>
			`;
			return;
		}

		listContainer.innerHTML = '';
		dependencies.forEach(dep => {
			const item = this._renderDependencyItem(dep, true);
			listContainer.appendChild(item);
		});
	},

	/**
	 * Render a single dependency item
	 * @param {Object} task - Task object
	 * @param {boolean} showRemove - Whether to show remove button
	 * @returns {HTMLElement} Dependency item element
	 */
	_renderDependencyItem(task, showRemove = false) {
		const item = document.createElement('div');
		item.className = 'dependency-modal__task-item';

		// Determine task ID field based on type
		const taskId = task.predecessor || task.successor || task.name || task.task_id;
		const taskTitle = task.title || 'Untitled Task';
		const taskStatus = task.status || 'BACKLOG';
		const statusClass = taskStatus.toLowerCase().replace('_', '-');

		item.innerHTML = `
			<div class="dependency-modal__task-info">
				<div class="dependency-modal__task-header">
					<div class="dependency-modal__task-title" title="${this._escapeHtml(taskTitle)}">
						${this._escapeHtml(taskTitle)}
					</div>
					<div class="dependency-modal__task-status dependency-modal__task-status--${statusClass}">
						${taskStatus}
					</div>
				</div>
				${task.due_date || task.start_date ? `
					<div class="dependency-modal__task-meta">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
							<line x1="16" y1="2" x2="16" y2="6"/>
							<line x1="8" y1="2" x2="8" y2="6"/>
							<line x1="3" y1="10" x2="21" y2="10"/>
						</svg>
						<span>${task.due_date ? 'Due: ' + frappe.datetime.str_to_user(task.due_date) : 'Start: ' + frappe.datetime.str_to_user(task.start_date)}</span>
					</div>
				` : ''}
			</div>
			${showRemove ? `
				<button class="dependency-modal__task-remove" data-action="remove" data-dep-id="${task.name}" data-task-id="${taskId}" title="Remove dependency">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"/>
						<line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			` : `
				<button class="dependency-modal__task-add" data-action="add" data-task-id="${taskId}" title="Add dependency">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="12" y1="5" x2="12" y2="19"/>
						<line x1="5" y1="12" x2="19" y2="12"/>
					</svg>
				</button>
			`}
		`;

		// Attach event listeners
		if (showRemove) {
			const removeBtn = item.querySelector('[data-action="remove"]');
			if (removeBtn) {
				removeBtn.addEventListener('click', () => {
					const depId = removeBtn.dataset.depId;
					this._removeDependency(depId);
				});
			}
		} else {
			const addBtn = item.querySelector('[data-action="add"]');
			if (addBtn) {
				addBtn.addEventListener('click', () => {
					const targetTaskId = addBtn.dataset.taskId;
					this._addDependency(targetTaskId);
				});
			}
		}

		return item;
	},

	/**
	 * Search for tasks
	 * @param {string} query - Search query
	 */
	_searchTasks(query) {
		const resultsContainer = document.querySelector('[data-list="search"]');
		if (!resultsContainer) return;

		resultsContainer.innerHTML = `
			<div class="dependency-modal__loading">
				<div class="dependency-modal__spinner"></div>
				<span>Searching...</span>
			</div>
		`;

		frappe.call({
			method: 'workhub_frappe_app.api.tasks.get_tasks',
			args: {
				filters: JSON.stringify({ search: query }),
				limit: 20
			},
			callback: (r) => {
				if (r.message) {
					// Filter out current task and already linked tasks
					this._filterAndRenderSearchResults(r.message);
				}
			},
			error: () => {
				resultsContainer.innerHTML = `
					<div class="dependency-modal__empty dependency-modal__empty--error">
						Error searching tasks
					</div>
				`;
			}
		});
	},

	/**
	 * Filter search results and render
	 * @param {Array} tasks - Array of task objects
	 */
	_filterAndRenderSearchResults(tasks) {
		const resultsContainer = document.querySelector('[data-list="search"]');
		if (!resultsContainer) return;

		// Filter out current task
		let filteredTasks = tasks.filter(t => t.name !== this.currentTaskId);

		if (filteredTasks.length === 0) {
			resultsContainer.innerHTML = `
				<div class="dependency-modal__empty">No tasks found</div>
			`;
			return;
		}

		// Get current dependencies to filter them out
		frappe.call({
			method: 'workhub_frappe_app.api.tasks.get_task_dependencies',
			args: { task_id: this.currentTaskId },
			callback: (r) => {
				if (r.message) {
					const currentDeps = this.selectedType === 'blocked_by'
						? r.message.predecessors
						: r.message.successors;

					// Extract task IDs from current dependencies
					const currentDepIds = currentDeps.map(d => d.predecessor || d.successor);

					// Filter out already linked tasks
					filteredTasks = filteredTasks.filter(t => !currentDepIds.includes(t.name));

					this._renderSearchResults(filteredTasks);
				}
			}
		});
	},

	/**
	 * Render search results
	 * @param {Array} tasks - Filtered array of task objects
	 */
	_renderSearchResults(tasks) {
		const resultsContainer = document.querySelector('[data-list="search"]');
		if (!resultsContainer) return;

		if (tasks.length === 0) {
			resultsContainer.innerHTML = `
				<div class="dependency-modal__empty">All matching tasks are already linked</div>
			`;
			return;
		}

		resultsContainer.innerHTML = '';
		tasks.forEach(task => {
			const item = this._renderDependencyItem(task, false);
			resultsContainer.appendChild(item);
		});
	},

	/**
	 * Clear search results
	 */
	_clearSearchResults() {
		const resultsContainer = document.querySelector('[data-list="search"]');
		if (resultsContainer) {
			resultsContainer.innerHTML = `
				<div class="dependency-modal__empty">Type to search for tasks</div>
			`;
		}
	},

	/**
	 * Add a dependency
	 * @param {string} targetTaskId - The task ID to link
	 */
	_addDependency(targetTaskId) {
		// Determine predecessor and successor based on type
		const predecessor = this.selectedType === 'blocked_by' ? targetTaskId : this.currentTaskId;
		const successor = this.selectedType === 'blocked_by' ? this.currentTaskId : targetTaskId;

		frappe.call({
			method: 'workhub_frappe_app.api.tasks.add_dependency',
			args: {
				predecessor_id: predecessor,
				successor_id: successor,
				dep_type: 'FS', // Finish-to-Start
				lag_days: 0
			},
			callback: (r) => {
				if (r.message && r.message.success) {
					frappe.show_alert({
						message: 'Dependency added successfully',
						indicator: 'green'
					});

					// Reload dependencies
					this._loadDependencies();

					// Clear search
					this._clearSearchResults();
					const searchInput = document.querySelector('[data-input="search"]');
					if (searchInput) searchInput.value = '';

					// Trigger update on parent page if exists
					this._triggerDependencyUpdate();
				}
			},
			error: (r) => {
				frappe.show_alert({
					message: r.message || 'Failed to add dependency',
					indicator: 'red'
				});
			}
		});
	},

	/**
	 * Remove a dependency
	 * @param {string} dependencyId - The dependency ID to remove
	 */
	_removeDependency(dependencyId) {
		frappe.confirm(
			'Are you sure you want to remove this dependency?',
			() => {
				frappe.call({
					method: 'workhub_frappe_app.api.tasks.remove_dependency',
					args: { dependency_id: dependencyId },
					callback: (r) => {
						if (r.message && r.message.success) {
							frappe.show_alert({
								message: 'Dependency removed successfully',
								indicator: 'green'
							});

							// Reload dependencies
							this._loadDependencies();

							// Trigger update on parent page if exists
							this._triggerDependencyUpdate();
						}
					},
					error: (r) => {
						frappe.show_alert({
							message: r.message || 'Failed to remove dependency',
							indicator: 'red'
						});
					}
				});
			}
		);
	},

	/**
	 * Trigger dependency update event for parent page
	 */
	_triggerDependencyUpdate() {
		// Dispatch custom event that parent pages can listen to
		const event = new CustomEvent('workhub:dependencies:updated', {
			detail: { taskId: this.currentTaskId }
		});
		document.dispatchEvent(event);

		// Also update badges if dependency module is loaded
		if (frappe.workhub.dependencies && frappe.workhub.dependencies.updateTaskBadges) {
			// Re-fetch task data to get updated counts
			frappe.call({
				method: 'workhub_frappe_app.api.tasks.get_tasks',
				args: {
					filters: JSON.stringify({ name: this.currentTaskId }),
					limit: 1
				},
				callback: (r) => {
					if (r.message && r.message.length > 0) {
						const task = r.message[0];
						frappe.workhub.dependencies.updateTaskBadges(
							this.currentTaskId,
							task.blocked_by_count || 0,
							task.blocks_count || 0
						);
					}
				}
			});
		}
	},

	/**
	 * Escape HTML to prevent XSS
	 * @param {string} text - Text to escape
	 * @returns {string} Escaped text
	 */
	_escapeHtml(text) {
		if (!text) return '';
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
};
