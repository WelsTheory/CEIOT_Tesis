import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ModuloService } from '../services/modulo.service';
import { ThemeToggleComponent } from '../components/theme-toggle/theme-toggle.component';

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonIcon,
  IonText,
  IonSegment,           
  IonSegmentButton,
  IonInput,          // Agregar para filtros de fecha
  IonGrid,           // Agregar para layout
  IonRow,            // Agregar para layout
  IonCol,            // Agregar para layout     
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { barChart, list, calendar } from 'ionicons/icons';

@Component({
  selector: 'app-mediciones',
  templateUrl: './mediciones.page.html',
  styleUrls: ['./mediciones.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonButtons,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonIcon,
    IonText,
    IonSegment,        
    IonSegmentButton,
    IonInput,          // Agregar para filtros de fecha
    IonGrid,           // Agregar para layout
    IonRow,            // Agregar para layout
    IonCol,             // Agregar para layout
    ThemeToggleComponent
 ]
})
export class MedicionesPage implements OnInit {
  moduloId!: number;
  mediciones: { medicionId: number; fecha: string; valor_temp: string; valor_press: string;}[] = [];
  medicionesFiltradas: { medicionId: number; fecha: string; valor_temp: string; valor_press: string;}[] = [];
  tipoSeleccionado: 'temperatura' | 'presion' = 'temperatura';
  vistaGrafico: boolean = false;
  datosGrafico: any[] = [];

  // Nuevas propiedades para tooltip
  mostrarTooltip: boolean = false;
  tooltipData: any = null;
  tooltipPosition: { x: number; y: number } = { x: 0, y: 0 };

  // Nuevas propiedades para filtros de fecha
  fechaInicio: string = '';
  fechaFin: string = '';
  medicionesOriginales: { medicionId: number; fecha: string; valor_temp: string; valor_press: string; }[] = [];

  // Métodos para manejar cambios de fecha
  onFechaInicioChange(event: any) {
    this.fechaInicio = event.detail.value;
    this.aplicarFiltroFecha();
  }

  onFechaFinChange(event: any) {
    this.fechaFin = event.detail.value;
    this.aplicarFiltroFecha();
  }

  constructor(
    private route: ActivatedRoute,
    private moduloService: ModuloService,
    private router: Router
  ) {
    addIcons({
      'bar-chart':barChart, 
      'list': list,
      'calendar': calendar
    });
  }

  async ngOnInit() {
    this.moduloId = Number(this.route.snapshot.paramMap.get('id'));
    await this.cargarMediciones();
    this.inicializarFiltrosFecha();
    await this.aplicarFiltro();
  }

  inicializarFiltrosFecha() {
    if (this.mediciones.length > 0) {
      // Ordenar mediciones por fecha
      const medicionesOrdenadas = [...this.mediciones].sort((a, b) => 
        new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      );
      
      // Fecha más antigua
      const fechaMasAntigua = new Date(medicionesOrdenadas[0].fecha);
      this.fechaInicio = fechaMasAntigua.toISOString().slice(0, 16); // formato datetime-local
      
      // Fecha actual
      const ahora = new Date();
      this.fechaFin = ahora.toISOString().slice(0, 16);
    }
  }

  aplicarFiltroFecha() {
    let medicionesFiltradas = [...this.medicionesOriginales];
    
    // Aplicar filtro por fechas si están definidas
    if (this.fechaInicio) {
      const fechaInicioDate = new Date(this.fechaInicio);
      medicionesFiltradas = medicionesFiltradas.filter(m => 
        new Date(m.fecha) >= fechaInicioDate
      );
    }
    
    if (this.fechaFin) {
      const fechaFinDate = new Date(this.fechaFin);
      medicionesFiltradas = medicionesFiltradas.filter(m => 
        new Date(m.fecha) <= fechaFinDate
      );
    }
    
    this.mediciones = medicionesFiltradas;
    this.aplicarFiltro();
  }

  limpiarFiltrosFecha() {
    this.mediciones = [...this.medicionesOriginales];
    this.inicializarFiltrosFecha();
    this.aplicarFiltro();
  }

