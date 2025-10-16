document.addEventListener('alpine:init', () => {
    
    // Store para el estado de la aplicación
    Alpine.store('app', {
        loading: false,
        sidebarOpen: false,
        
        toggleSidebar() {
            this.sidebarOpen = !this.sidebarOpen;
        },
        
        setLoading(value) {
            this.loading = value;
        }
    });
    
    // Store para los módulos
    Alpine.store('modules', {
        selected: [],
        filter: {
            ubicacion: 'all',
            estado: 'all',
            search: ''
        },
        
        isSelected(moduleId) {
            return this.selected.includes(moduleId);
        },
        
        toggleSelection(moduleId) {
            const index = this.selected.indexOf(moduleId);
            if (index > -1) {
                this.selected.splice(index, 1);
            } else {
                this.selected.push(moduleId);
            }
        },
        
        selectAll(moduleIds) {
            this.selected = [...moduleIds];
        },
        
        clearSelection() {
            this.selected = [];
        },
        
        setFilter(key, value) {
            this.filter[key] = value;
        }
    });
    
    // Store para notificaciones
    Alpine.store('notifications', {
        items: [],
        
        add(message, type = 'info', duration = 5000) {
            const id = Date.now();
            this.items.push({ id, message, type });
            
            if (duration > 0) {
                setTimeout(() => this.remove(id), duration);
            }
        },
        
        remove(id) {
            const index = this.items.findIndex(item => item.id === id);
            if (index > -1) {
                this.items.splice(index, 1);
            }
        },
        
        success(message) {
            this.add(message, 'success');
        },
        
        error(message) {
            this.add(message, 'error');
        },
        
        warning(message) {
            this.add(message, 'warning');
        },
        
        info(message) {
            this.add(message, 'info');
        }
    });
    
    // Store para MQTT
    Alpine.store('mqtt', {
        connected: false,
        reconnecting: false,
        lastMessage: null,
        
        setConnected(value) {
            this.connected = value;
            this.reconnecting = false;
        },
        
        setReconnecting(value) {
            this.reconnecting = value;
        },
        
        updateLastMessage(message) {
            this.lastMessage = message;
        }
    });
    
});

// Componentes reutilizables de Alpine.js

// Componente de Modal
Alpine.data('modal', (open = false) => ({
    open: open,
    
    show() {
        this.open = true;
        document.body.style.overflow = 'hidden';
    },
    
    hide() {
        this.open = false;
        document.body.style.overflow = 'auto';
    },
    
    toggle() {
        this.open ? this.hide() : this.show();
    }
}));

// Componente de Dropdown
Alpine.data('dropdown', () => ({
    open: false,
    
    toggle() {
        this.open = !this.open;
    },
    
    close() {
        this.open = false;
    }
}));

// Componente de Tabs
Alpine.data('tabs', (defaultTab = 0) => ({
    activeTab: defaultTab,
    
    setTab(index) {
        this.activeTab = index;
    },
    
    isActive(index) {
        return this.activeTab === index;
    }
}));

// Componente de Accordion
Alpine.data('accordion', () => ({
    expanded: false,
    
    toggle() {
        this.expanded = !this.expanded;
    }
}));

// Componente de Contador
Alpine.data('counter', (initial = 0, min = null, max = null) => ({
    count: initial,
    
    increment() {
        if (max === null || this.count < max) {
            this.count++;
        }
    },
    
    decrement() {
        if (min === null || this.count > min) {
            this.count--;
        }
    },
    
    reset() {
        this.count = initial;
    }
}));

