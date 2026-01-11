/**
 * WorkHub Dependencies - Dependency Visualization Module
 *
 * Functions to render dependency badges, attach popovers, and handle click interactions
 * for task dependency visualization.
 */

// Namespace for dependency functionality
frappe.workhub = frappe.workhub || {};
frappe.workhub.dependencies = {
	/**
	 * Render dependency badges for a task card
	 * @param {HTMLElement} taskCard - The task card element
	 * @param {Object} taskData - Task data including blocked_by_count and blocks_count
	 */
	renderBadges(taskCard, taskData) {
		if (!taskCard || !taskData) return;

		// Find or create badge container
		let badgeContainer = taskCard.querySelector('.task-card__dependency-badges');
		if (!badgeContainer) {
			badgeContainer = document.createElement('div');
			badgeContainer.className = 'task-card__dependency-badges';

			// Insert after task title or at end of card content area
			const titleEl = taskCard.querySelector('.task-card__title, .task-title');
			if (titleEl && titleEl.parentNode) {
				titleEl.parentNode.insertBefore(badgeContainer, titleEl.nextSibling);
			} else {
				taskCard.appendChild(badgeContainer);
			}
		}

		// Clear existing badges
		badgeContainer.innerHTML = '';

		// Render blocked badge if task is blocked by others
		if (taskData.blocked_by_count > 0) {
			const blockedBadge = this.createBadge('blocked', taskData.blocked_by_count, taskData.name);
			badgeContainer.appendChild(blockedBadge);
		}

		// Render blocking badge if task is blocking others
		if (taskData.blocks_count > 0) {
			const blockingBadge = this.createBadge('blocking', taskData.blocks_count, taskData.name);
			badgeContainer.appendChild(blockingBadge);
		}

		// Add blocked class to card if task is blocked
		if (taskData.blocked_by_count > 0) {
			taskCard.classList.add('task-card--blocked');
		} else {
			taskCard.classList.remove('task-card--blocked');
		}
	},

	/**
	 * Create a dependency badge element
	 * @param {string} type - 'blocked' or 'blocking'
	 * @param {number} count - Number of dependencies
	 * @param {string} taskId - Task ID for popover data
	 * @returns {HTMLElement} Badge element
	 */
	createBadge(type, count, taskId) {
		const badge = document.createElement('div');
		badge.className = `dependency-badge ${type}-badge`;
		badge.dataset.type = type;
		badge.dataset.taskId = taskId;
		badge.dataset.count = count;

		// Badge text
		const label = type === 'blocked' ? 'Blocked' : 'Blocking';
		badge.innerHTML = `
			<span>${label}</span>
			<span class="dependency-badge__count">${count}</span>
		`;

		// Attach click handler for popover
		badge.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.showPopover(badge, taskId, type);
		});

		return badge;
	},

	/**
	 * Show dependency popover
	 * @param {HTMLElement} triggerElement - Element that triggered the popover
	 * @param {string} taskId - Task ID to fetch dependencies for
	 * @param {string} type - 'blocked' or 'blocking'
	 */
	showPopover(triggerElement, taskId, type) {
		// Close any existing popovers
		this.closeAllPopovers();

		// Create popover element
		const popover = document.createElement('div');
		popover.className = 'dependency-popover dependency-popover--loading';
		popover.dataset.taskId = taskId;

		// Position popover
		const rect = triggerElement.getBoundingClientRect();
		popover.style.position = 'fixed';
		popover.style.top = `${rect.bottom + 8}px`;
		popover.style.left = `${rect.left}px`;

		// Loading state
		popover.innerHTML = `
			<div class="dependency-popover__spinner"></div>
		`;

		// Append to body
		document.body.appendChild(popover);

		// Fetch dependency data
		frappe.call({
			method: 'workhub_frappe_app.api.tasks.get_dependency_popover_data',
			args: { task_id: taskId },
			callback: (r) => {
				if (r.message) {
					this.renderPopoverContent(popover, r.message, type);
				}
			},
			error: () => {
				popover.innerHTML = `
					<div class="dependency-popover__empty">
						Error loading dependencies
					</div>
				`;
			}
		});

		// Close popover on outside click
		setTimeout(() => {
			document.addEventListener('click', this._handleOutsideClick.bind(this), true);
		}, 100);
	},

	/**
	 * Render popover content with dependency data
	 * @param {HTMLElement} popover - Popover element
	 * @param {Object} data - Dependency data from API
	 * @param {string} focusType - 'blocked' or 'blocking' to determine which section to show
	 */
	renderPopoverContent(popover, data, focusType) {
		popover.classList.remove('dependency-popover--loading');

		// Determine which data to show based on focus
		const showBlockedBy = focusType === 'blocked';
		const showBlocking = focusType === 'blocking';

		let html = `
			<div class="dependency-popover__header">
				<div class="dependency-popover__title">
					${showBlockedBy ? 'Blocked By' : 'Blocking'}
				</div>
				<button class="dependency-popover__close" data-action="close">×</button>
			</div>
		`;

		// Render blocked_by section
		if (showBlockedBy && data.blocked_by && data.blocked_by.length > 0) {
			html += this._renderTaskSection('Blocked By', data.blocked_by);
		} else if (showBlockedBy) {
			html += `<div class="dependency-popover__empty">No blocking tasks</div>`;
		}

		// Render blocks section
		if (showBlocking && data.blocks && data.blocks.length > 0) {
			html += this._renderTaskSection('Blocking', data.blocks);
		} else if (showBlocking) {
			html += `<div class="dependency-popover__empty">Not blocking any tasks</div>`;
		}

		popover.innerHTML = html;

		// Attach event listeners
		const closeBtn = popover.querySelector('[data-action="close"]');
		if (closeBtn) {
			closeBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.closeAllPopovers();
			});
		}

		// Attach task item click handlers
		popover.querySelectorAll('.dependency-task-item').forEach(item => {
			item.addEventListener('click', (e) => {
				e.stopPropagation();
				const taskId = item.dataset.taskId;
				if (taskId) {
					this.navigateToTask(taskId);
				}
			});
		});
	},

	/**
	 * Render a section of tasks (blocked_by or blocks)
	 * @param {string} title - Section title
	 * @param {Array} tasks - Array of task objects
	 * @returns {string} HTML string
	 */
	_renderTaskSection(title, tasks) {
		if (!tasks || tasks.length === 0) return '';

		let html = `
			<div class="dependency-popover__section">
				<div class="dependency-popover__section-title">${title}</div>
				<div class="dependency-popover__tasks">
		`;

		tasks.forEach(task => {
			html += this._renderTaskItem(task);
		});

		html += `
				</div>
			</div>
		`;

		return html;
	},

	/**
	 * Render a single task item
	 * @param {Object} task - Task object
	 * @returns {string} HTML string
	 */
	_renderTaskItem(task) {
		const statusClass = (task.status || 'BACKLOG').toLowerCase().replace('_', '-');
		const priorityClass = task.priority || 'P2';
		const assignee = task.assigned_to_name || 'Unassigned';
		const date = task.due_date || task.start_date || '';
		const dateLabel = task.due_date ? 'Due' : task.start_date ? 'Start' : '';

		return `
			<div class="dependency-task-item" data-task-id="${task.task_id}">
				<div class="dependency-task-item__header">
					<div class="dependency-task-item__title" title="${this._escapeHtml(task.title)}">
						${this._escapeHtml(task.title)}
					</div>
					<div class="dependency-task-item__status dependency-task-item__status--${statusClass}">
						${task.status || 'BACKLOG'}
					</div>
				</div>
				<div class="dependency-task-item__meta">
					<div class="dependency-task-item__assignee">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
							<circle cx="12" cy="7" r="4"/>
						</svg>
						<span>${assignee}</span>
					</div>
					${date ? `
						<div class="dependency-task-item__date">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
								<line x1="16" y1="2" x2="16" y2="6"/>
								<line x1="8" y1="2" x2="8" y2="6"/>
								<line x1="3" y1="10" x2="21" y2="10"/>
							</svg>
							<span>${dateLabel}: ${frappe.datetime.str_to_user(date)}</span>
						</div>
					` : ''}
					${task.priority ? `
						<div class="dependency-task-item__priority dependency-task-item__priority--${priorityClass}">
							${priorityClass}
						</div>
					` : ''}
				</div>
			</div>
		`;
	},

	/**
	 * Handle clicks outside popover to close it
	 * @param {Event} e - Click event
	 */
	_handleOutsideClick(e) {
		const popover = document.querySelector('.dependency-popover');
		if (popover && !popover.contains(e.target) && !e.target.closest('.dependency-badge')) {
			this.closeAllPopovers();
		}
	},

	/**
	 * Close all open popovers
	 */
	closeAllPopovers() {
		document.querySelectorAll('.dependency-popover').forEach(p => p.remove());
		document.removeEventListener('click', this._handleOutsideClick.bind(this), true);
	},

	/**
	 * Navigate to a task detail page
	 * @param {string} taskId - Task ID to navigate to
	 */
	navigateToTask(taskId) {
		this.closeAllPopovers();
		frappe.set_route('Form', 'WH Task', taskId);
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
	},

	/**
	 * Initialize dependency badges on all visible task cards
	 * Call this after loading tasks or rendering Kanban board
	 * @param {string} containerSelector - Optional selector for container with task cards
	 */
	initializeAll(containerSelector = '.task-card, .kanban-card') {
		const taskCards = document.querySelectorAll(containerSelector);
		const taskIdsToFetch = [];
		const cardMap = {};

		taskCards.forEach(card => {
			const taskId = card.dataset.taskId || card.dataset.name;
			if (taskId) {
				// Try to get task data from card's data attributes
				const blockedByCount = parseInt(card.dataset.blockedByCount || 0);
				const blocksCount = parseInt(card.dataset.blocksCount || 0);

				// If data attributes are present, use them immediately
				if (card.dataset.blockedByCount !== undefined || card.dataset.blocksCount !== undefined) {
					const taskData = {
						name: taskId,
						blocked_by_count: blockedByCount,
						blocks_count: blocksCount
					};

					if (taskData.blocked_by_count > 0 || taskData.blocks_count > 0) {
						this.renderBadges(card, taskData);
					}
				} else {
					// Otherwise, queue for batch fetch
					taskIdsToFetch.push(taskId);
					cardMap[taskId] = card;
				}
			}
		});

		// Fetch dependency counts for cards without data attributes
		if (taskIdsToFetch.length > 0) {
			this.fetchAndApplyDependencyCounts(taskIdsToFetch, cardMap);
		}
	},

	/**
	 * Fetch dependency counts for multiple tasks and apply highlighting
	 * @param {Array} taskIds - Array of task IDs
	 * @param {Object} cardMap - Map of task ID to card element
	 */
	fetchAndApplyDependencyCounts(taskIds, cardMap) {
		if (!taskIds || taskIds.length === 0) return;

		frappe.call({
			method: 'workhub_frappe_app.api.tasks.get_dependency_counts',
			args: { task_ids: taskIds },
			callback: (r) => {
				if (r.message) {
					r.message.forEach(taskData => {
						const card = cardMap[taskData.task_id];
						if (card) {
							// Store counts in data attributes for future use
							card.dataset.blockedByCount = taskData.blocked_by_count || 0;
							card.dataset.blocksCount = taskData.blocks_count || 0;

							// Render badges and apply highlighting
							if (taskData.blocked_by_count > 0 || taskData.blocks_count > 0) {
								this.renderBadges(card, {
									name: taskData.task_id,
									blocked_by_count: taskData.blocked_by_count || 0,
									blocks_count: taskData.blocks_count || 0
								});
							}
						}
					});
				}
			},
			error: (err) => {
				console.warn('Failed to fetch dependency counts:', err);
			}
		});
	},

	/**
	 * Update a single task card's dependency badges
	 * @param {string} taskId - Task ID
	 * @param {number} blockedByCount - Number of tasks blocking this task
	 * @param {number} blocksCount - Number of tasks this task is blocking
	 */
	updateTaskBadges(taskId, blockedByCount, blocksCount) {
		const taskCard = document.querySelector(`[data-task-id="${taskId}"], [data-name="${taskId}"]`);
		if (taskCard) {
			const taskData = {
				name: taskId,
				blocked_by_count: blockedByCount || 0,
				blocks_count: blocksCount || 0
			};

			// Update data attributes
			taskCard.dataset.blockedByCount = taskData.blocked_by_count;
			taskCard.dataset.blocksCount = taskData.blocks_count;

			// Re-render badges
			this.renderBadges(taskCard, taskData);
		}
	}
};

