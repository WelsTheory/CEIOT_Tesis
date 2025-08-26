import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonText,
  IonCol,
  IonRow,
  IonDatetime,
  IonGrid
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { ModuloService } from '../services/modulo.service';
import { Modulo } from '../listado-modulos/modulo';

// Interfaces para tipado
interface Apunte {
  apunteId: number;
  fecha: string;
  up: number;
  down: number;
  moduloId: number;
}

interface ApunteGrupo {
  fecha: string;
  apuntes: Apunte[];
}

interface Estadisticas {
  upMax: number;
  upMin: number;
  upPromedio: string;
  downMax: number;
  downMin: number;
  downPromedio: string;
}

@Component({
  selector: 'app-apuntes',
  templateUrl: './apuntes.page.html',
  styleUrls: ['./apuntes.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonChip,
    IonText,
    IonCol,
    IonRow,
    IonDatetime,
    IonGrid,
    CommonModule,
    FormsModule
  ],
})
export class HistorialApuntesPage implements OnInit {
  moduloId!: number;
  modulo!: Modulo;
  apuntes: Apunte[] = [];
  apuntesFiltrados: Apunte[] = [];
  apuntesAgrupados: ApunteGrupo[] = [];
  
  // Filtros de fecha
  fechaDesde: string = '';
  fechaHasta: string = '';
  
  // Estadísticas
  estadisticas: Estadisticas = {
    upMax: 0,
    upMin: 0,
    upPromedio: '0.0',
    downMax: 0,
    downMin: 0,
    downPromedio: '0.0'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private moduloService: ModuloService
  ) {
    // Inicializar fechas por defecto (último mes)
    const ahora = new Date();
    const haceUnMes = new Date();
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);
    
    this.fechaHasta = ahora.toISOString();
    this.fechaDesde = haceUnMes.toISOString();
  }

  async ngOnInit() {
    this.moduloId = Number(this.route.snapshot.paramMap.get('id'));
    
    if (this.moduloId) {
      await this.cargarModulo();
      await this.cargarApuntes();
    } else {
      console.error('No se pudo obtener el ID del módulo');
      this.router.navigate(['/home']);
    }
  }

  async cargarModulo() {
    try {
      this.modulo = await this.moduloService.getModuloById(this.moduloId);
      console.log('Módulo cargado:', this.modulo);
    } catch (error) {
      console.error('Error al cargar el módulo:', error);
    }
  }

  async cargarApuntes() {
    try {
      // Aquí deberías llamar a tu servicio real para obtener los apuntes
      // Por ahora, genero datos de ejemplo
      this.apuntes = await this.moduloService.getHistorialApuntes(this.moduloId);
      
      // Si no hay datos reales, generar datos de ejemplo
      if (!this.apuntes || this.apuntes.length === 0) {
        this.apuntes = this.generarDatosEjemplo();
      }
      
      this.filtrarPorFechas();
      console.log('Apuntes cargados:', this.apuntes);
    } catch (error) {
      console.error('Error al cargar los apuntes:', error);
      // Generar datos de ejemplo en caso de error
      this.apuntes = this.generarDatosEjemplo();
      this.filtrarPorFechas();
    }
  }

  generarDatosEjemplo(): Apunte[] {
    const apuntes: Apunte[] = [];
    const ahora = new Date();
    
    // Generar 30 apuntes de ejemplo de los últimos 30 días
    for (let i = 0; i < 30; i++) {
      const fecha = new Date(ahora);
      fecha.setDate(fecha.getDate() - i);
      fecha.setHours(Math.floor(Math.random() * 24));
      fecha.setMinutes(Math.floor(Math.random() * 60));
      fecha.setSeconds(Math.floor(Math.random() * 60));
      
      const upValues = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5];
      const downValues = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5];
      
      apuntes.push({
        apunteId: i + 1,
        fecha: fecha.toISOString(),
        up: upValues[Math.floor(Math.random() * upValues.length)],
        down: downValues[Math.floor(Math.random() * downValues.length)],
        moduloId: this.moduloId
      });
    }
    
    // Ordenar por fecha descendente (más reciente primero)
    return apuntes.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  filtrarPorFechas() {
    let apuntesFiltrados = [...this.apuntes];
    
    if (this.fechaDesde) {
      const fechaDesdeDate = new Date(this.fechaDesde);
      apuntesFiltrados = apuntesFiltrados.filter(apunte => 
        new Date(apunte.fecha) >= fechaDesdeDate
      );
    }
    
    if (this.fechaHasta) {
      const fechaHastaDate = new Date(this.fechaHasta);
      fechaHastaDate.setHours(23, 59, 59, 999); // Incluir todo el día
      apuntesFiltrados = apuntesFiltrados.filter(apunte => 
        new Date(apunte.fecha) <= fechaHastaDate
      );
    }
    
    this.apuntesFiltrados = apuntesFiltrados;
    this.agruparApuntesPorFecha();
    this.calcularEstadisticas();
  }

  agruparApuntesPorFecha() {
    const grupos: { [key: string]: Apunte[] } = {};
    
    this.apuntesFiltrados.forEach(apunte => {
      const fecha = new Date(apunte.fecha);
      const fechaKey = fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!grupos[fechaKey]) {
        grupos[fechaKey] = [];
      }
      grupos[fechaKey].push(apunte);
    });
    
    // Convertir a array y ordenar por fecha descendente
    this.apuntesAgrupados = Object.keys(grupos).map(fecha => ({
      fecha,
      apuntes: grupos[fecha].sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      )
    })).sort((a, b) => {
      const fechaA = new Date(a.apuntes[0].fecha);
      const fechaB = new Date(b.apuntes[0].fecha);
      return fechaB.getTime() - fechaA.getTime();
    });
  }

  calcularEstadisticas() {
    if (this.apuntesFiltrados.length === 0) {
      this.estadisticas = {
        upMax: 0,
        upMin: 0,
        upPromedio: '0.0',
        downMax: 0,
        downMin: 0,
        downPromedio: '0.0'
      };
      return;
    }
    
    const upValues = this.apuntesFiltrados.map(a => a.up);
    const downValues = this.apuntesFiltrados.map(a => a.down);
    
    this.estadisticas = {
      upMax: Math.max(...upValues),
      upMin: Math.min(...upValues),
      upPromedio: (upValues.reduce((sum, val) => sum + val, 0) / upValues.length).toFixed(1),
      downMax: Math.max(...downValues),
      downMin: Math.min(...downValues),
      downPromedio: (downValues.reduce((sum, val) => sum + val, 0) / downValues.length).toFixed(1)
    };
  }

  limpiarFiltros() {
    const ahora = new Date();
    const haceUnMes = new Date();
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);
    
    this.fechaDesde = haceUnMes.toISOString();
    this.fechaHasta = ahora.toISOString();
    
    this.filtrarPorFechas();
  }

  verDetalleApunte(apunte: Apunte) {
    // Aquí puedes implementar la lógica para mostrar detalles del apunte
    // Por ejemplo, un modal o navegar a otra página
    console.log('Ver detalle del apunte:', apunte);
    
    // Ejemplo de mostrar información
    alert(`Apunte del ${new Date(apunte.fecha).toLocaleString('es-ES')}\nUP: ${apunte.up}\nDOWN: ${apunte.down}`);
  }

  trackByApunte(index: number, apunte: Apunte): number {
    return apunte.apunteId;
  }

  volverAlModulo() {
    this.router.navigate([`/modulo/${this.moduloId}`]);
  }

  volverAlHome() {
    this.router.navigate(['/home']);
  }
}