// src/app/services/mqtt.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// Declarar mqtt para TypeScript
declare const mqtt: any;

export interface MqttMessage {
  topic: string;
  message: any;
  timestamp: Date;
}

export interface ModuloEstado {
  moduloId: number;
  estado_conexion: 'ONLINE' | 'OFFLINE' | 'TIMEOUT' | 'DESCONOCIDO';
  ultimo_heartbeat?: Date;
  apuntes?: {
    up_esperado?: number;
    down_esperado?: number;
    up_actual?: number;
    down_actual?: number;
    estado_up?: 'correcto' | 'mismatch' | 'desconectado';
    estado_down?: 'correcto' | 'mismatch' | 'desconectado';
  };
  info_tecnica?: {
    version_firmware?: string;
    ip_address?: string;
    temperatura_interna?: number;
    voltaje_alimentacion?: number;
  };
  detalles?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MqttService {
  private client: any = null;
  private connected = false;
  
  // Observable para el estado de conexión
  private connectionStatus = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatus.asObservable();
  
  // Observable para mensajes recibidos
  private messages = new BehaviorSubject<MqttMessage | null>(null);
  public messages$ = this.messages.asObservable();
  
  // Observable específico para estados de módulos
  private moduloEstados = new BehaviorSubject<ModuloEstado | null>(null);
  public moduloEstados$ = this.moduloEstados.asObservable();
  
  // Observable para actualizaciones de mediciones
  private medicionUpdates = new BehaviorSubject<any>(null);
  public medicionUpdates$ = this.medicionUpdates.asObservable();

  // Map para mantener el último estado conocido de cada módulo
  private estadosModulos: Map<number, ModuloEstado> = new Map();

  constructor() {
    // Cargar librería MQTT desde CDN si no está disponible
    this.cargarMqttLibrary().then(() => {
      this.initializeMqtt();
    });
  }

  private async cargarMqttLibrary(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof mqtt !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/mqtt@4.3.7/dist/mqtt.min.js';
      script.onload = () => {
        console.log('✅ Librería MQTT cargada desde CDN');
        resolve();
      };
      script.onerror = () => {
        console.error('❌ Error cargando librería MQTT');
        reject();
      };
      document.head.appendChild(script);
    });
  }

  private initializeMqtt() {
    try {
      console.log('🔌 Inicializando conexión MQTT...');
      
      // Conectar al broker MQTT vía WebSocket
      this.client = mqtt.connect('ws://localhost:9001', {
        clientId: 'ionic_frontend_' + Math.random().toString(16).substr(2, 8),
        // 🚀 OPTIMIZACIONES CLAVE:
        reconnectPeriod: 100,        // ⚡ Era 1000ms → ahora 100ms
        connectTimeout: 2000,        // ⚡ Timeout conexión: 2 segundos máximo
        keepalive: 10,               // ⚡ Era 60s → ahora 10s 
        clean: true,
        // 🚀 NUEVAS OPTIMIZACIONES:
        resubscribe: true,           // ⚡ Re-suscribir automáticamente
        protocolVersion: 4,          // ⚡ MQTT v3.1.1 (más rápido que v5)
        queueQoSZero: false,         // ⚡ No encolar mensajes QoS 0
        properties: {
          sessionExpiryInterval: 10, // ⚡ Expirar sesión rápido
          requestResponseInformation: false,
          requestProblemInformation: false
        }
      });

      // ⚡ EVENTOS OPTIMIZADOS
      this.client.on('connect', () => {
        console.log('✅ MQTT CONECTADO RÁPIDO en', Date.now());
        this.connected = true;
        this.connectionStatus.next(true);
        
        // ⚡ Suscribirse inmediatamente (sin delay)
        this.subscribeToTopics();
      });

      // ⚡ PROCESAMIENTO DE MENSAJES ULTRA RÁPIDO
      this.client.on('message', (topic: string, message: Uint8Array) => {
        const startTime = performance.now();
        
        try {
          const messageStr = message.toString();
          const data = JSON.parse(messageStr);
          
          console.log(`📨 MQTT mensaje procesado en ${(performance.now() - startTime).toFixed(2)}ms:`, {
            topic,
            data
          });
          
          // ⚡ Procesar mensaje INMEDIATAMENTE
          this.procesarMensaje(topic, data);
          
          // ⚡ Emitir mensaje genérico INMEDIATAMENTE
          this.messages.next({
            topic,
            message: data,
            timestamp: new Date()
          });
          
        } catch (error) {
          console.error('❌ Error procesando mensaje MQTT:', error);
        }
      });

      this.client.on('disconnect', () => {
        console.log('🔌 Desconectado de MQTT');
        this.connected = false;
        this.connectionStatus.next(false);
      });

      this.client.on('error', (error: any) => {
        console.error('❌ Error MQTT:', error);
        this.connected = false;
        this.connectionStatus.next(false);
      });

      // ⚡ NUEVOS EVENTOS PARA DEBUGGING
      this.client.on('reconnect', () => {
        console.log('🔄 Reconectando MQTT...');
      });

      this.client.on('offline', () => {
        console.log('📴 MQTT offline');
        this.connected = false;
        this.connectionStatus.next(false);
      });

    } catch (error) {
      console.error('❌ Error inicializando MQTT:', error);
    }
  }

  private subscribeToTopics() {
    const topics = [
      'modulos/+/estado',        // Estados de módulos
      'modulos/+/heartbeat',     // Heartbeats
      'modulos/+/mediciones',    // Mediciones de sensores
      'modulos/+/info-tecnica',  // Información técnica
      'modulos/+/apuntes'        // Cambios en apuntes
    ];

    topics.forEach(topic => {
      this.client.subscribe(topic, (err: any) => {
        if (!err) {
          console.log('📡 Suscrito a topic:', topic);
        } else {
          console.error('❌ Error suscribiéndose a:', topic, err);
        }
      });
    });
  }

  private procesarMensaje(topic: string, data: any) {
    const startTime = performance.now();
    try {
      // Extraer moduloId del topic (formato: modulos/X/tipo)
      const topicParts = topic.split('/');
      const moduloId = parseInt(topicParts[1]);
      const tipoMensaje = topicParts[2];

      if (!moduloId || isNaN(moduloId)) {
        console.warn('⚠️ ModuloId inválido en topic:', topic);
        return;
      }

      // Obtener estado actual del módulo o crear uno nuevo
      let estadoActual = this.estadosModulos.get(moduloId) || {
        moduloId,
        estado_conexion: 'DESCONOCIDO'
      };

      // Procesar según el tipo de mensaje
      switch (tipoMensaje) {
        case 'estado':
          estadoActual = this.procesarEstadoModulo(estadoActual, data);
          break;
        
        case 'heartbeat':
          estadoActual = this.procesarHeartbeat(estadoActual, data);
          break;
        
        case 'mediciones':
          this.procesarMediciones(moduloId, data);
          break;
        
        case 'info-tecnica':
          estadoActual = this.procesarInfoTecnica(estadoActual, data);
          break;
        
        case 'apuntes':
          estadoActual = this.procesarApuntes(estadoActual, data);
          break;
      }

      // Guardar estado actualizado
      this.estadosModulos.set(moduloId, estadoActual);
      
      // Emitir actualización
      this.moduloEstados.next(estadoActual);

      console.log(`⚡ Mensaje procesado en ${(performance.now() - startTime).toFixed(2)}ms`);
      
    } catch (error) {
      console.error('❌ Error procesando mensaje MQTT:', error);
    }
  }

  private procesarEstadoModulo(estadoActual: ModuloEstado, data: any): ModuloEstado {
    return {
      ...estadoActual,
      estado_conexion: data.estado_conexion || data.estado || estadoActual.estado_conexion,
      ultimo_heartbeat: data.ultimo_heartbeat ? new Date(data.ultimo_heartbeat) : new Date(),
      apuntes: {
        ...estadoActual.apuntes,
        ...data.apuntes
      },
      info_tecnica: {
        ...estadoActual.info_tecnica,
        ...data.info_tecnica
      },
      detalles: data.detalles || estadoActual.detalles
    };
  }

  private procesarHeartbeat(estadoActual: ModuloEstado, data: any): ModuloEstado {
    return {
      ...estadoActual,
      estado_conexion: 'ONLINE',
      ultimo_heartbeat: new Date(),
      info_tecnica: {
        ...estadoActual.info_tecnica,
        ...data
      }
    };
  }

  private procesarMediciones(moduloId: number, data: any) {
    // Emitir actualización de mediciones
    this.medicionUpdates.next({
      moduloId,
      temperatura: data.temperatura,
      presion: data.presion,
      timestamp: new Date(data.timestamp || Date.now()),
      apuntes_verificados: data.apuntes_verificados,
      mismatch_detectado: data.mismatch_detectado
    });
  }

  private procesarInfoTecnica(estadoActual: ModuloEstado, data: any): ModuloEstado {
    return {
      ...estadoActual,
      info_tecnica: {
        ...estadoActual.info_tecnica,
        version_firmware: data.version_firmware,
        ip_address: data.ip_address,
        temperatura_interna: data.temperatura_interna,
        voltaje_alimentacion: data.voltaje_alimentacion
      }
    };
  }

  private procesarApuntes(estadoActual: ModuloEstado, data: any): ModuloEstado {
    return {
      ...estadoActual,
      apuntes: {
        ...estadoActual.apuntes,
        up_esperado: data.up_esperado,
        down_esperado: data.down_esperado,
        up_actual: data.up_actual,
        down_actual: data.down_actual,
        estado_up: data.estado_up,
        estado_down: data.estado_down
      }
    };
  }

  // Métodos públicos para la interfaz
  
  /**
   * Obtener estado actual de un módulo específico
   */
  getEstadoModulo(moduloId: number): ModuloEstado | null {
    return this.estadosModulos.get(moduloId) || null;
  }

  /**
   * Obtener todos los estados de módulos
   */
  getTodosLosEstados(): Map<number, ModuloEstado> {
    return new Map(this.estadosModulos);
  }

  /**
   * Verificar si MQTT está conectado
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Publicar mensaje MQTT
   */
  publish(topic: string, message: any): void {
    if (this.connected && this.client) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      this.client.publish(topic, messageStr);
      console.log('📤 Mensaje publicado:', { topic, message });
    } else {
      console.warn('⚠️ MQTT no conectado, no se puede publicar mensaje');
    }
  }

  /**
   * Solicitar actualización de estado de un módulo específico
   */
  solicitarActualizacionModulo(moduloId: number): void {
    this.publish(`modulos/${moduloId}/cmd/refresh`, {
      command: 'refresh_status',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Solicitar actualización de todos los módulos
   */
  solicitarActualizacionTodos(): void {
    this.publish('modulos/all/cmd/refresh', {
      command: 'refresh_all_status',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Reconectar manualmente
   */
  reconnect(): void {
    if (this.client) {
      console.log('🔄 Reconectando a MQTT...');
      this.client.reconnect();
    }
  }

  /**
   * Desconectar
   */
  disconnect(): void {
    if (this.client && this.connected) {
      console.log('🔌 Desconectando de MQTT...');
      this.client.end();
      this.connected = false;
      this.connectionStatus.next(false);
    }
  }
}