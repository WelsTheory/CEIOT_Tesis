import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Dispositivo } from '../listado-dispositivos/dispositivo';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DispositivoService {
  private apiUrl = 'http://localhost:8000/dispositivo';

  constructor(private _http: HttpClient) {}

  private valveState = new BehaviorSubject<{id: number, estado: boolean} | null>(null);
  valveState$ = this.valveState.asObservable();

  setValveState(id: number, estado: boolean) {
    this.valveState.next({ id, estado });
  }

  getValveState(): boolean {
    return this.valveState.value?.estado ?? false;
  }

 
  getDispositivos(): Promise<Dispositivo[]> {
    return firstValueFrom(this._http.get<Dispositivo[]>(this.apiUrl));
  }
  getDispositivoById(id: number): Promise<Dispositivo> {
    return firstValueFrom(
      this._http.get<Dispositivo>(`http://localhost:8000/dispositivo/${id}`)
    );
  }
  
  cambiarEstadoValvula(id: number, apertura: boolean): Promise<void> {
    return firstValueFrom(
      this._http.post<void>(
        `http://localhost:8000/dispositivo/valvula`,
        { apertura: apertura ? 1 : 0 }
      )
    );
  }
  
  getMediciones(id: number): Promise<{ medicionId: number; fecha: string; valor: string }[]> {
    return firstValueFrom(
      this._http.get<{ medicionId: number; fecha: string; valor: string }[]>(
        `http://localhost:8000/dispositivo/${id}/mediciones`
      )
    );
  }
  
  abrirValvula(id: number): Promise<any> {
    return firstValueFrom(
      this._http.post(`http://localhost:8000/dispositivo/${id}/abrir`, {})
    );
  }
  
  cerrarValvula(id: number): Promise<any> {
    return firstValueFrom(
      this._http.post(`http://localhost:8000/dispositivo/${id}/cerrar`, {})
    );
  }
  
  getEstadoValvula(id: number): Promise<any> {
    return firstValueFrom(
      this._http.get(`http://localhost:8000/dispositivo/${id}/estado`)
    );
  }
  getUltimaMedicion(dispositivoId: number) {
    return firstValueFrom(
      this._http.get<{ fecha: string; valor: string }>(`http://localhost:8000/dispositivo/${dispositivoId}/ultima-medicion`)
    );
  }
  

}