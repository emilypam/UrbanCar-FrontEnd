import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { CatalogosService } from '@core/services/catalogos.service';
import { VehiculosService } from '@core/services/vehiculos.service';
import {
  BookingStateService, type SearchCriteria,
} from '@core/services/booking-state.service';
import type {
  Categoria, TipoCombustible, TipoTransmision, Vehiculo,
} from '@core/models/api.models';
import { formatLong } from '@core/utils/date.utils';
import { fadeIn, fadeUp, stagger80 } from '@core/animations/motion';

import { SearchBarComponent } from '@shared/components/search-bar/search-bar.component';
import { VehiculoCardComponent } from '@shared/components/vehiculo-card/vehiculo-card.component';
import {
  VehiculoCardSkeletonComponent,
} from '@shared/components/vehiculo-card-skeleton/vehiculo-card-skeleton.component';

interface ChipOption { id: string | null; label: string; }

@Component({
  selector: 'app-marketplace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgClass, LucideAngularModule,
    SearchBarComponent, VehiculoCardComponent, VehiculoCardSkeletonComponent,
  ],
  animations: [fadeIn, fadeUp, stagger80],
  template: `
    <!-- Buscador resumido en cabecera -->
    <section class="bg-gradient-to-b from-primary-50 to-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <h1 class="text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <lucide-icon name="search" class="w-6 h-6 text-primary-700"></lucide-icon>
          Vehículos disponibles
        </h1>
        <p class="text-sm text-ink-muted mt-1">
          {{ resumenFechas() }}
        </p>
      </div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <app-search-bar (search)="onSearch($event)" />
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">

        <!-- FILTROS -->
        <aside class="card-pad h-fit lg:sticky lg:top-20" [@fadeUp]>
          <header class="flex items-center justify-between mb-4">
            <h2 class="font-semibold flex items-center gap-2">
              <lucide-icon name="sliders-horizontal" class="w-4 h-4 text-primary-700"></lucide-icon>
              Filtros
            </h2>
            @if (hasFiltros()) {
              <button type="button" class="text-xs text-primary-700 hover:underline"
                      (click)="clearFiltros()">Limpiar</button>
            }
          </header>

          <fieldset class="mb-5">
            <legend class="text-xs uppercase tracking-wider text-ink-soft mb-2">Categoría</legend>
            <div class="flex flex-wrap gap-2">
              @for (opt of categoriaChips(); track opt.id) {
                <button type="button"
                        (click)="setFiltro({ categoriaId: opt.id })"
                        [ngClass]="chipClass(criteria().categoriaId === opt.id)">
                  {{ opt.label }}
                </button>
              }
            </div>
          </fieldset>

          <fieldset class="mb-5">
            <legend class="text-xs uppercase tracking-wider text-ink-soft mb-2">Combustible</legend>
            <div class="flex flex-wrap gap-2">
              @for (opt of combustibleChips(); track opt.id) {
                <button type="button"
                        (click)="setFiltro({ tipoCombustibleId: opt.id })"
                        [ngClass]="chipClass(criteria().tipoCombustibleId === opt.id)">
                  {{ opt.label }}
                </button>
              }
            </div>
          </fieldset>

          <fieldset>
            <legend class="text-xs uppercase tracking-wider text-ink-soft mb-2">Transmisión</legend>
            <div class="flex flex-wrap gap-2">
              @for (opt of transmisionChips(); track opt.id) {
                <button type="button"
                        (click)="setFiltro({ tipoTransmisionId: opt.id })"
                        [ngClass]="chipClass(criteria().tipoTransmisionId === opt.id)">
                  {{ opt.label }}
                </button>
              }
            </div>
          </fieldset>
        </aside>

        <!-- LISTADO -->
        <div>
          @if (loading()) {
            <p class="text-sm text-ink-muted mb-4 inline-flex items-center gap-2" [@fadeIn]>
              <lucide-icon name="loader-2" class="w-4 h-4 animate-spin text-primary-700"></lucide-icon>
              Buscando vehículos disponibles…
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              <app-vehiculo-card-skeleton [count]="6" />
            </div>
          } @else if (errorMsg()) {
            <div class="card-pad text-danger flex items-center gap-2" [@fadeIn]>
              <lucide-icon name="alert-circle" class="w-4 h-4"></lucide-icon>
              {{ errorMsg() }}
            </div>
          } @else if (vehiculos().length === 0) {
            <div class="card-pad text-ink-muted flex items-start gap-3" [@fadeIn]>
              <lucide-icon name="info" class="w-5 h-5 text-primary-700 mt-0.5"></lucide-icon>
              <div>
                <p class="font-medium text-ink">No encontramos autos con esos criterios.</p>
                <p class="text-sm">Prueba ampliando el rango de fechas o quitando filtros.</p>
              </div>
            </div>
          } @else {
            <p class="text-sm text-ink-muted mb-4">
              {{ vehiculos().length }}
              {{ vehiculos().length === 1 ? 'vehículo encontrado' : 'vehículos encontrados' }}
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                 [@stagger80]="vehiculos().length">
              @for (v of vehiculos(); track v.id) {
                <app-vehiculo-card [vehiculo]="v" (rent)="alquilar($event)" />
              }
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class MarketplaceComponent implements OnInit {
  private readonly catalogos  = inject(CatalogosService);
  private readonly vehiculos$ = inject(VehiculosService);
  private readonly state      = inject(BookingStateService);
  private readonly router     = inject(Router);

  protected readonly loading   = signal(false);
  protected readonly errorMsg  = signal<string | null>(null);
  protected readonly vehiculos = signal<Vehiculo[]>([]);

  protected readonly criteria = this.state.criteria;

  // Catálogos para filtros
  private readonly _categorias   = signal<Categoria[]>([]);
  private readonly _combustibles = signal<TipoCombustible[]>([]);
  private readonly _transmisiones = signal<TipoTransmision[]>([]);

  protected readonly categoriaChips = computed<ChipOption[]>(() => [
    { id: null, label: 'Todas' },
    ...this._categorias().map((c) => ({ id: c.id, label: c.nombre })),
  ]);
  protected readonly combustibleChips = computed<ChipOption[]>(() => [
    { id: null, label: 'Todos' },
    ...this._combustibles().map((c) => ({ id: c.id, label: c.nombre })),
  ]);
  protected readonly transmisionChips = computed<ChipOption[]>(() => [
    { id: null, label: 'Todas' },
    ...this._transmisiones().map((c) => ({ id: c.id, label: c.nombre })),
  ]);

  protected readonly hasFiltros = computed(() => {
    const c = this.criteria();
    return !!(c.categoriaId || c.tipoCombustibleId || c.tipoTransmisionId);
  });

  protected readonly resumenFechas = computed(() => {
    const c = this.criteria();
    const inicio = formatLong(c.fechaInicio);
    const fin    = formatLong(c.fechaFin);
    return `${inicio} · ${c.horaRecogida}  →  ${fin} · ${c.horaDevolucion}`;
  });

  ngOnInit(): void {
    this.catalogos.categorias().subscribe({
      next: (l) => this._categorias.set(l), error: () => this._categorias.set([]),
    });
    this.catalogos.tiposCombustible().subscribe({
      next: (l) => this._combustibles.set(l), error: () => this._combustibles.set([]),
    });
    this.catalogos.tiposTransmision().subscribe({
      next: (l) => this._transmisiones.set(l), error: () => this._transmisiones.set([]),
    });
    this.fetchVehiculos();
  }

  protected onSearch(_c: SearchCriteria): void { this.fetchVehiculos(); }

  protected setFiltro(patch: Partial<SearchCriteria>): void {
    this.state.setCriteria(patch);
    this.fetchVehiculos();
  }

  protected clearFiltros(): void {
    this.state.setCriteria({
      categoriaId: null,
      tipoCombustibleId: null,
      tipoTransmisionId: null,
    });
    this.fetchVehiculos();
  }

  protected alquilar(v: Vehiculo): void {
    this.state.setVehiculo(v);
    void this.router.navigate(['/reserva', v.id]);
  }

  protected chipClass(active: boolean): string {
    return active
      ? 'rounded-full px-3 py-1 text-xs font-medium bg-primary-700 text-white border border-primary-800'
      : 'rounded-full px-3 py-1 text-xs font-medium bg-white text-ink-muted border border-surface-border hover:border-primary hover:text-primary-700';
  }

  // ── Llamada al backend ────────────────────────────────────
  private fetchVehiculos(): void {
    const c = this.criteria();
    this.loading.set(true);
    this.errorMsg.set(null);

    this.vehiculos$.marketplace({
      ciudadId:          c.ciudadId          ?? undefined,
      categoriaId:       c.categoriaId       ?? undefined,
      tipoCombustibleId: c.tipoCombustibleId ?? undefined,
      tipoTransmisionId: c.tipoTransmisionId ?? undefined,
    }).subscribe({
      next: (data) => { this.vehiculos.set(data); this.loading.set(false); },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.loading.set(false);
        this.vehiculos.set([]);
        this.errorMsg.set(
          err?.error?.error?.message ??
          'No pudimos cargar el catálogo. Intenta nuevamente.',
        );
      },
    });
  }
}
