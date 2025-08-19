import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonChip, IonContent, IonHeader, IonIcon, IonLabel, IonTitle, IonToolbar, } from '@ionic/angular/standalone';
import { Observable, Subscription, fromEvent, interval } from 'rxjs';
import { DispositivoService } from '../services/dispositivo.service';
import { ActivatedRoute } from '@angular/router';
import { Dispositivo } from '../listado-dispositivos/dispositivo';
import { Router } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';


@Component({
  selector: 'app-dispositivo',
  templateUrl: './listado-dispositivos.page.html',
  styleUrls: ['./listado-dispositivos.page.scss'],
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
export class DispositivoPage implements OnInit{

  dispositivo!: Dispositivo;
  dispositivoId!: number;
  estadoValvula: boolean | null = null;
  ultimaMedicion: { fecha: string; valor: string } | null = null;


  constructor(
    private route: ActivatedRoute,
    private dispositivoService: DispositivoService,
    private valveService: DispositivoService,
    private router: Router
  ) {}

  async cargarUltimaMedicion() {
    try {
      this.ultimaMedicion = await this.dispositivoService.getUltimaMedicion(this.dispositivoId);
    } catch (error) {
      console.error('Error al cargar la última medición:', error);
    }
  }
  async ngOnInit() {
    this.dispositivoId = Number(this.route.snapshot.paramMap.get('id'));
    await this.cargarDispositivo();
    try {
      const estadoResponse = await this.dispositivoService.getEstadoValvula(this.dispositivoId);
      this.estadoValvula = estadoResponse.estado;
    } catch (error) {
      console.error('Error al obtener el estado de la válvula:', error);
      this.estadoValvula = null;
    }
    await this.cargarUltimaMedicion();
  }

  async cargarDispositivo() {
    try {
      this.dispositivo = await this.dispositivoService.getDispositivoById(this.dispositivoId);
      console.log('Dispositivo cargado:', this.dispositivo);
    } catch (error) {
      console.error('Error al cargar el dispositivo:', error);
    }
  }

  async cambiarEstadoValvula(apertura: boolean) {
    try {
      await this.dispositivoService.cambiarEstadoValvula(
        this.dispositivoId,
        apertura
      );
      alert(`Válvula ${apertura ? 'abierta' : 'cerrada'} correctamente`);
    } catch (error) {
      console.error('Error al cambiar el estado de la válvula:', error);
      alert('No se pudo cambiar el estado de la válvula.');
    }
  }
  verMediciones() {
    this.router.navigate([`/dispositivo`, this.dispositivoId, 'mediciones']);
  }
  
  async abrirValvula(dispositivoId: number) {
    try {
      await this.dispositivoService.abrirValvula(dispositivoId);
      alert('Válvula abierta exitosamente');
      this.actualizarEstadoValvula();
      this.dispositivoService.setValveState(dispositivoId, true); // ✅ Notifica a Home
    } catch (error) {
      console.error('Error al abrir la válvula:', error);
      alert('No se pudo abrir la válvula');
    }
  }
  
  async cerrarValvula(dispositivoId: number) {
    try {
      await this.dispositivoService.cerrarValvula(dispositivoId);
      alert('Válvula cerrada exitosamente');
      this.actualizarEstadoValvula();
      this.dispositivoService.setValveState(dispositivoId, false); // ✅ Notifica a Home
    } catch (error) {
      console.error('Error al cerrar la válvula:', error);
      alert('No se pudo cerrar la válvula');
    }
  }
  private async actualizarEstadoValvula() {
    try {
      const estadoResponse = await this.dispositivoService.getEstadoValvula(this.dispositivoId);
      this.estadoValvula = estadoResponse.estado;
    } catch (error) {
      console.error('Error al actualizar el estado de la válvula:', error);
    }
  }

  toggleValve(newState: boolean) {
    this.valveService.setValveState(this.dispositivoId, newState);
  }
  

  volverAlHome() {
    this.router.navigate(['/home']);
  }
  
}
