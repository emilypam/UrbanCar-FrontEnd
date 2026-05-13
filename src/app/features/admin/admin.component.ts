import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '@core/services/auth.service';
import { fadeIn } from '@core/animations/motion';

interface NavItem {
  label: string;
  icon: string;
  route: string[];
  exact?: boolean;
}

/**
 * Layout del panel de administración:
 *
 *   ┌─────────────┬──────────────────────────────────────┐
 *   │  Sidebar    │  Header (admin + logout)             │
 *   │  oscuro     ├──────────────────────────────────────┤
 *   │  turquesa   │                                      │
 *   │  (Lucide)   │   <router-outlet />                  │
 *   └─────────────┴──────────────────────────────────────┘
 *
 * Se monta como ruta padre `/admin` con hijos para Dashboard, Flota,
 * Reservas y Kardex (ver `app.routes.ts`).
 */
@Component({
  selector: 'app-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink, RouterLinkActive, RouterOutlet, LucideAngularModule],
  animations: [fadeIn],
  template: `
    <div class="min-h-screen grid grid-cols-1 lg:grid-cols-[260px_1fr] bg-surface-muted">
      <!-- ═══ SIDEBAR ═══ -->
      <aside class="bg-primary-900 text-white lg:min-h-screen flex flex-col"
             [ngClass]="mobileOpen() ? 'block' : 'hidden lg:flex'">
        <div class="px-5 py-5 flex items-center gap-3 border-b border-white/10">
          <span class="grid place-items-center w-10 h-10 rounded-xl bg-primary text-primary-900
                       shadow-soft">
            <lucide-icon name="car" class="w-5 h-5"></lucide-icon>
          </span>
          <div class="leading-tight">
            <p class="font-bold text-base">UrbanCar EC</p>
            <p class="text-[11px] text-white/60 uppercase tracking-wider">Panel Admin</p>
          </div>
        </div>

        <nav class="flex-1 px-3 py-5 space-y-1">
          @for (item of navItems; track item.label) {
            <a [routerLink]="item.route"
               [routerLinkActive]="'bg-white/10 text-white border-l-4 border-primary -ml-1 pl-4'"
               [routerLinkActiveOptions]="{ exact: !!item.exact }"
               (click)="closeMobile()"
               class="group flex items-center gap-3 px-4 py-2.5 rounded-lg
                      text-sm font-medium text-white/75 hover:text-white
                      hover:bg-white/5 transition-colors">
              <lucide-icon [name]="item.icon"
                           class="w-4 h-4 group-hover:text-primary"></lucide-icon>
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="px-5 py-4 border-t border-white/10 text-[11px] text-white/50">
          v0.1 · Reto 1 · API-first
        </div>
      </aside>

      <!-- ═══ MAIN AREA ═══ -->
      <div class="flex flex-col min-w-0">
        <!-- HEADER -->
        <header class="sticky top-0 z-30 bg-white border-b border-surface-border h-16
                       flex items-center justify-between px-4 sm:px-6">
          <div class="flex items-center gap-3 min-w-0">
            <button type="button" class="lg:hidden btn-ghost -ml-2"
                    (click)="toggleMobile()" aria-label="Menú">
              <lucide-icon [name]="mobileOpen() ? 'x' : 'menu'" class="w-5 h-5"></lucide-icon>
            </button>
            <div class="min-w-0">
              <p class="text-[11px] uppercase tracking-wider text-ink-soft">
                Panel administrativo
              </p>
              <h1 class="text-base font-semibold text-ink truncate">
                UrbanCar Ecuador
              </h1>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <a routerLink="/" class="hidden sm:inline-flex btn-ghost text-xs">
              Ver sitio público
            </a>

            <div class="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl
                        bg-surface-muted border border-surface-border">
              <span class="grid place-items-center w-8 h-8 rounded-full bg-primary-700 text-white">
                <lucide-icon name="user" class="w-4 h-4"></lucide-icon>
              </span>
              <div class="leading-tight">
                <p class="text-sm font-semibold">{{ auth.displayName() }}</p>
                <p class="text-[10px] text-primary-700 uppercase tracking-wider font-bold">
                  Administrador
                </p>
              </div>
            </div>

            <button type="button" class="btn-outline" (click)="auth.logout('/auth/login')">
              <lucide-icon name="log-out" class="w-4 h-4"></lucide-icon>
              <span class="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <!-- CONTENT -->
        <main class="flex-1 overflow-x-hidden" [@fadeIn]>
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AdminComponent {
  protected readonly auth = inject(AuthService);
  protected readonly mobileOpen = signal(false);

  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard',  icon: 'layout-dashboard', route: ['/admin'],               exact: true },
    { label: 'Flota',      icon: 'car',              route: ['/admin/vehiculos']                  },
    { label: 'Reservas',   icon: 'list-checks',      route: ['/admin/reservas']                   },
    { label: 'Alquileres', icon: 'key-round',        route: ['/admin/alquileres']                 },
    { label: 'Clientes',   icon: 'users',            route: ['/admin/clientes']                   },
    { label: 'Facturas',   icon: 'receipt',          route: ['/admin/facturas']                   },
    { label: 'Agencias',   icon: 'building-2',       route: ['/admin/agencias']                   },
    { label: 'Modelos',    icon: 'car',              route: ['/admin/modelos']                     },
    { label: 'Categorías', icon: 'tag',              route: ['/admin/categorias']                  },
    { label: 'Kardex',     icon: 'history',          route: ['/admin/kardex']                     },
  ];

  protected toggleMobile(): void { this.mobileOpen.update((v) => !v); }
  protected closeMobile():  void { this.mobileOpen.set(false); }
}
