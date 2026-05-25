import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { ReservasService }    from '@core/services/reservas.service';
import { AlquileresService }  from '@core/services/alquileres.service';
import { ToastService }       from '@core/services/toast.service';
import type {
  CreateAlquilerRequest, Reserva, ReservaStatus,
} from '@core/models/api.models';
import { formatLong, formatUsd } from '@core/utils/date.utils';
import { fadeIn, fadeUp } from '@core/animations/motion';
import { positiveNumberValidator } from '@core/validators/placa.validator';

import { BadgeStatusComponent } from '@shared/components/badge-status/badge-status.component';
import { EmptyStateComponent }  from '@shared/components/empty-state/empty-state.component';
import { ModalComponent }       from '@shared/components/modal/modal.component';
import { PaginatorComponent }   from '@shared/components/paginator/paginator.component';

const STATUSES: { id: ReservaStatus | 'TODAS'; label: string }[] = [
  { id: 'TODAS',      label: 'Todas' },
  { id: 'PENDIENTE',  label: 'Pendientes' },
  { id: 'CONFIRMADA', label: 'Confirmadas (pago recibido)' },
  { id: 'ACTIVA',     label: 'Activas' },
  { id: 'COMPLETADA', label: 'Completadas' },
  { id: 'CANCELADA',  label: 'Canceladas' },
];

