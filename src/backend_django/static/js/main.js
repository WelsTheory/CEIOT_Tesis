const CONFIG = {
    DEBUG: true,
    API_BASE_URL: '/api/v1',
    MQTT_BROKER: 'ws://localhost:9001',
    REFRESH_INTERVAL: 30000, // 30 segundos
};

// Utilidades
const Utils = {
    // Formatear fecha
    formatDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Formatear número
    formatNumber(num, decimals = 2) {
        return Number(num).toFixed(decimals);
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Mostrar notificación
    showNotification(message, type = 'info') {
        // Usar sistema de mensajes de Django o crear toast
        const event = new CustomEvent('show-toast', {
            detail: { message, type }
        });
        window.dispatchEvent(event);
    },

    // Copiar al portapapeles
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copiado al portapapeles', 'success');
        } catch (err) {
            console.error('Error al copiar:', err);
            this.showNotification('Error al copiar', 'error');
        }
    },

    // Obtener color por ubicación
    getLocationColor(ubicacion) {
        const colors = {
            'Norte': '#3b82f6',
            'Sur': '#10b981',
            'Este': '#f59e0b',
            'Oeste': '#ef4444'
        };
        return colors[ubicacion] || '#64748b';
    },

    // Obtener estado del módulo
    getModuleStatus(modulo) {
        if (!modulo.conectado) return 'offline';
        if (modulo.alerta) return 'warning';
        return 'online';
    },

    // Log solo en desarrollo
    log(...args) {
        if (CONFIG.DEBUG) {
            console.log('[Debug]', ...args);
        }
    }
};

// Gestión de Sidebar (Mobile)
class SidebarManager {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.getElementById('sidebar-overlay');
        this.toggle = document.getElementById('sidebar-toggle');
        
        this.init();
    }

    init() {
        if (!this.toggle) return;

        this.toggle.addEventListener('click', () => this.toggleSidebar());
        
        // Cerrar al hacer click fuera
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeSidebar());
        }

        // Cerrar con tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.closeSidebar();
            }
        });
    }

    isOpen() {
        return !this.sidebar.classList.contains('-translate-x-full');
    }

    toggleSidebar() {
        if (this.isOpen()) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        this.sidebar.classList.remove('-translate-x-full');
        if (this.overlay) {
            this.overlay.classList.remove('hidden');
        }
    }

    closeSidebar() {
        this.sidebar.classList.add('-translate-x-full');
        if (this.overlay) {
            this.overlay.classList.add('hidden');
        }
    }
}

// Gestión de Estados en Tiempo Real
class RealtimeManager {
    constructor() {
        this.updateInterval = null;
        this.lastUpdate = null;
    }

    start() {
        Utils.log('Iniciando actualizaciones en tiempo real');
        
        // Actualizar inmediatamente
        this.update();
        
        // Actualizar cada 30 segundos
        this.updateInterval = setInterval(() => {
            this.update();
        }, CONFIG.REFRESH_INTERVAL);
    }

    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    async update() {
        try {
            // Disparar evento personalizado para que otros componentes se actualicen
            const event = new CustomEvent('realtime-update', {
                detail: { timestamp: Date.now() }
            });
            window.dispatchEvent(event);
            
            this.lastUpdate = Date.now();
            Utils.log('Actualización completada');
        } catch (error) {
            console.error('Error en actualización:', error);
        }
    }
}

// Gestión de Búsqueda
class SearchManager {
    constructor() {
        this.searchInput = document.querySelector('input[hx-get*="search"]');
        this.init();
    }

    init() {
        if (!this.searchInput) return;

        // Agregar funcionalidad de búsqueda con teclado
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearSearch();
            }
        });
    }

    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.searchInput.dispatchEvent(new Event('input'));
        }
    }
}

// Auto-refresh de datos
class AutoRefresh {
    constructor(selector, url, interval = 30000) {
        this.element = document.querySelector(selector);
        this.url = url;
        this.interval = interval;
        this.timer = null;
    }

    start() {
        if (!this.element) return;

        this.timer = setInterval(() => {
            this.refresh();
        }, this.interval);

        Utils.log(`Auto-refresh iniciado para ${this.url}`);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    async refresh() {
        try {
            const response = await fetch(this.url);
            if (response.ok) {
                const html = await response.text();
                this.element.innerHTML = html;
                Utils.log(`Contenido actualizado: ${this.url}`);
            }
        } catch (error) {
            console.error('Error en auto-refresh:', error);
        }
    }
}

// Confirmación de acciones
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    Utils.log('Aplicación inicializada');

    // Inicializar componentes
    window.sidebarManager = new SidebarManager();
    window.realtimeManager = new RealtimeManager();
    window.searchManager = new SearchManager();

    // Iniciar actualizaciones en tiempo real si estamos en dashboard
    if (document.body.dataset.page === 'dashboard') {
        window.realtimeManager.start();
    }

    // Tooltips
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(el => {
        el.addEventListener('mouseenter', function() {
            const text = this.dataset.tooltip;
            // Implementar tooltip
        });
    });

    // Confirmaciones de formularios
    const confirmForms = document.querySelectorAll('form[data-confirm]');
    confirmForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const message = this.dataset.confirm;
            if (!confirm(message)) {
                e.preventDefault();
            }
        });
    });

    // Auto-hide alerts después de 5 segundos
    const alerts = document.querySelectorAll('.alert[data-auto-hide]');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.transition = 'opacity 0.5s';
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    });
});

// Limpiar cuando se cierra la página
window.addEventListener('beforeunload', function() {
    if (window.realtimeManager) {
        window.realtimeManager.stop();
    }
});

// Exportar utilidades globalmente
window.Utils = Utils;
window.confirmAction = confirmAction;