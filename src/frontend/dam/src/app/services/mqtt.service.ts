import { Injectable } from '@angular/core';
import { connect, MqttClient } from 'mqtt';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ModuloEstado {
  moduloId: number;
  estado_conexion: 'ONLINE' | 'OFFLINE' | 'DESCONOCIDO';
  ultimo_heartbeat: Date;
  apuntes: {
    up_esperado?: number;
    down_esperado?: number;
    up_actual?: number;
    down_actual?: number;
    estado_up?: string;
    estado_down?: string;
  };
  mediciones?: {
    temperatura?: number;
    presion?: number;
    timestamp?: Date;
  };
  info_tecnica: {
    version_firmware?: string;
    ip_address?: string;
    mac_address?: string;
    uptime?: number;
    memoria_libre?: number;
    temperatura_interna?: number;
    voltaje_alimentacion?: number;
    signal_strength?: number;
  };
  detalles?: string;
}

export interface MedicionUpdate {
  moduloId: number;
  temperatura: number;
  presion: number;
  timestamp: Date;
  apuntes_verificados?: boolean;
  mismatch_detectado?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MqttService {
  private client: MqttClient | null = null;
  private connected = false;

  // Subjects para emitir actualizaciones
  private connectionStatus = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatus.asObservable();

  private estadosModulos = new Map<number, ModuloEstado>();
  private moduloEstadoSubject = new Subject<{ moduloId: number, estado: ModuloEstado }>();
  public moduloEstado$ = this.moduloEstadoSubject.asObservable();

  private medicionUpdates = new Subject<MedicionUpdate>();
  public medicionUpdates$ = this.medicionUpdates.asObservable();

  constructor() {
    this.connect();
  }

  /**
   * Conectar al broker MQTT
   */
  connect() {
    if (this.client) {
      console.log('⚠️ Cliente MQTT ya existe');
      return;
    }

    try {
      console.log(`🔌 Conectando a MQTT: ${environment.mqttBrokerUrl}`);

      this.client = connect(environment.mqttBrokerUrl, {
        clientId: `ionic_client_${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000
      });

      this.client.on('connect', () => {
        console.log('✅ Conectado al broker MQTT');
        this.connected = true;
        this.connectionStatus.next(true);
        this.subscribeToTopics();
      });

      this.client.on('error', (error) => {
        console.error('❌ Error MQTT:', error);
        this.connected = false;
        this.connectionStatus.next(false);
      });

      this.client.on('close', () => {
        console.log('🔌 Desconectado del broker MQTT');
        this.connected = false;
        this.connectionStatus.next(false);
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message.toString());
      });

    } catch (error) {
      console.error('❌ Error al conectar MQTT:', error);
    }
  }

  /**
   * Suscribirse a los topics relevantes
   */
  private subscribeToTopics() {
    if (!this.client) return;

    const topics = [
      'medicion/#',
      'apunte/#',
      'estado/#',
      'heartbeat/#',
      'sensores/data',
      'dispositivos/estado',
      'mediciones/nuevas'
    ];

    topics.forEach(topic => {
      this.client?.subscribe(topic, (err) => {
        if (!err) {
          console.log(`📡 Suscrito a: ${topic}`);
        } else {
          console.error(`❌ Error suscribiéndose a ${topic}:`, err);
        }
      });
    });
  }

  /**
   * Procesar mensajes MQTT recibidos
   */
  private handleMessage(topic: string, message: string) {
    try {
      const data = JSON.parse(message);
      console.log(`📨 Mensaje MQTT [${topic}]:`, data);

      const moduloId = data.moduloId || data.modulo_id;
      if (!moduloId) return;

      // Obtener o crear estado del módulo
      let estadoActual = this.estadosModulos.get(moduloId) || this.crearEstadoInicial(moduloId);

      // Procesar según el topic
      if (topic.startsWith('medicion/') || topic === 'sensores/data' || topic === 'mediciones/nuevas') {
        estadoActual = this.procesarMedicion(estadoActual, data);
      } else if (topic.startsWith('apunte/')) {
        estadoActual = this.procesarApuntes(estadoActual, data);
      } else if (topic.startsWith('estado/') || topic === 'dispositivos/estado') {
        estadoActual = this.procesarEstado(estadoActual, data);
      } else if (topic.startsWith('heartbeat/')) {
        estadoActual = this.procesarHeartbeat(estadoActual, data);
      }

      // Actualizar el mapa y emitir el cambio
      this.estadosModulos.set(moduloId, estadoActual);
      this.moduloEstadoSubject.next({ moduloId, estado: estadoActual });

    } catch (error) {
      console.error('❌ Error procesando mensaje MQTT:', error);
    }
  }

  private crearEstadoInicial(moduloId: number): ModuloEstado {
    return {
      moduloId,
      estado_conexion: 'DESCONOCIDO',
      ultimo_heartbeat: new Date(),
      apuntes: {},
      info_tecnica: {}
    };
  }

  private procesarMedicion(estadoActual: ModuloEstado, data: any): ModuloEstado {
    const nuevaMedicion = {
      temperatura: data.temperatura || data.valor_temp,
      presion: data.presion || data.valor_press,
      timestamp: new Date(data.timestamp || data.fecha || Date.now())
    };

    // Emitir actualización de medición
    this.medicionUpdates.next({
      moduloId: estadoActual.moduloId,
      ...nuevaMedicion
    });

    return {
      ...estadoActual,
      mediciones: nuevaMedicion,
      estado_conexion: 'ONLINE',
      ultimo_heartbeat: new Date()
    };
  }

  private procesarApuntes(estadoActual: ModuloEstado, data: any): ModuloEstado {
    return {
      ...estadoActual,
      apuntes: {
        up_esperado: data.upEsperado || data.up_esperado,
        down_esperado: data.downEsperado || data.down_esperado,
        up_actual: data.upActual || data.up_actual,
        down_actual: data.downActual || data.down_actual,
        estado_up: data.estadoUp || data.estado_up,
        estado_down: data.estadoDown || data.estado_down
      }
    };
  }

  private procesarEstado(estadoActual: ModuloEstado, data: any): ModuloEstado {
    return {
      ...estadoActual,
      estado_conexion: data.estado || data.estado_conexion || 'DESCONOCIDO',
      detalles: data.detalles
    };
  }

  private procesarHeartbeat(estadoActual: ModuloEstado, data: any): ModuloEstado {
    return {
      ...estadoActual,
      estado_conexion: 'ONLINE',
      ultimo_heartbeat: new Date(),
      info_tecnica: {
        ...estadoActual.info_tecnica,
        version_firmware: data.firmware || estadoActual.info_tecnica.version_firmware,
        ip_address: data.ip || estadoActual.info_tecnica.ip_address,
        mac_address: data.mac || estadoActual.info_tecnica.mac_address,
        uptime: data.uptime || estadoActual.info_tecnica.uptime,
        memoria_libre: data.memoria || estadoActual.info_tecnica.memoria_libre,
        temperatura_interna: data.temperatura || estadoActual.info_tecnica.temperatura_interna,
        voltaje_alimentacion: data.voltaje || estadoActual.info_tecnica.voltaje_alimentacion,
        signal_strength: data.signal || estadoActual.info_tecnica.signal_strength
      }
    };
  }

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
      this.client.publish(topic, messageStr, (error) => {
        if (error) {
          console.error(`❌ Error publicando en ${topic}:`, error);
        } else {
          console.log(`📤 Mensaje publicado en ${topic}`);
        }
      });
    } else {
      console.warn('⚠️ No se puede publicar: MQTT no está conectado');
    }
  }

  /**
   * Solicitar actualización de estado de un módulo específico
   */
  solicitarActualizacionModulo(moduloId: number): void {
    if (this.connected && this.client) {
      const message = {
        moduloId: moduloId,
        action: 'request_update',
        timestamp: new Date().toISOString()
      };
      
      this.publish(`control/modulo/${moduloId}`, message);
      console.log(`📤 Solicitada actualización del módulo ${moduloId}`);
    } else {
      console.warn('⚠️ No se puede solicitar actualización: MQTT no está conectado');
    }
  }

  /**
   * Solicitar actualización de todos los módulos
   */
  solicitarActualizacionTodos(): void {
    if (this.connected && this.client) {
      const message = {
        action: 'request_update_all',
        timestamp: new Date().toISOString()
      };
      
      this.publish('control/update_all', message);
      console.log('📤 Solicitada actualización de todos los módulos');
    } else {
      console.warn('⚠️ No se puede solicitar actualización: MQTT no está conectado');
    }
  }

  /**
   * Desconectar del broker MQTT
   */
  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.connected = false;
      this.connectionStatus.next(false);
      console.log('🔌 Cliente MQTT desconectado');
    }
  }
}