// Componente de Timer/Countdown
Alpine.data('timer', (seconds) => ({
    remaining: seconds,
    running: false,
    interval: null,
    
    start() {
        if (this.running) return;
        
        this.running = true;
        this.interval = setInterval(() => {
            if (this.remaining > 0) {
                this.remaining--;
            } else {
                this.stop();
                this.$dispatch('timer-complete');
            }
        }, 1000);
    },
    
    stop() {
        this.running = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    },
    
    reset() {
        this.stop();
        this.remaining = seconds;
    },
    
    formatTime() {
        const mins = Math.floor(this.remaining / 60);
        const secs = this.remaining % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}));

// Componente de Confirmación
Alpine.data('confirm', (message = '¿Estás seguro?') => ({
    showDialog: false,
    callback: null,
    
    ask(callback) {
        this.callback = callback;
        this.showDialog = true;
    },
    
    yes() {
        if (this.callback) {
            this.callback();
        }
        this.cancel();
    },
    
    cancel() {
        this.showDialog = false;
        this.callback = null;
    }
}));

// Componente de Card de Módulo con estado
Alpine.data('moduleCard', (moduleData) => ({
    module: moduleData,
    loading: false,
    
    async toggleState() {
        this.loading = true;
        
        try {
            const response = await fetch(`/api/modulos/${this.module.id}/toggle/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.module.estado = data.estado;
                Alpine.store('notifications').success('Estado actualizado correctamente');
            } else {
                throw new Error('Error al cambiar estado');
            }
        } catch (error) {
            console.error('Error:', error);
            Alpine.store('notifications').error('Error al cambiar el estado del módulo');
        } finally {
            this.loading = false;
        }
    },
    
    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    },
    
    getStatusColor() {
        const colors = {
            'online': 'green',
            'offline': 'red',
            'warning': 'yellow'
        };
        return colors[this.module.status] || 'gray';
    }
}));

// Componente de búsqueda con debounce
Alpine.data('search', (delay = 300) => ({
    query: '',
    results: [],
    loading: false,
    timeout: null,
    
    init() {
        this.$watch('query', () => {
            this.debouncedSearch();
        });
    },
    
    debouncedSearch() {
        clearTimeout(this.timeout);
        
        if (this.query.length < 2) {
            this.results = [];
            return;
        }
        
        this.loading = true;
        
        this.timeout = setTimeout(() => {
            this.performSearch();
        }, delay);
    },
    
    async performSearch() {
        try {
            const response = await fetch(`/api/search/?q=${encodeURIComponent(this.query)}`);
            if (response.ok) {
                this.results = await response.json();
            }
        } catch (error) {
            console.error('Error en búsqueda:', error);
        } finally {
            this.loading = false;
        }
    },
    
    clear() {
        this.query = '';
        this.results = [];
    }
}));

// Directivas personalizadas de Alpine
Alpine.directive('tooltip', (el, { expression }, { evaluate }) => {
    const content = evaluate(expression);
    
    el.addEventListener('mouseenter', () => {
        // Crear tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg';
        tooltip.textContent = content;
        tooltip.style.bottom = '100%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.marginBottom = '8px';
        
        el.style.position = 'relative';
        el.appendChild(tooltip);
        
        el._tooltip = tooltip;
    });
    
    el.addEventListener('mouseleave', () => {
        if (el._tooltip) {
            el._tooltip.remove();
            delete el._tooltip;
        }
    });
});

// Magic helpers
Alpine.magic('clipboard', () => {
    return (text) => {
        return navigator.clipboard.writeText(text).then(() => {
            Alpine.store('notifications').success('Copiado al portapapeles');
        }).catch(() => {
            Alpine.store('notifications').error('Error al copiar');
        });
    };
});

Alpine.magic('formatDate', () => {
    return (date, format = 'short') => {
        const d = new Date(date);
        const options = {
            short: { year: 'numeric', month: 'short', day: 'numeric' },
            long: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
            time: { hour: '2-digit', minute: '2-digit' }
        };
        
        return d.toLocaleDateString('es-PE', options[format] || options.short);
    };
});

Alpine.magic('formatNumber', () => {
    return (num, decimals = 2) => {
        return Number(num).toFixed(decimals);
    };
});