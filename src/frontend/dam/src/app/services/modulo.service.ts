import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Modulo } from '../listado-modulos/modulo';
import { BehaviorSubject } from 'rxjs';

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
  
  getMediciones(id: number): Promise<{ medicionId: number; fecha: string; valor_temp: string; valor_press: string; }[]> {
    return firstValueFrom(
      this._http.get<{ medicionId: number; fecha: string; valor_temp: string; valor_press: string; }[]>(
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
      this._http.get<{ fecha: string; valor_temp: string; valor_press: string; }>(`http://localhost:8000/modulo/${moduloId}/ultima-medicion`)
    );
  }
  getApunte(moduloId:number): Promise<any> {
    return this._http.get(`http://localhost:8000/modulo/${moduloId}/apunte`).toPromise();
  }
  

}