import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModuloService } from '../services/modulo.service';
import { MqttService } from '../services/mqtt.service'; // ← Nueva importación
import { Modulo } from '../listado-modulos/modulo';
import { Router } from '@angular/router';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonList, IonToolbar, IonHeader, IonTitle, IonItem, IonAvatar, IonIcon, IonLabel, IonButton } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { addIcons } from 'ionicons';
import { leaf, restaurant, flower, home, bed, hardwareChip } from 'ionicons/icons';
import { Subscription } from 'rxjs';



@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonList,
    IonItem,
    IonAvatar,
    IonIcon,
    IonLabel,
    IonButton,
    CommonModule,
  ], schemas: [CUSTOM_ELEMENTS_SCHEMA],
})

export class HomePage implements OnInit {
  modulos: any[] = []; // Para almacenar modulos
  private sub!: Subscription;
  private refreshMedicionesInterval: any;
  private mqttSubscription!: Subscription;

  constructor(
    private moduloService: ModuloService, // Servicio para cargar modulos
    private mqttService: MqttService,
    private router: Router 
  ) {}

  // Método que se ejecuta al inicializar el componente
  async ngOnInit() {
    try {
      // Cargar datos iniciales
      await this.cargarModulosIniciales();
      
      // Configurar suscripciones
      this.configurarSuscripciones();
      
      // Iniciar actualización periódica (reducir frecuencia ya que MQTT será en tiempo real)
      this.iniciarActualizacionPeriodica();
      
    } catch (error) {
      console.error('Error al inicializar home:', error);
    }
  }

  ngOnDestroy() {
    // Limpiar suscripciones y timers
    if (this.sub) {
      this.sub.unsubscribe();
    }
    if (this.mqttSubscription) {
      this.mqttSubscription.unsubscribe();
    }
    if (this.refreshMedicionesInterval) {
      clearInterval(this.refreshMedicionesInterval);
    }
  }

  private async cargarModulosIniciales() {
    const modulos = await this.moduloService.getModulos();
    this.modulos = await Promise.all(
      modulos.map(async (d: Modulo) => {
        let medicionTempActual = '—';
        let medicionPressActual = '—';
        let estadoReset = null;
        let up = 0.0;
        let down = 0.0;
        
        try {
          const ultimaMedicion = await this.moduloService.getUltimaMedicion(d.moduloId);
          medicionTempActual = ultimaMedicion?.valor_temp ?? '—';
          medicionPressActual = ultimaMedicion?.valor_press ?? '—';
          
          const apunte = await this.moduloService.getApunte(d.moduloId);
          up = apunte?.up ?? 0.0;
          down = apunte?.down ?? 0.0;
        } catch (err) {
          console.error(`Error cargando datos de ${d.moduloId}`, err);
        }

        try {
          const estadoResponse = await this.moduloService.getEstadoReset(d.moduloId);
          estadoReset = estadoResponse.estado;
        } catch (err) {
          console.error(`Error cargando estado válvula ${d.moduloId}`, err);
        }

        return {
          ...d,
          ubicacion: d.ubicacion || 'Desconocida', 
          up,
          down,
          medicionTempActual,
          medicionPressActual,
          estadoReset
        };
      })
    );
  }

  private configurarSuscripciones() {
    // Suscripción existente para cambios de estado
    this.sub = this.moduloService.resetState$.subscribe(change => {
      if (change) {
        this.modulos = this.modulos.map(d =>
          d.moduloId === change.id
            ? { ...d, estadoReset: change.estado }
            : d
        );
      }
    });

    // ← NUEVA SUSCRIPCIÓN MQTT PARA ACTUALIZACIONES EN TIEMPO REAL
    this.mqttSubscription = this.mqttService.apunteUpdates$.subscribe(apunteUpdate => {
      if (apunteUpdate && apunteUpdate.moduloId) {
        console.log('🎯 Actualización de apunte recibida via MQTT:', apunteUpdate);
        
        // Actualizar el módulo específico en tiempo real
        this.modulos = this.modulos.map(modulo => {
          if (modulo.moduloId === apunteUpdate.moduloId) {
            return {
              ...modulo,
              up: apunteUpdate.up !== undefined ? apunteUpdate.up : modulo.up,
              down: apunteUpdate.down !== undefined ? apunteUpdate.down : modulo.down,
              // Opcionalmente mostrar indicador de actualización
              ultimaActualizacion: new Date().toLocaleTimeString()
            };
          }
          return modulo;
        });
        
        console.log('✅ Vista actualizada en tiempo real para módulo', apunteUpdate.moduloId);
      }
    });
  }

