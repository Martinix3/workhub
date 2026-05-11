/**
 * WorkHub Report Charts Module
 *
 * Provides chart rendering functionality using Chart.js for the reporting system.
 * Supports multiple chart types with responsive sizing and flexible data formatting.
 *
 * Supported Chart Types:
 * - Bar charts (vertical bars)
 * - Line charts (with points and lines)
 * - Pie charts (circular sectors)
 * - Doughnut charts (donut shape)
 * - Stacked bar charts (cumulative bars)
 *
 * Usage:
 *   const chartRenderer = new ReportChartRenderer();
 *   chartRenderer.renderChart(canvasElement, config, data);
 */

class ReportChartRenderer {
	constructor(options = {}) {
		this.defaultColors = options.defaultColors || [
			'#667eea',  // Purple
			'#764ba2',  // Deep purple
			'#f093fb',  // Pink
			'#4facfe',  // Blue
			'#43e97b',  // Green
			'#fa709a',  // Rose
			'#fee140',  // Yellow
			'#30cfd0',  // Cyan
			'#a8edea',  // Light cyan
			'#ff9a9e'   // Light red
		];

		this.chartInstances = new Map();
	}

	/**
	 * Render a chart on a canvas element
	 *
	 * @param {HTMLCanvasElement|string} canvas - Canvas element or ID
	 * @param {Object} config - Chart configuration
	 * @param {string} config.chart_type - Type: bar, line, pie, doughnut, stacked_bar
	 * @param {string} config.x_field - Field name for X-axis labels
	 * @param {string} config.y_field - Field name or array for Y-axis values
	 * @param {Array} config.colors - Optional color array
	 * @param {string} config.title - Optional chart title
	 * @param {boolean} config.show_legend - Show legend (default: auto)
	 * @param {boolean} config.show_grid - Show grid lines (default: true)
	 * @param {boolean} config.show_points - Show data points on lines (default: true)
	 * @param {Array} data - Array of data objects
	 * @returns {Chart} Chart.js instance
	 */
	renderChart(canvas, config, data) {
		// Get canvas element
		const canvasElement = typeof canvas === 'string'
			? document.getElementById(canvas)
			: canvas;

		if (!canvasElement) {
			console.error('Canvas element not found');
			return null;
		}

		// Destroy existing chart if present
		this.destroyChart(canvasElement.id);

		// Validate configuration
		const chartType = config.chart_type || 'bar';
		const xField = config.x_field || '';
		const yField = config.y_field || '';

		if (!data || data.length === 0) {
			this._renderEmptyState(canvasElement, 'No hay datos disponibles');
			return null;
		}

		if (!xField || !yField) {
			this._renderEmptyState(canvasElement, 'Configuración incompleta');
			return null;
		}

		// Extract and format data
		const chartData = this._extractChartData(data, config);

		// Build Chart.js configuration
		const chartConfig = this._buildChartConfig(chartType, chartData, config);

		// Create chart
		const chartInstance = new Chart(canvasElement, chartConfig);

		// Store instance for later cleanup
		if (canvasElement.id) {
			this.chartInstances.set(canvasElement.id, chartInstance);
		}

		return chartInstance;
	}

	/**
	 * Extract and format data for Chart.js
	 *
	 * @private
	 * @param {Array} data - Raw data array
	 * @param {Object} config - Chart configuration
	 * @returns {Object} Formatted data with labels and datasets
	 */
	_extractChartData(data, config) {
		const xField = config.x_field;
		const yField = config.y_field;
		const chartType = config.chart_type || 'bar';

		// Extract labels (X-axis)
		const labels = data.map(row => {
			const value = row[xField];
			return this._formatLabel(value);
		});

		// Handle multiple datasets (for stacked bar, etc.)
		let datasets = [];

		if (Array.isArray(yField)) {
			// Multiple Y fields - create dataset for each
			datasets = yField.map((field, index) => {
				const values = data.map(row => parseFloat(row[field]) || 0);
				const color = this._getColor(config.colors, index);

				return this._createDataset(
					field,
					values,
					color,
					chartType,
					config
				);
			});
		} else {
			// Single Y field
			const values = data.map(row => parseFloat(row[yField]) || 0);
			const colors = config.colors || this.defaultColors;

			datasets = [this._createDataset(
				config.title || yField,
				values,
				colors,
				chartType,
				config
			)];
		}

		return { labels, datasets };
	}

