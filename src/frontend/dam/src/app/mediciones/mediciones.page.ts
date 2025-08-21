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
  IonText
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
    IonText
  ]
})
export class MedicionesPage implements OnInit {
  moduloId!: number;
  mediciones: { medicionId: number; fecha: string; valor_temp: string; valor_press: string; }[] = [];

  constructor(
    private route: ActivatedRoute,
    private moduloService: ModuloService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.moduloId = Number(this.route.snapshot.paramMap.get('id'));
    await this.cargarMediciones();
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