  private iniciarActualizacionPeriodica() {
    // Reducir la frecuencia ya que MQTT maneja las actualizaciones en tiempo real
    this.refreshMedicionesInterval = setInterval(async () => {
      try {
        await Promise.all(
          this.modulos.map(async (d) => {
            try {
              const ultima = await this.moduloService.getUltimaMedicion(d.moduloId);
              const nuevoValorTemp = ultima?.valor_temp ?? '—';
              const nuevoValorPress = ultima?.valor_press ?? '—';
              
              if (d.medicionTempActual !== nuevoValorTemp) {
                d.medicionTempActual = nuevoValorTemp;
              }
              if (d.medicionPressActual !== nuevoValorPress) {
                d.medicionPressActual = nuevoValorPress;
              }
              
              // Para apuntes, primero verificar si no hay actualización MQTT reciente
              // Solo actualizar desde API si han pasado más de 10 segundos
              const tiempoSinActualizacionMqtt = this.tiempoDesdeUltimaActualizacionMqtt();
              if (tiempoSinActualizacionMqtt > 10000) { // 10 segundos
                const valor_apunte = await this.moduloService.getApunte(d.moduloId);
                const nuevoValorUP = valor_apunte?.up ?? 0.0;
                const nuevoValorDOWN = valor_apunte?.down ?? 0.0;
                
                if (d.up !== nuevoValorUP || d.down !== nuevoValorDOWN) {
                  d.up = nuevoValorUP;
                  d.down = nuevoValorDOWN;
                }
              }
              
            } catch (error) {
              console.error(`Error actualizando módulo ${d.moduloId}:`, error);
            }
          })
        );
      } catch (error) {
        console.error('Error en actualización periódica:', error);
      }
    }, 30000); // Cada 30 segundos en lugar de 5 segundos
  }

  private tiempoDesdeUltimaActualizacionMqtt(): number {
    // Implementar lógica para rastrear la última actualización MQTT
    // Por simplicidad, retornamos un número grande para permitir actualizaciones API inicialmente
    return 60000;
  }

  // Método auxiliar para mostrar estado de conexión MQTT (opcional)
  get mqttConnected(): boolean {
    return this.mqttService.isConnected();
  }

  navigateToModule(modulo: any) {
    this.router.navigate(['/listado-modulos', modulo.moduloId]);
  }
  // Métodos para filtrar por cuadrante
  getModulosNorte() {
    return this.modulos?.filter(m => m.ubicacion === 'Norte') || [];
  }

  getModulosSur() {
    return this.modulos?.filter(m => m.ubicacion === 'Sur') || [];
  }

  getModulosEste() {
    return this.modulos?.filter(m => m.ubicacion === 'Este') || [];
  }

  getModulosOeste() {
    return this.modulos?.filter(m => m.ubicacion === 'Oeste') || [];
  }
    // Encender todos los modulos
  async encenderTodos() {
    try {
      await Promise.all(
        this.modulos.map(async (d) => {
          try {
            await this.moduloService.abrirReset(d.moduloId);
            d.estadoReset = true; // Actualiza localmente
          } catch (err) {
            console.error(`Error encendiendo módulos ${d.moduloId}`, err);
          }
        })
      );
    } catch (err) {
      console.error('Error al encender todas las módulos', err);
    }
  }

  // Apagar todos los modulos
  async apagarTodos() {
    try {
      await Promise.all(
        this.modulos.map(async (d) => {
          try {
            await this.moduloService.cerrarReset(d.moduloId);
            d.estadoReset = false; // Actualiza localmente
          } catch (err) {
            console.error(`Error apagando modulo ${d.moduloId}`, err);
          }
        })
      );
    } catch (err) {
      console.error('Error al apagar todas las modulos', err);
    }
  }

    

  // Método para navegar a la página de detalles de un modulo
  verDetalle(moduloId: number) {
    console.log(`Ver detalle del modulo: ${moduloId}`);
    this.router.navigate([`/modulo`, moduloId]);
  }

  verMediciones(moduloId: number) {
    console.log(`Ver mediciones del modulo: ${moduloId}`);
    this.router.navigate([`/modulo`, moduloId, 'mediciones']);
    }
    
}



