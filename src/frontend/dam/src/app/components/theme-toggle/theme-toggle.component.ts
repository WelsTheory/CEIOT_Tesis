// src/app/components/theme-toggle/theme-toggle.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { ThemeService } from '../../services/theme.service';
import { addIcons } from 'ionicons';
import { sunnyOutline, moonOutline } from 'ionicons/icons';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon]
})
export class ThemeToggleComponent implements OnInit {
  isDark = false;

  constructor(private themeService: ThemeService) {
    // Registrar los iconos que usaremos
    addIcons({ sunnyOutline, moonOutline });
  }

  ngOnInit() {
    this.isDark = this.themeService.isDark();
  }

  toggleTheme() {
    const newTheme = this.themeService.toggleTheme();
    this.isDark = newTheme === 'dark';
  }
}