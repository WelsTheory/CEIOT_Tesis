// src/frontend/dam/src/app/services/mqtt.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// Declarar mqtt para TypeScript
declare const mqtt: any;

export interface MqttMessage {
  topic: string;
  message: any;
  timestamp: Date;
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
  
  // Observable específico para actualizaciones de apuntes
  private apunteUpdates = new BehaviorSubject<any>(null);
  public apunteUpdates$ = this.apunteUpdates.asObservable();

  constructor() {
    this.initializeMqtt();
  }

  private initializeMqtt() {
    try {
      // Conectar al broker MQTT vía WebSocket
      this.client = mqtt.connect('ws://localhost:9001', {
        clientId: 'ionic_frontend_' + Math.random().toString(16).substr(2, 8),
        reconnectPeriod: 1000,
        keepalive: 60,
        clean: true
      });

      this.client.on('connect', () => {
        console.log('✅ Frontend conectado a MQTT');
        this.connected = true;
        this.connectionStatus.next(true);
        
        // Suscribirse a topics importantes
        this.subscribeToTopics();
      });

      this.client.on('message', (topic: string, message: Uint8Array) => {
        try {
          const parsedMessage = JSON.parse(new TextDecoder().decode(message));
          console.log('📨 MQTT mensaje recibido en frontend:', { topic, message: parsedMessage });
          
          const mqttMessage: MqttMessage = {
            topic,
            message: parsedMessage,
            timestamp: new Date()
          };
          
          this.messages.next(mqttMessage);
          
          // Manejar mensajes específicos
          this.handleSpecificMessages(topic, parsedMessage);
          
        } catch (error) {
          console.error('Error procesando mensaje MQTT:', error);
        }
      });

      this.client.on('error', (error: any) => {
        console.error('❌ Error MQTT en frontend:', error);
        this.connected = false;
        this.connectionStatus.next(false);
      });

      this.client.on('close', () => {
        console.log('🔌 Conexión MQTT cerrada en frontend');
        this.connected = false;
        this.connectionStatus.next(false);
      });

    } catch (error) {
      console.error('❌ Error inicializando MQTT en frontend:', error);
    }
  }

  private subscribeToTopics() {
    if (!this.connected || !this.client) return;
    
    // Suscribirse a confirmaciones de apuntes
    this.client.subscribe('apunte/confirmacion', (err: any) => {
      if (!err) {
        console.log('📡 Frontend suscrito a: apunte/confirmacion');
      }
    });
    
    // Suscribirse a mediciones nuevas
    this.client.subscribe('mediciones/nuevas', (err: any) => {
      if (!err) {
        console.log('📡 Frontend suscrito a: mediciones/nuevas');
      }
    });
    
    // También puedes suscribirte a otros topics si necesitas
    this.client.subscribe('sensores/data', (err: any) => {
      if (!err) {
        console.log('📡 Frontend suscrito a: sensores/data');
      }
    });
  }

  private handleSpecificMessages(topic: string, message: any) {
    switch (topic) {
      case 'apunte/confirmacion':
        console.log('🎯 Confirmación de apunte recibida:', message);
        this.apunteUpdates.next(message);
        break;
      
      case 'mediciones/nuevas':
        console.log('📊 Nueva medición confirmada:', message);
        // Puedes emitir un evento específico para mediciones si necesitas
        break;
        
      case 'sensores/data':
        console.log('🌡️ Nuevos datos de sensor:', message);
        // Manejar datos de sensores si necesitas
        break;
    }
  }

  // Método para publicar mensajes (si necesitas enviar desde el frontend)
  publish(topic: string, message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.client) {
        reject(new Error('MQTT no está conectado'));
        return;
      }
      
      this.client.publish(topic, JSON.stringify(message), (error: any) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  // Método para verificar el estado
  isConnected(): boolean {
    return this.connected;
  }

  // Método para desconectar (cleanup)
  disconnect() {
    if (this.client) {
      this.client.end();
      this.connected = false;
      this.connectionStatus.next(false);
    }
  }
}