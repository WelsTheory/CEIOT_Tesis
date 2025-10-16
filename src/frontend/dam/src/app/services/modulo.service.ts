import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Modulo } from '../listado-modulos/modulo';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

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
  private apiUrl = `${environment.apiUrl}/modulos`;

  constructor(private _http: HttpClient) {}

  private resetState = new BehaviorSubject<{id: number, estado: boolean} | null>(null);
  resetState$ = this.resetState.asObservable();

  setResetState(id: number, estado: boolean) {
    this.resetState.next({ id, estado });
  }

  getResetState(): boolean {
    return this.resetState.value?.estado ?? false;
  }

  /**
   * Obtener todos los módulos
   * GET /api/modulos/
   */
  getModulos(): Promise<Modulo[]> {
    return firstValueFrom(
      this._http.get<{results: Modulo[]}>(this.apiUrl)
    ).then(response => response.results || response as any);
  }

  /**
   * Obtener módulo por ID
   * GET /api/modulos/{id}/
   */
  getModuloById(id: number): Promise<Modulo> {
    return firstValueFrom(
      this._http.get<Modulo>(`${this.apiUrl}/${id}/`)
    );
  }

  /**
   * Obtener mediciones de un módulo
   * GET /api/modulos/{id}/mediciones/
   */
  getMediciones(id: number): Promise<any[]> {
    return firstValueFrom(
      this._http.get<any[]>(`${this.apiUrl}/${id}/mediciones/`)
    );
  }

  /**
   * Obtener última medición
   * GET /api/modulos/{id}/ultima-medicion/
   */
  getUltimaMedicion(moduloId: number): Promise<any> {
    return firstValueFrom(
      this._http.get<any>(`${this.apiUrl}/${moduloId}/ultima-medicion/`)
    );
  }

  /**
   * Obtener apuntes de un módulo
   * GET /api/modulos/{id}/apuntes/
   */
  getApunte(moduloId: number): Promise<{up: number, down: number, fecha?: string}> {
    return firstValueFrom(
      this._http.get<{up: number, down: number, fecha?: string}>(`${this.apiUrl}/${moduloId}/apuntes/`)
    );
  }

  /**
   * Obtener historial de apuntes
   * GET /api/modulos/{id}/historial-apuntes/
   */
  getHistorialApuntes(moduloId: number): Promise<Apunte[]> {
    return firstValueFrom(
      this._http.get<Apunte[]>(`${this.apiUrl}/${moduloId}/historial-apuntes/`)
    );
  }

  /**
   * Obtener apuntes por rango de fechas
   * GET /api/modulos/{id}/apuntes/?fechaDesde={fecha}&fechaHasta={fecha}
   */
  getApuntesPorFecha(moduloId: number, fechaDesde: string, fechaHasta: string): Promise<Apunte[]> {
    const params = {
      fechaDesde,
      fechaHasta
    };
    return firstValueFrom(
      this._http.get<Apunte[]>(`${this.apiUrl}/${moduloId}/apuntes/`, { params })
    );
  }

  /**
   * Obtener información del sistema del módulo
   * GET /api/modulos/{id}/sistema-info/
   */
  getInformacionSistema(moduloId: number): Promise<InformacionSistema> {
    return firstValueFrom(
      this._http.get<InformacionSistema>(`${this.apiUrl}/${moduloId}/sistema-info/`)
    );
  }

  /**
   * Obtener información técnica del módulo
   * GET /api/modulos/{id}/info-tecnica/
   */
  getInformacionTecnica(moduloId: number): Promise<{direccionIP: string, firmware: string, direccionMAC: string}> {
    return firstValueFrom(
      this._http.get<{direccionIP: string, firmware: string, direccionMAC: string}>(`${this.apiUrl}/${moduloId}/info-tecnica/`)
    );
  }

  /**
   * Obtener métricas del sistema
   * GET /api/modulos/{id}/metricas-sistema/
   */
  getMetricasSistema(moduloId: number): Promise<{memoriaLibre: number, temperaturaInterna: number, voltajeAlimentacion: number}> {
    return firstValueFrom(
      this._http.get<{memoriaLibre: number, temperaturaInterna: number, voltajeAlimentacion: number}>(`${this.apiUrl}/${moduloId}/metricas-sistema/`)
    );
  }

  /**
   * Cambiar estado de reset (LEGACY - mantener por compatibilidad)
   * POST /api/controles-reinicio/reset/
   */
  cambiarEstadoReset(id: number, apertura: boolean): Promise<void> {
    return firstValueFrom(
      this._http.post<void>(
        `${environment.apiUrl}/controles-reinicio/reset/`,
        { apertura: apertura ? 1 : 0 }
      )
    );
  }

  /**
   * Abrir reset
   * POST /api/modulos/{id}/abrir/
   */
  abrirReset(id: number): Promise<any> {
    return firstValueFrom(
      this._http.post(`${this.apiUrl}/${id}/abrir/`, {})
    );
  }

  /**
   * Cerrar reset
   * POST /api/modulos/{id}/cerrar/
   */
  cerrarReset(id: number): Promise<any> {
    return firstValueFrom(
      this._http.post(`${this.apiUrl}/${id}/cerrar/`, {})
    );
  }

  /**
   * Obtener estado de reset
   * GET /api/modulos/{id}/estado/
   */
  getEstadoReset(id: number): Promise<any> {
    return firstValueFrom(
      this._http.get(`${this.apiUrl}/${id}/estado/`)
    );
  }
}