import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ModuloService } from '../services/modulo.service';

// Ionic standalone imports
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
  IonSegment,           // ← Agregar esta línea
  IonSegmentButton     // ← Agregar esta línea
} from '@ionic/angular/standalone';

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
    IonSegment,           // ← Agregar esta línea
    IonSegmentButton     // ← Agregar esta línea
  ]
})
export class MedicionesPage implements OnInit {
  moduloId!: number;
  mediciones: { medicionId: number; fecha: string; valor_temp: string; valor_press: string; }[] = [];
  medicionesFiltradas: { medicionId: number; fecha: string; valor_temp: string; valor_press: string; }[] = [];
  tipoSeleccionado: 'temperatura' | 'presion' = 'temperatura';

  constructor(
    private route: ActivatedRoute,
    private moduloService: ModuloService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.moduloId = Number(this.route.snapshot.paramMap.get('id'));
    await this.cargarMediciones();
    await this.aplicarFiltro();
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
      console.log('Datos de: ', valor);
    }
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
  }

  obtenerValorMedicion(medicion: { medicionId: number; fecha: string; valor_temp: string; valor_press: string; }): string {
    return this.tipoSeleccionado === 'temperatura' ? 
           medicion.valor_temp : medicion.valor_press;
  }

  async cargarMediciones() {
    try {
      this.mediciones = await this.moduloService.getMediciones(this.moduloId);
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
