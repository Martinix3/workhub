/**
 * WorkHub Report Builder - Drag and Drop Functionality
 *
 * Implements native HTML5 drag-drop API for:
 * - Draggable section components from sidebar
 * - Drop zone on canvas
 * - Reordering sections within canvas
 * - Delete/duplicate sections
 */

// Namespace
frappe.workhub = frappe.workhub || {};
frappe.workhub.reportBuilder = {};

(function() {
	'use strict';

	// ==========================================
	// STATE MANAGEMENT
	// ==========================================

	const state = {
		reportData: {},
		sections: [],
		selectedSectionIndex: null,
		draggedElement: null,
		draggedSectionIndex: null,
		dropTargetIndex: null,
		dataSources: []
	};

	// ==========================================
	// INITIALIZATION
	// ==========================================

	/**
	 * Initialize the report builder
	 * @param {Object} reportData - Initial report data from server
	 * @param {Array} dataSources - Available data sources
	 */
	frappe.workhub.reportBuilder.init = function(reportData, dataSources) {
		state.reportData = reportData || {};
		state.sections = reportData.sections || [];
		state.dataSources = dataSources || [];
		state.selectedSectionIndex = null;

		// Setup event listeners
		setupComponentDragListeners();
		setupCanvasDropListeners();

		// Render initial state
		renderSections();

		// Hide placeholder if sections exist
		if (state.sections.length > 0) {
			const placeholder = document.getElementById('canvas-placeholder');
			if (placeholder) {
				placeholder.style.display = 'none';
			}
		}
	};

	/**
	 * Get current state (for debugging)
	 */
	frappe.workhub.reportBuilder.getState = function() {
		return state;
	};

	// ==========================================
	// DRAG AND DROP - COMPONENTS TO CANVAS
	// ==========================================

	/**
	 * Setup drag listeners for component items in sidebar
	 */
	function setupComponentDragListeners() {
		const components = document.querySelectorAll('.component-item');
		components.forEach(component => {
			component.addEventListener('dragstart', handleComponentDragStart);
			component.addEventListener('dragend', handleComponentDragEnd);
		});
	}

	/**
	 * Handle drag start for component items
	 */
	function handleComponentDragStart(event) {
		const component = event.target.closest('.component-item');
		if (!component) return;

		const type = component.dataset.type;
		const label = component.dataset.label;

		event.dataTransfer.effectAllowed = 'copy';
		event.dataTransfer.setData('section-type', type);
		event.dataTransfer.setData('section-label', label);
		event.dataTransfer.setData('source', 'component');

		// Visual feedback
		component.style.opacity = '0.5';
		state.draggedElement = component;
	}

	/**
	 * Handle drag end for component items
	 */
	function handleComponentDragEnd(event) {
		const component = event.target.closest('.component-item');
		if (component) {
			component.style.opacity = '1';
		}
		state.draggedElement = null;
	}

	/**
	 * Setup drop listeners for canvas drop zone
	 */
	function setupCanvasDropListeners() {
		const dropZone = document.getElementById('canvas-drop-zone');
		if (!dropZone) return;

		dropZone.addEventListener('dragover', handleCanvasDragOver);
		dropZone.addEventListener('dragleave', handleCanvasDragLeave);
		dropZone.addEventListener('drop', handleCanvasDrop);
	}

	/**
	 * Handle drag over canvas
	 */
	function handleCanvasDragOver(event) {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';

		const dropZone = document.getElementById('canvas-drop-zone');
		if (dropZone) {
			dropZone.classList.add('drag-over');
		}
	}

	/**
	 * Handle drag leave canvas
	 */
	function handleCanvasDragLeave(event) {
		// Only remove class if leaving the drop zone itself, not child elements
		if (event.target.id === 'canvas-drop-zone') {
			event.target.classList.remove('drag-over');
		}
	}

	/**
	 * Handle drop on canvas
	 */
	function handleCanvasDrop(event) {
		event.preventDefault();

		const dropZone = document.getElementById('canvas-drop-zone');
		if (dropZone) {
			dropZone.classList.remove('drag-over');
		}

		const source = event.dataTransfer.getData('source');

		// Check if dropping a component from sidebar
		if (source === 'component') {
			const sectionType = event.dataTransfer.getData('section-type');
			const sectionLabel = event.dataTransfer.getData('section-label');

			if (sectionType) {
				addSection(sectionType, sectionLabel);
			}
		}
	}

	// ==========================================
	// DRAG AND DROP - REORDERING SECTIONS
	// ==========================================

	/**
	 * Setup drag listeners for a section card
	 * @param {HTMLElement} card - The section card element
	 * @param {number} index - Section index
	 */
	function setupSectionDragListeners(card, index) {
		card.addEventListener('dragstart', (e) => handleSectionDragStart(e, index));
		card.addEventListener('dragend', handleSectionDragEnd);
		card.addEventListener('dragover', (e) => handleSectionDragOver(e, index));
		card.addEventListener('drop', (e) => handleSectionDrop(e, index));
	}

	/**
	 * Handle drag start for section card
	 */
	function handleSectionDragStart(event, index) {
		// Only allow dragging by the section header (not by buttons)
		if (event.target.closest('button')) {
			event.preventDefault();
			return;
		}

		state.draggedSectionIndex = index;
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('source', 'section');
		event.dataTransfer.setData('section-index', index.toString());

		// Visual feedback
		const card = event.currentTarget;
		card.classList.add('dragging');
		state.draggedElement = card;
	}

	/**
	 * Handle drag end for section card
	 */
	function handleSectionDragEnd(event) {
		const card = event.currentTarget;
		card.classList.remove('dragging');

		// Remove all drop indicators
		document.querySelectorAll('.section-card').forEach(c => {
			c.classList.remove('drop-above', 'drop-below');
		});

		state.draggedSectionIndex = null;
		state.dropTargetIndex = null;
		state.draggedElement = null;
	}

	/**
	 * Handle drag over section card
	 */
	function handleSectionDragOver(event, index) {
		event.preventDefault();

		const source = event.dataTransfer.types.includes('section-index') ? 'section' : null;
		if (source !== 'section' || state.draggedSectionIndex === null) {
			return;
		}

		// Don't allow dropping on itself
		if (state.draggedSectionIndex === index) {
			return;
		}

		event.dataTransfer.dropEffect = 'move';

		// Determine drop position (above or below)
		const card = event.currentTarget;
		const rect = card.getBoundingClientRect();
		const midpoint = rect.top + rect.height / 2;
		const mouseY = event.clientY;

		// Remove existing indicators
		document.querySelectorAll('.section-card').forEach(c => {
			c.classList.remove('drop-above', 'drop-below');
		});

		// Add appropriate indicator
		if (mouseY < midpoint) {
			card.classList.add('drop-above');
			state.dropTargetIndex = index;
		} else {
			card.classList.add('drop-below');
			state.dropTargetIndex = index + 1;
		}
	}

	/**
	 * Handle drop on section card
	 */
	function handleSectionDrop(event, index) {
		event.preventDefault();
		event.stopPropagation();

		const source = event.dataTransfer.getData('source');
		if (source !== 'section' || state.draggedSectionIndex === null) {
			return;
		}

		// Don't allow dropping on itself
		if (state.draggedSectionIndex === index) {
			return;
		}

		// Determine final drop position
		const card = event.currentTarget;
		const rect = card.getBoundingClientRect();
		const midpoint = rect.top + rect.height / 2;
		const mouseY = event.clientY;

		let targetIndex;
		if (mouseY < midpoint) {
			targetIndex = index;
		} else {
			targetIndex = index + 1;
		}

		// Perform the reorder
		reorderSection(state.draggedSectionIndex, targetIndex);

		// Clean up
		card.classList.remove('drop-above', 'drop-below');
	}

	/**
	 * Reorder a section by moving it to a new position
	 * @param {number} fromIndex - Current index
	 * @param {number} toIndex - Target index
	 */
	function reorderSection(fromIndex, toIndex) {
		if (fromIndex === toIndex || fromIndex === toIndex - 1) {
			return; // No change needed
		}

		// Remove the section from its current position
		const [movedSection] = state.sections.splice(fromIndex, 1);

		// Adjust target index if needed
		let adjustedToIndex = toIndex;
		if (fromIndex < toIndex) {
			adjustedToIndex--;
		}

		// Insert at new position
		state.sections.splice(adjustedToIndex, 0, movedSection);

		// Update display_order for all sections
		state.sections.forEach((s, i) => {
			s.display_order = i;
		});

		// Update selected index if needed
		if (state.selectedSectionIndex === fromIndex) {
			state.selectedSectionIndex = adjustedToIndex;
		} else if (state.selectedSectionIndex > fromIndex && state.selectedSectionIndex < toIndex) {
			state.selectedSectionIndex--;
		} else if (state.selectedSectionIndex < fromIndex && state.selectedSectionIndex >= adjustedToIndex) {
			state.selectedSectionIndex++;
		}

		// Re-render
		renderSections();
	}

	// ==========================================
	// SECTION MANAGEMENT
	// ==========================================

	/**
	 * Add a new section to the report
	 * @param {string} type - Section type (Header, KPI, Chart, Table, Text)
	 * @param {string} label - Section label
	 */
	function addSection(type, label) {
		const newSection = {
			section_type: type,
			title: label || type,
			data_source: '',
			display_order: state.sections.length,
			is_visible: 1,
			config: getDefaultConfig(type)
		};

		state.sections.push(newSection);
		renderSections();

		// Hide placeholder
		const placeholder = document.getElementById('canvas-placeholder');
		if (placeholder) {
			placeholder.style.display = 'none';
		}

		// Select the new section
		frappe.workhub.reportBuilder.selectSection(state.sections.length - 1);
	}

	/**
	 * Get default configuration for a section type
	 * @param {string} type - Section type
	 * @returns {Object} Default config
	 */
	function getDefaultConfig(type) {
		switch(type) {
			case 'Chart':
				return {
					chart_type: 'bar',
					x_field: '',
					y_field: '',
					colors: ['#007bff', '#28a745', '#ffc107']
				};
			case 'Table':
				return {
					columns: [],
					show_totals: false,
					page_size: 50
				};
			case 'KPI':
				return {
					kpis: []
				};
			case 'Text':
				return {
					content: ''
				};
			default:
				return {};
		}
	}

	/**
	 * Move a section up or down
	 * @param {number} index - Section index
	 * @param {number} direction - Direction (-1 for up, 1 for down)
	 */
	frappe.workhub.reportBuilder.moveSection = function(index, direction) {
		const newIndex = index + direction;
		if (newIndex < 0 || newIndex >= state.sections.length) return;

		// Swap sections
		[state.sections[index], state.sections[newIndex]] = [state.sections[newIndex], state.sections[index]];

		// Update display_order
		state.sections.forEach((s, i) => {
			s.display_order = i;
		});

		// Update selected index
		if (state.selectedSectionIndex === index) {
			state.selectedSectionIndex = newIndex;
		}

		renderSections();
	};

	/**
	 * Duplicate a section
	 * @param {number} index - Section index
	 */
	frappe.workhub.reportBuilder.duplicateSection = function(index) {
		const section = state.sections[index];
		const newSection = JSON.parse(JSON.stringify(section));
		newSection.title = section.title + ' (Copia)';
		newSection.display_order = state.sections.length;

		state.sections.push(newSection);
		renderSections();

		// Show success feedback
		frappe.show_alert({
			message: 'Sección duplicada',
			indicator: 'green'
		});
	};

	/**
	 * Delete a section
	 * @param {number} index - Section index
	 */
	frappe.workhub.reportBuilder.deleteSection = function(index) {
		if (!confirm('¿Eliminar esta sección?')) {
			return;
		}

		state.sections.splice(index, 1);

		// Update display_order
		state.sections.forEach((s, i) => {
			s.display_order = i;
		});

		// Clear selection if deleted
		if (state.selectedSectionIndex === index) {
			state.selectedSectionIndex = null;
		} else if (state.selectedSectionIndex > index) {
			state.selectedSectionIndex--;
		}

		renderSections();
		renderProperties();

		// Show placeholder if empty
		if (state.sections.length === 0) {
			const placeholder = document.getElementById('canvas-placeholder');
			if (placeholder) {
				placeholder.style.display = 'block';
			}
		}

		// Show success feedback
		frappe.show_alert({
			message: 'Sección eliminada',
			indicator: 'orange'
		});
	};

	/**
	 * Select a section for editing
	 * @param {number} index - Section index
	 */
	frappe.workhub.reportBuilder.selectSection = function(index) {
		state.selectedSectionIndex = index;
		renderSections();
		renderProperties();
	};

	// ==========================================
	// RENDERING
	// ==========================================

	/**
	 * Render all sections in the canvas
	 */
	function renderSections() {
		const container = document.getElementById('sections-container');
		if (!container) return;

		container.innerHTML = '';

		state.sections.forEach((section, index) => {
			const card = createSectionCard(section, index);
			container.appendChild(card);
		});
	}

	/**
	 * Create a section card element
	 * @param {Object} section - Section data
	 * @param {number} index - Section index
	 * @returns {HTMLElement} Section card element
	 */
	function createSectionCard(section, index) {
		const card = document.createElement('div');
		card.className = 'section-card';
		card.draggable = true;
		card.dataset.index = index;

		if (state.selectedSectionIndex === index) {
			card.classList.add('selected');
		}

		// Get section type info from window context
		const sectionTypes = window.reportBuilderContext?.sectionTypes || [];
		const typeInfo = sectionTypes.find(t => t.id === section.section_type) || {};

		card.innerHTML = `
			<div class="section-header">
				<span class="section-type-badge" style="background: ${typeInfo.color || '#999'}20; color: ${typeInfo.color || '#999'};">
					${typeInfo.icon || '📄'} ${typeInfo.label || section.section_type}
				</span>
				<div class="section-actions">
					<button onclick="frappe.workhub.reportBuilder.selectSection(${index})" title="Configurar">⚙️</button>
					<button onclick="frappe.workhub.reportBuilder.moveSection(${index}, -1)" title="Mover arriba" ${index === 0 ? 'disabled' : ''}>⬆️</button>
					<button onclick="frappe.workhub.reportBuilder.moveSection(${index}, 1)" title="Mover abajo" ${index === state.sections.length - 1 ? 'disabled' : ''}>⬇️</button>
					<button onclick="frappe.workhub.reportBuilder.duplicateSection(${index})" title="Duplicar">📋</button>
					<button onclick="frappe.workhub.reportBuilder.deleteSection(${index})" title="Eliminar">🗑️</button>
				</div>
			</div>
			<div class="section-title">${section.title}</div>
			<div class="section-meta">
				${section.data_source ? 'Origen: ' + section.data_source : 'Sin origen de datos'}
			</div>
		`;

		// Click to select (but not on buttons)
		card.addEventListener('click', (e) => {
			if (!e.target.closest('button')) {
				frappe.workhub.reportBuilder.selectSection(index);
			}
		});

		// Setup drag-and-drop for reordering
		setupSectionDragListeners(card, index);

		return card;
	}

	/**
	 * Render the properties panel for the selected section
	 */
	function renderProperties() {
		const content = document.getElementById('properties-content');
		if (!content) return;

		if (state.selectedSectionIndex === null) {
			content.innerHTML = `
				<div class="no-selection">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 48px; height: 48px; margin: 0 auto; color: #ccc; display: block;">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
					</svg>
					<p class="text-muted mt-3 text-center">Selecciona una sección para configurar</p>
				</div>
			`;
			return;
		}

		const section = state.sections[state.selectedSectionIndex];

		// Build the properties panel based on section type
		let html = renderCommonProperties(section);

		// Add type-specific properties
		if (section.section_type === 'Chart') {
			html += renderChartProperties(section);
		} else if (section.section_type === 'Table') {
			html += renderTableProperties(section);
		} else if (section.section_type === 'KPI') {
			html += renderKPIProperties(section);
		} else if (section.section_type === 'Text') {
			html += renderTextProperties(section);
		}

		content.innerHTML = html;
	}

	/**
	 * Render common properties shared by all section types
	 */
	function renderCommonProperties(section) {
		let html = `
			<div class="form-group">
				<label>Título de la Sección *</label>
				<input type="text" class="form-control" id="prop-title" value="${escapeHtml(section.title)}"
					   onchange="frappe.workhub.reportBuilder.updateSectionProperty('title', this.value)">
			</div>
			<div class="form-group">
				<label>Visible</label>
				<select class="form-control" id="prop-visible" onchange="frappe.workhub.reportBuilder.updateSectionProperty('is_visible', parseInt(this.value))">
					<option value="1" ${section.is_visible ? 'selected' : ''}>Sí</option>
					<option value="0" ${!section.is_visible ? 'selected' : ''}>No</option>
				</select>
			</div>
		`;

		// Add data source selector for data-driven sections
		if (section.section_type !== 'Header' && section.section_type !== 'Text') {
			html += `
				<div class="form-group">
					<label>Origen de Datos *</label>
					<select class="form-control" id="prop-datasource" onchange="frappe.workhub.reportBuilder.updateSectionProperty('data_source', this.value)">
						<option value="">-- Seleccionar --</option>
						${state.dataSources.map(ds => `
							<option value="${ds.id}" ${section.data_source === ds.id ? 'selected' : ''}>${ds.label}</option>
						`).join('')}
					</select>
					<small class="text-muted">Selecciona la fuente de datos para esta sección</small>
				</div>
				<hr>
			`;
		}

		return html;
	}

	/**
	 * Render chart-specific configuration properties
	 */
	function renderChartProperties(section) {
		const chartTypes = window.reportBuilderContext?.chartTypes || [];
		const colors = section.config.colors || ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8'];

		return `
			<h6 class="mb-3">⚙️ Configuración del Gráfico</h6>
			<div class="form-group">
				<label>Tipo de Gráfico *</label>
				<select class="form-control" id="prop-chart-type" onchange="frappe.workhub.reportBuilder.updateConfigProperty('chart_type', this.value)">
					${chartTypes.map(ct => `
						<option value="${ct.id}" ${section.config.chart_type === ct.id ? 'selected' : ''}>${ct.label}</option>
					`).join('')}
				</select>
			</div>
			<div class="form-group">
				<label>Campo X (Eje horizontal) *</label>
				<input type="text" class="form-control" id="prop-x-field" value="${escapeHtml(section.config.x_field || '')}"
					   onchange="frappe.workhub.reportBuilder.updateConfigProperty('x_field', this.value)"
					   placeholder="Ej: month, category, name">
				<small class="text-muted">Campo de los datos para el eje X</small>
			</div>
			<div class="form-group">
				<label>Campo Y (Eje vertical) *</label>
				<input type="text" class="form-control" id="prop-y-field" value="${escapeHtml(section.config.y_field || '')}"
					   onchange="frappe.workhub.reportBuilder.updateConfigProperty('y_field', this.value)"
					   placeholder="Ej: count, total, value">
				<small class="text-muted">Campo de los datos para el eje Y</small>
			</div>
			<div class="form-group">
				<label>Colores del Gráfico</label>
				<div class="color-inputs" id="chart-colors-container">
					${colors.map((color, idx) => `
						<div class="input-group mb-2">
							<input type="color" class="form-control form-control-color" value="${color}"
								   onchange="frappe.workhub.reportBuilder.updateChartColor(${idx}, this.value)"
								   style="max-width: 60px;">
							<input type="text" class="form-control" value="${color}"
								   onchange="frappe.workhub.reportBuilder.updateChartColor(${idx}, this.value)"
								   placeholder="#007bff">
							<button class="btn btn-outline-danger btn-sm" onclick="frappe.workhub.reportBuilder.removeChartColor(${idx})" type="button">✕</button>
						</div>
					`).join('')}
				</div>
				<button class="btn btn-sm btn-outline-primary mt-2" onclick="frappe.workhub.reportBuilder.addChartColor()" type="button">+ Agregar Color</button>
				<small class="text-muted d-block mt-2">Define la paleta de colores para el gráfico</small>
			</div>
		`;
	}

	/**
	 * Render table-specific configuration properties
	 */
	function renderTableProperties(section) {
		const sortOptions = section.config.sort_by || {};
		const filters = section.config.filters || {};

		return `
			<h6 class="mb-3">⚙️ Configuración de la Tabla</h6>
			<div class="form-group">
				<label>Columnas *</label>
				<textarea class="form-control font-monospace" id="prop-columns" rows="6"
						  onchange="frappe.workhub.reportBuilder.updateConfigPropertyJSON('columns', this.value)"
						  placeholder='[{"field": "name", "label": "Nombre", "type": "text"}]'>${JSON.stringify(section.config.columns || [], null, 2)}</textarea>
				<small class="text-muted">Define columnas en formato JSON. Tipos: text, number, currency, date, link</small>
			</div>
			<div class="form-group">
				<label>Ordenar por</label>
				<div class="row">
					<div class="col-8">
						<input type="text" class="form-control" id="prop-sort-field" value="${escapeHtml(sortOptions.field || '')}"
							   onchange="frappe.workhub.reportBuilder.updateTableSorting(this.value, document.getElementById('prop-sort-order').value)"
							   placeholder="Nombre del campo">
					</div>
					<div class="col-4">
						<select class="form-control" id="prop-sort-order" onchange="frappe.workhub.reportBuilder.updateTableSorting(document.getElementById('prop-sort-field').value, this.value)">
							<option value="asc" ${sortOptions.order === 'asc' ? 'selected' : ''}>ASC</option>
							<option value="desc" ${sortOptions.order === 'desc' ? 'selected' : ''}>DESC</option>
						</select>
					</div>
				</div>
				<small class="text-muted">Campo y dirección de ordenamiento por defecto</small>
			</div>
			<div class="form-group">
				<label>Filtros (JSON)</label>
				<textarea class="form-control font-monospace" id="prop-filters" rows="4"
						  onchange="frappe.workhub.reportBuilder.updateConfigPropertyJSON('filters', this.value)"
						  placeholder='{"status": "Active", "priority": "High"}'>${JSON.stringify(filters, null, 2)}</textarea>
				<small class="text-muted">Filtros adicionales para la tabla en formato JSON</small>
			</div>
			<div class="row">
				<div class="col-6">
					<div class="form-group">
						<label>Mostrar Totales</label>
						<select class="form-control" id="prop-show-totals" onchange="frappe.workhub.reportBuilder.updateConfigProperty('show_totals', this.value === 'true')">
							<option value="false" ${!section.config.show_totals ? 'selected' : ''}>No</option>
							<option value="true" ${section.config.show_totals ? 'selected' : ''}>Sí</option>
						</select>
					</div>
				</div>
				<div class="col-6">
					<div class="form-group">
						<label>Filas por página</label>
						<input type="number" class="form-control" id="prop-page-size" value="${section.config.page_size || 50}"
							   onchange="frappe.workhub.reportBuilder.updateConfigProperty('page_size', parseInt(this.value))"
							   min="10" max="1000" step="10">
					</div>
				</div>
			</div>
			<div class="form-group">
				<label>Agrupar por</label>
				<input type="text" class="form-control" id="prop-group-by" value="${escapeHtml(section.config.group_by || '')}"
					   onchange="frappe.workhub.reportBuilder.updateConfigProperty('group_by', this.value)"
					   placeholder="Nombre del campo para agrupar">
				<small class="text-muted">Agrupar filas por este campo (opcional)</small>
			</div>
		`;
	}

	/**
	 * Render KPI-specific configuration properties
	 */
	function renderKPIProperties(section) {
		const kpis = section.config.kpis || [];

		return `
			<h6 class="mb-3">⚙️ Configuración de KPIs</h6>
			<div id="kpi-list" class="mb-3">
				${kpis.map((kpi, idx) => `
					<div class="card mb-2" style="border-left: 4px solid ${kpi.color || '#007bff'};">
						<div class="card-body p-3">
							<div class="d-flex justify-content-between align-items-start mb-2">
								<strong>${escapeHtml(kpi.label || 'KPI ' + (idx + 1))}</strong>
								<button class="btn btn-sm btn-outline-danger" onclick="frappe.workhub.reportBuilder.removeKPI(${idx})" type="button">✕</button>
							</div>
							<div class="form-group mb-2">
								<label class="small">Etiqueta *</label>
								<input type="text" class="form-control form-control-sm" value="${escapeHtml(kpi.label || '')}"
									   onchange="frappe.workhub.reportBuilder.updateKPIProperty(${idx}, 'label', this.value)"
									   placeholder="Ej: Total de Ventas">
							</div>
							<div class="form-group mb-2">
								<label class="small">Campo Métrica *</label>
								<input type="text" class="form-control form-control-sm" value="${escapeHtml(kpi.metric_field || '')}"
									   onchange="frappe.workhub.reportBuilder.updateKPIProperty(${idx}, 'metric_field', this.value)"
									   placeholder="Ej: total_sales, count">
							</div>
							<div class="form-group mb-2">
								<label class="small">Tipo de Agregación</label>
								<select class="form-control form-control-sm" onchange="frappe.workhub.reportBuilder.updateKPIProperty(${idx}, 'aggregation', this.value)">
									<option value="sum" ${kpi.aggregation === 'sum' ? 'selected' : ''}>Suma</option>
									<option value="avg" ${kpi.aggregation === 'avg' ? 'selected' : ''}>Promedio</option>
									<option value="count" ${kpi.aggregation === 'count' ? 'selected' : ''}>Contar</option>
									<option value="min" ${kpi.aggregation === 'min' ? 'selected' : ''}>Mínimo</option>
									<option value="max" ${kpi.aggregation === 'max' ? 'selected' : ''}>Máximo</option>
								</select>
							</div>
							<div class="form-group mb-2">
								<label class="small">Formato</label>
								<select class="form-control form-control-sm" onchange="frappe.workhub.reportBuilder.updateKPIProperty(${idx}, 'format', this.value)">
									<option value="number" ${kpi.format === 'number' ? 'selected' : ''}>Número</option>
									<option value="currency" ${kpi.format === 'currency' ? 'selected' : ''}>Moneda</option>
									<option value="percentage" ${kpi.format === 'percentage' ? 'selected' : ''}>Porcentaje</option>
									<option value="text" ${kpi.format === 'text' ? 'selected' : ''}>Texto</option>
								</select>
							</div>
							<div class="form-group mb-2">
								<label class="small">Comparación (opcional)</label>
								<input type="text" class="form-control form-control-sm" value="${escapeHtml(kpi.comparison_field || '')}"
									   onchange="frappe.workhub.reportBuilder.updateKPIProperty(${idx}, 'comparison_field', this.value)"
									   placeholder="Ej: last_month_sales">
								<small class="text-muted">Campo para comparar vs período anterior</small>
							</div>
							<div class="row">
								<div class="col-6">
									<div class="form-group mb-0">
										<label class="small">Color</label>
										<input type="color" class="form-control form-control-color form-control-sm" value="${kpi.color || '#007bff'}"
											   onchange="frappe.workhub.reportBuilder.updateKPIProperty(${idx}, 'color', this.value)">
									</div>
								</div>
								<div class="col-6">
									<div class="form-group mb-0">
										<label class="small">Icono</label>
										<input type="text" class="form-control form-control-sm" value="${escapeHtml(kpi.icon || '')}"
											   onchange="frappe.workhub.reportBuilder.updateKPIProperty(${idx}, 'icon', this.value)"
											   placeholder="📊">
									</div>
								</div>
							</div>
						</div>
					</div>
				`).join('')}
			</div>
			<button class="btn btn-sm btn-outline-primary" onclick="frappe.workhub.reportBuilder.addKPI()" type="button">+ Agregar KPI</button>
			${kpis.length === 0 ? '<p class="text-muted mt-2 mb-0 small">Agrega al menos un KPI para esta sección</p>' : ''}
		`;
	}

	/**
	 * Render text-specific configuration properties
	 */
	function renderTextProperties(section) {
		return `
			<h6 class="mb-3">⚙️ Configuración de Texto</h6>
			<div class="form-group">
				<label>Contenido *</label>
				<textarea class="form-control" id="prop-content" rows="8"
						  onchange="frappe.workhub.reportBuilder.updateConfigProperty('content', this.value)"
						  placeholder="Escribe el contenido de texto aquí...&#10;&#10;Puedes usar Markdown para formatear:&#10;- **negrita** para negrita&#10;- *cursiva* para cursiva&#10;- # Título para encabezados">${escapeHtml(section.config.content || '')}</textarea>
				<small class="text-muted">Soporta formato Markdown básico</small>
			</div>
			<div class="form-group">
				<label>Alineación</label>
				<select class="form-control" id="prop-text-align" onchange="frappe.workhub.reportBuilder.updateConfigProperty('text_align', this.value)">
					<option value="left" ${section.config.text_align === 'left' ? 'selected' : ''}>Izquierda</option>
					<option value="center" ${section.config.text_align === 'center' ? 'selected' : ''}>Centro</option>
					<option value="right" ${section.config.text_align === 'right' ? 'selected' : ''}>Derecha</option>
					<option value="justify" ${section.config.text_align === 'justify' ? 'selected' : ''}>Justificado</option>
				</select>
			</div>
			<div class="form-group">
				<label>Estilo de Fuente</label>
				<select class="form-control" id="prop-font-style" onchange="frappe.workhub.reportBuilder.updateConfigProperty('font_style', this.value)">
					<option value="normal" ${!section.config.font_style || section.config.font_style === 'normal' ? 'selected' : ''}>Normal</option>
					<option value="italic" ${section.config.font_style === 'italic' ? 'selected' : ''}>Cursiva</option>
				</select>
			</div>
		`;
	}

	/**
	 * Escape HTML to prevent XSS
	 */
	function escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	/**
	 * Update a section property
	 * @param {string} key - Property key
	 * @param {*} value - Property value
	 */
	frappe.workhub.reportBuilder.updateSectionProperty = function(key, value) {
		if (state.selectedSectionIndex !== null) {
			state.sections[state.selectedSectionIndex][key] = value;
			renderSections();
		}
	};

	/**
	 * Update a section config property
	 * @param {string} key - Config key
	 * @param {*} value - Config value
	 */
	frappe.workhub.reportBuilder.updateConfigProperty = function(key, value) {
		if (state.selectedSectionIndex !== null) {
			state.sections[state.selectedSectionIndex].config[key] = value;
			renderSections();
		}
	};

	/**
	 * Update a section config property from JSON string
	 * @param {string} key - Config key
	 * @param {string} value - JSON string value
	 */
	frappe.workhub.reportBuilder.updateConfigPropertyJSON = function(key, value) {
		try {
			const parsed = JSON.parse(value);
			frappe.workhub.reportBuilder.updateConfigProperty(key, parsed);
		} catch (e) {
			frappe.show_alert({
				message: 'JSON inválido: ' + e.message,
				indicator: 'red'
			});
		}
	};

	// ==========================================
	// CHART CONFIGURATION HELPERS
	// ==========================================

	/**
	 * Update a chart color at specific index
	 * @param {number} index - Color index
	 * @param {string} color - Color value
	 */
	frappe.workhub.reportBuilder.updateChartColor = function(index, color) {
		if (state.selectedSectionIndex !== null) {
			const section = state.sections[state.selectedSectionIndex];
			if (!section.config.colors) {
				section.config.colors = [];
			}
			section.config.colors[index] = color;
			renderProperties();
		}
	};

	/**
	 * Remove a chart color
	 * @param {number} index - Color index to remove
	 */
	frappe.workhub.reportBuilder.removeChartColor = function(index) {
		if (state.selectedSectionIndex !== null) {
			const section = state.sections[state.selectedSectionIndex];
			if (section.config.colors && section.config.colors.length > 1) {
				section.config.colors.splice(index, 1);
				renderProperties();
			} else {
				frappe.show_alert({
					message: 'Debe haber al menos un color',
					indicator: 'orange'
				});
			}
		}
	};

	/**
	 * Add a new chart color
	 */
	frappe.workhub.reportBuilder.addChartColor = function() {
		if (state.selectedSectionIndex !== null) {
			const section = state.sections[state.selectedSectionIndex];
			if (!section.config.colors) {
				section.config.colors = [];
			}
			section.config.colors.push('#999999');
			renderProperties();
		}
	};

	// ==========================================
	// TABLE CONFIGURATION HELPERS
	// ==========================================

	/**
	 * Update table sorting configuration
	 * @param {string} field - Field to sort by
	 * @param {string} order - Sort order (asc/desc)
	 */
	frappe.workhub.reportBuilder.updateTableSorting = function(field, order) {
		if (state.selectedSectionIndex !== null) {
			const section = state.sections[state.selectedSectionIndex];
			section.config.sort_by = {
				field: field,
				order: order
			};
			renderSections();
		}
	};

	// ==========================================
	// KPI CONFIGURATION HELPERS
	// ==========================================

	/**
	 * Add a new KPI
	 */
	frappe.workhub.reportBuilder.addKPI = function() {
		if (state.selectedSectionIndex !== null) {
			const section = state.sections[state.selectedSectionIndex];
			if (!section.config.kpis) {
				section.config.kpis = [];
			}
			section.config.kpis.push({
				label: 'Nuevo KPI',
				metric_field: '',
				aggregation: 'sum',
				format: 'number',
				comparison_field: '',
				color: '#007bff',
				icon: '📊'
			});
			renderProperties();
		}
	};

	/**
	 * Update a KPI property
	 * @param {number} index - KPI index
	 * @param {string} key - Property key
	 * @param {*} value - Property value
	 */
	frappe.workhub.reportBuilder.updateKPIProperty = function(index, key, value) {
		if (state.selectedSectionIndex !== null) {
			const section = state.sections[state.selectedSectionIndex];
			if (section.config.kpis && section.config.kpis[index]) {
				section.config.kpis[index][key] = value;
				renderProperties();
			}
		}
	};

	/**
	 * Remove a KPI
	 * @param {number} index - KPI index to remove
	 */
	frappe.workhub.reportBuilder.removeKPI = function(index) {
		if (!confirm('¿Eliminar este KPI?')) {
			return;
		}

		if (state.selectedSectionIndex !== null) {
			const section = state.sections[state.selectedSectionIndex];
			if (section.config.kpis) {
				section.config.kpis.splice(index, 1);
				renderProperties();
				frappe.show_alert({
					message: 'KPI eliminado',
					indicator: 'orange'
				});
			}
		}
	};

	// ==========================================
	// SAVE REPORT
	// ==========================================

	/**
	 * Save the report
	 * @param {boolean} isNew - Whether this is a new report
	 */
	frappe.workhub.reportBuilder.saveReport = function(isNew) {
		const title = document.getElementById('report-title').value.trim();
		const description = document.getElementById('report-description').value.trim();
		const reportType = document.getElementById('report-type').value;
		const category = document.getElementById('report-category').value;
		const isActive = parseInt(document.getElementById('report-active').value);

		if (!title) {
			frappe.show_alert({
				message: 'El título es requerido',
				indicator: 'red'
			});
			return;
		}

		if (state.sections.length === 0) {
			frappe.show_alert({
				message: 'Agrega al menos una sección al reporte',
				indicator: 'orange'
			});
			return;
		}

		// Show loading
		frappe.show_progress('Guardando...', 50, 100, 'Guardando reporte...');

		// Prepare data
		const reportId = state.reportData.name;

		const data = {
			title: title,
			description: description,
			report_type: reportType,
			category: category,
			is_active: isActive,
			sections: state.sections.map(s => ({
				section_type: s.section_type,
				title: s.title,
				data_source: s.data_source || '',
				display_order: s.display_order,
				is_visible: s.is_visible,
				config: JSON.stringify(s.config)
			}))
		};

		const method = isNew ?
			'workhub_frappe_app.api.reports.create_report' :
			'workhub_frappe_app.api.reports.update_report';

		const args = isNew ? data : { report_id: reportId, ...data };

		frappe.call({
			method: method,
			args: args,
			callback: function(r) {
				frappe.hide_progress();
				if (r.message && r.message.success) {
					frappe.show_alert({
						message: 'Reporte guardado exitosamente',
						indicator: 'green'
					});

					// Redirect to reports list after short delay
					setTimeout(() => {
						window.location.href = '/workhub_reportes';
					}, 1000);
				} else {
					frappe.show_alert({
						message: 'Error al guardar el reporte',
						indicator: 'red'
					});
				}
			},
			error: function(err) {
				frappe.hide_progress();
				frappe.show_alert({
					message: 'Error al guardar el reporte: ' + (err.message || 'Error desconocido'),
					indicator: 'red'
				});
			}
		});
	};

	// ==========================================
	// EXPORT PUBLIC API
	// ==========================================

	// Export functions to global namespace
	window.frappe.workhub.reportBuilder.getSections = function() {
		return state.sections;
	};

})();