@Component({
  selector: 'app-admin-reservas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgClass, ReactiveFormsModule, LucideAngularModule,
    BadgeStatusComponent, EmptyStateComponent, ModalComponent, PaginatorComponent,
  ],
  animations: [fadeIn, fadeUp],
  template: `
    <section class="px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <header class="flex items-end justify-between flex-wrap gap-3" [@fadeUp]>
        <div>
          <p class="text-xs uppercase tracking-wider text-ink-soft">Operaciones</p>
          <h2 class="text-2xl font-semibold flex items-center gap-2">
            <lucide-icon name="list-checks" class="w-6 h-6 text-primary-700"></lucide-icon>
            Control de Reservas y Pagos
          </h2>
          <p class="text-sm text-ink-muted mt-1">
            {{ filtered().length }} reservas visibles · total estimado
            {{ formatUsd(totalAcumulado()) }}.
          </p>
        </div>

        <input type="search" [value]="query()" (input)="setQuery($event)"
               class="input max-w-xs" placeholder="Buscar por placa, modelo o ID…" />
      </header>

      <!-- Filtros por estado -->
      <div class="flex flex-wrap gap-2" [@fadeUp]>
        @for (s of statuses; track s.id) {
          <button type="button"
                  (click)="setStatus(s.id)"
                  [ngClass]="chipClass(filterStatus() === s.id)">
            {{ s.label }}
            <span class="ml-1 text-[10px] opacity-70">
              ({{ countOf(s.id) }})
            </span>
          </button>
        }
      </div>

      <article class="card overflow-hidden" [@fadeUp]>
        @if (loading()) {
          <div class="p-6 space-y-2" [@fadeIn]>
            @for (i of [0,1,2,3,4,5]; track i) {
              <div class="skeleton h-12"></div>
            }
          </div>
        } @else if (filtered().length === 0) {
          <app-empty-state icon="list-checks" title="Sin reservas"
                           description="No hay reservas que coincidan con el filtro o la búsqueda actual." />
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-surface-muted text-ink-muted text-xs uppercase tracking-wider">
                <tr>
                  <th class="text-left px-4 py-3 font-semibold">ID</th>
                  <th class="text-left px-4 py-3 font-semibold">Vehículo</th>
                  <th class="text-left px-4 py-3 font-semibold">Fechas</th>
                  <th class="text-left px-4 py-3 font-semibold">Estado</th>
                  <th class="text-right px-4 py-3 font-semibold">Total</th>
                  <th class="text-right px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-border">
                @for (r of paginated(); track r.id) {
                  <tr class="hover:bg-primary-50/40 transition-colors">
                    <td class="px-4 py-3 font-mono text-xs text-ink-muted">
                      {{ shortId(r.id) }}
                    </td>
                    <td class="px-4 py-3">
                      <p class="font-medium leading-tight">
                        {{ r.vehiculo?.modelo?.marca?.nombre }}
                        <span class="text-ink-muted font-normal">
                          {{ r.vehiculo?.modelo?.nombre }}
                        </span>
                      </p>
                      <p class="text-xs text-ink-soft">{{ r.vehiculo?.placa }}</p>
                    </td>
                    <td class="px-4 py-3 text-ink-muted">
                      <p>{{ formatLong(r.fechaInicio) }}</p>
                      <p class="text-xs">→ {{ formatLong(r.fechaFin) }}</p>
                    </td>
                    <td class="px-4 py-3">
                      <app-badge-status [status]="r.status" />
                    </td>
                    <td class="px-4 py-3 text-right font-bold text-primary-700">
                      {{ formatUsd(r.total) }}
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-end gap-1">
                        @if (canIniciarAlquiler(r)) {
                          <button type="button" class="btn-primary !py-1.5 !px-3 text-xs"
                                  [disabled]="!!processingId()"
                                  (click)="askIniciar(r)">
                            <lucide-icon name="power" class="w-3.5 h-3.5"></lucide-icon>
                            Iniciar alquiler
                          </button>
                        }
                        @if (canConfirmar(r)) {
                          <button type="button" class="btn-outline !py-1.5 !px-3 text-xs"
                                  [disabled]="processingId() === r.id"
                                  (click)="confirmar(r)">
                            @if (processingId() === r.id) {
                              <lucide-icon name="loader-2" class="w-3.5 h-3.5 animate-spin"></lucide-icon>
                            } @else {
                              <lucide-icon name="check-circle-2" class="w-3.5 h-3.5"></lucide-icon>
                            }
                            Confirmar
                          </button>
                        }
                        @if (canCancelar(r)) {
                          <button type="button" class="btn-ghost text-danger hover:bg-red-50"
                                  title="Cancelar reserva"
                                  [disabled]="processingId() === r.id"
                                  (click)="cancelar(r)">
                            @if (processingId() === r.id) {
                              <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
                            } @else {
                              <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
                            }
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <app-paginator
              [total]="filtered().length" [page]="page()" [limit]="limit()"
              (pageChange)="setPage($event)"
              (limitChange)="setLimit($event)" />
        }
      </article>
    </section>

    <!-- ════════ Modal Iniciar Alquiler ════════ -->
    <app-modal [open]="!!iniciandoReserva()" size="md"
               title="Iniciar alquiler"
               subtitle="Cambia la reserva a ACTIVA y registra los kilómetros de salida."
               (closed)="cancelIniciar()">
      <ng-container body>
        @if (iniciandoReserva(); as r) {
          <div class="rounded-xl border border-surface-border bg-surface-muted p-3 mb-4">
            <p class="text-sm font-semibold">
              {{ r.vehiculo?.modelo?.marca?.nombre }} {{ r.vehiculo?.modelo?.nombre }}
              <span class="text-ink-muted font-normal">· {{ r.vehiculo?.placa }}</span>
            </p>
            <p class="text-xs text-ink-soft">
              {{ formatLong(r.fechaInicio) }} → {{ formatLong(r.fechaFin) }}
            </p>
          </div>

          <form [formGroup]="iniciarForm" novalidate class="space-y-4">
            <div>
              <label class="label" for="km-salida">Kilometraje de salida *</label>
              <input id="km-salida" type="number" formControlName="kmSalida"
                     class="input" min="0" step="1" />
              @if (iniciarForm.controls.kmSalida.touched
                   && iniciarForm.controls.kmSalida.invalid) {
                <p class="error">Ingresa un kilometraje mayor o igual a cero.</p>
              }
            </div>
            <div>
              <label class="label" for="km-obs">Observaciones</label>
              <textarea id="km-obs" formControlName="observaciones" class="input min-h-[80px]"
                        placeholder="Detalles del retiro, daños previos, etc."></textarea>
            </div>
          </form>
        }
      </ng-container>
      <ng-container footer>
        <button type="button" class="btn-outline" (click)="cancelIniciar()" [disabled]="saving()">
          Cancelar
        </button>
        <button type="button" class="btn-primary"
                [disabled]="iniciarForm.invalid || saving()"
                (click)="confirmIniciar()">
          @if (saving()) {
            <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
            Procesando…
          } @else {
            <lucide-icon name="power" class="w-4 h-4"></lucide-icon>
            Iniciar alquiler
          }
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class AdminReservasComponent implements OnInit {
  private readonly reservas$    = inject(ReservasService);
  private readonly alquileres$  = inject(AlquileresService);
  private readonly toast        = inject(ToastService);
  private readonly fb           = inject(FormBuilder);

  protected readonly statuses    = STATUSES;
  protected readonly formatLong  = formatLong;
  protected readonly formatUsd   = formatUsd;

  protected readonly loading      = signal(true);
  protected readonly saving       = signal(false);
  protected readonly processingId = signal<string | null>(null);
  protected readonly reservas     = signal<Reserva[]>([]);
  protected readonly query        = signal('');
  protected readonly filterStatus = signal<ReservaStatus | 'TODAS'>('TODAS');

  // ── Paginación cliente (GET /reservas devuelve la lista completa) ──
  protected readonly page  = signal(1);
  protected readonly limit = signal(20);

  protected readonly iniciandoReserva = signal<Reserva | null>(null);
  protected readonly iniciarForm = this.fb.nonNullable.group({
    kmSalida:      [0,  [Validators.required, Validators.min(0), positiveNumberValidator]],
    observaciones: [''],
  });

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const s = this.filterStatus();
    return this.reservas().filter((r) => {
      if (s !== 'TODAS' && r.status !== s) return false;
      if (!q) return true;
      return r.id.toLowerCase().includes(q) ||
             (r.vehiculo?.placa ?? '').toLowerCase().includes(q) ||
             (r.vehiculo?.modelo?.nombre ?? '').toLowerCase().includes(q);
    });
  });

  protected readonly totalAcumulado = computed(() =>
    this.filtered().reduce((acc, r) => acc + Number(r.total ?? 0), 0),
  );

  /** Slice del listado filtrado para la página actual. */
  protected readonly paginated = computed(() => {
    const start = (this.page() - 1) * this.limit();
    return this.filtered().slice(start, start + this.limit());
  });

  ngOnInit(): void { this.fetch(); }

  // ── Filtros y paginación ─────────────────────────────────
  protected setQuery(ev: Event): void {
    this.query.set((ev.target as HTMLInputElement).value);
    this.page.set(1);
  }
  protected setStatus(id: ReservaStatus | 'TODAS'): void {
    this.filterStatus.set(id);
    this.page.set(1);
  }
  protected setPage(p: number):  void { this.page.set(p); }
  protected setLimit(l: number): void { this.limit.set(l); this.page.set(1); }

  protected chipClass(active: boolean): string {
    return active
      ? 'rounded-full px-3 py-1 text-xs font-medium bg-primary-700 text-white border border-primary-800'
      : 'rounded-full px-3 py-1 text-xs font-medium bg-white text-ink-muted border border-surface-border hover:border-primary hover:text-primary-700';
  }

  protected countOf(s: ReservaStatus | 'TODAS'): number {
    if (s === 'TODAS') return this.reservas().length;
    return this.reservas().filter((r) => r.status === s).length;
  }

  // ── Acciones ─────────────────────────────────────────────
  protected canIniciarAlquiler(r: Reserva): boolean { return r.status === 'CONFIRMADA'; }
  protected canConfirmar(r: Reserva):       boolean { return r.status === 'PENDIENTE'; }
  protected canCancelar(r: Reserva):        boolean {
    return r.status === 'PENDIENTE' || r.status === 'CONFIRMADA';
  }

  protected confirmar(r: Reserva): void {
    if (this.processingId()) return;
    this.processingId.set(r.id);
    this.reservas$.updateStatus(r.id, 'CONFIRMADA').subscribe({
      next: () => {
        this.processingId.set(null);
        this.toast.success('Reserva confirmada', this.shortId(r.id));
        this.fetch();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.processingId.set(null);
        this.toast.error('No se pudo confirmar',
          err?.error?.error?.message ?? 'Intenta nuevamente.');
      },
    });
  }

  protected cancelar(r: Reserva): void {
    if (this.processingId()) return;
    this.processingId.set(r.id);
    this.reservas$.cancel(r.id).subscribe({
      next: () => {
        this.processingId.set(null);
        this.toast.success('Reserva cancelada', this.shortId(r.id));
        this.fetch();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.processingId.set(null);
        this.toast.error('No se pudo cancelar',
          err?.error?.error?.message ?? 'Intenta nuevamente.');
      },
    });
  }

  protected askIniciar(r: Reserva): void {
    this.iniciandoReserva.set(r);
    this.iniciarForm.reset({
      kmSalida: r.vehiculo?.kilometraje ?? 0,
      observaciones: '',
    });
  }
  protected cancelIniciar(): void { this.iniciandoReserva.set(null); }

  protected confirmIniciar(): void {
    const r = this.iniciandoReserva();
    if (!r || this.iniciarForm.invalid) {
      this.iniciarForm.markAllAsTouched();
      return;
    }
    const v = this.iniciarForm.getRawValue();
    const payload: CreateAlquilerRequest = {
      reservaId: r.id,
      kmSalida: Number(v.kmSalida),
      observaciones: v.observaciones?.trim() || undefined,
    };
    this.saving.set(true);
    this.alquileres$.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Alquiler iniciado', `Reserva ${this.shortId(r.id)} → ACTIVA`);
        this.iniciandoReserva.set(null);
        this.fetch();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.saving.set(false);
        this.toast.error('No se pudo iniciar el alquiler',
          err?.error?.error?.message ?? 'Verifica el estado de la reserva.');
      },
    });
  }

  protected shortId(id: string): string { return id.slice(0, 8).toUpperCase(); }

  // ── Carga ────────────────────────────────────────────────
  private fetch(): void {
    this.loading.set(true);
    this.reservas$.listAll().subscribe({
      next: (l) => {
        this.reservas.set(l);
        this.loading.set(false);
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.reservas.set([]);
        this.loading.set(false);
        this.toast.error('No se pudo cargar las reservas',
          err?.error?.error?.message ?? 'Verifica el backend.');
      },
    });
  }
}