	/**
	 * Create a Chart.js dataset configuration
	 *
	 * @private
	 * @param {string} label - Dataset label
	 * @param {Array} values - Data values
	 * @param {string|Array} colors - Color or array of colors
	 * @param {string} chartType - Chart type
	 * @param {Object} config - Additional configuration
	 * @returns {Object} Dataset configuration
	 */
	_createDataset(label, values, colors, chartType, config) {
		const isMultiColor = chartType === 'pie' || chartType === 'doughnut' || chartType === 'bar';

		// Determine colors
		let backgroundColor, borderColor;

		if (Array.isArray(colors)) {
			if (isMultiColor) {
				// Use array of colors for each data point
				backgroundColor = values.map((_, i) => this._getColor(colors, i));
				borderColor = backgroundColor;
			} else {
				// Use first color for entire dataset
				backgroundColor = this._addAlpha(colors[0], 0.2);
				borderColor = colors[0];
			}
		} else {
			backgroundColor = isMultiColor ? colors : this._addAlpha(colors, 0.2);
			borderColor = colors;
		}

		const dataset = {
			label: label,
			data: values,
			backgroundColor: backgroundColor,
			borderColor: borderColor,
			borderWidth: chartType === 'line' ? 2 : 1
		};

		// Line-specific options
		if (chartType === 'line') {
			dataset.tension = 0.3; // Smooth curves
			dataset.fill = true;
			dataset.pointRadius = config.show_points !== false ? 4 : 0;
			dataset.pointHoverRadius = 6;
			dataset.pointBackgroundColor = borderColor;
			dataset.pointBorderColor = '#fff';
			dataset.pointBorderWidth = 2;
		}

		return dataset;
	}

	/**
	 * Build complete Chart.js configuration
	 *
	 * @private
	 * @param {string} chartType - Chart type
	 * @param {Object} chartData - Formatted data with labels and datasets
	 * @param {Object} config - User configuration
	 * @returns {Object} Complete Chart.js config
	 */
	_buildChartConfig(chartType, chartData, config) {
		// Map chart type (handle stacked_bar)
		const mappedType = chartType === 'stacked_bar' ? 'bar' : chartType;

		// Determine if legend should be shown
		const showLegend = config.show_legend !== undefined
			? config.show_legend
			: (chartType === 'pie' || chartType === 'doughnut' || chartData.datasets.length > 1);

		// Base configuration
		const chartConfig = {
			type: mappedType,
			data: chartData,
			options: {
				responsive: true,
				maintainAspectRatio: true,
				aspectRatio: this._getAspectRatio(chartType),
				plugins: {
					legend: {
						display: showLegend,
						position: 'top',
						labels: {
							padding: 15,
							usePointStyle: true,
							font: {
								size: 12,
								family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
							}
						}
					},
					tooltip: {
						enabled: true,
						backgroundColor: 'rgba(0, 0, 0, 0.8)',
						titleFont: {
							size: 13,
							weight: 'bold'
						},
						bodyFont: {
							size: 12
						},
						padding: 12,
						cornerRadius: 6,
						displayColors: true,
						callbacks: {
							label: (context) => {
								let label = context.dataset.label || '';
								if (label) {
									label += ': ';
								}
								label += this._formatValue(context.parsed.y || context.parsed);
								return label;
							}
						}
					}
				}
			}
		};

		// Add scales for non-pie/doughnut charts
		if (chartType !== 'pie' && chartType !== 'doughnut') {
			chartConfig.options.scales = {
				x: {
					display: true,
					grid: {
						display: config.show_grid !== false,
						color: 'rgba(0, 0, 0, 0.05)'
					},
					ticks: {
						font: {
							size: 11
						},
						maxRotation: 45,
						minRotation: 0
					}
				},
				y: {
					display: true,
					beginAtZero: true,
					grid: {
						display: config.show_grid !== false,
						color: 'rgba(0, 0, 0, 0.05)'
					},
					ticks: {
						font: {
							size: 11
						},
						callback: (value) => this._formatValue(value)
					}
				}
			};

			// Stacked bar configuration
			if (chartType === 'stacked_bar') {
				chartConfig.options.scales.x.stacked = true;
				chartConfig.options.scales.y.stacked = true;
			}
		}

		// Doughnut-specific options
		if (chartType === 'doughnut') {
			chartConfig.options.cutout = '60%';
		}

		return chartConfig;
	}

	/**
	 * Get appropriate aspect ratio for chart type
	 *
	 * @private
	 * @param {string} chartType - Chart type
	 * @returns {number} Aspect ratio
	 */
	_getAspectRatio(chartType) {
		switch (chartType) {
			case 'pie':
			case 'doughnut':
				return 1.5; // More square for circular charts
			case 'bar':
			case 'stacked_bar':
				return 2; // Wider for bar charts
			case 'line':
			default:
				return 2.5; // Wider for line charts
		}
	}

