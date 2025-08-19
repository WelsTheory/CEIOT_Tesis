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

  private valveState = new BehaviorSubject<{id: number, estado: boolean} | null>(null);
  valveState$ = this.valveState.asObservable();

  setValveState(id: number, estado: boolean) {
    this.valveState.next({ id, estado });
  }

  getValveState(): boolean {
    return this.valveState.value?.estado ?? false;
  }

 
  getModulos(): Promise<Modulo[]> {
    return firstValueFrom(this._http.get<Modulo[]>(this.apiUrl));
  }
  getModuloById(id: number): Promise<Modulo> {
    return firstValueFrom(
      this._http.get<Modulo>(`http://localhost:8000/modulo/${id}`)
    );
  }
  
  cambiarEstadoValvula(id: number, apertura: boolean): Promise<void> {
    return firstValueFrom(
      this._http.post<void>(
        `http://localhost:8000/modulo/valvula`,
        { apertura: apertura ? 1 : 0 }
      )
    );
  }
  
  getMediciones(id: number): Promise<{ medicionId: number; fecha: string; valor: string }[]> {
    return firstValueFrom(
      this._http.get<{ medicionId: number; fecha: string; valor: string }[]>(
        `http://localhost:8000/modulo/${id}/mediciones`
      )
    );
  }
  
  abrirValvula(id: number): Promise<any> {
    return firstValueFrom(
      this._http.post(`http://localhost:8000/modulo/${id}/abrir`, {})
    );
  }
  
  cerrarValvula(id: number): Promise<any> {
    return firstValueFrom(
      this._http.post(`http://localhost:8000/modulo/${id}/cerrar`, {})
    );
  }
  
  getEstadoValvula(id: number): Promise<any> {
    return firstValueFrom(
      this._http.get(`http://localhost:8000/modulo/${id}/estado`)
    );
  }
  getUltimaMedicion(moduloId: number) {
    return firstValueFrom(
      this._http.get<{ fecha: string; valor: string }>(`http://localhost:8000/modulo/${moduloId}/ultima-medicion`)
    );
  }
  

}