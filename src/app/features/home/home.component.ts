import {
  ChangeDetectionStrategy, Component, inject, OnInit, signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { VehiculosService } from '@core/services/vehiculos.service';
import { BookingStateService, type SearchCriteria } from '@core/services/booking-state.service';
import { SearchBarComponent } from '@shared/components/search-bar/search-bar.component';
import {
  VehiculoCardComponent,
} from '@shared/components/vehiculo-card/vehiculo-card.component';
import {
  VehiculoCardSkeletonComponent,
} from '@shared/components/vehiculo-card-skeleton/vehiculo-card-skeleton.component';
import type { Vehiculo } from '@core/models/api.models';
import { fadeIn, fadeUp, stagger80 } from '@core/animations/motion';

const FEATURED_LIMIT = 6;

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, LucideAngularModule,
    SearchBarComponent, VehiculoCardComponent, VehiculoCardSkeletonComponent,
  ],
  animations: [fadeUp, fadeIn, stagger80],
  styles: [`
    .hero-pattern {
      background-image:
        radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px),
        linear-gradient(135deg, #003E40 0%, #005A5C 45%, #009091 100%);
      background-size: 22px 22px, 100% 100%;
    }
  `],
  template: `
    <!-- HERO -->
    <section class="hero-pattern text-white relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-b from-transparent to-surface-muted/40
                  pointer-events-none"></div>

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-40">
        <div class="max-w-3xl" [@fadeUp]>
          <span class="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur
                       px-3 py-1 text-xs font-medium border border-white/25">
            <lucide-icon name="sparkles" class="w-3.5 h-3.5"></lucide-icon>
            Marketplace oficial de UrbanCar Ecuador
          </span>
          <h1 class="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]
                     text-white">
            Reserva tu auto en segundos.
            <span class="block text-white/80 font-medium text-2xl sm:text-3xl lg:text-4xl mt-3">
              Recógelo donde quieras, cuando quieras.
            </span>
          </h1>
          <p class="mt-5 text-white/85 text-base sm:text-lg max-w-xl">
            Tarifas transparentes, disponibilidad en tiempo real y agencias en todo
            el país. Sin filas, sin papeleo, sin sorpresas.
          </p>
        </div>
      </div>

      <!-- Buscador flotante -->
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 pb-12" [@fadeUp]>
        <app-search-bar [floating]="true" submitLabel="Ver disponibilidad"
                        (search)="onSearch($event)" />
      </div>
    </section>

    <!-- VENTAJAS -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" [@fadeIn]>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <article class="card-pad">
          <span class="grid place-items-center w-11 h-11 rounded-2xl bg-primary-50 text-primary-700 mb-4">
            <lucide-icon name="map-pin" class="w-5 h-5"></lucide-icon>
          </span>
          <h3 class="text-lg mb-1">Cobertura nacional</h3>
          <p class="text-sm text-ink-muted">
            Agencias en Quito, Guayaquil y Cuenca con flota verificada.
          </p>
        </article>
        <article class="card-pad">
          <span class="grid place-items-center w-11 h-11 rounded-2xl bg-primary-50 text-primary-700 mb-4">
            <lucide-icon name="calendar" class="w-5 h-5"></lucide-icon>
          </span>
          <h3 class="text-lg mb-1">Disponibilidad real</h3>
          <p class="text-sm text-ink-muted">
            Sin reservas duplicadas: validamos cada rango de fechas en el momento.
          </p>
        </article>
        <article class="card-pad">
          <span class="grid place-items-center w-11 h-11 rounded-2xl bg-primary-50 text-primary-700 mb-4">
            <lucide-icon name="shield" class="w-5 h-5"></lucide-icon>
          </span>
          <h3 class="text-lg mb-1">Pago y seguro a tu medida</h3>
          <p class="text-sm text-ink-muted">
            Múltiples métodos de pago, seguros opcionales y factura electrónica.
          </p>
        </article>
      </div>
    </section>

    <!-- VEHÍCULOS DESTACADOS -->
    @if (!searched()) {
      <section class="bg-surface-muted border-t border-surface-border py-16" [@fadeIn]>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <header class="flex items-end justify-between flex-wrap gap-4 mb-8">
            <div>
              <p class="text-xs uppercase tracking-wider text-ink-soft">Disponible ahora</p>
              <h2 class="text-2xl font-semibold text-ink flex items-center gap-2">
                <lucide-icon name="car" class="w-6 h-6 text-primary-700"></lucide-icon>
                Nuestra Flota
              </h2>
              <p class="text-sm text-ink-muted mt-0.5">
                Vehículos listos para alquilar hoy mismo.
              </p>
            </div>
            <a routerLink="/marketplace" class="btn-outline shrink-0">
              Ver todos los vehículos
              <lucide-icon name="arrow-right" class="w-4 h-4"></lucide-icon>
            </a>
          </header>

          @if (loadingFlota()) {
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              <app-vehiculo-card-skeleton [count]="6" />
            </div>
          } @else if (flotaError()) {
            <div class="card-pad text-ink-muted flex items-center gap-2" [@fadeIn]>
              <lucide-icon name="wifi-off" class="w-4 h-4 text-primary-700"></lucide-icon>
              No pudimos cargar la flota. Intenta más tarde.
            </div>
          } @else if (flota().length === 0) {
            <div class="card-pad text-ink-muted flex items-center gap-2" [@fadeIn]>
              <lucide-icon name="info" class="w-4 h-4 text-primary-700"></lucide-icon>
              No hay vehículos disponibles en este momento.
            </div>
          } @else {
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                 [@stagger80]="flota().length">
              @for (v of flota(); track v.id) {
                <app-vehiculo-card [vehiculo]="v" (rent)="alquilar($event)" />
              }
            </div>

            @if (hayMas()) {
              <div class="mt-10 text-center">
                <a routerLink="/marketplace" class="btn-primary">
                  Ver todos los vehículos
                  <lucide-icon name="arrow-right" class="w-4 h-4"></lucide-icon>
                </a>
              </div>
            }
          }
        </div>
      </section>
    }
  `,
})
export class HomeComponent implements OnInit {
  private readonly router     = inject(Router);
  private readonly vehiculos$ = inject(VehiculosService);
  private readonly state      = inject(BookingStateService);

  protected readonly loadingFlota = signal(true);
  protected readonly flotaError   = signal(false);
  protected readonly flota        = signal<Vehiculo[]>([]);
  protected readonly hayMas       = signal(false);
  protected readonly searched     = signal(false);

  ngOnInit(): void {
    this.vehiculos$.marketplace().subscribe({
      next: (list) => {
        this.hayMas.set(list.length > FEATURED_LIMIT);
        this.flota.set(list.slice(0, FEATURED_LIMIT));
        this.loadingFlota.set(false);
      },
      error: () => {
        this.flotaError.set(true);
        this.loadingFlota.set(false);
      },
    });
  }

  protected onSearch(criteria: SearchCriteria): void {
    this.state.setCriteria(criteria);
    this.searched.set(true);
    void this.router.navigate(['/marketplace']);
  }

  protected alquilar(v: Vehiculo): void {
    this.state.setVehiculo(v);
    void this.router.navigate(['/reserva', v.id]);
  }
}
