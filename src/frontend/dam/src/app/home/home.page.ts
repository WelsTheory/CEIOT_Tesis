import { Component, OnInit, OnDestroy } from '@angular/core';
import { DispositivoService } from '../services/dispositivo.service';
import { Dispositivo } from '../listado-dispositivos/dispositivo';
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
  dispositivos: any[] = []; // Para almacenar dispositivos
  private sub!: Subscription;
  private refreshMedicionesInterval: any;

  constructor(
    private dispositivoService: DispositivoService, // Servicio para cargar dispositivos
    private router: Router 
  ) {}

  // Método que se ejecuta al inicializar el componente
  async ngOnInit() {
    try {
      const dispositivos = await this.dispositivoService.getDispositivos();
  
      // Para cada dispositivo, traemos la última medición y estado de válvula
      this.dispositivos = await Promise.all(
        dispositivos.map(async (d: Dispositivo) => {
          let medicionActual = '—';
          let estadoValvula = null;

          try {
            // 👇 ahora pedimos solo la última medición
            const ultimaMedicion = await this.dispositivoService.getUltimaMedicion(d.dispositivoId);
            medicionActual = ultimaMedicion?.valor ?? '—';
          } catch (err) {
            console.error(`Error cargando última medición de ${d.dispositivoId}`, err);
          }

          try {
            const estadoResponse = await this.dispositivoService.getEstadoValvula(d.dispositivoId);
            estadoValvula = estadoResponse.estado;
          } catch (err) {
            console.error(`Error cargando estado válvula ${d.dispositivoId}`, err);
          }

          return {
            ...d,
            medicionActual,
            estadoValvula
          };
        })
      );
      // refresca mediciones cada 5 segundos
      this.sub = this.dispositivoService.valveState$.subscribe(change => {
        if (change) {
          this.dispositivos = this.dispositivos.map(d =>
            d.dispositivoId === change.id
              ? { ...d, estadoValvula: change.estado }
              : d
          );
        }
      });
      
    } 
    catch (error) {
      console.error('Error al cargar dispositivos:', error);
    }
    this.refreshMedicionesInterval = setInterval(async () => {
      try {
        await Promise.all(
          this.dispositivos.map(async (d) => {
            try {
              const ultima = await this.dispositivoService.getUltimaMedicion(d.dispositivoId);
              const nuevoValor = ultima?.valor ?? '—';
              if (d.medicionActual !== nuevoValor) {
                d.medicionActual = nuevoValor; // actualiza lo que ya usas en el HTML
              }
            } catch (e) {
              // no interrumpe el resto si una falla
              console.warn(`No se pudo refrescar medición de ${d.dispositivoId}`, e);
            }
          })
        );
      } catch (e) {
        console.warn('Error global al refrescar mediciones', e);
      }
    }, 1000);
  }

async ngOnDestroy() {
  if (this.sub) {
    this.sub.unsubscribe(); // 👈 Aquí cerramos la suscripción
  }
  if (this.refreshMedicionesInterval) {
    clearInterval(this.refreshMedicionesInterval);
  }
}

  // Encender todos los dispositivos
async encenderTodos() {
  try {
    await Promise.all(
      this.dispositivos.map(async (d) => {
        try {
          await this.dispositivoService.abrirValvula(d.dispositivoId);
          d.estadoValvula = true; // Actualiza localmente
        } catch (err) {
          console.error(`Error encendiendo válvula ${d.dispositivoId}`, err);
        }
      })
    );
  } catch (err) {
    console.error('Error al encender todas las válvulas', err);
  }
}

// Apagar todos los dispositivos
async apagarTodos() {
  try {
    await Promise.all(
      this.dispositivos.map(async (d) => {
        try {
          await this.dispositivoService.cerrarValvula(d.dispositivoId);
          d.estadoValvula = false; // Actualiza localmente
        } catch (err) {
          console.error(`Error apagando válvula ${d.dispositivoId}`, err);
        }
      })
    );
  } catch (err) {
    console.error('Error al apagar todas las válvulas', err);
  }
}

  

// Método para navegar a la página de detalles de un dispositivo
verDetalle(dispositivoId: number) {
  console.log(`Ver detalle del dispositivo: ${dispositivoId}`);
  this.router.navigate([`/dispositivo`, dispositivoId]);
}

verMediciones(dispositivoId: number) {
  console.log(`Ver mediciones del dispositivo: ${dispositivoId}`);
  this.router.navigate([`/dispositivo`, dispositivoId, 'mediciones']);
  }
  
}

