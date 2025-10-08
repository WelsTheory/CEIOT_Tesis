// src/app/home/home.page.ts - CON INTEGRACIÓN MQTT REAL
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModuloService } from '../services/modulo.service';
import { MqttService, ModuloEstado } from '../services/mqtt.service'; // ← MQTT Service
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
import { ToastController } from '@ionic/angular';
import { heart, logoApple, settingsSharp, star } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, 
    IonCardTitle, IonCardSubtitle, IonList, IonItem, IonAvatar, IonIcon, 
    IonLabel, IonButton, CommonModule, ThemeToggleComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class HomePage implements OnInit, OnDestroy {
  modulos: any[] = [];
  cuadranteActivo: string = 'norte';
  mostrarNavegacion: boolean = false;
  
  // Estados de conexión y apuntes (ahora reales via MQTT)
  estadosConexion: Map<number, string> = new Map();
  estadosApuntes: Map<number, {up: string, down: string}> = new Map();
  actualizandoEstadoGeneral: boolean = false;
  
  // Suscripciones
  private sub!: Subscription;
  private mqttSubscription!: Subscription;
  private medicionSubscription!: Subscription;
  private refreshMedicionesInterval: any;
  
  // Estado MQTT
  mqttConnected: boolean = false;
  ultimaActualizacionMqtt: Date | null = null;

  constructor(
    private moduloService: ModuloService,
    private mqttService: MqttService, // ← Inyectar MQTT Service
    private router: Router,
    private toastController: ToastController
  ) {
    addIcons({ leaf, restaurant, flower, home, bed, hardwareChip });
    addIcons({ heart, logoApple, settingsSharp, star });
  }

  async ngOnInit() {
    try {
      console.log('🏠 Inicializando HomePage con MQTT...');
      
      // Cargar datos iniciales
      await this.cargarModulosIniciales();
      
      // Configurar suscripciones MQTT
      this.configurarSuscripcionesMQTT();
      
      // Configurar responsive
      this.configurarResponsive();
      
      // Inicializar estados
      this.inicializarEstados();
      
      // Reducir frecuencia de actualización periódica (MQTT será en tiempo real)
      this.iniciarActualizacionPeriodica();
      
    } catch (error) {
      console.error('❌ Error al inicializar home:', error);
    }
  }

  ngOnDestroy() {
    this.limpiarSuscripciones();
  }

  private limpiarSuscripciones() {
    if (this.sub) this.sub.unsubscribe();
    if (this.mqttSubscription) this.mqttSubscription.unsubscribe();
    if (this.medicionSubscription) this.medicionSubscription.unsubscribe();
    if (this.refreshMedicionesInterval) clearInterval(this.refreshMedicionesInterval);
  }

  private async actualizarModulo(modulo: any): Promise<any> {
    try {
      // Cargar mediciones
      const ultimaMedicion = await this.moduloService.getUltimaMedicion(modulo.moduloId);
      const medicionTempActual = ultimaMedicion?.valor_temp ?? modulo.medicionTempActual ?? '—';
      const medicionPressActual = ultimaMedicion?.valor_press ?? modulo.medicionPressActual ?? '—';
      
      // Cargar apuntes
      const apunte = await this.moduloService.getApunte(modulo.moduloId);
      const up = apunte?.up ?? modulo.up ?? 0.0;
      const down = apunte?.down ?? modulo.down ?? 0.0;
      
      // Cargar estado reset
      let estadoReset = modulo.estadoReset ?? null;
      try {
        const estadoResponse = await this.moduloService.getEstadoReset(modulo.moduloId);
        estadoReset = estadoResponse.estado;
      } catch (error) {
        // Mantener el valor anterior si falla
      }
      
      // Retornar módulo actualizado
      return {
        ...modulo,
        medicionTempActual,
        medicionPressActual,
        estadoReset,
        up,
        down,
        actualizandoEstado: false
      };
    } catch (error) {
      console.error(`Error actualizando módulo ${modulo.moduloId}:`, error);
      return modulo; // Retornar sin cambios si hay error
    }
  }
  
  // cargarModulosIniciales simplificado
  private async cargarModulosIniciales() {
    const modulos = await this.moduloService.getModulos();
    this.modulos = await Promise.all(
      modulos.map(modulo => this.actualizarModulo(modulo))
    );
  }
  
  // ionViewWillEnter actualiza en lugar de recargar
  async ionViewWillEnter() {
    console.log('👁️ Vista Home activada, actualizando módulos...');
    
    if (this.modulos.length === 0) {
      await this.cargarModulosIniciales();
    } else {
      // Actualizar módulos existentes sin reemplazar el array
      for (let i = 0; i < this.modulos.length; i++) {
        this.modulos[i] = await this.actualizarModulo(this.modulos[i]);
      }
    }
  }
  
  // iniciarActualizacionPeriodica también usa el mismo método
  private iniciarActualizacionPeriodica() {
    this.refreshMedicionesInterval = setInterval(async () => {
      try {
        console.log('🔄 Actualización periódica cada 2 minutos...');
        
        // Actualizar cada módulo
        for (let i = 0; i < this.modulos.length; i++) {
          this.modulos[i] = await this.actualizarModulo(this.modulos[i]);
        }
        
        console.log('✅ Actualización periódica completada');
      } catch (error) {
        console.error('❌ Error en actualización periódica:', error);
      }
    }, 120000); // Cada 2 minutos
    
    console.log('⏰ Actualización periódica configurada cada 2 minutos');
  }

  /**
   * Configurar suscripciones MQTT para recibir estados en tiempo real
   */
  private configurarSuscripcionesMQTT() {
    console.log('📡 Configurando suscripciones MQTT...');
    
    // Suscribirse al estado de conexión MQTT
    this.mqttService.connectionStatus$.subscribe(connected => {
      this.mqttConnected = connected;
      console.log(`🔌 Estado MQTT: ${connected ? 'CONECTADO' : 'DESCONECTADO'}`);
      
      if (connected) {
        // Solicitar estados iniciales cuando se conecte
        setTimeout(() => {
          this.mqttService.solicitarActualizacionTodos();
        }, 1000);
      }
    });

    // Suscribirse a actualizaciones de estado de módulos
    this.mqttSubscription = this.mqttService.moduloEstados$.subscribe(estadoModulo => {
      if (estadoModulo) {
        this.procesarActualizacionEstadoMQTT(estadoModulo);
      }
    });

    // Suscribirse a actualizaciones de mediciones
    this.medicionSubscription = this.mqttService.medicionUpdates$.subscribe(medicion => {
      if (medicion) {
        this.procesarActualizacionMedicion(medicion);
      }
    });
  }

  /**
   * Procesar actualización de estado recibida via MQTT
   */
  private procesarActualizacionEstadoMQTT(estadoModulo: ModuloEstado) {
    const { moduloId } = estadoModulo;
  
    console.log(`📡 Actualizando estado MQTT - Módulo ${moduloId}:`, estadoModulo);
    
    const modulo = this.modulos.find(m => m.moduloId === moduloId);
    if (!modulo) return;
    
    // Actualizar estado de conexión
    this.estadosConexion.set(moduloId, estadoModulo.estado_conexion);
    
    // 🎯 ACTUALIZAR VALORES DE APUNTES (NUEVO)
    if (estadoModulo.apuntes) {
      // Actualizar valores
      if (estadoModulo.apuntes.up_actual !== undefined) {
        modulo.up = estadoModulo.apuntes.up_actual;
      }
      if (estadoModulo.apuntes.down_actual !== undefined) {
        modulo.down = estadoModulo.apuntes.down_actual;
      }
      
      // Actualizar estados (colores)
      const { estado_up, estado_down } = estadoModulo.apuntes;
      this.estadosApuntes.set(moduloId, {
        up: estado_up || this.determinarEstadoApunte(estadoModulo, 'up'),
        down: estado_down || this.determinarEstadoApunte(estadoModulo, 'down')
      });
    }
    
    // Actualizar información técnica
    if (estadoModulo.info_tecnica) {
      if (estadoModulo.info_tecnica.version_firmware) {
        modulo.version = estadoModulo.info_tecnica.version_firmware;
      }
    }
    
    // Actualizar timestamp
    this.ultimaActualizacionMqtt = new Date();
    
    // Marcar módulo como no actualizando
    if (modulo) {
      modulo.actualizandoEstado = false;
    }
    
    console.log(`✅ Módulo ${moduloId} actualizado - UP: ${modulo.up}, DOWN: ${modulo.down}`);
  }

  /**
   * Procesar actualización de mediciones recibida via MQTT
   */
  private procesarActualizacionMedicion(medicion: any) {
    const modulo = this.modulos.find(m => m.moduloId === medicion.moduloId);
    if (modulo) {
      modulo.medicionTempActual = medicion.temperatura?.toFixed(1) || modulo.medicionTempActual;
      modulo.medicionPressActual = medicion.presion?.toFixed(1) || modulo.medicionPressActual;
      
      console.log(`🌡️ Mediciones actualizadas - Módulo ${medicion.moduloId}:`, {
        temp: medicion.temperatura,
        press: medicion.presion
      });
    }
  }

  /**
   * Determinar estado de apunte basado en valores esperados vs actuales
   */
  private determinarEstadoApunte(estadoModulo: ModuloEstado, tipo: 'up' | 'down'): string {
    if (estadoModulo.estado_conexion === 'OFFLINE') {
      return 'desconectado';
    }
    
    const apuntes = estadoModulo.apuntes;
    if (!apuntes) return 'desconocido';
    
    const esperado = tipo === 'up' ? apuntes.up_esperado : apuntes.down_esperado;
    const actual = tipo === 'up' ? apuntes.up_actual : apuntes.down_actual;
    
    if (esperado === undefined || actual === undefined) {
      return 'desconocido';
    }
    
    return esperado === actual ? 'correcto' : 'mismatch';
  }

  /**
   * Actualizar estado de conexión de un módulo específico (via MQTT)
   */
  async actualizarEstadoModulo(moduloId: number) {
    const modulo = this.modulos.find(m => m.moduloId === moduloId);
    if (!modulo) return;

    try {
      // Activar animación de carga
      modulo.actualizandoEstado = true;
      
      console.log(`🔄 Solicitando actualización MQTT del módulo ${moduloId}...`);
      
      // Solicitar actualización via MQTT
      this.mqttService.solicitarActualizacionModulo(moduloId);
      
      // Timeout para desactivar animación si no hay respuesta
      setTimeout(() => {
        if (modulo.actualizandoEstado) {
          modulo.actualizandoEstado = false;
          this.mostrarToast(`Timeout actualizando módulo ${moduloId}`, 'warning');
        }
      }, 3000); // 10 segundos de timeout
      
    } catch (error) {
      console.error(`❌ Error solicitando actualización del módulo ${moduloId}:`, error);
      modulo.actualizandoEstado = false;
      await this.mostrarToast(`Error al actualizar módulo ${moduloId}`, 'danger');
    }
  }

  /**
   * Actualizar estado de todos los módulos (Botón STATUS) - via MQTT
   */
  async actualizarEstadoTodos() {
    if (this.actualizandoEstadoGeneral) return;
    
    try {
      this.actualizandoEstadoGeneral = true;
      console.log('🔄 Solicitando actualización masiva via MQTT...');
      
      await this.mostrarToast('Solicitando actualización de todos los módulos...', 'primary');
      
      // Solicitar actualización de todos los módulos via MQTT
      this.mqttService.solicitarActualizacionTodos();
      
      // También marcar todos como actualizando
      this.modulos.forEach(modulo => {
        modulo.actualizandoEstado = true;
      });
      
      // Timeout para completar la actualización masiva
      setTimeout(() => {
        this.actualizandoEstadoGeneral = false;
        
        // Desmarcar módulos que aún estén actualizando
        this.modulos.forEach(modulo => {
          if (modulo.actualizandoEstado) {
            modulo.actualizandoEstado = false;
          }
        });
        
        // Mostrar resumen
        const conteoEstados = this.contarEstados();
        this.mostrarToast(
          `Actualización completada: ${conteoEstados.online} online, ${conteoEstados.offline} offline`,
          'success'
        );
        
      }, 5000); // 15 segundos para completar actualización masiva
      
    } catch (error) {
      console.error('❌ Error en actualización masiva MQTT:', error);
      this.actualizandoEstadoGeneral = false;
      await this.mostrarToast('Error en la actualización masiva', 'danger');
    }
  }

  // ===================== MÉTODOS DE INTERFAZ (sin cambios) =====================
  
  getEstadoConexion(moduloId: number): string {
    return this.estadosConexion.get(moduloId) || 'DESCONOCIDO';
  }

  getEstadoApunte(moduloId: number, tipo: 'up' | 'down'): string {
    const estados = this.estadosApuntes.get(moduloId);
    if (!estados) return 'desconocido';
    return estados[tipo] || 'desconocido';
  }

  getIconoApunte(moduloId: number, tipo: 'up' | 'down'): string {
    const estado = this.getEstadoApunte(moduloId, tipo);
    
    switch (estado) {
      case 'correcto': return 'checkmark-circle';
      case 'mismatch': return 'warning';
      case 'desconectado': return 'close-circle';
      default: return 'help-circle';
    }
  }

  getTituloEstado(moduloId: number): string {
    const estado = this.getEstadoConexion(moduloId);
    const fechaActualizacion = this.ultimaActualizacionMqtt?.toLocaleTimeString() || 'No disponible';
    
    switch (estado) {
      case 'ONLINE':
        return `Módulo ${moduloId}: En línea (${fechaActualizacion})`;
      case 'OFFLINE':
        return `Módulo ${moduloId}: Desconectado (${fechaActualizacion})`;
      case 'TIMEOUT':
        return `Módulo ${moduloId}: Sin respuesta (${fechaActualizacion})`;
      default:
        return `Módulo ${moduloId}: Estado desconocido`;
    }
  }

  private contarEstados(): {online: number, offline: number, timeout: number, desconocido: number} {
    const conteo = {online: 0, offline: 0, timeout: 0, desconocido: 0};
    
    this.estadosConexion.forEach(estado => {
      switch (estado) {
        case 'ONLINE': conteo.online++; break;
        case 'OFFLINE': conteo.offline++; break;
        case 'TIMEOUT': conteo.timeout++; break;
        default: conteo.desconocido++; break;
      }
    });
    
    return conteo;
  }

  private async mostrarToast(mensaje: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
    console.log(`Toast [${color}]: ${mensaje}`);
  }

  // ===================== MÉTODOS EXISTENTES (sin cambios significativos) =====================

  private inicializarEstados() {
    if (this.modulos) {
      this.modulos.forEach(modulo => {
        this.estadosConexion.set(modulo.moduloId, 'DESCONOCIDO');
        this.estadosApuntes.set(modulo.moduloId, {up: 'desconocido', down: 'desconocido'});
        modulo.actualizandoEstado = false;
      });
    }
  }

  private configurarResponsive() {
    this.verificarTamanioPantalla();
    window.addEventListener('resize', () => {
      this.verificarTamanioPantalla();
    });
  }

  private verificarTamanioPantalla() {
    this.mostrarNavegacion = window.innerWidth < 901;
    
    if (!this.mostrarNavegacion) {
      this.cuadranteActivo = 'norte';
    }
    
    if (this.mostrarNavegacion) {
      console.log(`📱 ${window.innerWidth < 768 ? 'Móvil' : 'Tablet'}: Cuadrante ${this.cuadranteActivo}`);
    }
  }

  // Métodos de navegación por cuadrantes
  cambiarCuadrante(cuadrante: string) {
    if (window.innerWidth < 901) {
      this.cuadranteActivo = cuadrante;
      console.log('Cambiando a cuadrante:', cuadrante);
      
      // Scroll suave al top para mejor UX
      document.querySelector('ion-content')?.scrollToTop(300);
    }
  }

  esCuadranteActivo(cuadrante: string): boolean {
    return window.innerWidth >= 901 || this.cuadranteActivo === cuadrante;
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

  // Métodos de control de módulos
  async encenderTodos() {
    try {
      await Promise.all(
        this.modulos.map(async (d) => {
          try {
            await this.moduloService.abrirReset(d.moduloId);
            d.estadoReset = true;
          } catch (err) {
            console.error(`Error encendiendo módulo ${d.moduloId}`, err);
          }
        })
      );
    } catch (err) {
      console.error('Error al encender todos los módulos', err);
    }
  }

  async apagarTodos() {
    try {
      await Promise.all(
        this.modulos.map(async (d) => {
          try {
            await this.moduloService.cerrarReset(d.moduloId);
            d.estadoReset = false;
          } catch (err) {
            console.error(`Error apagando módulo ${d.moduloId}`, err);
          }
        })
      );
    } catch (err) {
      console.error('Error al apagar todos los módulos', err);
    }
  }

  // Métodos de navegación
  verDetalle(moduloId: number) {
    console.log(`Ver detalle del módulo: ${moduloId}`);
    this.router.navigate([`/modulo`, moduloId]);
  }

  verMediciones(moduloId: number) {
    console.log(`Ver mediciones del módulo: ${moduloId}`);
    this.router.navigate([`/modulo`, moduloId, 'mediciones']);
  }

  // Propiedades para debug MQTT
  get estadoMqtt(): string {
    return this.mqttConnected ? 'Conectado' : 'Desconectado';
  }

  get tiempoUltimaActualizacionMqtt(): string {
    return this.ultimaActualizacionMqtt 
      ? this.ultimaActualizacionMqtt.toLocaleTimeString() 
      : 'Nunca';
  }
}