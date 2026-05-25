import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <header class="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-surface-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a routerLink="/" class="flex items-center gap-2 text-primary-700 font-bold text-lg">
          <span class="grid place-items-center w-9 h-9 rounded-xl bg-primary-700 text-white shadow-soft">
            <lucide-icon name="car" class="w-5 h-5"></lucide-icon>
          </span>
          UrbanCar <span class="text-ink">EC</span>
        </a>

        <nav class="hidden md:flex items-center gap-1">
          <a routerLink="/" routerLinkActive="text-primary-700 bg-primary-50"
             [routerLinkActiveOptions]="{ exact: true }"
             class="btn-ghost">Inicio</a>
          <a routerLink="/marketplace" routerLinkActive="text-primary-700 bg-primary-50"
             class="btn-ghost">
            <lucide-icon name="search" class="w-4 h-4"></lucide-icon>
            Buscar autos
          </a>
          @if (auth.isAuthenticated()) {
            <a routerLink="/cliente" routerLinkActive="text-primary-700 bg-primary-50"
               class="btn-ghost">
              <lucide-icon name="calendar" class="w-4 h-4"></lucide-icon>
              Mis reservas
            </a>
            <a routerLink="/perfil" routerLinkActive="text-primary-700 bg-primary-50"
               class="btn-ghost">
              <lucide-icon name="user-round" class="w-4 h-4"></lucide-icon>
              Mi perfil
            </a>
          }
          @if (auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="text-primary-700 bg-primary-50"
               class="btn-ghost">
              <lucide-icon name="layout-dashboard" class="w-4 h-4"></lucide-icon>
              Admin
            </a>
          }
        </nav>

        <div class="hidden md:flex items-center gap-2">
          @if (!auth.isAuthenticated()) {
            <a routerLink="/auth/login" class="btn-ghost">
              <lucide-icon name="log-in" class="w-4 h-4"></lucide-icon>
              Iniciar sesión
            </a>
            <a routerLink="/auth/register" class="btn-primary">
              <lucide-icon name="user-plus" class="w-4 h-4"></lucide-icon>
              Registrarse
            </a>
          } @else {
            <span class="hidden lg:inline-flex items-center gap-2 text-sm text-ink-muted">
              <lucide-icon name="user" class="w-4 h-4 text-primary-700"></lucide-icon>
              {{ auth.displayName() }}
              @if (auth.isAdmin()) {
                <span class="badge-primary">
                  <lucide-icon name="shield-check" class="w-3 h-3"></lucide-icon>
                  ADMIN
                </span>
              }
            </span>
            <button type="button" class="btn-outline" (click)="logout()">
              <lucide-icon name="log-out" class="w-4 h-4"></lucide-icon>
              Salir
            </button>
          }
        </div>

        <button type="button" class="md:hidden btn-ghost" (click)="toggleMobile()" aria-label="Menú">
          <lucide-icon [name]="mobileOpen() ? 'x' : 'menu'" class="w-5 h-5"></lucide-icon>
        </button>
      </div>

      <div class="md:hidden border-t border-surface-border bg-white"
           [ngClass]="{ 'hidden': !mobileOpen() }">
        <div class="px-4 py-3 flex flex-col gap-1">
          <a routerLink="/" (click)="closeMobile()" class="btn-ghost justify-start">Inicio</a>
          <a routerLink="/marketplace" (click)="closeMobile()" class="btn-ghost justify-start">
            Buscar autos
          </a>
          @if (auth.isAuthenticated()) {
            <a routerLink="/cliente" (click)="closeMobile()" class="btn-ghost justify-start">
              Mis reservas
            </a>
            <a routerLink="/perfil" (click)="closeMobile()" class="btn-ghost justify-start">
              <lucide-icon name="user-round" class="w-4 h-4"></lucide-icon>
              Mi perfil
            </a>
          }
          @if (auth.isAdmin()) {
            <a routerLink="/admin" (click)="closeMobile()" class="btn-ghost justify-start">
              Panel admin
            </a>
          }
          <hr class="my-2 border-surface-border">
          @if (!auth.isAuthenticated()) {
            <a routerLink="/auth/login" (click)="closeMobile()" class="btn-outline justify-start">
              Iniciar sesión
            </a>
            <a routerLink="/auth/register" (click)="closeMobile()" class="btn-primary justify-start">
              Registrarse
            </a>
          } @else {
            <button type="button" class="btn-outline justify-start" (click)="logout()">
              Cerrar sesión
            </button>
          }
        </div>
      </div>
    </header>
  `,
})
export class NavbarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly mobileOpen = signal(false);

  protected toggleMobile(): void { this.mobileOpen.update((v) => !v); }
  protected closeMobile(): void  { this.mobileOpen.set(false); }

  protected logout(): void {
    this.closeMobile();
    this.auth.logout();
  }
}