  // Métodos para tooltip
  mostrarTooltipEnPunto(event: MouseEvent, dato: any, index: number) {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const contenedor = (event.target as HTMLElement).closest('.grafico-container');
    const contenedorRect = contenedor?.getBoundingClientRect();
    
    if (contenedorRect) {
      this.tooltipPosition = {
        x: rect.left - contenedorRect.left + rect.width / 2,
        y: rect.top - contenedorRect.top - 10
      };
      
      this.tooltipData = {
        fecha: dato.fecha,
        valor: dato.valor,
        unidad: this.tipoSeleccionado === 'temperatura' ? '°C' : 'hPa',
        tipo: this.tipoSeleccionado
      };
      
      this.mostrarTooltip = true;
    }
  }

  ocultarTooltip() {
    this.mostrarTooltip = false;
    this.tooltipData = null;
  }

  // Método para alternar entre vista de lista y gráfico
  toggleVistaGrafico() {
    this.vistaGrafico = !this.vistaGrafico;
    if (this.vistaGrafico) {
      this.prepararDatosGrafico();
    }
  }

  prepararDatosGrafico() {
    // Preparar datos para el gráfico (invertir orden para mostrar cronológicamente)
    const datosOrdenados = [...this.medicionesFiltradas].reverse();
    
    this.datosGrafico = datosOrdenados.map((medicion, index) => {
      const fecha = new Date(medicion.fecha);
      const fechaFormateada = fecha.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const valor = parseFloat(this.obtenerValorMedicion(medicion)) || 0;
      
      return {
        fecha: fechaFormateada,
        fechaCompleta: medicion.fecha,
        valor: valor,
        indice: index + 1
      };
    });
  }

  seleccionarTipo(tipo: 'temperatura' | 'presion'| undefined) {
    if (tipo === 'temperatura' || tipo === 'presion') {
      this.tipoSeleccionado = tipo;
      this.aplicarFiltro();
    }
  }

  // Método alternativo más específico para el segment
  onSegmentChange(event: any) {
    const valor = event.detail.value as 'temperatura' | 'presion';
    if (valor === 'temperatura' || valor === 'presion') {
      this.tipoSeleccionado = valor;
      this.aplicarFiltro();
      if (this.vistaGrafico) {
        this.prepararDatosGrafico();
      }
      console.log('Datos de: ', valor);
    }
  }

  obtenerColorGrafico(): string {
    return this.tipoSeleccionado === 'temperatura' ? '#ff6b6b' : '#4ecdc4';
  }

  calcularPorcentajeAltura(valor: number): number {
    if (this.datosGrafico.length === 0) return 0;
    
    const valores = this.datosGrafico.map(d => d.valor);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const rango = max - min || 1;
    
    return ((valor - min) / rango) * 80 + 10; // 10% margen inferior, 80% rango útil
  }

  obtenerPuntosLinea(): string {
    if (this.datosGrafico.length === 0) return '';
    
    const puntos = this.datosGrafico.map((dato, index) => {
      const x = (index / (this.datosGrafico.length - 1)) * 100;
      const y = 100 - this.calcularPorcentajeAltura(dato.valor); // Invertir Y para SVG
      return `${x},${y}`;
    });
    
    return puntos.join(' ');
  }

  aplicarFiltro() {
    if (this.tipoSeleccionado === 'temperatura') {
      // Filtrar mediciones que tengan valor_temp (no vacío)
      this.medicionesFiltradas = this.mediciones.filter(m => 
        m.valor_temp !== undefined && 
        m.valor_temp !== null && 
        m.valor_temp !== ''
      );
    } else {
      // Filtrar mediciones que tengan valor_press (no vacío)
      this.medicionesFiltradas = this.mediciones.filter(m => 
        m.valor_press !== undefined && 
        m.valor_press !== null && 
        m.valor_press !== ''
      );
    }
    
    if (this.vistaGrafico) {
      this.prepararDatosGrafico();
    }
  }

  obtenerValorMedicion(medicion: { medicionId: number; fecha: string; valor_temp: string; valor_press: string}): string {
    return this.tipoSeleccionado === 'temperatura' ? 
           medicion.valor_temp : medicion.valor_press;
  }

  async cargarMediciones() {
    try {
      this.mediciones = await this.moduloService.getMediciones(this.moduloId);
      this.medicionesOriginales = [...this.mediciones]; // Guardar copia original
    } catch (error) {
      console.error('Error al cargar las mediciones:', error);
    }
  }

  trackByFecha(index: number, medicion: any) {
    return medicion.fecha;
  }

  volverAlHome() {
    this.router.navigate(['/home']);
  }
}
