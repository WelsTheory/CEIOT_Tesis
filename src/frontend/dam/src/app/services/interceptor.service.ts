import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class InterceptorService implements HttpInterceptor {

  constructor(private _router: Router) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log('🔍 Interceptor - URL:', req.url);

    // No agregar token para peticiones de login
    if (req.url.includes('/login')) {
      return next.handle(req);
    }

    // Obtener token del localStorage
    const token = localStorage.getItem('token');

    if (token) {
      // Agregar token al header
      const reqWithAuthHeader = req.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Token agregado al header');
      
      // Manejar errores de autenticación
      return next.handle(reqWithAuthHeader).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            // Token expirado o inválido
            console.error('❌ Token inválido o expirado');
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            this._router.navigate(['/login']);
          }
          return throwError(() => error);
        })
      );
    } else {
      // No hay token, redirigir a login
      console.warn('⚠️ No hay token disponible');
      this._router.navigate(['/login']);
      return throwError(() => new Error('No authentication token'));
    }
  }
}