/**
 * SwipeableTask Component
 *
 * Touch-optimized swipe-to-complete gesture handler for task items.
 * Provides visual feedback, threshold detection, and smooth animations.
 *
 * Features:
 * - Swipe right to complete tasks
 * - Swipe left for alternative actions (delete/archive)
 * - Velocity detection for natural feel
 * - Haptic feedback on supported devices
 * - GPU-accelerated animations
 * - Works with .wh-swipeable-task CSS component
 */

frappe.workhub = frappe.workhub || {};

frappe.workhub.SwipeableTask = class SwipeableTask {
	constructor(element, options = {}) {
		this.element = element;
		this.options = {
			threshold: options.threshold || 0.3, // 30% of width to trigger completion
			minSwipeDistance: options.minSwipeDistance || 80, // Minimum distance in px
			velocityThreshold: options.velocityThreshold || 0.3, // Minimum velocity px/ms
			maxSwipeTime: options.maxSwipeTime || 500, // Maximum time for swipe (ms)
			onComplete: options.onComplete || null, // Callback when task completed
			onDelete: options.onDelete || null, // Callback for left swipe
			disabled: options.disabled || false, // Disable swipe
			...options
		};

		// Touch tracking state
		this.touchStartX = 0;
		this.touchStartY = 0;
		this.touchCurrentX = 0;
		this.touchCurrentY = 0;
		this.touchStartTime = 0;
		this.isSwiping = false;
		this.swipeDirection = null; // 'left' or 'right'
		this.isCompleting = false;

		// DOM references
		this.contentElement = element.querySelector('.wh-swipeable-task-content');
		this.actionsElement = element.querySelector('.wh-swipeable-task-actions');
		this.actionsLeftElement = element.querySelector('.wh-swipeable-task-actions-left');

		// Bind methods
		this.handleTouchStart = this.handleTouchStart.bind(this);
		this.handleTouchMove = this.handleTouchMove.bind(this);
		this.handleTouchEnd = this.handleTouchEnd.bind(this);
		this.handleTouchCancel = this.handleTouchCancel.bind(this);

		// Initialize
		this.init();
	}

	/**
	 * Initialize the swipeable task
	 */
	init() {
		// Only enable on touch devices and mobile screens
		if (!('ontouchstart' in window)) {
			return;
		}

		// Skip if disabled
		if (this.options.disabled || this.element.classList.contains('disabled')) {
			return;
		}

		this.attachEventListeners();
	}

	/**
	 * Attach touch event listeners
	 */
	attachEventListeners() {
		// Use passive listeners for start/end, active for move (to prevent scroll)
		this.element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
		this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
		this.element.addEventListener('touchend', this.handleTouchEnd, { passive: true });
		this.element.addEventListener('touchcancel', this.handleTouchCancel, { passive: true });
	}

	/**
	 * Remove event listeners (for cleanup)
	 */
	removeEventListeners() {
		this.element.removeEventListener('touchstart', this.handleTouchStart);
		this.element.removeEventListener('touchmove', this.handleTouchMove);
		this.element.removeEventListener('touchend', this.handleTouchEnd);
		this.element.removeEventListener('touchcancel', this.handleTouchCancel);
	}

	/**
	 * Handle touch start event
	 */
	handleTouchStart(e) {
		// Ignore if already completing or disabled
		if (this.isCompleting || this.options.disabled) {
			return;
		}

		// Ignore multi-touch
		if (e.touches.length > 1) {
			return;
		}

		const touch = e.touches[0];
		this.touchStartX = touch.clientX;
		this.touchStartY = touch.clientY;
		this.touchCurrentX = touch.clientX;
		this.touchCurrentY = touch.clientY;
		this.touchStartTime = Date.now();
		this.isSwiping = false;
		this.swipeDirection = null;
	}

	/**
	 * Handle touch move event
	 */
	handleTouchMove(e) {
		// Ignore if not tracking or already completing
		if (!this.touchStartX || this.isCompleting || this.options.disabled) {
			return;
		}

		// Ignore multi-touch
		if (e.touches.length > 1) {
			this.cancelSwipe();
			return;
		}

		const touch = e.touches[0];
		this.touchCurrentX = touch.clientX;
		this.touchCurrentY = touch.clientY;

		const deltaX = this.touchCurrentX - this.touchStartX;
		const deltaY = this.touchCurrentY - this.touchStartY;
		const absDeltaX = Math.abs(deltaX);
		const absDeltaY = Math.abs(deltaY);

		// Determine swipe direction on first significant movement
		if (!this.isSwiping && (absDeltaX > 10 || absDeltaY > 10)) {
			// More horizontal than vertical = swipe
			if (absDeltaX > absDeltaY) {
				this.isSwiping = true;
				this.swipeDirection = deltaX > 0 ? 'right' : 'left';
				this.element.classList.add('swiping');
				if (this.swipeDirection === 'left') {
					this.element.classList.add('swiping-left');
				}
			} else {
				// Vertical scroll - cancel swipe
				return;
			}
		}

		// Only handle horizontal swipes
		if (!this.isSwiping) {
			return;
		}

		// Prevent default scroll during swipe
		e.preventDefault();

		// Update visual feedback
		this.updateSwipePosition(deltaX);
	}

	/**
	 * Handle touch end event
	 */
	handleTouchEnd(e) {
		// Ignore if not swiping
		if (!this.isSwiping || this.isCompleting) {
			this.resetSwipe();
			return;
		}

		const deltaX = this.touchCurrentX - this.touchStartX;
		const distance = Math.abs(deltaX);
		const duration = Date.now() - this.touchStartTime;
		const velocity = distance / duration; // px/ms

		// Get threshold in pixels
		const elementWidth = this.element.offsetWidth;
		const thresholdDistance = elementWidth * this.options.threshold;

		// Determine if swipe should complete
		const shouldComplete =
			distance >= thresholdDistance ||
			(distance >= this.options.minSwipeDistance && velocity >= this.options.velocityThreshold);

		if (shouldComplete) {
			if (this.swipeDirection === 'right') {
				this.completeSwipe();
			} else if (this.swipeDirection === 'left') {
				this.completeLeftSwipe();
			}
		} else {
			this.cancelSwipe();
		}
	}

	/**
	 * Handle touch cancel event
	 */
	handleTouchCancel(e) {
		this.cancelSwipe();
	}

	/**
	 * Update visual position during swipe
	 */
	updateSwipePosition(deltaX) {
		if (!this.contentElement) {
			return;
		}

		const elementWidth = this.element.offsetWidth;
		const maxDistance = elementWidth * 0.5; // Limit swipe to 50% of width

		// Clamp deltaX
		let clampedDeltaX;
		if (this.swipeDirection === 'right') {
			clampedDeltaX = Math.min(Math.max(0, deltaX), maxDistance);
		} else {
			clampedDeltaX = Math.max(Math.min(0, deltaX), -maxDistance);
		}

		// Apply transform
		this.contentElement.style.transform = `translateX(${clampedDeltaX}px)`;
		this.contentElement.style.setProperty('--swipe-distance', `${clampedDeltaX}px`);

		// Check if threshold reached for visual feedback
		const thresholdDistance = elementWidth * this.options.threshold;
		const absClampedDelta = Math.abs(clampedDeltaX);

		if (absClampedDelta >= thresholdDistance) {
			if (!this.element.classList.contains('threshold-reached')) {
				this.element.classList.add('threshold-reached');
				this.triggerHapticFeedback('medium');
			}
		} else {
			this.element.classList.remove('threshold-reached');
		}
	}

	/**
	 * Complete the swipe (swipe right to complete task)
	 */
	completeSwipe() {
		this.isCompleting = true;

		// Remove swiping class, add completing class
		this.element.classList.remove('swiping', 'threshold-reached');
		this.element.classList.add('completing');

		// Strong haptic feedback
		this.triggerHapticFeedback('heavy');

		// Wait for slide-out animation to complete
		setTimeout(() => {
			this.element.classList.add('completed');

			// Call completion callback if provided
			if (this.options.onComplete && typeof this.options.onComplete === 'function') {
				this.options.onComplete(this.element);
			}

			// Wait for collapse animation, then remove element
			setTimeout(() => {
				this.destroy();
			}, 500);
		}, 300);
	}

	/**
	 * Complete left swipe (alternative action like delete)
	 */
	completeLeftSwipe() {
		this.isCompleting = true;

		// Remove swiping class
		this.element.classList.remove('swiping', 'swiping-left', 'threshold-reached');
		this.element.classList.add('completing');

		// Strong haptic feedback
		this.triggerHapticFeedback('heavy');

		// Call delete callback if provided
		if (this.options.onDelete && typeof this.options.onDelete === 'function') {
			this.options.onDelete(this.element);
		} else {
			// Default: just remove the element
			setTimeout(() => {
				this.element.classList.add('completed');
				setTimeout(() => {
					this.destroy();
				}, 500);
			}, 300);
		}
	}

	/**
	 * Cancel the swipe and return to original position
	 */
	cancelSwipe() {
		if (!this.isSwiping) {
			this.resetSwipe();
			return;
		}

		// Add resetting class for spring animation
		this.element.classList.remove('swiping', 'swiping-left', 'threshold-reached');
		this.element.classList.add('resetting');

		// Reset transform
		if (this.contentElement) {
			this.contentElement.style.transform = '';
			this.contentElement.style.removeProperty('--swipe-distance');
		}

		// Remove resetting class after animation
		setTimeout(() => {
			this.element.classList.remove('resetting');
			this.resetSwipe();
		}, 250);
	}

	/**
	 * Reset swipe state
	 */
	resetSwipe() {
		this.touchStartX = 0;
		this.touchStartY = 0;
		this.touchCurrentX = 0;
		this.touchCurrentY = 0;
		this.touchStartTime = 0;
		this.isSwiping = false;
		this.swipeDirection = null;
	}

	/**
	 * Trigger haptic feedback (if supported)
	 *
	 * Provides tactile feedback during swipe gestures using the Vibration API.
	 * Respects user preferences and accessibility settings.
	 *
	 * @param {string} intensity - 'light', 'medium', or 'heavy'
	 */
	triggerHapticFeedback(intensity = 'medium') {
		// Check if Vibration API is supported
		if (!navigator.vibrate || typeof navigator.vibrate !== 'function') {
			return;
		}

		// Respect reduced motion preference (accessibility)
		if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}

		// Check user preference for haptic feedback
		// First check localStorage, then fall back to Frappe user settings
		const hapticEnabled = this.isHapticEnabled();
		if (!hapticEnabled) {
			return;
		}

		// Map intensity to vibration patterns (in milliseconds)
		// Using patterns instead of single durations for richer feedback
		const patterns = {
			light: [15],          // Single short pulse for threshold feedback
			medium: [25, 10, 25], // Double pulse for significant events
			heavy: [40, 15, 30]   // Strong pattern for completion
		};

		const pattern = patterns[intensity] || patterns.medium;

		try {
			navigator.vibrate(pattern);
		} catch (error) {
			// Silently fail if vibration API throws error
			console.warn('Haptic feedback failed:', error);
		}
	}

	/**
	 * Check if haptic feedback is enabled
	 *
	 * Checks user preferences in the following order:
	 * 1. LocalStorage setting (workhub.haptic_feedback)
	 * 2. Frappe user settings (if available)
	 * 3. Default to true (enabled)
	 *
	 * @returns {boolean}
	 */
	isHapticEnabled() {
		// Check localStorage first (fastest)
		try {
			const localPref = localStorage.getItem('workhub.haptic_feedback');
			if (localPref !== null) {
				return localPref === 'true';
			}
		} catch (error) {
			// LocalStorage might not be available (privacy mode, etc.)
		}

		// Check Frappe user settings if available
		if (frappe && frappe.boot && frappe.boot.user_settings) {
			const userSettings = frappe.boot.user_settings;
			if (typeof userSettings.haptic_feedback !== 'undefined') {
				return userSettings.haptic_feedback;
			}
		}

		// Default to enabled
		return true;
	}

	/**
	 * Disable swipe functionality
	 */
	disable() {
		this.options.disabled = true;
		this.element.classList.add('disabled');
		this.cancelSwipe();
	}

	/**
	 * Enable swipe functionality
	 */
	enable() {
		this.options.disabled = false;
		this.element.classList.remove('disabled');
	}

	/**
	 * Destroy the component and clean up
	 */
	destroy() {
		this.removeEventListeners();

		// Remove element from DOM if it still exists
		if (this.element && this.element.parentNode) {
			this.element.parentNode.removeChild(this.element);
		}
	}

	/**
	 * Static method to initialize all swipeable tasks on the page
	 */
	static initializeAll(selector = '.wh-swipeable-task', options = {}) {
		const elements = document.querySelectorAll(selector);
		const instances = [];

		elements.forEach(element => {
			// Skip if already initialized
			if (element._swipeableTask) {
				return;
			}

			// Create instance and store reference
			const instance = new SwipeableTask(element, options);
			element._swipeableTask = instance;
			instances.push(instance);
		});

		return instances;
	}

	/**
	 * Static method to destroy all instances
	 */
	static destroyAll(selector = '.wh-swipeable-task') {
		const elements = document.querySelectorAll(selector);

		elements.forEach(element => {
			if (element._swipeableTask) {
				element._swipeableTask.destroy();
				delete element._swipeableTask;
			}
		});
	}

	/**
	 * Static method to enable haptic feedback globally
	 */
	static enableHapticFeedback() {
		try {
			localStorage.setItem('workhub.haptic_feedback', 'true');
		} catch (error) {
			console.warn('Failed to save haptic feedback preference:', error);
		}
	}

	/**
	 * Static method to disable haptic feedback globally
	 */
	static disableHapticFeedback() {
		try {
			localStorage.setItem('workhub.haptic_feedback', 'false');
		} catch (error) {
			console.warn('Failed to save haptic feedback preference:', error);
		}
	}

	/**
	 * Static method to check if haptic feedback is supported
	 *
	 * @returns {boolean}
	 */
	static isHapticSupported() {
		return !!(navigator.vibrate && typeof navigator.vibrate === 'function');
	}
};
