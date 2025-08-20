import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [authGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'modulo',
    loadComponent: () => import('./listado-modulos/listado-modulos.page').then( m => m.ModuloPage)
  },
  {
    path: 'modulo/:id',
    loadComponent: () =>
      import('./listado-modulos/listado-modulos.page').then((m) => m.ModuloPage),
  },
  {
    path: 'modulo/:id/mediciones',
    loadComponent: () =>
      import('./mediciones/mediciones.page').then((m) => m.MedicionesPage),
  },
];
