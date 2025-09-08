import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Modulo } from '../listado-modulos/modulo';
import { BehaviorSubject } from 'rxjs';

// Interface para los apuntes
export interface Apunte {
  apunteId: number;
  fecha: string;
  up: number;
  down: number;
  moduloId: number;
}

// Interfaz para la información del sistema
export interface InformacionSistema {
  memoriaLibre?: number;
  temperaturaInterna?: number;
  voltajeAlimentacion?: number;
  direccionIP?: string;
  firmware?: string;
  direccionMAC?: string;
}


@Injectable({
  providedIn: 'root'
})
export class ModuloService {
  private apiUrl = 'http://localhost:8000/modulo';

  constructor(private _http: HttpClient) {}

  private resetState = new BehaviorSubject<{id: number, estado: boolean} | null>(null);
  resetState$ = this.resetState.asObservable();

  setResetState(id: number, estado: boolean) {
    this.resetState.next({ id, estado });
  }

  getResetState(): boolean {
    return this.resetState.value?.estado ?? false;
  }

 
  getModulos(): Promise<Modulo[]> {
    return firstValueFrom(this._http.get<Modulo[]>(this.apiUrl));
  }
  getModuloById(id: number): Promise<Modulo> {
    return firstValueFrom(
      this._http.get<Modulo>(`http://localhost:8000/modulo/${id}`)
    );
  }
  
  cambiarEstadoReset(id: number, apertura: boolean): Promise<void> {
    return firstValueFrom(
      this._http.post<void>(
        `http://localhost:8000/modulo/reset`,
        { apertura: apertura ? 1 : 0 }
      )
    );
  }
  
  getMediciones(id: number): Promise<{ medicionId: number; fecha: string; valor_temp: string; valor_press: string;}[]> {
    return firstValueFrom(
      this._http.get<{ medicionId: number; fecha: string; valor_temp: string; valor_press: string; ubicacion: string}[]>(
        `http://localhost:8000/modulo/${id}/mediciones`
      )
    );
  }
  
  abrirReset(id: number): Promise<any> {
    return firstValueFrom(
      this._http.post(`http://localhost:8000/modulo/${id}/abrir`, {})
    );
  }
  
  cerrarReset(id: number): Promise<any> {
    return firstValueFrom(
      this._http.post(`http://localhost:8000/modulo/${id}/cerrar`, {})
    );
  }
  
  getEstadoReset(id: number): Promise<any> {
    return firstValueFrom(
      this._http.get(`http://localhost:8000/modulo/${id}/estado`)
    );
  }
  getUltimaMedicion(moduloId: number) {
    return firstValueFrom(
      this._http.get<{ fecha: string; valor_temp: string; valor_press: string;}>(`http://localhost:8000/modulo/${moduloId}/ultima-medicion`)
    );
  }
  getApunte(moduloId: number): Promise<{up: number, down: number, fecha?: string}> {
    return firstValueFrom(
      this._http.get<{up: number, down: number, fecha?: string}>(`http://localhost:8000/modulo/${moduloId}/apunte`)
    );
  }
  // Nuevo método para obtener el historial de apuntes
  getHistorialApuntes(moduloId: number): Promise<Apunte[]> {
    return firstValueFrom(
      this._http.get<Apunte[]>(`http://localhost:8000/modulo/${moduloId}/historial-apuntes`)
    );
  }
  // Método para obtener apuntes por rango de fechas
  getApuntesPorFecha(moduloId: number, fechaDesde: string, fechaHasta: string): Promise<Apunte[]> {
    const params = {
      fechaDesde,
      fechaHasta
    };
    return firstValueFrom(
      this._http.get<Apunte[]>(`http://localhost:8000/modulo/${moduloId}/apuntes`, { params })
    );
  }
    /**
   * Obtiene la información del sistema del módulo (memoria, temperatura interna, voltaje, IP, firmware, MAC)
   */
  getInformacionSistema(moduloId: number): Promise<InformacionSistema> {
    return firstValueFrom(
      this._http.get<InformacionSistema>(`${this.apiUrl}/${moduloId}/sistema-info`)
    );
  }

  /**
   * Obtiene información técnica del módulo (IP, firmware, MAC)
   */
  getInformacionTecnica(moduloId: number): Promise<{direccionIP: string, firmware: string, direccionMAC: string}> {
    return firstValueFrom(
      this._http.get<{direccionIP: string, firmware: string, direccionMAC: string}>(`${this.apiUrl}/${moduloId}/info-tecnica`)
    );
  }

  /**
   * Obtiene métricas del sistema del módulo (memoria, temperatura interna, voltaje)
   */
  getMetricasSistema(moduloId: number): Promise<{memoriaLibre: number, temperaturaInterna: number, voltajeAlimentacion: number}> {
    return firstValueFrom(
      this._http.get<{memoriaLibre: number, temperaturaInterna: number, voltajeAlimentacion: number}>(`${this.apiUrl}/${moduloId}/metricas-sistema`)
    );
  }
}