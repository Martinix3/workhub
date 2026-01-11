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

        // Create backdrop for mobile (if not exists)
        if (!document.querySelector('.wh-sidebar-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.className = 'wh-sidebar-backdrop';
            document.body.appendChild(backdrop);

            // Add click listener to close sidebar
            backdrop.addEventListener('click', () => {
                if (frappe.workhub.bottomNav) {
                    frappe.workhub.bottomNav.closeMobileSidebar();
                }
            });
        }
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
// HEADER COMPONENT
// ==========================================
frappe.workhub.header = {
    init() {
        this.render();
        this.attachEventListeners();
        this.updateBreadcrumbs();
        this.setupRealtimeNotifications();
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
                    this.markAllNotificationsRead();
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
    },

    setupRealtimeNotifications() {
        // Obtener notificaciones iniciales
        frappe.call({
            method: 'frappe.desk.doctype.notification_log.notification_log.get_notification_logs',
            args: {
                limit: 20
            },
            callback: (r) => {
                if (r.message) {
                    // API returns {notification_logs: [...]} or direct array
                    const notifications = r.message.notification_logs || r.message || [];
                    this.loadNotifications(Array.isArray(notifications) ? notifications : []);
                }
            }
        });

        // Escuchar nuevas notificaciones
        frappe.realtime.on('notification', (data) => {
            this.addNotification(data);
            this.updateNotificationCount(this.getUnreadCount() + 1);
        });
    },

    loadNotifications(notifications) {
        const list = document.querySelector('.wh-notifications-list');
        if (!list) return;

        // Limpiar
        list.innerHTML = '';

        if (!notifications || notifications.length === 0) {
            list.innerHTML = '<div class="wh-notifications-empty">No tienes notificaciones</div>';
            this.updateNotificationCount(0);
            return;
        }

        // Renderizar notificaciones
        notifications.forEach(notif => {
            this.addNotification(notif, false);
        });

        // Actualizar count
        const unreadCount = notifications.filter(n => !n.read).length;
        this.updateNotificationCount(unreadCount);
    },

    addNotification(notification, prepend = true) {
        const list = document.querySelector('.wh-notifications-list');
        if (!list) return;

        // Remove empty message
        const empty = list.querySelector('.wh-notifications-empty');
        if (empty) empty.remove();

        // Add notification
        const item = document.createElement('div');
        item.className = 'wh-notification-item' + (notification.read ? '' : ' unread');
        item.innerHTML = `
            <div class="wh-notification-title">${notification.subject || 'Notificación'}</div>
            <div class="wh-notification-message">${notification.email_content || notification.document_name || ''}</div>
            <div class="wh-notification-time">${frappe.datetime.comment_when(notification.creation || new Date())}</div>
        `;

        if (prepend) {
            list.insertBefore(item, list.firstChild);
        } else {
            list.appendChild(item);
        }
    },

    getUnreadCount() {
        const items = document.querySelectorAll('.wh-notification-item.unread');
        return items.length;
    },

    updateNotificationCount(count) {
        const badge = document.querySelector('.wh-notification-badge');
        if (!badge) return;

        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    },

    markAllNotificationsRead() {
        frappe.call({
            method: 'frappe.desk.doctype.notification_log.notification_log.mark_all_as_read',
            callback: () => {
                document.querySelectorAll('.wh-notification-item.unread').forEach(item => {
                    item.classList.remove('unread');
                });
                this.updateNotificationCount(0);
            }
        });
    }
};

// ==========================================
// MOBILE GESTURES (Swipe Support)
// ==========================================
frappe.workhub.mobileGestures = {
    touchStartX: 0,
    touchStartY: 0,
    touchCurrentX: 0,
    touchCurrentY: 0,
    touchStartTime: 0,
    isSwiping: false,
    swipeDirection: null,
    edgeSwipeThreshold: 50, // pixels from edge to trigger edge swipe
    minSwipeDistance: 80, // minimum distance to complete swipe
    maxSwipeTime: 500, // maximum time for a swipe gesture (ms)
    velocityThreshold: 0.3, // minimum velocity (px/ms)

    init() {
        // Only enable on touch devices
        if (!('ontouchstart' in window)) {
            return;
        }

        this.attachEventListeners();
    },

    attachEventListeners() {
        // Touch start
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });

        // Touch move - not passive because we may need to prevent scroll
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });

        // Touch end
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });

        // Touch cancel
        document.addEventListener('touchcancel', (e) => this.handleTouchCancel(e), { passive: true });
    },

    handleTouchStart(e) {
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchCurrentX = touch.clientX;
        this.touchCurrentY = touch.clientY;
        this.touchStartTime = Date.now();
        this.isSwiping = false;
        this.swipeDirection = null;
    },

    handleTouchMove(e) {
        if (!e.touches || e.touches.length === 0) return;

        const touch = e.touches[0];
        this.touchCurrentX = touch.clientX;
        this.touchCurrentY = touch.clientY;

        const deltaX = this.touchCurrentX - this.touchStartX;
        const deltaY = this.touchCurrentY - this.touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Determine if this is a horizontal or vertical swipe
        if (!this.isSwiping && (absDeltaX > 10 || absDeltaY > 10)) {
            // Determine swipe direction based on which delta is larger
            if (absDeltaX > absDeltaY) {
                // Horizontal swipe
                this.swipeDirection = 'horizontal';
                this.isSwiping = true;
            } else {
                // Vertical swipe - let it scroll normally
                this.swipeDirection = 'vertical';
                return;
            }
        }

        // Only handle horizontal swipes
        if (this.swipeDirection !== 'horizontal') {
            return;
        }

        const sidebar = document.querySelector('.wh-sidebar');
        const isSidebarOpen = sidebar && sidebar.classList.contains('mobile-open');

        // Check if this is an edge swipe (from left edge) to open sidebar
        const isEdgeSwipe = this.touchStartX <= this.edgeSwipeThreshold;

        if (isEdgeSwipe && !isSidebarOpen && deltaX > 0) {
            // Swipe right from edge to open
            e.preventDefault(); // Prevent scrolling during swipe
            this.updateSidebarPosition(deltaX, false);
        } else if (isSidebarOpen && deltaX < 0) {
            // Swipe left to close
            e.preventDefault(); // Prevent scrolling during swipe
            this.updateSidebarPosition(deltaX, true);
        }
    },

    handleTouchEnd(e) {
        if (!this.isSwiping || this.swipeDirection !== 'horizontal') {
            this.resetSwipe();
            return;
        }

        const deltaX = this.touchCurrentX - this.touchStartX;
        const deltaY = this.touchCurrentY - this.touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const distance = Math.abs(deltaX);
        const duration = Date.now() - this.touchStartTime;
        const velocity = distance / duration;

        const sidebar = document.querySelector('.wh-sidebar');
        const isSidebarOpen = sidebar && sidebar.classList.contains('mobile-open');
        const isEdgeSwipe = this.touchStartX <= this.edgeSwipeThreshold;

        // Determine if swipe should complete
        const shouldComplete = distance >= this.minSwipeDistance || velocity >= this.velocityThreshold;

        if (isEdgeSwipe && !isSidebarOpen && deltaX > 0 && shouldComplete) {
            // Complete open swipe
            this.completeSidebarOpen();
        } else if (isSidebarOpen && deltaX < 0 && shouldComplete) {
            // Complete close swipe
            this.completeSidebarClose();
        } else {
            // Cancel swipe - return to original state
            this.cancelSwipe(isSidebarOpen);
        }

        this.resetSwipe();
    },

    handleTouchCancel(e) {
        const sidebar = document.querySelector('.wh-sidebar');
        const isSidebarOpen = sidebar && sidebar.classList.contains('mobile-open');
        this.cancelSwipe(isSidebarOpen);
        this.resetSwipe();
    },

    updateSidebarPosition(deltaX, isClosing) {
        const sidebar = document.querySelector('.wh-sidebar');
        if (!sidebar) return;

        // Add swiping class to disable transitions
        sidebar.classList.add('swiping');

        if (isClosing) {
            // Closing: translate from 0 to -100%
            // Clamp deltaX to not go beyond 0 (right)
            const translateX = Math.min(0, deltaX);
            sidebar.style.transform = `translateX(${translateX}px)`;
        } else {
            // Opening: translate from -100% to 0
            // Start at -256px (sidebar width) and add deltaX
            const sidebarWidth = 256;
            const translateX = Math.max(-sidebarWidth, -sidebarWidth + deltaX);
            sidebar.style.transform = `translateX(${translateX}px)`;
        }

        // Update backdrop opacity based on position
        this.updateBackdropOpacity(deltaX, isClosing);
    },

    updateBackdropOpacity(deltaX, isClosing) {
        const backdrop = document.querySelector('.wh-sidebar-backdrop');
        if (!backdrop) return;

        const sidebarWidth = 256;
        let opacity;

        if (isClosing) {
            // When closing, opacity decreases as we swipe left
            const progress = Math.abs(deltaX) / sidebarWidth;
            opacity = Math.max(0, 1 - progress);
        } else {
            // When opening, opacity increases as we swipe right
            const progress = Math.abs(deltaX) / sidebarWidth;
            opacity = Math.min(1, progress);
        }

        backdrop.style.opacity = opacity.toString();

        // Show backdrop during swipe
        if (!backdrop.classList.contains('active')) {
            backdrop.style.display = 'block';
        }
    },

    completeSidebarOpen() {
        const sidebar = document.querySelector('.wh-sidebar');
        const backdrop = document.querySelector('.wh-sidebar-backdrop');

        if (sidebar) {
            sidebar.classList.remove('swiping');
            sidebar.style.transform = '';
            sidebar.classList.add('mobile-open');
        }

        if (backdrop) {
            backdrop.classList.add('active');
            backdrop.style.opacity = '';
            backdrop.style.display = '';
        }
    },

    completeSidebarClose() {
        const sidebar = document.querySelector('.wh-sidebar');
        const backdrop = document.querySelector('.wh-sidebar-backdrop');

        if (sidebar) {
            sidebar.classList.remove('swiping');
            sidebar.style.transform = '';
            sidebar.classList.remove('mobile-open');
        }

        if (backdrop) {
            backdrop.classList.remove('active');
            backdrop.style.opacity = '';
            backdrop.style.display = '';
        }
    },

    cancelSwipe(wasOpen) {
        const sidebar = document.querySelector('.wh-sidebar');
        const backdrop = document.querySelector('.wh-sidebar-backdrop');

        if (sidebar) {
            sidebar.classList.remove('swiping');
            sidebar.style.transform = '';

            // Return to original state
            if (wasOpen) {
                sidebar.classList.add('mobile-open');
            } else {
                sidebar.classList.remove('mobile-open');
            }
        }

        if (backdrop) {
            backdrop.style.opacity = '';

            if (wasOpen) {
                backdrop.classList.add('active');
            } else {
                backdrop.classList.remove('active');
                backdrop.style.display = '';
            }
        }
    },

    resetSwipe() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchCurrentX = 0;
        this.touchCurrentY = 0;
        this.touchStartTime = 0;
        this.isSwiping = false;
        this.swipeDirection = null;
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
        const backdrop = document.querySelector('.wh-sidebar-backdrop');

        if (sidebar) {
            sidebar.classList.add('mobile-open');
        }
        if (overlay) {
            overlay.classList.add('active');
        }
        if (backdrop) {
            backdrop.classList.add('active');
        }
    },

    /**
     * Close mobile sidebar
     */
    closeMobileSidebar() {
        const sidebar = document.querySelector('.wh-sidebar');
        const overlay = document.querySelector('.wh-mobile-overlay');
        const backdrop = document.querySelector('.wh-sidebar-backdrop');

        if (sidebar) {
            sidebar.classList.remove('mobile-open');
        }
        if (overlay) {
            overlay.classList.remove('active');
        }
        if (backdrop) {
            backdrop.classList.remove('active');
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
// TASK STATE MANAGEMENT
// ==========================================
frappe.workhub.taskManager = {
    /**
     * Update task status in Leantime (SSOT for tasks)
     *
     * @param {string} taskId - Leantime task ID
     * @param {string} status - New status (BACKLOG, NEXT, DOING, BLOCKED, DONE)
     * @returns {Promise}
     */
    updateTaskStatus(taskId, status) {
        return new Promise((resolve, reject) => {
            if (!taskId) {
                reject(new Error('Task ID is required'));
                return;
            }

            // Call Frappe backend method which will sync to Leantime
            frappe.call({
                method: 'workhub_frappe_app.api.tasks.update_task_status',
                args: {
                    task_id: taskId,
                    status: status
                },
                callback: (response) => {
                    if (response.message && response.message.success) {
                        resolve(response.message);
                    } else {
                        reject(new Error(response.message?.error || 'Failed to update task status'));
                    }
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    },

    /**
     * Mark task as complete (sets status to DONE)
     *
     * @param {HTMLElement} taskElement - Task DOM element
     * @returns {Promise}
     */
    async completeTask(taskElement) {
        const taskId = taskElement.dataset.taskId || taskElement.getAttribute('data-task-id');

        if (!taskId) {
            console.warn('Task element missing data-task-id attribute:', taskElement);
            frappe.show_alert({
                message: __('Task ID not found'),
                indicator: 'red'
            }, 3);
            return;
        }

        try {
            await this.updateTaskStatus(taskId, 'DONE');

            // Show success notification
            frappe.show_alert({
                message: __('Task marked as complete'),
                indicator: 'green'
            }, 3);

            // Emit event for other components to listen to
            frappe.ui.trigger('task:completed', {
                taskId: taskId,
                element: taskElement
            });

        } catch (error) {
            console.error('Failed to complete task:', error);

            frappe.show_alert({
                message: __('Failed to complete task: {0}', [error.message]),
                indicator: 'red'
            }, 5);

            // Re-add the task element if it was removed
            throw error;
        }
    },

    /**
     * Delete/archive task
     *
     * @param {HTMLElement} taskElement - Task DOM element
     * @returns {Promise}
     */
    async deleteTask(taskElement) {
        const taskId = taskElement.dataset.taskId || taskElement.getAttribute('data-task-id');

        if (!taskId) {
            console.warn('Task element missing data-task-id attribute:', taskElement);
            frappe.show_alert({
                message: __('Task ID not found'),
                indicator: 'red'
            }, 3);
            return;
        }

        try {
            // Call Frappe backend method to delete/archive task
            await new Promise((resolve, reject) => {
                frappe.call({
                    method: 'workhub_frappe_app.api.tasks.delete_task',
                    args: {
                        task_id: taskId
                    },
                    callback: (response) => {
                        if (response.message && response.message.success) {
                            resolve(response.message);
                        } else {
                            reject(new Error(response.message?.error || 'Failed to delete task'));
                        }
                    },
                    error: (error) => {
                        reject(error);
                    }
                });
            });

            // Show success notification
            frappe.show_alert({
                message: __('Task archived'),
                indicator: 'orange'
            }, 3);

            // Emit event for other components
            frappe.ui.trigger('task:deleted', {
                taskId: taskId,
                element: taskElement
            });

        } catch (error) {
            console.error('Failed to delete task:', error);

            frappe.show_alert({
                message: __('Failed to archive task: {0}', [error.message]),
                indicator: 'red'
            }, 5);

            // Re-add the task element if it was removed
            throw error;
        }
    }
};

// ==========================================
// SWIPEABLE TASKS INITIALIZATION
// ==========================================
frappe.workhub.swipeableTasks = {
    instances: [],

    /**
     * Initialize swipeable task gestures on all task elements
     */
    init() {
        // Only initialize on touch devices
        if (!('ontouchstart' in window)) {
            return;
        }

        // Initialize all existing swipeable tasks
        this.initializeAll();

        // Re-initialize when new tasks are added to the DOM
        this.observeTaskChanges();
    },

    /**
     * Initialize all swipeable task elements on the current page
     */
    initializeAll() {
        if (!frappe.workhub.SwipeableTask) {
            console.warn('SwipeableTask component not loaded');
            return;
        }

        // Default configuration for task swipe gestures
        const options = {
            threshold: 0.3,
            minSwipeDistance: 80,
            velocityThreshold: 0.3,
            onComplete: (element) => {
                // Handle swipe right to complete
                frappe.workhub.taskManager.completeTask(element).catch((error) => {
                    // If task completion fails, we need to restore the element
                    // since SwipeableTask removes it on completion
                    console.error('Task completion failed, but element already removed:', error);
                });
            },
            onDelete: (element) => {
                // Handle swipe left to delete/archive
                frappe.workhub.taskManager.deleteTask(element).catch((error) => {
                    // If task deletion fails, restore the element
                    console.error('Task deletion failed, but element already removed:', error);
                });
            }
        };

        // Initialize all tasks with the .wh-swipeable-task class
        const instances = frappe.workhub.SwipeableTask.initializeAll('.wh-swipeable-task', options);
        this.instances.push(...instances);

        if (instances.length > 0) {
            console.log(`Initialized ${instances.length} swipeable task(s)`);
        }
    },

    /**
     * Observe DOM changes to initialize swipeable tasks dynamically
     */
    observeTaskChanges() {
        // Use MutationObserver to detect when new tasks are added
        const observer = new MutationObserver((mutations) => {
            let hasNewTasks = false;

            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    // Check if the added node is a task or contains tasks
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList && node.classList.contains('wh-swipeable-task')) {
                            hasNewTasks = true;
                        } else if (node.querySelectorAll) {
                            const tasks = node.querySelectorAll('.wh-swipeable-task');
                            if (tasks.length > 0) {
                                hasNewTasks = true;
                            }
                        }
                    }
                });
            });

            // Re-initialize if new tasks were added
            if (hasNewTasks) {
                this.initializeAll();
            }
        });

        // Start observing the document body for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.observer = observer;
    },

    /**
     * Destroy all swipeable task instances
     */
    destroy() {
        if (frappe.workhub.SwipeableTask) {
            frappe.workhub.SwipeableTask.destroyAll();
        }

        this.instances = [];

        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    },

    /**
     * Refresh swipeable tasks (destroy and re-initialize)
     */
    refresh() {
        this.destroy();
        this.initializeAll();
    }
};

// ==========================================
// SERVICE WORKER (PWA)
// ==========================================
frappe.workhub.serviceWorker = {
    registration: null,
    updateAvailable: false,

    /**
     * Initialize and register service worker
     */
    init() {
        // Check if service workers are supported
        if (!('serviceWorker' in navigator)) {
            console.log('[SW] Service workers not supported in this browser');
            return;
        }

        // Register service worker
        this.register();

        // Listen for online/offline events
        this.setupConnectivityListeners();
    },

    /**
     * Register the service worker
     */
    async register() {
        try {
            console.log('[SW] Registering service worker...');

            // Register service worker at /assets/workhub_frappe_app/sw.js
            const registration = await navigator.serviceWorker.register(
                '/assets/workhub_frappe_app/sw.js',
                {
                    scope: '/'
                }
            );

            this.registration = registration;

            console.log('[SW] Service worker registered successfully:', registration.scope);

            // Check for updates on page load
            registration.update();

            // Listen for service worker updates
            registration.addEventListener('updatefound', () => {
                this.handleUpdateFound(registration);
            });

            // Check if service worker is already controlling the page
            if (navigator.serviceWorker.controller) {
                console.log('[SW] Service worker is controlling the page');
            }

            // Listen for controller changes (when a new service worker activates)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[SW] Controller changed - page will reload');
                // Reload the page to get latest content
                window.location.reload();
            });

            // Check for updates periodically (every 60 minutes)
            setInterval(() => {
                registration.update();
            }, 60 * 60 * 1000);

        } catch (error) {
            console.error('[SW] Service worker registration failed:', error);
        }
    },

    /**
     * Handle service worker update found
     * @param {ServiceWorkerRegistration} registration
     */
    handleUpdateFound(registration) {
        const newWorker = registration.installing;

        if (!newWorker) {
            return;
        }

        console.log('[SW] New service worker found, installing...');

        newWorker.addEventListener('statechange', () => {
            console.log('[SW] Service worker state changed:', newWorker.state);

            // When the new service worker is installed and waiting
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is waiting to activate
                this.updateAvailable = true;
                this.showUpdateNotification();
            }
        });
    },

    /**
     * Show update notification to user
     */
    showUpdateNotification() {
        console.log('[SW] Update available - showing notification');

        // Use Frappe's alert system to notify user
        frappe.show_alert({
            message: __('A new version of WorkHub is available!'),
            indicator: 'blue',
            action: {
                label: __('Update Now'),
                callback: () => {
                    this.activateUpdate();
                }
            }
        }, 0); // 0 = don't auto-dismiss

        // Also emit event for offline indicator component
        frappe.ui.trigger('sw:update-available', {
            registration: this.registration
        });
    },

    /**
     * Activate the waiting service worker
     */
    activateUpdate() {
        if (!this.registration || !this.registration.waiting) {
            console.log('[SW] No service worker waiting to activate');
            return;
        }

        console.log('[SW] Activating new service worker...');

        // Send message to service worker to skip waiting
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

        // The controllerchange event listener will reload the page
    },

    /**
     * Setup connectivity listeners for online/offline detection
     */
    setupConnectivityListeners() {
        // Online event
        window.addEventListener('online', () => {
            console.log('[SW] Network connection restored');

            frappe.show_alert({
                message: __('You are back online'),
                indicator: 'green'
            }, 3);

            // Emit event for offline indicator
            frappe.ui.trigger('connectivity:online');
        });

        // Offline event
        window.addEventListener('offline', () => {
            console.log('[SW] Network connection lost');

            frappe.show_alert({
                message: __('You are offline - some features may be limited'),
                indicator: 'orange'
            }, 5);

            // Emit event for offline indicator
            frappe.ui.trigger('connectivity:offline');
        });

        // Log current connectivity status
        console.log('[SW] Initial connectivity status:', navigator.onLine ? 'online' : 'offline');
    },

    /**
     * Check if app is currently online
     * @returns {boolean}
     */
    isOnline() {
        return navigator.onLine;
    },

    /**
     * Unregister service worker (for development/debugging)
     */
    async unregister() {
        if (!this.registration) {
            console.log('[SW] No service worker registered');
            return;
        }

        try {
            const success = await this.registration.unregister();
            if (success) {
                console.log('[SW] Service worker unregistered successfully');
                this.registration = null;
            } else {
                console.log('[SW] Service worker unregister failed');
            }
        } catch (error) {
            console.error('[SW] Error unregistering service worker:', error);
        }
    },

    /**
     * Clear all caches (for development/debugging)
     */
    async clearCache() {
        try {
            const cacheNames = await caches.keys();
            const workhubCaches = cacheNames.filter(name => name.startsWith('workhub-'));

            await Promise.all(
                workhubCaches.map(cacheName => {
                    console.log('[SW] Deleting cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );

            console.log('[SW] All WorkHub caches cleared');

            frappe.show_alert({
                message: __('Cache cleared successfully'),
                indicator: 'green'
            }, 3);

        } catch (error) {
            console.error('[SW] Error clearing cache:', error);
        }
    },

    /**
     * Get cache size (for debugging)
     */
    async getCacheSize() {
        if (!this.registration || !this.registration.active) {
            console.log('[SW] No active service worker');
            return 0;
        }

        try {
            const cacheNames = await caches.keys();
            let totalSize = 0;

            for (const cacheName of cacheNames) {
                if (cacheName.startsWith('workhub-')) {
                    const cache = await caches.open(cacheName);
                    const keys = await cache.keys();
                    totalSize += keys.length;
                }
            }

            console.log('[SW] Total cached items:', totalSize);
            return totalSize;

        } catch (error) {
            console.error('[SW] Error getting cache size:', error);
            return 0;
        }
    }
};

// ==========================================
// OFFLINE INDICATOR (PWA)
// ==========================================
frappe.workhub.offlineIndicator = {
    indicator: null,
    autoHideTimeout: null,
    autoHideDelay: 5000, // Auto-hide online status after 5 seconds

    /**
     * Initialize offline indicator component
     */
    init() {
        console.log('[Offline Indicator] Initializing...');

        // Create indicator DOM element
        this.createIndicator();

        // Listen to connectivity events from service worker
        this.setupEventListeners();

        // Set initial state
        this.updateStatus(navigator.onLine);

        console.log('[Offline Indicator] Initialized');
    },

    /**
     * Create the indicator DOM element and inject into page
     */
    createIndicator() {
        // Check if indicator already exists
        if (document.querySelector('.wh-offline-indicator')) {
            console.log('[Offline Indicator] Already exists');
            return;
        }

        // Create indicator element
        const indicator = document.createElement('div');
        indicator.className = 'wh-offline-indicator';
        indicator.setAttribute('role', 'status');
        indicator.setAttribute('aria-live', 'polite');

        // Create status dot
        const dot = document.createElement('span');
        dot.className = 'wh-offline-indicator__dot';
        dot.setAttribute('aria-hidden', 'true');

        // Create status text
        const text = document.createElement('span');
        text.className = 'wh-offline-indicator__text';
        text.textContent = navigator.onLine ? 'Online' : 'Offline';

        // Assemble indicator
        indicator.appendChild(dot);
        indicator.appendChild(text);

        // Inject into page
        document.body.appendChild(indicator);

        // Store reference
        this.indicator = indicator;

        console.log('[Offline Indicator] DOM element created');
    },

    /**
     * Setup event listeners for connectivity changes
     */
    setupEventListeners() {
        // Listen to custom connectivity events from service worker
        frappe.ui.on('connectivity:online', () => {
            console.log('[Offline Indicator] Received online event');
            this.updateStatus(true);
        });

        frappe.ui.on('connectivity:offline', () => {
            console.log('[Offline Indicator] Received offline event');
            this.updateStatus(false);
        });

        // Also listen to native events as fallback
        window.addEventListener('online', () => {
            console.log('[Offline Indicator] Native online event');
            this.updateStatus(true);
        });

        window.addEventListener('offline', () => {
            console.log('[Offline Indicator] Native offline event');
            this.updateStatus(false);
        });

        console.log('[Offline Indicator] Event listeners registered');
    },

    /**
     * Update indicator status
     * @param {boolean} isOnline - Whether the app is online
     */
    updateStatus(isOnline) {
        if (!this.indicator) {
            console.warn('[Offline Indicator] Indicator not initialized');
            return;
        }

        // Clear any pending auto-hide timeout
        if (this.autoHideTimeout) {
            clearTimeout(this.autoHideTimeout);
            this.autoHideTimeout = null;
        }

        // Update indicator classes
        this.indicator.classList.remove('online', 'offline');
        this.indicator.classList.add(isOnline ? 'online' : 'offline');

        // Update text
        const textElement = this.indicator.querySelector('.wh-offline-indicator__text');
        if (textElement) {
            textElement.textContent = isOnline ? 'Online' : 'Offline';
        }

        // Show indicator
        this.show();

        // Auto-hide online status after delay (keep offline visible)
        if (isOnline) {
            this.autoHideTimeout = setTimeout(() => {
                this.hide();
            }, this.autoHideDelay);
        }

        console.log('[Offline Indicator] Status updated:', isOnline ? 'online' : 'offline');
    },

    /**
     * Show the indicator
     */
    show() {
        if (!this.indicator) return;

        // Add visible class to trigger slide-down animation
        this.indicator.classList.add('visible');
    },

    /**
     * Hide the indicator
     */
    hide() {
        if (!this.indicator) return;

        // Remove visible class to trigger slide-up animation
        this.indicator.classList.remove('visible');
    },

    /**
     * Check if indicator is currently visible
     * @returns {boolean}
     */
    isVisible() {
        return this.indicator && this.indicator.classList.contains('visible');
    },

    /**
     * Destroy the indicator (for cleanup)
     */
    destroy() {
        if (this.autoHideTimeout) {
            clearTimeout(this.autoHideTimeout);
            this.autoHideTimeout = null;
        }

        if (this.indicator) {
            this.indicator.remove();
            this.indicator = null;
        }

        console.log('[Offline Indicator] Destroyed');
    }
};

// ==========================================
// TASK EDITOR (MOBILE)
// ==========================================

/**
 * Task Editor Module
 *
 * Handles task editing on mobile via drawer interface.
 * Integrates with MobileTaskDrawer component for edit functionality.
 *
 * Features:
 * - Click/tap on task to open edit drawer
 * - Extracts task data from DOM element
 * - Opens MobileTaskDrawer in edit mode
 * - Handles task updates and UI refresh
 * - Works with existing task list rendering
 */
frappe.workhub.taskEditor = {
    /**
     * Initialize task editor
     */
    init() {
        console.log('[Task Editor] Initializing...');

        // Load MobileTaskDrawer component dynamically
        this.loadComponent();

        console.log('[Task Editor] Initialized');
    },

    /**
     * Load MobileTaskDrawer component dynamically
     */
    loadComponent() {
        // Check if already loaded
        if (frappe.workhub.MobileTaskDrawer) {
            console.log('[Task Editor] MobileTaskDrawer already loaded');
            this.setupTaskClickHandlers();
            return;
        }

        // Check if script is already loading
        const existingScript = document.querySelector('script[src*="mobile-task-drawer.js"]');
        if (existingScript) {
            console.log('[Task Editor] MobileTaskDrawer script already loading');
            this.waitForComponent();
            return;
        }

        // Load component script
        console.log('[Task Editor] Loading MobileTaskDrawer component...');
        const script = document.createElement('script');
        script.src = '/assets/workhub_frappe_app/js/components/mobile-task-drawer.js';
        script.async = true;
        script.onload = () => {
            console.log('[Task Editor] MobileTaskDrawer component script loaded');
            this.waitForComponent();
        };
        script.onerror = (error) => {
            console.error('[Task Editor] Failed to load MobileTaskDrawer component:', error);
        };
        document.head.appendChild(script);
    },

    /**
     * Wait for MobileTaskDrawer component to be available
     */
    waitForComponent() {
        const checkInterval = setInterval(() => {
            if (frappe.workhub.MobileTaskDrawer) {
                clearInterval(checkInterval);
                console.log('[Task Editor] MobileTaskDrawer component ready');
                this.setupTaskClickHandlers();
            }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!frappe.workhub.MobileTaskDrawer) {
                console.warn('[Task Editor] MobileTaskDrawer component not available after timeout');
            }
        }, 10000);
    },

    /**
     * Setup click handlers for tasks
     */
    setupTaskClickHandlers() {
        console.log('[Task Editor] Setting up task click handlers...');

        // Use event delegation for dynamically added tasks
        document.addEventListener('click', (e) => {
            // Find closest task element
            const taskElement = e.target.closest('[data-task-id]');

            if (!taskElement) return;

            // Skip if clicking on action buttons (complete, delete, etc.)
            if (e.target.closest('.task-action, .task-complete-btn, .task-delete-btn')) {
                return;
            }

            // Skip if clicking on swipeable task during swipe
            if (taskElement.classList.contains('swiping')) {
                return;
            }

            // Get task data
            const taskData = this.extractTaskData(taskElement);

            if (taskData && taskData.id) {
                console.log('[Task Editor] Opening edit drawer for task:', taskData.id);
                this.openEditDrawer(taskData);
            }
        });

        // Also observe DOM for new tasks and add explicit handlers
        this.observeTaskList();

        console.log('[Task Editor] Task click handlers ready');
    },

    /**
     * Observe task list for dynamically added tasks
     */
    observeTaskList() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    // Check if added node is a task or contains tasks
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const tasks = node.matches && node.matches('[data-task-id]')
                            ? [node]
                            : node.querySelectorAll('[data-task-id]');

                        if (tasks.length > 0) {
                            console.log(`[Task Editor] ${tasks.length} new task(s) detected`);
                        }
                    }
                });
            });
        });

        // Start observing document body for task additions
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('[Task Editor] DOM observer started');
    },

    /**
     * Extract task data from DOM element
     * @param {HTMLElement} taskElement - Task element
     * @returns {Object} Task data object
     */
    extractTaskData(taskElement) {
        try {
            const taskData = {
                id: taskElement.dataset.taskId || taskElement.getAttribute('data-task-id'),
                name: '',
                description: '',
                status: 'BACKLOG',
                priority: 'P2',
                department: 'SALES',
                dueDate: null,
                assignedTo: null
            };

            // Extract task name
            const nameElement = taskElement.querySelector('.task-name, .task-title, [data-task-name]');
            if (nameElement) {
                taskData.name = nameElement.textContent.trim() || nameElement.dataset.taskName;
            }

            // Extract description
            const descElement = taskElement.querySelector('.task-description, .task-desc, [data-task-description]');
            if (descElement) {
                taskData.description = descElement.textContent.trim() || descElement.dataset.taskDescription || '';
            }

            // Extract status
            const statusElement = taskElement.querySelector('[data-task-status]');
            if (statusElement) {
                taskData.status = statusElement.dataset.taskStatus || taskData.status;
            } else if (taskElement.dataset.taskStatus) {
                taskData.status = taskElement.dataset.taskStatus;
            }

            // Extract priority
            const priorityElement = taskElement.querySelector('[data-task-priority]');
            if (priorityElement) {
                taskData.priority = priorityElement.dataset.taskPriority || taskData.priority;
            } else if (taskElement.dataset.taskPriority) {
                taskData.priority = taskElement.dataset.taskPriority;
            }

            // Extract department
            const deptElement = taskElement.querySelector('[data-task-department]');
            if (deptElement) {
                taskData.department = deptElement.dataset.taskDepartment || taskData.department;
            } else if (taskElement.dataset.taskDepartment) {
                taskData.department = taskElement.dataset.taskDepartment;
            }

            // Extract due date
            const dueDateElement = taskElement.querySelector('[data-task-due-date]');
            if (dueDateElement) {
                taskData.dueDate = dueDateElement.dataset.taskDueDate || null;
            } else if (taskElement.dataset.taskDueDate) {
                taskData.dueDate = taskElement.dataset.taskDueDate;
            }

            // Extract assigned to
            const assignedElement = taskElement.querySelector('[data-task-assigned]');
            if (assignedElement) {
                taskData.assignedTo = assignedElement.dataset.taskAssigned || null;
            } else if (taskElement.dataset.taskAssigned) {
                taskData.assignedTo = taskElement.dataset.taskAssigned;
            }

            return taskData;
        } catch (error) {
            console.error('[Task Editor] Error extracting task data:', error);
            return null;
        }
    },

    /**
     * Open edit drawer for task
     * @param {Object} taskData - Task data object
     */
    openEditDrawer(taskData) {
        if (!frappe.workhub.MobileTaskDrawer) {
            console.error('[Task Editor] MobileTaskDrawer component not available');
            frappe.show_alert({
                message: __('Task editor not available. Please refresh the page.'),
                indicator: 'red'
            }, 3);
            return;
        }

        try {
            // Open edit drawer
            frappe.workhub.MobileTaskDrawer.openEditTaskDrawer(taskData, {
                onSave: (updatedTask) => {
                    console.log('[Task Editor] Task updated:', updatedTask);
                    // Refresh task list or update specific task in DOM
                    this.refreshTaskInList(updatedTask);
                },
                onCancel: () => {
                    console.log('[Task Editor] Edit cancelled');
                }
            });
        } catch (error) {
            console.error('[Task Editor] Error opening edit drawer:', error);
            frappe.show_alert({
                message: __('Failed to open task editor. Please try again.'),
                indicator: 'red'
            }, 3);
        }
    },

    /**
     * Refresh task in list after update
     * @param {Object} updatedTask - Updated task data
     */
    refreshTaskInList(updatedTask) {
        if (!updatedTask || !updatedTask.id) return;

        // Find task element by ID
        const taskElement = document.querySelector(`[data-task-id="${updatedTask.id}"]`);

        if (!taskElement) {
            console.warn('[Task Editor] Task element not found for refresh:', updatedTask.id);
            // Trigger a full list refresh event
            frappe.ui.trigger_event('task:list:refresh');
            return;
        }

        // Update task element data attributes
        if (updatedTask.status) {
            taskElement.dataset.taskStatus = updatedTask.status;
            const statusElement = taskElement.querySelector('[data-task-status]');
            if (statusElement) {
                statusElement.dataset.taskStatus = updatedTask.status;
                statusElement.textContent = updatedTask.status;
            }
        }

        if (updatedTask.priority) {
            taskElement.dataset.taskPriority = updatedTask.priority;
            const priorityElement = taskElement.querySelector('[data-task-priority]');
            if (priorityElement) {
                priorityElement.dataset.taskPriority = updatedTask.priority;
                priorityElement.textContent = updatedTask.priority;
            }
        }

        // Update task name
        if (updatedTask.name) {
            const nameElement = taskElement.querySelector('.task-name, .task-title, [data-task-name]');
            if (nameElement) {
                nameElement.textContent = updatedTask.name;
                nameElement.dataset.taskName = updatedTask.name;
            }
        }

        // Update description
        if (updatedTask.description !== undefined) {
            const descElement = taskElement.querySelector('.task-description, .task-desc, [data-task-description]');
            if (descElement) {
                descElement.textContent = updatedTask.description;
                descElement.dataset.taskDescription = updatedTask.description;
            }
        }

        console.log('[Task Editor] Task element refreshed:', updatedTask.id);

        // Trigger refresh event for other components
        frappe.ui.trigger_event('task:updated', updatedTask);
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

        // Inicializar mobile gestures (swipe support)
        if (frappe.workhub && frappe.workhub.mobileGestures) {
            frappe.workhub.mobileGestures.init();
        }

        // Inicializar swipeable tasks (mobile task gestures)
        if (frappe.workhub && frappe.workhub.swipeableTasks) {
            frappe.workhub.swipeableTasks.init();
        }

        // Inicializar Service Worker (PWA)
        if (frappe.workhub && frappe.workhub.serviceWorker) {
            frappe.workhub.serviceWorker.init();
        }

        // Inicializar Offline Indicator (PWA)
        if (frappe.workhub && frappe.workhub.offlineIndicator) {
            frappe.workhub.offlineIndicator.init();
        }

        // Inicializar Task Editor (Mobile task editing)
        if (frappe.workhub && frappe.workhub.taskEditor) {
            frappe.workhub.taskEditor.init();
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
