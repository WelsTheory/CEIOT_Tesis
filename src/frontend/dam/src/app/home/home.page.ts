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
  cuadranteActivo: string = 'norte'; // Cuadrante seleccionado
  mostrarNavegacion: boolean = false; // Controla la visibilidad del menú de navegación
  private sub!: Subscription;
  private refreshMedicionesInterval: any;
  private mqttSubscription!: Subscription;

  estadosConexion: Map<number, string> = new Map(); // moduloId -> estado
  estadosApuntes: Map<number, {up: string, down: string}> = new Map(); // moduloId -> estados apuntes
  actualizandoEstadoGeneral: boolean = false;
  intervalosActualizacion: any[] = []; // Para limpiar intervalos

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

      this.configurarResponsive();

      this.inicializarEstados();
      this.configurarActualizacionAutomatica();
      
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
    this.limpiarIntervalos();
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

  // Configurar responsive con breakpoints específicos
  private configurarResponsive() {
    this.evaluarTamañoPantalla();
    
    // Escuchar cambios de tamaño con debounce
    let resizeTimer: any;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.evaluarTamañoPantalla();
      }, 150);
    });
  }

  // Evaluar tamaño de pantalla y ajustar comportamiento
  private evaluarTamañoPantalla() {
    const ancho = window.innerWidth;
    
    if (ancho >= 901) {
      // Desktop: Mostrar todos los cuadrantes
      this.cuadranteActivo = 'todos';
      this.mostrarNavegacion = false;
      console.log('Modo Desktop: Todos los cuadrantes visibles');
    } else {
      // Tablet/Móvil: Mostrar navegación y un cuadrante
      this.mostrarNavegacion = true;
      if (this.cuadranteActivo === 'todos') {
        this.cuadranteActivo = 'norte'; // Default
      }
      console.log(`Modo ${ancho <= 480 ? 'Móvil' : 'Tablet'}: Cuadrante ${this.cuadranteActivo}`);
    }
  }

  /**
   * Inicializar estados de conexión y apuntes para todos los módulos
   */
  private inicializarEstados() {
    if (this.modulos) {
      this.modulos.forEach(modulo => {
        // Estado inicial como DESCONOCIDO
        this.estadosConexion.set(modulo.moduloId, 'DESCONOCIDO');
        this.estadosApuntes.set(modulo.moduloId, {up: 'desconocido', down: 'desconocido'});
        
        // Agregar propiedad para animación de carga
        modulo.actualizandoEstado = false;
      });
    }
  }

  /**
   * Configurar actualización automática de estados cada 30 segundos
   */
  private configurarActualizacionAutomatica() {
    const intervalo = setInterval(() => {
      this.actualizarEstadosTodos();
    }, 30000); // 30 segundos
    
    this.intervalosActualizacion.push(intervalo);
  }

  /**
   * Limpiar todos los intervalos al destruir el componente
   */
  private limpiarIntervalos() {
    this.intervalosActualizacion.forEach(intervalo => clearInterval(intervalo));
    this.intervalosActualizacion = [];
  }

  /**
   * Obtener estado de conexión de un módulo específico
   */
  getEstadoConexion(moduloId: number): string {
    return this.estadosConexion.get(moduloId) || 'DESCONOCIDO';
  }

  /**
   * Obtener estado de apunte (UP o DOWN) de un módulo específico
   */
  getEstadoApunte(moduloId: number, tipo: 'up' | 'down'): string {
    const estados = this.estadosApuntes.get(moduloId);
    if (!estados) return 'desconocido';
    return estados[tipo] || 'desconocido';
  }

  /**
   * Obtener ícono apropiado para el estado del apunte
   */
  getIconoApunte(moduloId: number, tipo: 'up' | 'down'): string {
    const estado = this.getEstadoApunte(moduloId, tipo);
    
    switch (estado) {
      case 'correcto':
        return 'checkmark-circle';
      case 'mismatch':
        return 'warning';
      case 'desconectado':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  }

  /**
   * Obtener título descriptivo para el estado de conexión
   */
  getTituloEstado(moduloId: number): string {
    const estado = this.getEstadoConexion(moduloId);
    const fechaActualizacion = new Date().toLocaleTimeString();
    
    switch (estado) {
      case 'ONLINE':
        return `Módulo ${moduloId}: En línea (${fechaActualizacion})`;
      case 'OFFLINE':
        return `Módulo ${moduloId}: Desconectado (${fechaActualizacion})`;
      case 'TIMEOUT':
        return `Módulo ${moduloId}: Sin respuesta (${fechaActualizacion})`;
      default:
        return `Módulo ${moduloId}: Estado desconocido (${fechaActualizacion})`;
    }
  }

  /**
   * Actualizar estado de conexión de un módulo específico
   */
  async actualizarEstadoModulo(moduloId: number) {
    const modulo = this.modulos.find(m => m.moduloId === moduloId);
    if (!modulo) return;

    try {
      // Activar animación de carga
      modulo.actualizandoEstado = true;
      
      console.log(`🔄 Actualizando estado del módulo ${moduloId}...`);
      
      // Simular consulta al backend para obtener estado actual
      const estadoActual = await this.consultarEstadoModulo(moduloId);
      const estadosApuntes = await this.verificarApuntesModulo(moduloId);
      
      // Actualizar estados
      this.estadosConexion.set(moduloId, estadoActual.conexion);
      this.estadosApuntes.set(moduloId, estadosApuntes);
      
      console.log(`✅ Estado actualizado - Módulo ${moduloId}: ${estadoActual.conexion}`);
      
      // Mostrar toast de confirmación
      await this.mostrarToast(
        `Módulo ${moduloId} actualizado: ${estadoActual.conexion}`, 
        estadoActual.conexion === 'ONLINE' ? 'success' : 'warning'
      );
      
    } catch (error) {
      console.error(`❌ Error actualizando estado del módulo ${moduloId}:`, error);
      
      // En caso de error, marcar como desconectado
      this.estadosConexion.set(moduloId, 'OFFLINE');
      this.estadosApuntes.set(moduloId, {up: 'desconectado', down: 'desconectado'});
      
      await this.mostrarToast(`Error al actualizar módulo ${moduloId}`, 'danger');
      
    } finally {
      // Desactivar animación de carga
      modulo.actualizandoEstado = false;
    }
  }

  /**
   * Actualizar estado de todos los módulos (Botón STATUS)
   */
  async actualizarEstadoTodos() {
    if (this.actualizandoEstadoGeneral) return;
    
    try {
      this.actualizandoEstadoGeneral = true;
      console.log('🔄 Actualizando estado de todos los módulos...');
      
      await this.mostrarToast('Actualizando estado de todos los módulos...', 'primary');
      
      // Actualizar todos los módulos en paralelo
      const promesasActualizacion = this.modulos.map(modulo => 
        this.actualizarEstadoModuloSilencioso(modulo.moduloId)
      );
      
      await Promise.all(promesasActualizacion);
      
      // Contar estados
      const conteoEstados = this.contarEstados();
      
      console.log('✅ Actualización masiva completada:', conteoEstados);
      
      await this.mostrarToast(
        `Actualización completa: ${conteoEstados.online} online, ${conteoEstados.offline} offline, ${conteoEstados.timeout} timeout`, 
        'success'
      );
      
    } catch (error) {
      console.error('❌ Error en actualización masiva:', error);
      await this.mostrarToast('Error en la actualización masiva', 'danger');
      
    } finally {
      this.actualizandoEstadoGeneral = false;
    }
  }

  /**
   * Actualizar estado de un módulo sin mostrar toast individual
   */
  private async actualizarEstadoModuloSilencioso(moduloId: number) {
    try {
      const estadoActual = await this.consultarEstadoModulo(moduloId);
      const estadosApuntes = await this.verificarApuntesModulo(moduloId);
      
      this.estadosConexion.set(moduloId, estadoActual.conexion);
      this.estadosApuntes.set(moduloId, estadosApuntes);
      
    } catch (error) {
      console.error(`Error consultando módulo ${moduloId}:`, error);
      this.estadosConexion.set(moduloId, 'OFFLINE');
      this.estadosApuntes.set(moduloId, {up: 'desconectado', down: 'desconectado'});
    }
  }

  /**
   * Actualizar estados de todos los módulos (sin interfaz de usuario)
   */
  private async actualizarEstadosTodos() {
    try {
      const promesas = this.modulos.map(modulo => 
        this.actualizarEstadoModuloSilencioso(modulo.moduloId)
      );
      
      await Promise.all(promesas);
      console.log('🔄 Actualización automática completada');
      
    } catch (error) {
      console.error('❌ Error en actualización automática:', error);
    }
  }

  /**
   * Consultar estado actual de un módulo desde el backend
   */
  private async consultarEstadoModulo(moduloId: number): Promise<{conexion: string, ultimoHeartbeat: Date}> {
    try {
      // Aquí iría la llamada real al backend
      // const response = await this.moduloService.getEstadoConexion(moduloId);
      
      // Por ahora, simulamos la respuesta
      await this.delay(500 + Math.random() * 1000); // Simular latencia
      
      // Simular diferentes estados basado en el módulo ID
      const estados = ['ONLINE', 'OFFLINE', 'TIMEOUT'];
      const probabilidades = [0.7, 0.2, 0.1]; // 70% online, 20% offline, 10% timeout
      
      const random = Math.random();
      let estadoSeleccionado = 'DESCONOCIDO';
      
      if (random < probabilidades[0]) {
        estadoSeleccionado = 'ONLINE';
      } else if (random < probabilidades[0] + probabilidades[1]) {
        estadoSeleccionado = 'OFFLINE';
      } else {
        estadoSeleccionado = 'TIMEOUT';
      }
      
      return {
        conexion: estadoSeleccionado,
        ultimoHeartbeat: new Date()
      };
      
    } catch (error) {
      console.error(`Error consultando estado del módulo ${moduloId}:`, error);
      return {
        conexion: 'OFFLINE',
        ultimoHeartbeat: new Date()
      };
    }
  }

  /**
   * Verificar estado de los apuntes UP/DOWN de un módulo
   */
  private async verificarApuntesModulo(moduloId: number): Promise<{up: string, down: string}> {
    try {
      // Aquí iría la llamada real al backend para verificar apuntes
      // const response = await this.moduloService.verificarApuntes(moduloId);
      
      await this.delay(300 + Math.random() * 500);
      
      // Simular estados de apuntes
      const estados = ['correcto', 'mismatch', 'desconectado'];
      const probabilidades = [0.8, 0.15, 0.05]; // 80% correcto, 15% mismatch, 5% desconectado
      
      const getEstadoSimulado = () => {
        const random = Math.random();
        if (random < probabilidades[0]) return 'correcto';
        if (random < probabilidades[0] + probabilidades[1]) return 'mismatch';
        return 'desconectado';
      };
      
      return {
        up: getEstadoSimulado(),
        down: getEstadoSimulado()
      };
      
    } catch (error) {
      console.error(`Error verificando apuntes del módulo ${moduloId}:`, error);
      return {
        up: 'desconectado',
        down: 'desconectado'
      };
    }
  }

  /**
   * Contar módulos por estado de conexión
   */
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

  /**
   * Mostrar toast con mensaje
   */
  private async mostrarToast(mensaje: string, color: string = 'primary') {
    // Aquí implementarías la lógica del toast
    // Por ejemplo usando ToastController de Ionic
    console.log(`Toast [${color}]: ${mensaje}`);
  }

  /**
   * Delay para simulaciones
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Método mejorado para cambiar cuadrante
  cambiarCuadrante(cuadrante: string) {
    if (window.innerWidth < 901) {
      this.cuadranteActivo = cuadrante;
      console.log('Cambiando a cuadrante:', cuadrante);
      
      // Scroll suave al top para mejor UX
      document.querySelector('ion-content')?.scrollToTop(300);
    }
  }

  // Verificar si un cuadrante debe estar activo
  esCuadranteActivo(cuadrante: string): boolean {
    return window.innerWidth >= 901 || this.cuadranteActivo === cuadrante;
  }

  // Obtener clase CSS para cuadrante
  getClaseCuadrante(cuadrante: string): string {
    const clases = [`cuadrante-${cuadrante}`];
    
    if (this.esCuadranteActivo(cuadrante)) {
      clases.push('cuadrante-activo');
    }
    
    return clases.join(' ');
  }
  // Métodos adicionales para mejor UX
  
  // Obtener número de módulos por cuadrante (para mostrar en navegación)
  getNumeroModulos(cuadrante: string): number {
    switch(cuadrante.toLowerCase()) {
      case 'norte': return this.getModulosNorte().length;
      case 'este': return this.getModulosEste().length;
      case 'oeste': return this.getModulosOeste().length;
      case 'sur': return this.getModulosSur().length;
      default: return 0;
    }
  }

  // Obtener información del cuadrante activo
  getInfoCuadranteActivo() {
    return {
      nombre: this.cuadranteActivo.charAt(0).toUpperCase() + this.cuadranteActivo.slice(1),
      cantidad: this.getNumeroModulos(this.cuadranteActivo),
      modulos: this.getModulosPorCuadrante(this.cuadranteActivo)
    };
  }

  // Obtener módulos de un cuadrante específico
  getModulosPorCuadrante(cuadrante: string) {
    switch(cuadrante.toLowerCase()) {
      case 'norte': return this.getModulosNorte();
      case 'este': return this.getModulosEste();
      case 'oeste': return this.getModulosOeste();
      case 'sur': return this.getModulosSur();
      default: return [];
    }
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



