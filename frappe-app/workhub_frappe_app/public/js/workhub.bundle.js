/**
 * WorkHub Shell - Main Bundle
 *
 * Este archivo se inyecta en TODAS las páginas del Desk de Frappe.
 * Actúa como el "entry point" del shell custom.
 */

// Namespace global
frappe.workhub = frappe.workhub || {};

// ==========================================
// STORAGE UTILITIES
// ==========================================
frappe.workhub.storage = {
    prefix: 'wh_',

    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(this.prefix + key);
            return value !== null ? JSON.parse(value) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    },

    remove(key) {
        localStorage.removeItem(this.prefix + key);
    },

    clear() {
        Object.keys(localStorage)
            .filter(k => k.startsWith(this.prefix))
            .forEach(k => localStorage.removeItem(k));
    }
};

// Aliases comunes
frappe.workhub.getSetting = (key, def) => frappe.workhub.storage.get(key, def);
frappe.workhub.setSetting = (key, val) => frappe.workhub.storage.set(key, val);

// ==========================================
// NAV CONFIG
// ==========================================

/**
 * Configuración de navegación estática
 * Basada en el layout original de Santa Brisa Next.js
 */
frappe.workhub.NAV_CONFIG = [
    {
        id: 'ejecutivo',
        title: 'Ejecutivo',
        icon: 'trending-up',
        href: '/workhub_ejecutivo',
        items: []
    },
    {
        id: 'alertas',
        title: 'Alertas',
        icon: 'bell',
        href: '/workhub_alertas',
        badge: true,
        items: []
    },
    {
        id: 'workhub',
        title: 'WorkHub',
        icon: 'briefcase',
        href: '/app',
        items: []
    },
    {
        id: 'ventas',
        title: 'Ventas',
        icon: 'shopping-cart',
        href: '/workhub_ventas',
        items: [
            { href: '/workhub_ventas_pipeline', label: 'Pipeline' },
            { href: '/workhub_ventas_clientes', label: 'Clientes' },
            { href: '/workhub_ventas_pedidos', label: 'Pedidos' },
            { href: '/workhub_ventas_analytics', label: 'Analytics' }
        ]
    },
    {
        id: 'marketing',
        title: 'Marketing',
        icon: 'megaphone',
        href: '/workhub_marketing',
        items: [
            { href: '/workhub_marketing_campanas', label: 'Campañas' },
            { href: '/workhub_marketing_social', label: 'Social Media' },
            { href: '/workhub_marketing_analytics', label: 'Analytics' }
        ]
    },
    {
        id: 'operaciones',
        title: 'Operaciones',
        icon: 'truck',
        href: '/workhub_operaciones',
        items: [
            { href: '/workhub_operaciones_inventario', label: 'Inventario' },
            { href: '/workhub_operaciones_recepciones', label: 'Recepciones' },
            { href: '/workhub_operaciones_logistica', label: 'Logística' }
        ]
    },
    {
        id: 'produccion',
        title: 'Producción',
        icon: 'cog',
        href: '/workhub_produccion',
        items: [
            { href: '/workhub_produccion_planta', label: 'Planta' },
            { href: '/workhub_produccion_ordenes', label: 'Órdenes' },
            { href: '/workhub_produccion_formulaciones', label: 'Formulaciones' }
        ]
    },
    {
        id: 'calidad',
        title: 'Calidad',
        icon: 'check-circle',
        href: '/workhub_calidad',
        items: [
            { href: '/workhub_calidad_inspecciones', label: 'Inspecciones' },
            { href: '/workhub_calidad_noconformidades', label: 'No Conformidades' }
        ]
    },
    {
        id: 'distribuidores',
        title: 'Distribuidores',
        icon: 'building',
        href: '/workhub_distribuidores',
        items: [
            { href: '/workhub_distribuidores_portal', label: 'Portal' }
        ]
    },
    {
        id: 'finanzas',
        title: 'Finanzas',
        icon: 'dollar-sign',
        href: '/workhub_finanzas',
        items: [
            { href: '/workhub_finanzas_cobros', label: 'Cobros' },
            { href: '/workhub_finanzas_pagos', label: 'Pagos' }
        ]
    },
    {
        id: 'tecnico',
        title: 'Técnico',
        icon: 'tool',
        href: '/workhub_tecnico',
        items: []
    },
    {
        id: 'admin',
        title: 'Admin',
        icon: 'settings',
        href: '/workhub_admin',
        items: [
            { href: '/workhub_admin_usuarios', label: 'Usuarios' },
            { href: '/workhub_admin_reportes', label: 'Reportes' }
        ]
    }
];

// Helper: Filtrar secciones según rol del usuario
frappe.workhub.getFilteredNavConfig = function() {
    const isAdmin = frappe.user_roles && (
        frappe.user_roles.includes('System Manager') ||
        frappe.user_roles.includes('Administrator')
    );

    return frappe.workhub.NAV_CONFIG.filter(section => {
        // Ocultar Admin si no es admin
        if (section.id === 'admin' && !isAdmin) {
            return false;
        }
        return true;
    });
};

// Helper: Obtener módulo por ID
frappe.workhub.getModule = function(id) {
    return frappe.workhub.NAV_CONFIG.find(m => m.id === id);
};

