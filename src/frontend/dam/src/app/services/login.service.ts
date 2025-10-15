import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private apiUrl = environment.apiUrl;

  constructor(private _http: HttpClient, private _router: Router) { }

  async login(username: string, password: string) {
    try {
      let response = await firstValueFrom(
        this._http.post<any>(
          `${this.apiUrl}/login/`,
          { username: username, password: password }
        )
      );
      
      if (response && response.token) {
        // Guardar token y datos del usuario
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Si hay refresh token, guardarlo también
        if (response.refresh) {
          localStorage.setItem('refresh_token', response.refresh);
        }
        
        // Navegar al home
        this._router.navigate(['/home']);
        
        return response;
      }
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this._router.navigate(['/login']);
  }

  public get logIn(): boolean {
    return localStorage.getItem('token') !== null;
  }

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}