document.addEventListener('DOMContentLoaded', function() {
    
    // Configurar cabeceras para todas las peticiones htmx
    document.body.addEventListener('htmx:configRequest', function(evt) {
        // Agregar CSRF token automáticamente
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        if (csrfToken) {
            evt.detail.headers['X-CSRFToken'] = csrfToken;
        }
        
        // Agregar header personalizado
        evt.detail.headers['X-Requested-With'] = 'XMLHttpRequest';
    });

    // Antes de enviar la petición
    document.body.addEventListener('htmx:beforeRequest', function(evt) {
        Utils.log('HTMX Request:', evt.detail.verb, evt.detail.path);
        
        // Mostrar indicador de carga
        const target = evt.detail.target;
        if (target) {
            target.classList.add('htmx-request');
        }
    });

    // Después de recibir la respuesta
    document.body.addEventListener('htmx:afterRequest', function(evt) {
        const target = evt.detail.target;
        if (target) {
            target.classList.remove('htmx-request');
        }

        // Manejar errores
        if (!evt.detail.successful) {
            console.error('Error en petición HTMX:', evt.detail);
            Utils.showNotification('Error al procesar la solicitud', 'error');
        }
    });

    // Cuando se completa el swap de contenido
    document.body.addEventListener('htmx:afterSwap', function(evt) {
        Utils.log('HTMX Swap completado');
        
        // Reinicializar componentes si es necesario
        initializeNewContent(evt.detail.target);
    });

    // Cuando se completa el settle (animaciones)
    document.body.addEventListener('htmx:afterSettle', function(evt) {
        Utils.log('HTMX Settle completado');
    });

    // Manejar eventos de error HTTP
    document.body.addEventListener('htmx:responseError', function(evt) {
        console.error('Error HTTP:', evt.detail.xhr.status);
        
        let message = 'Error en la solicitud';
        
        switch(evt.detail.xhr.status) {
            case 403:
                message = 'No tienes permisos para realizar esta acción';
                break;
            case 404:
                message = 'Recurso no encontrado';
                break;
            case 500:
                message = 'Error interno del servidor';
                break;
            case 503:
                message = 'Servicio no disponible';
                break;
        }
        
        Utils.showNotification(message, 'error');
    });

    // Manejar timeout
    document.body.addEventListener('htmx:timeout', function(evt) {
        Utils.showNotification('La solicitud ha tardado demasiado', 'warning');
    });

    // Confirmar acciones antes de enviar
    document.body.addEventListener('htmx:confirm', function(evt) {
        const confirmMessage = evt.target.getAttribute('hx-confirm') || 
                             evt.target.getAttribute('data-confirm');
        
        if (confirmMessage && !confirm(confirmMessage)) {
            evt.preventDefault();
        }
    });

});

// Función para inicializar contenido nuevo agregado por htmx
function initializeNewContent(element) {
    // Reinicializar tooltips
    const tooltips = element.querySelectorAll('[data-tooltip]');
    // ... inicializar tooltips
    
    // Reinicializar gráficos si existen
    const charts = element.querySelectorAll('[data-chart]');
    charts.forEach(chart => {
        // Inicializar Chart.js si es necesario
        if (typeof initChart === 'function') {
            initChart(chart);
        }
    });
    
    // Reinicializar Alpine.js components
    if (window.Alpine) {
        window.Alpine.initTree(element);
    }
}

// Configuración adicional de htmx
htmx.config.defaultSwapStyle = 'innerHTML';
htmx.config.defaultSwapDelay = 100;
htmx.config.defaultSettleDelay = 100;
htmx.config.timeout = 10000; // 10 segundos
htmx.config.historyCacheSize = 10;
htmx.config.refreshOnHistoryMiss = true;

// Funciones auxiliares para usar con htmx
window.htmxHelpers = {
    // Refrescar un elemento
    refresh: function(selector) {
        const element = document.querySelector(selector);
        if (element) {
            htmx.trigger(element, 'refresh');
        }
    },
    
    // Limpiar un formulario después del submit
    clearForm: function(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    },
    
    // Cerrar modal
    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }
};