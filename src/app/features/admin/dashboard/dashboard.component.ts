import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

import { AdminService } from '@core/services/admin.service';
import { VehiculosService } from '@core/services/vehiculos.service';
import { ReservasService } from '@core/services/reservas.service';
import type {
  DashboardStats, Reserva, Vehiculo,
} from '@core/models/api.models';
import { formatLong, formatUsd, todayIso } from '@core/utils/date.utils';
import { fadeUp, stagger80 } from '@core/animations/motion';

interface Kpi {
  label: string;
  icon: string;
  value: string;
  hint: string;
  /** Tailwind classes para el bloque de icono. */
  tone: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, LucideAngularModule],
  animations: [fadeUp, stagger80],
  template: `
    <section class="px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      <header class="flex items-end justify-between flex-wrap gap-3" [@fadeUp]>
        <div>
          <p class="text-xs uppercase tracking-wider text-ink-soft">
            Resumen de operación
          </p>
          <h2 class="text-2xl font-semibold text-ink">Dashboard</h2>
        </div>
        <p class="text-sm text-ink-muted">{{ today() }}</p>
      </header>

      <!-- KPI cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
           [@stagger80]="kpis().length">
        @for (k of kpis(); track k.label) {
          <article class="card-pad flex items-start gap-4 hover:shadow-card transition-shadow">
            <span class="grid place-items-center w-12 h-12 rounded-2xl shrink-0"
                  [ngClass]="k.tone">
              <lucide-icon [name]="k.icon" class="w-6 h-6"></lucide-icon>
            </span>
            <div class="min-w-0">
              <p class="text-[11px] uppercase tracking-wider text-ink-soft">{{ k.label }}</p>
              <p class="text-3xl font-bold leading-tight mt-1">{{ k.value }}</p>
              <p class="text-xs text-ink-muted mt-1 truncate">{{ k.hint }}</p>
            </div>
          </article>
        }
      </div>

      <!-- Detalle: vehículos en mantenimiento + reservas recientes -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <article class="card-pad" [@fadeUp]>
          <header class="flex items-center justify-between mb-4">
            <h3 class="font-semibold flex items-center gap-2">
              <lucide-icon name="wrench" class="w-4 h-4 text-primary-700"></lucide-icon>
              Vehículos en mantenimiento
            </h3>
            <span class="badge-warn">{{ enMantenimiento().length }}</span>
          </header>
          @if (loading()) {
            <ul class="space-y-2">
              @for (i of [0,1,2]; track i) {
                <li class="h-12 rounded-xl bg-surface-muted animate-pulse"></li>
              }
            </ul>
          } @else if (enMantenimiento().length === 0) {
            <p class="text-sm text-ink-muted">Sin vehículos en mantenimiento.</p>
          } @else {
            <ul class="divide-y divide-surface-border">
              @for (v of enMantenimiento(); track v.id) {
                <li class="py-2 flex items-center justify-between text-sm">
                  <span class="font-medium">
                    {{ v.modelo?.marca?.nombre }} {{ v.modelo?.nombre }}
                    <span class="text-ink-muted">· {{ v.placa }}</span>
                  </span>
                  <span class="text-xs text-warning font-medium">
                    {{ v.estado?.nombre ?? 'Mantenimiento' }}
                  </span>
                </li>
              }
            </ul>
          }
        </article>

        <article class="card-pad" [@fadeUp]>
          <header class="flex items-center justify-between mb-4">
            <h3 class="font-semibold flex items-center gap-2">
              <lucide-icon name="list-checks" class="w-4 h-4 text-primary-700"></lucide-icon>
              Reservas más recientes
            </h3>
            <span class="badge-primary">{{ reservasRecientes().length }}</span>
          </header>
          @if (loading()) {
            <ul class="space-y-2">
              @for (i of [0,1,2,3]; track i) {
                <li class="h-12 rounded-xl bg-surface-muted animate-pulse"></li>
              }
            </ul>
          } @else if (reservasRecientes().length === 0) {
            <p class="text-sm text-ink-muted">Aún no hay reservas registradas.</p>
          } @else {
            <ul class="divide-y divide-surface-border">
              @for (r of reservasRecientes(); track r.id) {
                <li class="py-2.5 flex items-center justify-between text-sm">
                  <div class="min-w-0">
                    <p class="font-medium truncate">
                      {{ r.vehiculo?.modelo?.marca?.nombre }} {{ r.vehiculo?.modelo?.nombre }}
                    </p>
                    <p class="text-xs text-ink-soft">
                      {{ r.fechaInicio }} → {{ r.fechaFin }}
                    </p>
                  </div>
                  <span class="text-xs font-bold text-primary-700">
                    {{ formatUsd(r.total) }}
                  </span>
                </li>
              }
            </ul>
          }
        </article>
      </div>
    </section>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly admin      = inject(AdminService);
  private readonly vehiculos$ = inject(VehiculosService);
  private readonly reservas$  = inject(ReservasService);

  protected readonly formatUsd = formatUsd;
  protected readonly today = signal(formatLong(todayIso()));

  protected readonly loading = signal(true);
  private readonly _stats     = signal<DashboardStats | null>(null);
  private readonly _vehiculos = signal<Vehiculo[]>([]);
  private readonly _reservas  = signal<Reserva[]>([]);

  protected readonly enMantenimiento = computed(() =>
    this._vehiculos().filter((v) => /mantenim/i.test(v.estado?.nombre ?? '')),
  );

  protected readonly reservasRecientes = computed(() =>
    [...this._reservas()]
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, 5),
  );

  protected readonly kpis = computed<Kpi[]>(() => {
    const s = this._stats();
    const reservasHoy = this.reservasHoyCount();
    const enUso       = this._vehiculos().filter((v) => /uso/i.test(v.estado?.nombre ?? '')).length;
    const enMant      = this.enMantenimiento().length;
    const ingresos    = s?.ingresos.total || this.fallbackIngresos();

    return [
      {
        label: 'Autos en uso',
        icon:  'car',
        value: String(enUso || s?.reservas.activas || 0),
        hint:  this._vehiculos().length
                 ? `${this._vehiculos().length - enUso - enMant} disponibles · ${this._vehiculos().length} totales`
                 : 'Sincronizando flota…',
        tone:  'bg-primary-50 text-primary-700',
      },
      {
        label: 'Reservas hoy',
        icon:  'calendar',
        value: String(reservasHoy),
        hint:  s ? `${s.reservas.total} en total · ${s.reservas.activas} activas`
                 : 'Sin datos aún',
        tone:  'bg-amber-50 text-warning',
      },
      {
        label: 'Ingresos acumulados',
        icon:  'wallet',
        value: formatUsd(ingresos),
        hint:  s?.facturas.total
                 ? `${s.facturas.total} facturas emitidas`
                 : `${this._reservas().filter((r) => r.status !== 'CANCELADA').length} reservas activas/completadas`,
        tone:  'bg-primary-700 text-white',
      },
      {
        label: 'En mantenimiento',
        icon:  'wrench',
        value: String(enMant),
        hint:  enMant === 0
                 ? 'Toda la flota operativa'
                 : 'Requieren revisión',
        tone:  'bg-red-50 text-danger',
      },
    ];
  });

  ngOnInit(): void {
    this.admin.dashboard().subscribe({
      next: (s) => { this._stats.set(s); this.tryFinishLoading(); },
      error: ()  => { this._stats.set(null); this.tryFinishLoading(); },
    });
    this.vehiculos$.list(1, 200).subscribe({
      next: (p) => { this._vehiculos.set(p.items); this.tryFinishLoading(); },
      error: ()  => { this._vehiculos.set([]);     this.tryFinishLoading(); },
    });
    this.reservas$.listAll().subscribe({
      next: (l) => { this._reservas.set(l); this.tryFinishLoading(); },
      error: ()  => { this._reservas.set([]); this.tryFinishLoading(); },
    });
  }

  private finished = 0;
  private tryFinishLoading(): void {
    this.finished += 1;
    if (this.finished >= 3) this.loading.set(false);
  }

  private reservasHoyCount(): number {
    const hoy = todayIso();
    return this._reservas().filter((r) => (r.createdAt ?? '').startsWith(hoy)).length;
  }

  private fallbackIngresos(): number {
    return this._reservas()
      .filter((r) => r.status !== 'CANCELADA')
      .reduce((acc, r) => acc + Number(r.total ?? 0), 0);
  }
}
