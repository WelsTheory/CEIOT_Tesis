import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonChip, IonContent, IonHeader, IonIcon, IonLabel, IonTitle, IonToolbar, } from '@ionic/angular/standalone';
import { Observable, Subscription, fromEvent, interval } from 'rxjs';
import { ModuloService } from '../services/modulo.service';
import { ActivatedRoute } from '@angular/router';
import { Modulo } from '../listado-modulos/modulo';
import { Router } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';


@Component({
  selector: 'app-modulo',
  templateUrl: './listado-modulos.page.html',
  styleUrls: ['./listado-modulos.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent, 
    IonLabel,       
    IonChip,       
    IonIcon,     
    CommonModule,], schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ModuloPage implements OnInit{

  modulo!: Modulo;
  moduloId!: number;
  estadoReset: boolean | null = null;
  ultimaMedicion: { fecha: string; valor: string } | null = null;


  constructor(
    private route: ActivatedRoute,
    private moduloService: ModuloService,
    private resetService: ModuloService,
    private router: Router
  ) {}

  async cargarUltimaMedicion() {
    try {
      this.ultimaMedicion = await this.moduloService.getUltimaMedicion(this.moduloId);
    } catch (error) {
      console.error('Error al cargar la última medición:', error);
    }
  }
  async ngOnInit() {
    this.moduloId = Number(this.route.snapshot.paramMap.get('id'));
    await this.cargarmodulo();
    try {
      const estadoResponse = await this.moduloService.getEstadoReset(this.moduloId);
      this.estadoReset = estadoResponse.estado;
    } catch (error) {
      console.error('Error al obtener el reinicio del módulo:', error);
      this.estadoReset = null;
    }
    await this.cargarUltimaMedicion();
  }
  async cargarmodulo() {
    try {
      this.modulo = await this.moduloService.getModuloById(this.moduloId);
      console.log('modulo cargado:', this.modulo);
    } catch (error) {
      console.error('Error al cargar el modulo:', error);
    }
  }

  async cambiarEstadoReset(reinicio: boolean) {
    try {
      await this.moduloService.cambiarEstadoReset(
        this.moduloId,
        reinicio
      );
      alert(` ${reinicio ? 'abierto' : 'cerrado'} correctamente`);
    } catch (error) {
      console.error('Error al cambiar el estado del reinicio :', error);
      alert('No se pudo cambiar el reinicio del módulo.');
    }
  }
  verMediciones() {
    console.log('Es aqui:',this.modulo);
    this.router.navigate([`/modulo`, this.moduloId, 'mediciones']);
  }
  
  async abrirReset(moduloId: number) {
    try {
      await this.moduloService.abrirReset(moduloId);
      alert('Válvula abierta exitosamente');
      this.actualizarEstadoReset();
      this.moduloService.setResetState(moduloId, true); // ✅ Notifica a Home
    } catch (error) {
      console.error('Error al abrir la válvula:', error);
      alert('No se pudo abrir la válvula');
    }
  }
  
  async cerrarReset(moduloId: number) {
    try {
      await this.moduloService.cerrarReset(moduloId);
      alert('Válvula cerrada exitosamente');
      this.actualizarEstadoReset();
      this.moduloService.setResetState(moduloId, false); // ✅ Notifica a Home
    } catch (error) {
      console.error('Error al cerrar la válvula:', error);
      alert('No se pudo cerrar la válvula');
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

  toggleReset(newState: boolean) {
    this.resetService.setResetState(this.moduloId, newState);
  }
  

  volverAlHome() {
    this.router.navigate(['/home']);
  }
  
}
