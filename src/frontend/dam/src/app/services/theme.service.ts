// src/app/services/theme.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  
  constructor() {
    this.initializeTheme();
  }

  // Inicializar el tema basado en preferencias guardadas o sistema
  initializeTheme() {
    const savedTheme = localStorage.getItem('app-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      this.setTheme(savedTheme as 'light' | 'dark');
    } else if (prefersDark) {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }

  // Cambiar entre light y dark
  toggleTheme() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    return newTheme;
  }

  // Establecer tema específico
  setTheme(theme: 'light' | 'dark') {
    document.body.classList.remove('dark');
    
    if (theme === 'dark') {
      document.body.classList.add('dark');
    }
    
    localStorage.setItem('app-theme', theme);
  }

  // Obtener tema actual
  getCurrentTheme(): 'light' | 'dark' {
    return document.body.classList.contains('dark') ? 'dark' : 'light';
  }

  // Verificar si está en modo oscuro
  isDark(): boolean {
    return this.getCurrentTheme() === 'dark';
  }
}