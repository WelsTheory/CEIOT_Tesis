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
import { ThemeToggleComponent } from '../components/theme-toggle/theme-toggle.component';

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
    ThemeToggleComponent
  ], schemas: [CUSTOM_ELEMENTS_SCHEMA],
})

export class HomePage implements OnInit {
  modulos: any[] = []; // Para almacenar modulos
  private sub!: Subscription;
  private refreshMedicionesInterval: any;
  private mqttSubscription!: Subscription;

  // Variables de debug
  ultimaActualizacionMqtt: Date | null = null;
  mqttConnected: boolean = false;

  constructor(
    private moduloService: ModuloService, // Servicio para cargar modulos
    private mqttService: MqttService,
    private router: Router 
  ) {
    addIcons({ leaf, restaurant, flower, home, bed, hardwareChip });
  }

  // Método que se ejecuta al inicializar el componente
  async ngOnInit() {
    try {
      console.log('🏠 Inicializando HomePage...');
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
    console.log('📡 Configurando suscripciones...');
    
    // Suscripción a cambios de estado de válvulas
    this.sub = this.moduloService.resetState$.subscribe(change => {
      if (change) {
        console.log('🔄 Cambio de estado de válvula recibido:', change);
        this.modulos = this.modulos.map(d =>
          d.moduloId === change.id
            ? { ...d, estadoReset: change.estado }
            : d
        );
      }
    });

    // Suscripción a estado de conexión MQTT
    this.mqttService.connectionStatus$.subscribe(connected => {
      this.mqttConnected = connected;
      console.log('📡 Estado MQTT:', connected ? 'Conectado' : 'Desconectado');
    });

    // ⭐ SUSCRIPCIÓN PRINCIPAL PARA ACTUALIZACIONES DE APUNTES
    this.mqttSubscription = this.mqttService.apunteUpdates$.subscribe(apunteUpdate => {
      if (apunteUpdate && apunteUpdate.moduloId) {
        console.log('🎯 Actualización de apunte recibida via MQTT:', apunteUpdate);
        this.ultimaActualizacionMqtt = new Date();
        
        // Actualizar el módulo específico en tiempo real
        const moduloIndex = this.modulos.findIndex(m => m.moduloId === apunteUpdate.moduloId);
        
        if (moduloIndex !== -1) {
          const moduloAnterior = { ...this.modulos[moduloIndex] };
          
          // Actualizar valores
          this.modulos[moduloIndex] = {
            ...this.modulos[moduloIndex],
            up: apunteUpdate.up !== undefined ? apunteUpdate.up : this.modulos[moduloIndex].up,
            down: apunteUpdate.down !== undefined ? apunteUpdate.down : this.modulos[moduloIndex].down,
            ultimaActualizacion: new Date().toLocaleTimeString(),
            // Flag para indicar que hubo cambios
            actualizado: true
          };
          
          console.log('✅ Módulo actualizado en vista:');
          console.log('  - Módulo ID:', apunteUpdate.moduloId);
          console.log('  - UP: ', moduloAnterior.up, '→', this.modulos[moduloIndex].up);
          console.log('  - DOWN:', moduloAnterior.down, '→', this.modulos[moduloIndex].down);
          
          // Opcional: Remover flag de actualizado después de unos segundos
          setTimeout(() => {
            if (this.modulos[moduloIndex]) {
              this.modulos[moduloIndex].actualizado = false;
            }
          }, 3000);
          
        } else {
          console.warn('⚠️ Módulo no encontrado en la lista:', apunteUpdate.moduloId);
        }
      }
    });
    
    console.log('✅ Suscripciones configuradas');
  }

  private iniciarActualizacionPeriodica() {
    // Reducir la frecuencia ya que MQTT maneja las actualizaciones en tiempo real
    this.refreshMedicionesInterval = setInterval(async () => {
      try {
        await Promise.all(
          this.modulos.map(async (modulo) => {
            try {
              const ultima = await this.moduloService.getUltimaMedicion(modulo.moduloId);
              const nuevoValorTemp = ultima?.valor_temp ?? '—';
              const nuevoValorPress = ultima?.valor_press ?? '—';
              
              if (modulo.medicionTempActual !== nuevoValorTemp) {
                modulo.medicionTempActual = nuevoValorTemp;
              }
              if (modulo.medicionPressActual !== nuevoValorPress) {
                modulo.medicionPressActual = nuevoValorPress;
              }
              
              // Solo actualizar apuntes si no hay conexión MQTT activa
              if (!this.mqttConnected) {
                console.log(`📊 MQTT desconectado, actualizando apuntes via API para módulo ${modulo.moduloId}`);
                const apunte = await this.moduloService.getApunte(modulo.moduloId);
                
                if (apunte) {
                  if (modulo.up !== apunte.up) {
                    console.log(`📈 UP actualizado módulo ${modulo.moduloId}: ${modulo.up} → ${apunte.up}`);
                    modulo.up = apunte.up;
                  }
                  
                  if (modulo.down !== apunte.down) {
                    console.log(`📉 DOWN actualizado módulo ${modulo.moduloId}: ${modulo.down} → ${apunte.down}`);
                    modulo.down = apunte.down;
                  }
                }
              }
              
            } catch (error) {
              console.error(`❌ Error actualizando módulo ${modulo.moduloId}:`, error);
            }
          })
        );
        
        console.log('✅ Actualización periódica completada');
        
      } catch (error) {
        console.error('❌ Error en actualización periódica:', error);
      }
    }, 5000);
    
    console.log('✅ Actualización periódica configurada (cada 2 minutos)');
  }

  // Método para refrescar manualmente
  async refrescarDatos() {
    console.log('🔄 Refresh manual solicitado...');
    
    try {
      await this.cargarModulosIniciales();
      console.log('✅ Datos refrescados manualmente');
    } catch (error) {
      console.error('❌ Error en refresh manual:', error);
    }
  }

  // Getter para mostrar estado de conexión en el template si quieres
  get estadoMqtt(): string {
    return this.mqttConnected ? 'Conectado' : 'Desconectado';
  }

  get tiempoUltimaActualizacionMqtt(): string {
    return this.ultimaActualizacionMqtt 
      ? this.ultimaActualizacionMqtt.toLocaleTimeString() 
      : 'Nunca';
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



