import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModuloService } from '../services/modulo.service';
import { Modulo } from '../listado-modulos/modulo';
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
  modulos: any[] = []; // Para almacenar modulos
  private sub!: Subscription;
  private refreshMedicionesInterval: any;

  constructor(
    private moduloService: ModuloService, // Servicio para cargar modulos
    private router: Router 
  ) {}

  // Método que se ejecuta al inicializar el componente
  async ngOnInit() {
    try {
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
            medicionTempActual = ultimaMedicion?.valor_temp?? '—';
            medicionPressActual = ultimaMedicion?.valor_press?? '—';
            const apunte = await this.moduloService.getApunte(d.moduloId);
            up = apunte?.up ;
            down = apunte?.down;
          } catch (err) {
            console.error(`Error cargando última medición de ${d.moduloId}`, err);
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
      // refresca mediciones cada 5 segundos
      this.sub = this.moduloService.resetState$.subscribe(change => {
        if (change) {
          this.modulos = this.modulos.map(d =>
            d.moduloId === change.id
              ? { ...d, estadoReset: change.estado }
              : d
          );
        }
      });
      
    } 
    catch (error) {
      console.error('Error al cargar modulos:', error);
    }
    this.refreshMedicionesInterval = setInterval(async () => {
      try {
        await Promise.all(
          this.modulos.map(async (d) => {
            try {
              const ultima = await this.moduloService.getUltimaMedicion(d.moduloId);
              const nuevoValorTemp = ultima?.valor_temp ?? '—';
              const nuevoValorPress = ultima?.valor_press ?? '—';
              
              if (d.medicionTempActual !== nuevoValorTemp) {
                d.medicionTempActual = nuevoValorTemp; // actualiza lo que ya usas en el HTML
              }
              if (d.medicionPressActual !== nuevoValorPress) {
                d.medicionPressActual = nuevoValorPress; // actualiza lo que ya usas en el HTML
              }
              // OBTENER ULTIMO APUNTE
              const valor_apunte = await this.moduloService.getApunte(d.moduloId);
              const nuevoValorUP = valor_apunte?.up ?? 0.0;
              const nuevoValorDOWN = valor_apunte?.down ?? 0.0;
              if(d.up !== nuevoValorUP){
                d.up = nuevoValorUP;
              }
              if(d.down !== nuevoValorDOWN){
                d.down = nuevoValorDOWN;
              }
            } catch (e) {
              // no interrumpe el resto si una falla
              console.warn(`No se pudo refrescar medición de ${d.moduloId}`, e);
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