	/**
	 * Format label for display
	 *
	 * @private
	 * @param {*} value - Label value
	 * @returns {string} Formatted label
	 */
	_formatLabel(value) {
		if (value === null || value === undefined) {
			return '';
		}

		// Date handling
		if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))) {
			try {
				const date = value instanceof Date ? value : new Date(value);
				return date.toLocaleDateString('es-ES', {
					month: 'short',
					day: 'numeric'
				});
			} catch (e) {
				return value.toString();
			}
		}

		return value.toString();
	}

	/**
	 * Format numeric value for display
	 *
	 * @private
	 * @param {number} value - Numeric value
	 * @returns {string} Formatted value
	 */
	_formatValue(value) {
		if (typeof value !== 'number') {
			return value;
		}

		// Format with thousands separator
		return new Intl.NumberFormat('es-ES', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(value);
	}

	/**
	 * Get color from array with cycling
	 *
	 * @private
	 * @param {Array} colors - Color array
	 * @param {number} index - Index
	 * @returns {string} Color
	 */
	_getColor(colors, index) {
		const colorArray = colors && colors.length > 0 ? colors : this.defaultColors;
		return colorArray[index % colorArray.length];
	}

	/**
	 * Add alpha transparency to color
	 *
	 * @private
	 * @param {string} color - Hex or rgb color
	 * @param {number} alpha - Alpha value (0-1)
	 * @returns {string} Color with alpha
	 */
	_addAlpha(color, alpha) {
		// Handle hex colors
		if (color.startsWith('#')) {
			const r = parseInt(color.slice(1, 3), 16);
			const g = parseInt(color.slice(3, 5), 16);
			const b = parseInt(color.slice(5, 7), 16);
			return `rgba(${r}, ${g}, ${b}, ${alpha})`;
		}

		// Handle rgb/rgba colors
		if (color.startsWith('rgb')) {
			return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
		}

		return color;
	}

	/**
	 * Render empty state on canvas
	 *
	 * @private
	 * @param {HTMLCanvasElement} canvas - Canvas element
	 * @param {string} message - Message to display
	 */
	_renderEmptyState(canvas, message) {
		const ctx = canvas.getContext('2d');
		const width = canvas.width;
		const height = canvas.height;

		// Clear canvas
		ctx.clearRect(0, 0, width, height);

		// Draw background
		ctx.fillStyle = '#f8f9fa';
		ctx.fillRect(0, 0, width, height);

		// Draw border
		ctx.strokeStyle = '#dee2e6';
		ctx.lineWidth = 2;
		ctx.strokeRect(0, 0, width, height);

		// Draw message
		ctx.fillStyle = '#6c757d';
		ctx.font = '14px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(message, width / 2, height / 2);
	}

	/**
	 * Destroy a chart instance
	 *
	 * @param {string} canvasId - Canvas element ID
	 */
	destroyChart(canvasId) {
		if (this.chartInstances.has(canvasId)) {
			const chart = this.chartInstances.get(canvasId);
			chart.destroy();
			this.chartInstances.delete(canvasId);
		}
	}

	/**
	 * Destroy all chart instances
	 */
	destroyAllCharts() {
		this.chartInstances.forEach(chart => chart.destroy());
		this.chartInstances.clear();
	}

	/**
	 * Update existing chart with new data
	 *
	 * @param {string} canvasId - Canvas element ID
	 * @param {Object} config - Chart configuration
	 * @param {Array} data - New data
	 * @returns {Chart} Updated chart instance
	 */
	updateChart(canvasId, config, data) {
		const chart = this.chartInstances.get(canvasId);

		if (!chart) {
			// Create new chart if doesn't exist
			return this.renderChart(canvasId, config, data);
		}

		// Extract new data
		const chartData = this._extractChartData(data, config);

		// Update chart
		chart.data.labels = chartData.labels;
		chart.data.datasets = chartData.datasets;
		chart.update();

		return chart;
	}

	/**
	 * Render multiple charts in a container
	 *
	 * @param {Array} sections - Array of section objects with chart configs
	 * @param {string} containerSelector - Container CSS selector
	 */
	renderMultipleCharts(sections, containerSelector) {
		const container = document.querySelector(containerSelector);
		if (!container) {
			console.error('Container not found:', containerSelector);
			return;
		}

		sections.forEach((section, index) => {
			if (section.section_type !== 'Chart') {
				return;
			}

			const canvasId = `chart-${section.id || index}`;

			// Create canvas if doesn't exist
			let canvas = document.getElementById(canvasId);
			if (!canvas) {
				const wrapper = document.createElement('div');
				wrapper.className = 'chart-wrapper';
				wrapper.innerHTML = `
					<h3>${section.title || 'Chart'}</h3>
					<div class="chart-container">
						<canvas id="${canvasId}"></canvas>
					</div>
				`;
				container.appendChild(wrapper);
				canvas = document.getElementById(canvasId);
			}

			// Render chart
			setTimeout(() => {
				this.renderChart(canvas, section.config || {}, section.data || []);
			}, 100);
		});
	}
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
	module.exports = ReportChartRenderer;
}

// Make available globally for inline scripts
if (typeof window !== 'undefined') {
	window.ReportChartRenderer = ReportChartRenderer;
}
