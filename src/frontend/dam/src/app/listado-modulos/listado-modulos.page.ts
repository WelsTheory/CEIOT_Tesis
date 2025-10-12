import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonChip, IonContent, IonHeader, IonIcon, IonLabel, IonTitle, IonToolbar, IonGrid, IonRow, IonCol } from '@ionic/angular/standalone';
import { Observable, Subscription, fromEvent, interval } from 'rxjs';
import { ModuloService } from '../services/modulo.service';
import { ActivatedRoute } from '@angular/router';
import { Modulo } from '../listado-modulos/modulo';
import { Router } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ThemeToggleComponent } from '../components/theme-toggle/theme-toggle.component';
import { MqttService } from '../services/mqtt.service';

@Component({
  selector: 'app-modulo',
  templateUrl: './listado-modulos.page.html',
  styleUrls: ['./listado-modulos.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButton,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, 
    IonLabel, IonChip, IonIcon, IonGrid, IonRow, IonCol,
    CommonModule, ThemeToggleComponent
  ], 
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ModuloPage implements OnInit {

  modulo!: Modulo;
  moduloId!: number;
  estadoReset: boolean | null = null;
  ultimaMedicion: { fecha: string; valor_temp: string; valor_press: string; } | null = null;
  ultimoApunte: { up: number; down: number; } | null = null;
  
  // Variables para la información adicional del sistema
  informacionSistema: {
    memoriaLibre?: number;
    temperaturaInterna?: number;
    voltajeAlimentacion?: number;
    direccionIP?: string;
    firmware?: string;
    direccionMAC?: string;
  } = {};

  // Suscripción para actualizaciones automáticas
  private actualizacionSubscription?: Subscription;
  private mqttSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private moduloService: ModuloService,
    private resetService: ModuloService,
    private router: Router,
    private mqttService: MqttService  // ← AGREGAR
  ) {}

  async cargarUltimaMedicion() {
    try {
      this.ultimaMedicion = await this.moduloService.getUltimaMedicion(this.moduloId);
      console.log('Última medición cargada:', this.ultimaMedicion);
    } catch (error) {
      console.error('Error al cargar la última medición:', error);
    }
  }

  async cargarApunte() {
    try {
      const apunte = await this.moduloService.getApunte(this.moduloId);
      console.log('Apunte cargado:', apunte);
      this.ultimoApunte = apunte;
    } catch (error) {
      console.error('Error al cargar el apunte:', error);
    }
  }

  async cargarInformacionSistema() {
    try {
      // Llamar al nuevo endpoint para obtener información del sistema
      const infoSistema = await this.moduloService.getInformacionSistema(this.moduloId);
      this.informacionSistema = infoSistema;
      
      // También actualizar el objeto modulo con esta información
      this.modulo = {
        ...this.modulo,
        memoriaLibre: infoSistema.memoriaLibre,
        temperaturaInterna: infoSistema.temperaturaInterna,
        voltajeAlimentacion: infoSistema.voltajeAlimentacion,
        direccionIP: infoSistema.direccionIP,
        firmware: infoSistema.firmware,
        direccionMAC: infoSistema.direccionMAC
      };
      
      console.log('Información del sistema cargada:', this.informacionSistema);
    } catch (error) {
      console.error('Error al cargar la información del sistema:', error);
      // Valores por defecto en caso de error
      this.informacionSistema = {
        memoriaLibre: undefined,
        temperaturaInterna: undefined,
        voltajeAlimentacion: undefined,
        direccionIP: undefined,
        firmware: undefined,
        direccionMAC: undefined
      };
    }
  }

  async ngOnInit() {
    this.moduloId = Number(this.route.snapshot.paramMap.get('id'));
    
    // Cargar toda la información inicial
    await this.cargarmodulo();
    await this.cargarEstadoReset();
    await this.cargarUltimaMedicion();
    await this.cargarApunte();
    await this.cargarInformacionSistema();
    
    // Configurar actualización automática cada 30 segundos
    this.iniciarActualizacionAutomatica();

    this.suscribirMQTT();
  }

  ngOnDestroy() {
    // Limpiar suscripciones al destruir el componente
    if (this.actualizacionSubscription) {
      this.actualizacionSubscription.unsubscribe();
    }
    if (this.mqttSubscription) {
      this.mqttSubscription.unsubscribe();
    }
  }

  private iniciarActualizacionAutomatica() {
    // Actualizar cada 30 segundos
    this.actualizacionSubscription = interval(30000).subscribe(() => {
      this.actualizarDatos();
    });
  }

  private async actualizarDatos() {
    try {
      // Actualizar solo los datos que cambian frecuentemente
      await Promise.all([
        this.cargarEstadoReset(),
        this.cargarUltimaMedicion(),
        this.cargarInformacionSistema()
      ]);
      console.log('Datos actualizados automáticamente');
    } catch (error) {
      console.error('Error en actualización automática:', error);
    }
  }

  async cargarEstadoReset() {
    try {
      const estadoResponse = await this.moduloService.getEstadoReset(this.moduloId);
      this.estadoReset = estadoResponse.estado;
    } catch (error) {
      console.error('Error al obtener el reinicio del módulo:', error);
      this.estadoReset = null;
    }
  }

  async cargarmodulo() {
    try {
      this.modulo = await this.moduloService.getModuloById(this.moduloId);
      console.log('Módulo cargado:', this.modulo);
    } catch (error) {
      console.error('Error al cargar el módulo:', error);
    }
  }

  async cambiarEstadoReset(reinicio: boolean) {
    try {
      await this.moduloService.cambiarEstadoReset(this.moduloId, reinicio);
      
      // Actualizar el estado local inmediatamente
      this.estadoReset = reinicio;
      
      // Mostrar mensaje de confirmación
      const mensaje = reinicio ? 'Módulo encendido correctamente' : 'Módulo apagado correctamente';
      alert(mensaje);
      
      // Actualizar la información del sistema después del cambio de estado
      setTimeout(() => {
        this.cargarInformacionSistema();
      }, 1000);
      
    } catch (error) {
      console.error('Error al cambiar el estado del reinicio:', error);
      alert('No se pudo cambiar el estado del módulo.');
    }
  }

  verMediciones() {
    console.log('Navegando a mediciones del módulo:', this.modulo);
    this.router.navigate(['/modulo', this.moduloId,'mediciones']);
  }

  // Nuevo método para navegar al historial de apuntes
  verHistorialApuntes() {
    console.log('Navegando al historial de apuntes del módulo:', this.moduloId);
    this.router.navigate(['/modulo', this.moduloId,'apuntes']);
  }
  
  async abrirReset(moduloId: number) {
    try {
      await this.moduloService.abrirReset(moduloId);
      alert('Módulo encendido exitosamente');
      this.actualizarEstadoReset();
      this.moduloService.setResetState(moduloId, true);
    } catch (error) {
      console.error('Error al encender el módulo:', error);
      alert('No se pudo encender el módulo');
    }
  }
  
  async cerrarReset(moduloId: number) {
    try {
      await this.moduloService.cerrarReset(moduloId);
      alert('Módulo apagado exitosamente');
      this.actualizarEstadoReset();
      this.moduloService.setResetState(moduloId, false);
    } catch (error) {
      console.error('Error al apagar el módulo:', error);
      alert('No se pudo apagar el módulo');
    }
  }
  
  private async actualizarEstadoReset() {
    try {
      const estadoResponse = await this.moduloService.getEstadoReset(this.moduloId);
      this.estadoReset = estadoResponse.estado;
    } catch (error) {
      console.error('Error al actualizar el reinicio del módulo:', error);
    }
  }

  private suscribirMQTT() {
    this.mqttSubscription = this.mqttService.moduloEstados$.subscribe(estadoModulo => {
      if (estadoModulo && estadoModulo.moduloId === this.moduloId) {
        console.log('📡 Actualización MQTT recibida para módulo', this.moduloId, estadoModulo);
        
        // Actualizar info técnica en tiempo real
        if (estadoModulo.info_tecnica) {
          this.informacionSistema = {
            ...this.informacionSistema,
            temperaturaInterna: estadoModulo.info_tecnica.temperatura_interna,
            voltajeAlimentacion: estadoModulo.info_tecnica.voltaje_alimentacion,
            direccionIP: estadoModulo.info_tecnica.ip_address,
            firmware: estadoModulo.info_tecnica.version_firmware
          };
          
          // También actualizar el objeto modulo
          this.modulo = {
            ...this.modulo,
            temperaturaInterna: estadoModulo.info_tecnica.temperatura_interna,
            voltajeAlimentacion: estadoModulo.info_tecnica.voltaje_alimentacion,
            direccionIP: estadoModulo.info_tecnica.ip_address,
            firmware: estadoModulo.info_tecnica.version_firmware
          };
        }
      }
    });
  }

  toggleReset(newState: boolean) {
    this.resetService.setResetState(this.moduloId, newState);
  }

  volverAlHome() {
    this.router.navigate(['/home']);
  }

  // Método auxiliar para mostrar valores con formato
  formatearValor(valor: any, unidad: string = '', valorPorDefecto: string = 'N/A'): string {
    if (valor === null || valor === undefined || valor === '') {
      return valorPorDefecto;
    }
    return `${valor}${unidad}`;
  }

  // Método auxiliar para mostrar direcciones MAC e IP formateadas
  formatearDireccion(direccion: string | undefined): string {
    if (!direccion) return 'N/A';
    return direccion.toUpperCase();
  }
}
