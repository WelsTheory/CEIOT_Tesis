class MQTTClient {
    constructor(brokerUrl = 'ws://localhost:9001') {
        this.brokerUrl = brokerUrl;
        this.client = null;
        this.connected = false;
        this.reconnectInterval = 5000;
        this.reconnectTimer = null;
    }

    connect() {
        try {
            Utils.log('Conectando a MQTT WebSocket:', this.brokerUrl);
            
            // Crear cliente MQTT (requiere paho-mqtt.js)
            const clientId = 'web_client_' + Math.random().toString(16).substr(2, 8);
            this.client = new Paho.MQTT.Client(
                this.brokerUrl.replace('ws://', ''),
                Number(9001),
                clientId
            );

            // Configurar callbacks
            this.client.onConnectionLost = (response) => {
                this.onConnectionLost(response);
            };

            this.client.onMessageArrived = (message) => {
                this.onMessageArrived(message);
            };

            // Conectar
            this.client.connect({
                onSuccess: () => this.onConnect(),
                onFailure: (error) => this.onConnectFailure(error),
                keepAliveInterval: 60,
                cleanSession: true
            });
            
        } catch (error) {
            console.error('Error al inicializar cliente MQTT:', error);
            this.scheduleReconnect();
        }
    }

    onConnect() {
        Utils.log('✅ Conectado a MQTT WebSocket');
        this.connected = true;
        
        // Actualizar indicador en UI
        Alpine.store('mqtt').setConnected(true);
        
        // Suscribirse a topics
        this.subscribe('modulos/+/mediciones');
        this.subscribe('modulos/+/estado');
        this.subscribe('modulos/+/alerta');
        
        // Limpiar timer de reconexión
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    onConnectFailure(error) {
        console.error('❌ Error conectando a MQTT:', error);
        this.connected = false;
        Alpine.store('mqtt').setConnected(false);
        this.scheduleReconnect();
    }

    onConnectionLost(response) {
        Utils.log('⚠️ Conexión MQTT perdida:', response.errorMessage);
        this.connected = false;
        Alpine.store('mqtt').setConnected(false);
        this.scheduleReconnect();
    }

    scheduleReconnect() {
        if (this.reconnectTimer) return;
        
        Utils.log(`🔄 Reintentando conexión en ${this.reconnectInterval/1000}s...`);
        Alpine.store('mqtt').setReconnecting(true);
        
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, this.reconnectInterval);
    }

    subscribe(topic) {
        if (!this.connected || !this.client) return;
        
        this.client.subscribe(topic, {
            onSuccess: () => {
                Utils.log(`📡 Suscrito a: ${topic}`);
            },
            onFailure: (error) => {
                console.error(`Error al suscribirse a ${topic}:`, error);
            }
        });
    }

    onMessageArrived(message) {
        const topic = message.destinationName;
        const payload = message.payloadString;
        
        Utils.log('📨 Mensaje MQTT:', topic, payload);
        
        try {
            const data = JSON.parse(payload);
            this.handleMessage(topic, data);
        } catch (error) {
            console.error('Error parseando mensaje MQTT:', error);
        }
    }

    handleMessage(topic, data) {
        // Actualizar store de Alpine.js
        Alpine.store('mqtt').updateLastMessage({ topic, data, timestamp: Date.now() });
        
        // Parsear topic
        const parts = topic.split('/');
        if (parts.length < 3) return;
        
        const moduloId = parts[1];
        const messageType = parts[2];
        
        // Disparar eventos personalizados
        switch(messageType) {
            case 'mediciones':
                this.handleMedicion(moduloId, data);
                break;
            case 'estado':
                this.handleEstado(moduloId, data);
                break;
            case 'alerta':
                this.handleAlerta(moduloId, data);
                break;
        }
    }

    handleMedicion(moduloId, data) {
        // Disparar evento para actualizar UI
        window.dispatchEvent(new CustomEvent('nueva-medicion', {
            detail: { moduloId, ...data }
        }));
        
        // Si estamos en la página del módulo, actualizar con htmx
        if (window.location.pathname.includes(`/modulos/${moduloId}`)) {
            htmx.trigger(`#ultima-medicion-${moduloId}`, 'refresh');
        }
    }

    handleEstado(moduloId, data) {
        window.dispatchEvent(new CustomEvent('cambio-estado', {
            detail: { moduloId, ...data }
        }));
        
        // Actualizar card del módulo en dashboard
        htmx.trigger(`#modulo-${moduloId}`, 'refresh');
    }

    handleAlerta(moduloId, data) {
        // Mostrar notificación
        Alpine.store('notifications').warning(
            `Alerta en Módulo ${moduloId}: ${data.mensaje}`
        );
        
        window.dispatchEvent(new CustomEvent('nueva-alerta', {
            detail: { moduloId, ...data }
        }));
    }

    publish(topic, payload) {
        if (!this.connected || !this.client) {
            console.error('No conectado a MQTT');
            return;
        }

        const message = new Paho.MQTT.Message(
            typeof payload === 'string' ? payload : JSON.stringify(payload)
        );
        message.destinationName = topic;
        
        this.client.send(message);
        Utils.log('📤 Mensaje enviado:', topic, payload);
    }

    disconnect() {
        if (this.client && this.connected) {
            this.client.disconnect();
            Utils.log('🔌 Desconectado de MQTT');
        }
    }
}

// Inicializar cliente MQTT global
window.mqttClient = null;

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Solo iniciar si estamos en una página que necesita MQTT
    if (document.body.dataset.mqttEnabled === 'true') {
        window.mqttClient = new MQTTClient('ws://localhost:9001');
        window.mqttClient.connect();
    }
});

// Limpiar al cerrar
window.addEventListener('beforeunload', function() {
    if (window.mqttClient) {
        window.mqttClient.disconnect();
    }
});