// Helper: Módulo activo según URL actual
frappe.workhub.getActiveModule = function() {
    const path = window.location.pathname;
    return frappe.workhub.NAV_CONFIG.find(m => {
        if (path === m.href) return true;
        if (m.items && m.items.some(item => path.includes(item.href))) return true;
        return false;
    });
};

// ==========================================
// SIDEBAR COMPONENT
// ==========================================
frappe.workhub.sidebar = {
    collapsed: false,
    expandedSections: new Set(),

    init() {
        // Cargar estado de localStorage
        this.collapsed = frappe.workhub.getSetting('sidebar_collapsed', false);
        const savedExpanded = frappe.workhub.getSetting('sidebar_expanded_sections', []);
        this.expandedSections = new Set(savedExpanded);

        // Renderizar sidebar
        this.render();

        // Agregar event listeners
        this.attachEventListeners();

        // Actualizar en cambio de ruta
        frappe.router.on('change', () => {
            this.updateActiveItem();
        });
    },

    render() {
        // Verificar si ya existe
        if (document.querySelector('.wh-sidebar')) {
            document.querySelector('.wh-sidebar').remove();
        }

        // Crear contenedor
        const sidebar = document.createElement('div');
        sidebar.className = 'wh-sidebar';
        if (this.collapsed) {
            sidebar.classList.add('collapsed');
        }

        // HTML del sidebar
        sidebar.innerHTML = `
            <div class="wh-sidebar-header">
                <div class="wh-sidebar-logo">
                    <img src="/assets/workhub_frappe_app/img/logo.svg" alt="Santa Brisa" />
                </div>
                <div class="wh-sidebar-toggle" data-action="toggle">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M3 12h18M3 6h18M3 18h18" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
            </div>
            <nav class="wh-sidebar-nav">
                ${this.renderNavItems()}
            </nav>
        `;

        // Agregar al body
        document.body.appendChild(sidebar);
    },

    renderNavItems() {
        const activePath = window.location.pathname;
        const config = frappe.workhub.getFilteredNavConfig();

        return config.map(module => {
            const isActive = this.isModuleActive(module, activePath);
            const hasItems = module.items && module.items.length > 0;
            const isExpanded = this.expandedSections.has(module.id);
            const badge = module.badge ? this.getModuleBadgeCount(module.id) : null;
            const chevronIcon = hasItems ? `
                <svg class="wh-nav-item-chevron ${isExpanded ? 'expanded' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                </svg>
            ` : '';

            const subItems = hasItems && isExpanded ? `
                <div class="wh-nav-subitems">
                    ${module.items.map(item => {
                        const isSubActive = activePath.startsWith(item.href);
                        return `
                            <a href="${item.href}"
                               class="wh-nav-subitem ${isSubActive ? 'active' : ''}"
                               data-subitem="${item.href}">
                                ${item.label}
                            </a>
                        `;
                    }).join('')}
                </div>
            ` : '';

            return `
                <div class="wh-nav-section" data-section="${module.id}">
                    <a href="${module.href}"
                       class="wh-nav-item ${isActive ? 'active' : ''} ${hasItems ? 'has-items' : ''}"
                       data-module-id="${module.id}">
                        <div class="wh-nav-item-icon">
                            ${this.getIcon(module.icon)}
                        </div>
                        <div class="wh-nav-item-label">
                            ${module.title}
                        </div>
                        ${badge ? `<div class="wh-nav-item-badge">${badge}</div>` : ''}
                        ${chevronIcon}
                    </a>
                    ${subItems}
                </div>
            `;
        }).join('');
    },

    isModuleActive(module, path) {
        if (path === module.href) return true;
        if (module.items && module.items.some(item => path.includes(item.href))) {
            return true;
        }
        return false;
    },

    getModuleBadgeCount(moduleId) {
        // TODO: Conectar con sistema de alertas real
        if (moduleId === 'alertas') {
            return 5; // Mock data
        }
        return null;
    },

    getIcon(iconName) {
        // Frappe icons como SVG simple
        const icons = {
            'trending-up': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
            'bell': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
            'briefcase': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
            'shopping-cart': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
            'megaphone': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
            'truck': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
            'cog': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m5.2-13.8l-4.2 4.2m-2 2l-4.2 4.2m13.8-5.2l-6 0m-6 0l-6 0m13.8 5.2l-4.2-4.2m-2-2l-4.2-4.2"/></svg>',
            'check-circle': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            'building': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>',
            'dollar-sign': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
            'tool': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
            'settings': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6"/></svg>'
        };

        return icons[iconName] || icons['briefcase'];
    },

    attachEventListeners() {
        // Toggle collapse
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="toggle"]')) {
                this.toggleCollapse();
            }
        });

        // Toggle section expansion (chevron click)
        document.addEventListener('click', (e) => {
            const chevron = e.target.closest('.wh-nav-item-chevron');
            if (chevron) {
                e.preventDefault();
                e.stopPropagation();
                const navItem = chevron.closest('.wh-nav-item');
                const moduleId = navItem?.getAttribute('data-module-id');
                if (moduleId) {
                    this.toggleSection(moduleId);
                }
                return;
            }
        });

        // Handle sub-item clicks
        document.addEventListener('click', (e) => {
            const subItem = e.target.closest('.wh-nav-subitem');
            if (subItem) {
                e.preventDefault();
                const href = subItem.getAttribute('href');
                if (href) {
                    // Si es una ruta workhub_*, navegar directamente (página www)
                    if (href.includes('workhub_')) {
                        window.location.href = href;
                    } else {
                        frappe.set_route(href.replace('/app/', ''));
                    }
                }
                return;
            }
        });

        // Handle nav item clicks (section headers)
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('.wh-nav-item');
            if (navItem && !e.target.closest('.wh-nav-item-chevron')) {
                e.preventDefault();
                const href = navItem.getAttribute('href');
                const hasItems = navItem.classList.contains('has-items');

                // If has items, also toggle expansion
                if (hasItems) {
                    const moduleId = navItem.getAttribute('data-module-id');
                    this.toggleSection(moduleId);
                }

                // Navigate to href
                if (href) {
                    // Si es una ruta workhub_*, navegar directamente (página www)
                    if (href.includes('workhub_')) {
                        window.location.href = href;
                    } else {
                        frappe.set_route(href.replace('/app/', ''));
                    }
                }
            }
        });
    },

    toggleSection(moduleId) {
        if (this.expandedSections.has(moduleId)) {
            this.expandedSections.delete(moduleId);
        } else {
            this.expandedSections.add(moduleId);
        }

        // Save to localStorage
        frappe.workhub.setSetting('sidebar_expanded_sections', Array.from(this.expandedSections));

        // Re-render sidebar
        this.render();
    },

    updateActiveItem() {
        // Update active states without full re-render
        const activePath = window.location.pathname;
        const config = frappe.workhub.getFilteredNavConfig();

        // Update nav items
        document.querySelectorAll('.wh-nav-item').forEach(item => {
            const moduleId = item.getAttribute('data-module-id');
            const module = config.find(m => m.id === moduleId);

            if (module && this.isModuleActive(module, activePath)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update sub-items
        document.querySelectorAll('.wh-nav-subitem').forEach(item => {
            const href = item.getAttribute('href');
            if (activePath.startsWith(href)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    toggleCollapse() {
        this.collapsed = !this.collapsed;
        frappe.workhub.setSetting('sidebar_collapsed', this.collapsed);

        const sidebar = document.querySelector('.wh-sidebar');
        if (this.collapsed) {
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('collapsed');
        }
    },

    updateActivePath() {
        // Actualizar item activo según ruta actual
        document.querySelectorAll('.wh-nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const activePath = window.location.pathname;
        const activeModule = frappe.workhub.NAV_CONFIG.find(m =>
            this.isModuleActive(m, activePath)
        );

        if (activeModule) {
            const activeItem = document.querySelector(`[data-module="${activeModule.id}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }
    }
};

// Actualizar sidebar cuando cambia la ruta
frappe.router.on('change', () => {
    if (frappe.workhub.sidebar) {
        frappe.workhub.sidebar.updateActivePath();
    }
});

// ==========================================
// NOTIFICATIONS MODULE
// ==========================================
frappe.workhub.notifications = {
    /**
     * Estado interno del modulo
     */
    notifications: [],
    unreadCount: 0,
    highPriorityCount: 0,
    isInitialized: false,

    /**
     * Inicializar el modulo de notificaciones
     * Carga notificaciones iniciales y configura listeners
     */
    init() {
        if (this.isInitialized) return;

        this.loadNotifications();
        this.setupRealtimeListener();
        this.isInitialized = true;
    },

    /**
     * Cargar notificaciones del usuario actual
     * @param {Object} options - Opciones de filtrado { unread_only, priority, limit }
     */
    loadNotifications(options = {}) {
        const defaultOptions = {
            unread_only: false,
            priority: null,
            limit: 50
        };
        const params = Object.assign({}, defaultOptions, options);

        frappe.call({
            method: 'workhub_frappe_app.api.notifications.get_notifications',
            args: params,
            callback: (r) => {
                if (r.message) {
                    this.notifications = r.message.notifications || [];
                    this.unreadCount = r.message.unread_count || 0;
                    this.updateBadge();
                    this.renderNotificationsList();
                }
            }
        });
    },

    /**
     * Actualizar solo los contadores (optimizado para polling)
     */
    updateCounts() {
        frappe.call({
            method: 'workhub_frappe_app.api.notifications.get_unread_count',
            callback: (r) => {
                if (r.message) {
                    this.unreadCount = r.message.unread_count || 0;
                    this.highPriorityCount = r.message.high_priority_count || 0;
                    this.updateBadge();
                }
            }
        });
    },

    /**
     * Actualizar el badge visual del header
     */
    updateBadge() {
        const badge = document.querySelector('.wh-notification-badge');
        if (!badge) return;

        if (this.unreadCount > 0) {
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            badge.style.display = 'flex';

            // Agregar clase especial si hay notificaciones de alta prioridad
            if (this.highPriorityCount > 0) {
                badge.classList.add('has-high-priority');
            } else {
                badge.classList.remove('has-high-priority');
            }
        } else {
            badge.style.display = 'none';
            badge.classList.remove('has-high-priority');
        }
    },

    /**
     * Renderizar lista de notificaciones en el panel
     */
    renderNotificationsList() {
        const list = document.querySelector('.wh-notifications-list');
        if (!list) return;

        // Limpiar
        list.innerHTML = '';

        if (!this.notifications || this.notifications.length === 0) {
            list.innerHTML = '<div class="wh-notifications-empty">No tienes notificaciones</div>';
            return;
        }

        // Renderizar cada notificacion
        this.notifications.forEach(notif => {
            this.addNotificationToList(notif, false);
        });
    },

    /**
     * Agregar una notificacion al panel
     * @param {Object} notification - Datos de la notificacion
     * @param {Boolean} prepend - Si debe agregarse al inicio (true) o al final (false)
     */
    addNotificationToList(notification, prepend = true) {
        const list = document.querySelector('.wh-notifications-list');
        if (!list) return;

        // Remover mensaje vacio si existe
        const empty = list.querySelector('.wh-notifications-empty');
        if (empty) empty.remove();

        // Crear elemento de notificacion
        const item = document.createElement('div');
        item.className = 'wh-notification-item';
        item.dataset.notificationId = notification.name;

        // Clases adicionales segun estado y prioridad
        if (!notification.read) {
            item.classList.add('unread');
        }
        if (notification.priority === 'HIGH') {
            item.classList.add('high-priority');
        }

        // Icono segun prioridad
        const priorityIcon = this.getPriorityIcon(notification.priority);

        // Construir HTML
        item.innerHTML = `
            ${priorityIcon}
            <div class="wh-notification-content">
                <div class="wh-notification-title">${notification.title || 'Notificación'}</div>
                <div class="wh-notification-message">${notification.message || ''}</div>
                <div class="wh-notification-time">${frappe.datetime.comment_when(notification.created_at)}</div>
            </div>
        `;

        // Click handler para marcar como leida y navegar
        item.addEventListener('click', () => {
            this.markAsRead(notification.name);

            // Navegar si tiene action_url
            if (notification.action_url) {
                window.location.href = notification.action_url;
            } else if (notification.reference_doctype && notification.reference_name) {
                frappe.set_route('Form', notification.reference_doctype, notification.reference_name);
            }
        });

        // Agregar al DOM
        if (prepend) {
            list.insertBefore(item, list.firstChild);
        } else {
            list.appendChild(item);
        }
    },

    /**
     * Obtener icono segun prioridad
     * @param {String} priority - HIGH, MEDIUM, LOW
     */
    getPriorityIcon(priority) {
        const icons = {
            'HIGH': '<div class="wh-notification-priority high"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>',
            'MEDIUM': '<div class="wh-notification-priority medium"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>',
            'LOW': '<div class="wh-notification-priority low"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg></div>'
        };
        return icons[priority] || icons['LOW'];
    },

    /**
     * Marcar una notificacion como leida
     * @param {String} notificationId - ID de la notificacion
     */
    markAsRead(notificationId) {
        frappe.call({
            method: 'workhub_frappe_app.api.notifications.mark_read',
            args: { notification_id: notificationId },
            callback: (r) => {
                if (r.message && r.message.success) {
                    // Actualizar UI
                    const item = document.querySelector(`[data-notification-id="${notificationId}"]`);
                    if (item) {
                        item.classList.remove('unread');
                    }

                    // Actualizar contador
                    if (this.unreadCount > 0) {
                        this.unreadCount--;
                    }

                    // Actualizar en array local
                    const notif = this.notifications.find(n => n.name === notificationId);
                    if (notif) {
                        notif.read = 1;
                    }

                    this.updateBadge();
                }
            }
        });
    },

    /**
     * Marcar todas las notificaciones como leidas
     */
    markAllAsRead() {
        frappe.call({
            method: 'workhub_frappe_app.api.notifications.mark_all_read',
            callback: (r) => {
                if (r.message && r.message.success) {
                    // Actualizar UI
                    document.querySelectorAll('.wh-notification-item.unread').forEach(item => {
                        item.classList.remove('unread');
                    });

                    // Actualizar array local
                    this.notifications.forEach(n => {
                        n.read = 1;
                    });

                    this.unreadCount = 0;
                    this.highPriorityCount = 0;
                    this.updateBadge();
                }
            }
        });
    },

    /**
     * Configurar listener de eventos en tiempo real
     */
    setupRealtimeListener() {
        // Escuchar nuevas notificaciones
        frappe.realtime.on('wh_notification', (data) => {
            // Agregar a array local
            this.notifications.unshift(data);

            // Incrementar contador si no esta leida
            if (!data.read) {
                this.unreadCount++;
                if (data.priority === 'HIGH') {
                    this.highPriorityCount++;
                }
            }

            // Actualizar UI
            this.updateBadge();
            this.addNotificationToList(data, true);

            // Mostrar toast para notificaciones de alta prioridad
            if (data.priority === 'HIGH') {
                this.showHighPriorityToast(data);
            }
        });
    },

    /**
     * Mostrar toast para notificaciones urgentes
     * @param {Object} notification - Datos de la notificacion
     */
    showHighPriorityToast(notification) {
        frappe.show_alert({
            message: `<strong>${notification.title}</strong><br>${notification.message}`,
            indicator: 'red'
        }, 7);
    }
};

// ==========================================
// HEADER COMPONENT
// ==========================================
frappe.workhub.header = {
    init() {
        this.render();
        this.attachEventListeners();
        this.updateBreadcrumbs();

        // Inicializar modulo de notificaciones
        if (frappe.workhub.notifications) {
            frappe.workhub.notifications.init();
        }
    },

    render() {
        // Verificar si ya existe
        if (document.querySelector('.wh-header')) {
            document.querySelector('.wh-header').remove();
        }

        // Ocultar header nativo de Frappe
        const nativeHeader = document.querySelector('.page-head');
        if (nativeHeader) {
            nativeHeader.style.display = 'none';
        }

        // Crear header
        const header = document.createElement('div');
        header.className = 'wh-header';
        header.innerHTML = `
            <div class="wh-header-left">
                <button class="wh-header-menu-toggle" onclick="frappe.workhub.bottomNav.openMobileSidebar()">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
                <nav class="wh-breadcrumbs">
                    <!-- Breadcrumbs dinámicos -->
                </nav>
            </div>
            <div class="wh-header-center">
                <div class="wh-search-bar">
                    <input
                        type="text"
                        class="wh-search-input"
                        placeholder="Buscar... (Ctrl+K)"
                    />
                    <div class="wh-search-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="wh-header-right">
                <!-- Notificaciones -->
                <div class="wh-header-action" data-action="notifications">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    <div class="wh-notification-badge has-count" data-count="0" style="display: none;">
                        0
                    </div>
                </div>

                <!-- User Menu -->
                <div class="wh-user-menu">
                    <div class="wh-user-avatar" data-action="user-menu">
                        ${this.getUserInitials()}
                    </div>
                </div>
            </div>
        `;

        // Insertar header
        const mainSection = document.querySelector('.main-section');
        if (mainSection) {
            mainSection.insertBefore(header, mainSection.firstChild);
        }

        // Renderizar panels
        this.renderNotificationsPanel();
        this.renderUserDropdown();
    },

    getUserInitials() {
        const user = frappe.session.user_fullname || frappe.session.user;
        return user.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    },

    updateBreadcrumbs() {
        const breadcrumbs = document.querySelector('.wh-breadcrumbs');
        if (!breadcrumbs) return;

        const route = frappe.get_route();
        const items = [];

        // Home
        items.push(`<div class="wh-breadcrumb-item">
            <a href="/app" class="wh-breadcrumb-link">Home</a>
        </div>`);

        // Route parts
        if (route && route.length > 0) {
            route.forEach((part, index) => {
                const isLast = index === route.length - 1;
                items.push(`<div class="wh-breadcrumb-separator">/</div>`);

                if (isLast) {
                    items.push(`<div class="wh-breadcrumb-item">
                        <span class="wh-breadcrumb-current">${part}</span>
                    </div>`);
                } else {
                    const href = '/app/' + route.slice(0, index + 1).join('/');
                    items.push(`<div class="wh-breadcrumb-item">
                        <a href="${href}" class="wh-breadcrumb-link">${part}</a>
                    </div>`);
                }
            });
        }

        breadcrumbs.innerHTML = items.join('');
    },

    renderNotificationsPanel() {
        const panel = document.createElement('div');
        panel.className = 'wh-notifications-panel';
        panel.innerHTML = `
            <div class="wh-notifications-header">
                <div class="wh-notifications-title">Notificaciones</div>
                <div class="wh-notifications-mark-read" data-action="mark-all-read">
                    Marcar todas como leídas
                </div>
            </div>
            <div class="wh-notifications-list">
                <div class="wh-notifications-empty">
                    No tienes notificaciones
                </div>
            </div>
        `;

        document.querySelector('.wh-header-action[data-action="notifications"]').appendChild(panel);
    },

    renderUserDropdown() {
        const dropdown = document.createElement('div');
        dropdown.className = 'wh-user-dropdown';
        dropdown.innerHTML = `
            <div class="wh-user-info">
                <div class="wh-user-name">${frappe.session.user_fullname}</div>
                <div class="wh-user-email">${frappe.session.user}</div>
            </div>
            <div class="wh-user-actions">
                <div class="wh-user-action-item" data-action="profile">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Mi Perfil
                </div>
                <div class="wh-user-action-item" data-action="settings">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M12 1v6m0 6v6"/>
                    </svg>
                    Configuración
                </div>
                <div class="wh-user-action-item" data-action="logout">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Cerrar Sesión
                </div>
            </div>
        `;

        document.querySelector('.wh-user-menu').appendChild(dropdown);
    },

    attachEventListeners() {
        // Toggle notifications panel
        document.addEventListener('click', (e) => {
            const notifBtn = e.target.closest('[data-action="notifications"]');
            if (notifBtn) {
                const panel = notifBtn.querySelector('.wh-notifications-panel');
                panel.classList.toggle('open');
                e.stopPropagation();
            }
        });

        // Toggle user menu
        document.addEventListener('click', (e) => {
            const userBtn = e.target.closest('[data-action="user-menu"]');
            if (userBtn) {
                const dropdown = document.querySelector('.wh-user-dropdown');
                dropdown.classList.toggle('open');
                e.stopPropagation();
            }
        });

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.wh-notifications-panel') && !e.target.closest('[data-action="notifications"]')) {
                document.querySelectorAll('.wh-notifications-panel.open').forEach(p => p.classList.remove('open'));
            }
            if (!e.target.closest('.wh-user-dropdown') && !e.target.closest('[data-action="user-menu"]')) {
                document.querySelectorAll('.wh-user-dropdown.open').forEach(d => d.classList.remove('open'));
            }
        });

        // User actions
        document.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]');
            if (!action) return;

            const actionType = action.dataset.action;

            switch (actionType) {
                case 'profile':
                    frappe.set_route('Form', 'User', frappe.session.user);
                    document.querySelectorAll('.wh-user-dropdown.open').forEach(d => d.classList.remove('open'));
                    break;
                case 'settings':
                    frappe.set_route('personal-settings');
                    document.querySelectorAll('.wh-user-dropdown.open').forEach(d => d.classList.remove('open'));
                    break;
                case 'logout':
                    frappe.app.logout();
                    break;
                case 'mark-all-read':
                    if (frappe.workhub.notifications) {
                        frappe.workhub.notifications.markAllAsRead();
                    }
                    break;
            }
        });

        // Search keyboard shortcut (Ctrl+K)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.querySelector('.wh-search-input')?.focus();
            }
        });

        // Search input
        const searchInput = document.querySelector('.wh-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Update breadcrumbs on route change
        frappe.router.on('change', () => {
            this.updateBreadcrumbs();
        });
    },

    handleSearch(query) {
        if (!query || query.length < 2) return;

        // Usar búsqueda nativa de Frappe
        frappe.searchdialog.search.init_search(query, 'Global Search');
    }
};

// ==========================================
// BOTTOM NAVIGATION (Mobile)
// ==========================================
frappe.workhub.bottomNav = {
    /**
     * Initialize bottom navigation
     */
    init() {
        this.render();
        this.attachEventListeners();
        this.updateActiveItem();

        // Update on route change
        frappe.router.on('change', () => {
            this.updateActiveItem();
        });
    },

    /**
     * Render bottom navigation HTML
     */
    render() {
        // Check if already rendered
        if (document.querySelector('.wh-bottom-nav')) {
            return;
        }

        // Get main modules for bottom nav (limit to 5)
        const navConfig = frappe.workhub.getFilteredNavConfig();
        const mainModules = navConfig.slice(0, 5);

        // Create bottom nav HTML
        const bottomNavHTML = `
            <nav class="wh-bottom-nav">
                <div class="wh-bottom-nav-items">
                    ${mainModules.map(module => this.renderNavItem(module)).join('')}
                </div>
            </nav>
        `;

        // Append to body
        document.body.insertAdjacentHTML('beforeend', bottomNavHTML);

        // Create mobile overlay
        const overlayHTML = '<div class="wh-mobile-overlay"></div>';
        document.body.insertAdjacentHTML('beforeend', overlayHTML);
    },

    /**
     * Render a single nav item
     */
    renderNavItem(module) {
        const iconSVG = this.getIconSVG(module.icon);
        const badge = module.badge ? `<span class="wh-bottom-nav-item-badge">${module.badge}</span>` : '';

        return `
            <a href="${module.href || '#'}"
               class="wh-bottom-nav-item"
               data-module-id="${module.id}">
                <div class="wh-bottom-nav-item-icon">
                    ${iconSVG}
                </div>
                <span class="wh-bottom-nav-item-label">${module.title}</span>
                ${badge}
            </a>
        `;
    },

    /**
     * Get SVG icon (reuse from sidebar icons)
     */
    getIconSVG(iconName) {
        const icons = {
            'trending-up': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>',
            'bell': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>',
            'shopping-cart': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>',
            'users': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>',
            'package': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>',
            'home': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>',
            'dollar-sign': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            'cog': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
            'briefcase': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
            'help-circle': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            'tool': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
            'settings': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
            'check-circle': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            'archive': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>'
        };

        return icons[iconName] || icons['package'];
    },

    /**
     * Update active item based on current route
     */
    updateActiveItem() {
        let currentRoute = null;
        try {
            currentRoute = frappe.get_route_str();
        } catch (e) {
            // Router not ready yet, use pathname as fallback
            currentRoute = window.location.pathname.replace('/app/', '');
        }

        if (!currentRoute) {
            currentRoute = window.location.pathname.replace('/app/', '');
        }

        const items = document.querySelectorAll('.wh-bottom-nav-item');

        items.forEach(item => {
            const href = item.getAttribute('href');
            const isActive = currentRoute && href && currentRoute.includes(href.replace('/app/', ''));

            if (isActive) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Handle bottom nav clicks
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('.wh-bottom-nav-item');
            if (navItem) {
                e.preventDefault();
                const href = navItem.getAttribute('href');
                if (href && href !== '#') {
                    // Si es una ruta workhub_*, navegar directamente (página www)
                    if (href.includes('workhub_')) {
                        window.location.href = href;
                    } else {
                        frappe.set_route(href.replace('/app/', ''));
                    }
                }
            }
        });

        // Handle mobile overlay click (close sidebar)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('wh-mobile-overlay')) {
                this.closeMobileSidebar();
            }
        });
    },

    /**
     * Open mobile sidebar
     */
    openMobileSidebar() {
        const sidebar = document.querySelector('.wh-sidebar');
        const overlay = document.querySelector('.wh-mobile-overlay');

        if (sidebar) {
            sidebar.classList.add('mobile-open');
        }
        if (overlay) {
            overlay.classList.add('active');
        }
    },

    /**
     * Close mobile sidebar
     */
    closeMobileSidebar() {
        const sidebar = document.querySelector('.wh-sidebar');
        const overlay = document.querySelector('.wh-mobile-overlay');

        if (sidebar) {
            sidebar.classList.remove('mobile-open');
        }
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
};

// ==========================================
// COMMAND PALETTE (Cmd+K)
// ==========================================
frappe.workhub.commandPalette = {
    isOpen: false,
    selectedIndex: 0,
    results: [],
    recentSearches: [],

    init() {
        this.render();
        this.attachEventListeners();
        this.loadRecentSearches();
    },

    render() {
        if (document.querySelector('.cmd-palette-backdrop')) return;

        const backdrop = document.createElement('div');
        backdrop.className = 'cmd-palette-backdrop';
        document.body.appendChild(backdrop);

        const palette = document.createElement('div');
        palette.className = 'cmd-palette';

        const search = document.createElement('div');
        search.className = 'cmd-palette__search';

        const searchIcon = document.createElement('svg');
        searchIcon.className = 'cmd-palette__search-icon';
        searchIcon.setAttribute('viewBox', '0 0 24 24');
        searchIcon.setAttribute('fill', 'none');
        searchIcon.setAttribute('stroke', 'currentColor');
        searchIcon.setAttribute('stroke-width', '2');
        searchIcon.innerHTML = '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'cmd-palette__input';
        input.placeholder = 'Buscar paginas, clientes, pedidos...';
        input.autocomplete = 'off';

        const shortcut = document.createElement('span');
        shortcut.className = 'cmd-palette__shortcut';
        shortcut.textContent = 'ESC';

        search.appendChild(searchIcon);
        search.appendChild(input);
        search.appendChild(shortcut);

        const results = document.createElement('div');
        results.className = 'cmd-palette__results';

        const footer = document.createElement('div');
        footer.className = 'cmd-palette__footer';
        footer.innerHTML = '<div class="cmd-palette__footer-item"><kbd>↑</kbd><kbd>↓</kbd> navegar</div><div class="cmd-palette__footer-item"><kbd>↵</kbd> abrir</div><div class="cmd-palette__footer-item"><kbd>esc</kbd> cerrar</div>';

        palette.appendChild(search);
        palette.appendChild(results);
        palette.appendChild(footer);
        document.body.appendChild(palette);
    },

    open() {
        this.isOpen = true;
        this.selectedIndex = 0;
        document.querySelector('.cmd-palette-backdrop')?.classList.add('is-open');
        document.querySelector('.cmd-palette')?.classList.add('is-open');
        document.querySelector('.cmd-palette__input')?.focus();
        this.showDefaultResults();
    },

    close() {
        this.isOpen = false;
        document.querySelector('.cmd-palette-backdrop')?.classList.remove('is-open');
        document.querySelector('.cmd-palette')?.classList.remove('is-open');
        const input = document.querySelector('.cmd-palette__input');
        if (input) input.value = '';
    },

    toggle() {
        this.isOpen ? this.close() : this.open();
    },

    showDefaultResults() {
        const items = [];
        if (this.recentSearches.length > 0) {
            items.push({ type: 'group', title: 'Recientes' });
            this.recentSearches.slice(0, 3).forEach(item => items.push(item));
        }
        items.push({ type: 'group', title: 'Paginas' });
        frappe.workhub.getFilteredNavConfig().forEach(module => {
            items.push({ type: 'page', title: module.title, subtitle: module.href, href: module.href });
            if (module.items) {
                module.items.forEach(sub => {
                    items.push({ type: 'page', title: sub.label, subtitle: module.title + ' / ' + sub.label, href: sub.href });
                });
            }
        });
        this.results = items.filter(i => i.type !== 'group');
        this.renderResults(items);
    },

    search(query) {
        if (!query) { this.showDefaultResults(); return; }
        const q = query.toLowerCase();
        const items = [];
        const pages = [];
        frappe.workhub.getFilteredNavConfig().forEach(module => {
            if (module.title.toLowerCase().includes(q)) {
                pages.push({ type: 'page', title: module.title, subtitle: module.href, href: module.href });
            }
            if (module.items) {
                module.items.forEach(sub => {
                    if (sub.label.toLowerCase().includes(q)) {
                        pages.push({ type: 'page', title: sub.label, subtitle: module.title + ' / ' + sub.label, href: sub.href });
                    }
                });
            }
        });
        if (pages.length) { items.push({ type: 'group', title: 'Paginas' }); items.push(...pages); }
        this.results = items.filter(i => i.type !== 'group');
        this.selectedIndex = 0;
        this.renderResults(items);
    },

    renderResults(items) {
        const container = document.querySelector('.cmd-palette__results');
        if (!container) return;
        container.textContent = '';
        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'cmd-palette__empty';
            empty.innerHTML = '<div class="cmd-palette__empty-title">Sin resultados</div>';
            container.appendChild(empty);
            return;
        }
        let idx = 0;
        items.forEach(item => {
            if (item.type === 'group') {
                const group = document.createElement('div');
                group.className = 'cmd-palette__group';
                const title = document.createElement('div');
                title.className = 'cmd-palette__group-title';
                title.textContent = item.title;
                group.appendChild(title);
                container.appendChild(group);
            } else {
                const el = document.createElement('div');
                el.className = 'cmd-palette__item' + (idx === this.selectedIndex ? ' is-selected' : '');
                el.dataset.index = idx;
                el.dataset.href = item.href || '';
                const icon = document.createElement('div');
                icon.className = 'cmd-palette__item-icon';
                icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
                const content = document.createElement('div');
                content.className = 'cmd-palette__item-content';
                const titleEl = document.createElement('div');
                titleEl.className = 'cmd-palette__item-title';
                titleEl.textContent = item.title;
                content.appendChild(titleEl);
                if (item.subtitle) {
                    const sub = document.createElement('div');
                    sub.className = 'cmd-palette__item-subtitle';
                    sub.textContent = item.subtitle;
                    content.appendChild(sub);
                }
                el.appendChild(icon);
                el.appendChild(content);
                container.appendChild(el);
                idx++;
            }
        });
    },

    selectNext() {
        if (!this.results.length) return;
        this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
        this.updateSelection();
    },

    selectPrev() {
        if (!this.results.length) return;
        this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
        this.updateSelection();
    },

    updateSelection() {
        document.querySelectorAll('.cmd-palette__item').forEach((el, i) => {
            el.classList.toggle('is-selected', i === this.selectedIndex);
            if (i === this.selectedIndex) el.scrollIntoView({ block: 'nearest' });
        });
    },

    executeSelected() {
        const selected = this.results[this.selectedIndex];
        if (!selected) return;
        this.saveToRecent(selected);
        if (selected.href) {
            selected.href.includes('workhub_') ? (window.location.href = selected.href) : frappe.set_route(selected.href.replace('/app/', ''));
        }
        this.close();
    },

    saveToRecent(item) {
        this.recentSearches = this.recentSearches.filter(r => r.href !== item.href);
        this.recentSearches.unshift({ type: 'recent', title: item.title, subtitle: item.subtitle, href: item.href });
        this.recentSearches = this.recentSearches.slice(0, 5);
        frappe.workhub.setSetting('cmd_palette_recent', this.recentSearches);
    },

    loadRecentSearches() {
        this.recentSearches = frappe.workhub.getSetting('cmd_palette_recent', []);
    },

    attachEventListeners() {
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); this.toggle(); }
            if (e.key === 'Escape' && this.isOpen) { e.preventDefault(); this.close(); }
            if (!this.isOpen) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); this.selectNext(); }
            if (e.key === 'ArrowUp') { e.preventDefault(); this.selectPrev(); }
            if (e.key === 'Enter') { e.preventDefault(); this.executeSelected(); }
        });
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('cmd-palette-backdrop')) this.close();
            const item = e.target.closest('.cmd-palette__item');
            if (item) { this.selectedIndex = parseInt(item.dataset.index, 10); this.executeSelected(); }
        });
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('cmd-palette__input')) this.search(e.target.value);
        });
    }
};

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================
frappe.workhub.shortcuts = {
    bindings: {},
    buffer: '',
    timeout: null,

    init() {
        this.register('g v', () => window.location.href = '/workhub_ventas', 'Ir a Ventas');
        this.register('g o', () => window.location.href = '/workhub_operaciones', 'Ir a Operaciones');
        this.register('g f', () => window.location.href = '/workhub_finanzas', 'Ir a Finanzas');
        this.register('g p', () => window.location.href = '/workhub_produccion', 'Ir a Produccion');
        this.register('g m', () => window.location.href = '/workhub_marketing', 'Ir a Marketing');
        this.register('?', () => this.showHelp(), 'Mostrar atajos');
        this.attachListener();
    },

    register(combo, action, desc) {
        this.bindings[combo] = { action, desc };
    },

    showHelp() {
        const list = Object.entries(this.bindings).map(([k, v]) => k.toUpperCase() + ': ' + v.desc).join('\n');
        frappe.msgprint({ title: 'Atajos de Teclado', message: '<pre>' + list + '\n\nCmd+K: Buscar</pre>', indicator: 'blue' });
    },

    attachListener() {
        document.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => { this.buffer = ''; }, 500);
            this.buffer += (this.buffer ? ' ' : '') + e.key.toLowerCase();
            if (this.bindings[this.buffer]) { e.preventDefault(); this.bindings[this.buffer].action(); this.buffer = ''; }
        });
    }
};

// ==========================================
// INITIALIZATION
// ==========================================
(function initWorkHub() {
    function doInit() {
        // Inicializar sidebar
        if (frappe.workhub && frappe.workhub.sidebar) {
            frappe.workhub.sidebar.init();
        }

        // Inicializar header
        if (frappe.workhub && frappe.workhub.header) {
            frappe.workhub.header.init();
        }

        // Inicializar bottom navigation (Mobile)
        if (frappe.workhub && frappe.workhub.bottomNav) {
            frappe.workhub.bottomNav.init();
        }

        // Inicializar Command Palette (Cmd+K)
        if (frappe.workhub && frappe.workhub.commandPalette) {
            frappe.workhub.commandPalette.init();
        }

        // Inicializar Keyboard Shortcuts
        if (frappe.workhub && frappe.workhub.shortcuts) {
            frappe.workhub.shortcuts.init();
        }
    }

    // Use frappe.ready if available (desk pages), otherwise DOMContentLoaded (www pages)
    if (typeof frappe !== 'undefined' && typeof frappe.ready === 'function') {
        frappe.ready(doInit);
    } else {
        // For www pages, just use DOMContentLoaded - no jQuery dependency
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', doInit);
        } else {
            // DOM already loaded
            doInit();
        }
    }
})();