// Auto-initialize on DOM ready if in desk
if (typeof frappe !== 'undefined' && typeof frappe.ready === 'function') {
	frappe.ready(() => {
		// Initialize on initial load
		frappe.workhub.dependencies.initializeAll();

		// Re-initialize when route changes (e.g., navigating to Kanban board)
		frappe.router.on('change', () => {
			setTimeout(() => {
				frappe.workhub.dependencies.initializeAll();
			}, 500);
		});

		// Re-initialize when Kanban board is rendered
		// Frappe's Kanban board emits events when cards are added
		if (frappe.views && frappe.views.KanbanView) {
			const originalRender = frappe.views.KanbanView.prototype.render_cards;
			if (originalRender) {
				frappe.views.KanbanView.prototype.render_cards = function() {
					const result = originalRender.apply(this, arguments);
					setTimeout(() => {
						frappe.workhub.dependencies.initializeAll('.kanban-card');
					}, 200);
					return result;
				};
			}
		}

		// Use MutationObserver to detect when new task cards are added to the DOM
		// This handles dynamic loading in list/grid/kanban views
		const observer = new MutationObserver((mutations) => {
			let hasNewCards = false;
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType === 1) {
						if (node.matches && (node.matches('.kanban-card') || node.matches('.list-row') || node.matches('.grid-row'))) {
							hasNewCards = true;
						} else if (node.querySelector) {
							const cards = node.querySelectorAll('.kanban-card, .list-row, .grid-row');
							if (cards.length > 0) {
								hasNewCards = true;
							}
						}
					}
				});
			});

			if (hasNewCards) {
				setTimeout(() => {
					frappe.workhub.dependencies.initializeAll('.kanban-card, .list-row, .grid-row');
				}, 100);
			}
		});

		// Observe the main content area for changes
		const contentArea = document.querySelector('.page-content, .layout-main, #page-Workspaces');
		if (contentArea) {
			observer.observe(contentArea, {
				childList: true,
				subtree: true
			});
		}
	});
}
