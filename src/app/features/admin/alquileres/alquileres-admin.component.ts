import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { AlquileresService } from '@core/services/alquileres.service';
import { ToastService }      from '@core/services/toast.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ModalComponent }      from '@shared/components/modal/modal.component';
import { formatUsd } from '@core/utils/date.utils';
import type { Alquiler, AlquilerStatus } from '@core/models/api.models';

const STATUS_CLASSES: Record<AlquilerStatus, string> = {
  ACTIVO:     'bg-primary-700 text-white border-primary-800',
  FINALIZADO: 'bg-slate-100 text-ink border-slate-200',
};

const ESTADOS_VEHICULO = ['BUENO', 'REGULAR', 'MALO'] as const;

@Component({
  selector: 'app-admin-alquileres',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, DecimalPipe, NgClass, ReactiveFormsModule,
    LucideAngularModule, EmptyStateComponent, ModalComponent,
  ],
  template: `
    <section class="px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <header class="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p class="text-xs uppercase tracking-wider text-ink-soft">Panel administrativo</p>
          <h2 class="text-2xl font-semibold text-ink">Alquileres</h2>
        </div>
        <span class="text-sm text-ink-muted">
          {{ total() }} registro{{ total() !== 1 ? 's' : '' }}
        </span>
      </header>

      <!-- Skeleton -->
      @if (loading()) {
        <div class="card overflow-hidden">
          <div class="divide-y divide-surface-border">
            @for (i of [0,1,2,3,4]; track i) {
              <div class="px-5 py-3.5 flex items-center gap-4" aria-hidden="true">
                <div class="skeleton h-3 w-20"></div>
                <div class="skeleton h-3 w-32 flex-1"></div>
                <div class="skeleton h-5 w-20 rounded-full"></div>
                <div class="skeleton h-3 w-16"></div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Empty -->
      @else if (alquileres().length === 0) {
        <app-empty-state
          icon="key-round"
          title="Sin alquileres registrados"
          description="Los alquileres aparecerán aquí cuando se inicien reservas confirmadas."
        />
      }

      <!-- Tabla -->
      @else {
        <div class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="bg-surface-muted border-b border-surface-border text-xs uppercase
                           tracking-wider text-ink-soft">
                  <th class="px-5 py-3 text-left font-medium">ID</th>
                  <th class="px-5 py-3 text-left font-medium">Vehículo</th>
                  <th class="px-5 py-3 text-left font-medium">Km Salida</th>
                  <th class="px-5 py-3 text-left font-medium">Km Entrada</th>
                  <th class="px-5 py-3 text-left font-medium">Fecha inicio</th>
                  <th class="px-5 py-3 text-left font-medium">Fecha fin</th>
                  <th class="px-5 py-3 text-left font-medium">Estado</th>
                  <th class="px-5 py-3 text-right font-medium">Total</th>
                  <th class="px-5 py-3 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-border">
                @for (a of alquileres(); track a.id) {
                  <tr class="hover:bg-surface-muted/50 transition-colors">
                    <td class="px-5 py-3 font-mono text-xs text-ink-soft">
                      {{ a.id.slice(0, 8) }}…
                    </td>
                    <td class="px-5 py-3">
                      <p class="font-medium text-ink">
                        {{ a.reserva?.vehiculo?.modelo?.marca?.nombre ?? '—' }}
                        {{ a.reserva?.vehiculo?.modelo?.nombre ?? '' }}
                      </p>
                      <p class="text-xs text-ink-muted">{{ a.reserva?.vehiculo?.placa ?? '' }}</p>
                    </td>
                    <td class="px-5 py-3 text-ink-muted">{{ a.kmSalida | number }}</td>
                    <td class="px-5 py-3 text-ink-muted">
                      {{ a.kmEntrada != null ? (a.kmEntrada | number) : '—' }}
                    </td>
                    <td class="px-5 py-3 text-ink-muted">
                      {{ a.fechaInicio | date:'dd/MM/yyyy' }}
                    </td>
                    <td class="px-5 py-3 text-ink-muted">
                      {{ a.fechaFin ? (a.fechaFin | date:'dd/MM/yyyy') : '—' }}
                    </td>
                    <td class="px-5 py-3">
                      <span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5
                                   text-xs font-medium uppercase tracking-wide"
                            [ngClass]="statusCls(a.status)">
                        {{ a.status }}
                      </span>
                    </td>
                    <td class="px-5 py-3 text-right font-semibold text-primary-700">
                      {{ formatUsd(a.reserva?.total) }}
                    </td>
                    <td class="px-5 py-3 text-right">
                      @if (a.status === 'ACTIVO') {
                        <button type="button"
                                class="btn-outline !py-1.5 !px-3 text-xs"
                                (click)="askDevolucion(a)">
                          <lucide-icon name="arrow-left-right" class="w-3.5 h-3.5"></lucide-icon>
                          Registrar devolución
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </section>

    <!-- ════════ Modal Registrar Devolución ════════ -->
    <app-modal [open]="!!devolviendo()" size="md"
               title="Registrar devolución"
               subtitle="Finaliza el alquiler y libera el vehículo."
               (closed)="cancelDevolucion()">
      <ng-container body>
        @if (devolviendo(); as a) {
          <div class="rounded-xl border border-surface-border bg-surface-muted p-3 mb-4">
            <p class="text-sm font-semibold">
              {{ a.reserva?.vehiculo?.modelo?.marca?.nombre }}
              {{ a.reserva?.vehiculo?.modelo?.nombre }}
              <span class="text-ink-muted font-normal">· {{ a.reserva?.vehiculo?.placa }}</span>
            </p>
            <p class="text-xs text-ink-soft">Km salida: {{ a.kmSalida | number }}</p>
          </div>

          <form [formGroup]="devolucionForm" novalidate class="space-y-4">
            <div>
              <label class="label" for="km-entrada">Kilometraje de entrada *</label>
              <input id="km-entrada" type="number" formControlName="kmEntrada"
                     class="input" [min]="a.kmSalida ?? 0" step="1" />
              @if (devolucionForm.controls.kmEntrada.touched
                   && devolucionForm.controls.kmEntrada.invalid) {
                <p class="error">Debe ser mayor o igual al km de salida ({{ a.kmSalida | number }}).</p>
              }
            </div>

            <div>
              <label class="label" for="estado-v">Estado del vehículo *</label>
              <select id="estado-v" formControlName="estadoVehiculo" class="input">
                <option value="" disabled>Selecciona…</option>
                @for (e of estados; track e) {
                  <option [value]="e">{{ e }}</option>
                }
              </select>
            </div>

            <div>
              <label class="label" for="cargo-extra">Cargo extra (USD)</label>
              <input id="cargo-extra" type="number" formControlName="cargoExtra"
                     class="input" min="0" step="0.01" />
            </div>

            <div>
              <label class="label" for="obs-dev">Observaciones</label>
              <textarea id="obs-dev" formControlName="observaciones"
                        class="input min-h-[72px]"
                        placeholder="Daños, novedades al ingreso…"></textarea>
            </div>
          </form>
        }
      </ng-container>
      <ng-container footer>
        <button type="button" class="btn-outline" (click)="cancelDevolucion()" [disabled]="saving()">
          Cancelar
        </button>
        <button type="button" class="btn-primary"
                [disabled]="devolucionForm.invalid || saving()"
                (click)="confirmDevolucion()">
          @if (saving()) {
            <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
            Procesando…
          } @else {
            <lucide-icon name="arrow-left-right" class="w-4 h-4"></lucide-icon>
            Confirmar devolución
          }
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class AdminAlquileresComponent implements OnInit {
  private readonly alquileres$ = inject(AlquileresService);
  private readonly toast        = inject(ToastService);
  private readonly fb           = inject(FormBuilder);

  protected readonly formatUsd  = formatUsd;
  protected readonly estados    = ESTADOS_VEHICULO;

  protected readonly loading    = signal(true);
  protected readonly saving     = signal(false);
  protected readonly alquileres = signal<Alquiler[]>([]);
  protected readonly total      = computed(() => this.alquileres().length);
  protected readonly devolviendo = signal<Alquiler | null>(null);

  protected readonly devolucionForm = this.fb.nonNullable.group({
    kmEntrada:      [0,  [Validators.required, Validators.min(0)]],
    estadoVehiculo: ['', Validators.required],
    cargoExtra:     [0],
    observaciones:  [''],
  });

  protected statusCls(s: AlquilerStatus): string {
    return STATUS_CLASSES[s] ?? 'bg-slate-100 text-ink';
  }

  ngOnInit(): void { this.fetch(); }

  protected askDevolucion(a: Alquiler): void {
    this.devolviendo.set(a);
    this.devolucionForm.reset({
      kmEntrada:      a.kmSalida ?? 0,
      estadoVehiculo: '',
      cargoExtra:     0,
      observaciones:  '',
    });
    this.devolucionForm.controls.kmEntrada.setValidators([
      Validators.required,
      Validators.min(a.kmSalida ?? 0),
    ]);
    this.devolucionForm.controls.kmEntrada.updateValueAndValidity();
  }

  protected cancelDevolucion(): void { this.devolviendo.set(null); }

  protected confirmDevolucion(): void {
    const a = this.devolviendo();
    if (!a || this.devolucionForm.invalid) {
      this.devolucionForm.markAllAsTouched();
      return;
    }
    const v = this.devolucionForm.getRawValue();
    this.saving.set(true);
    this.alquileres$.registrarDevolucion({
      alquilerId:     a.id,
      kmEntrada:      Number(v.kmEntrada),
      estadoVehiculo: v.estadoVehiculo,
      cargoExtra:     Number(v.cargoExtra) || 0,
      observaciones:  v.observaciones?.trim() || undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Devolución registrada', `Vehículo liberado → DISPONIBLE`);
        this.devolviendo.set(null);
        this.fetch();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.saving.set(false);
        this.toast.error('No se pudo registrar la devolución',
          err?.error?.error?.message ?? 'Intenta nuevamente.');
      },
    });
  }

  private fetch(): void {
    this.loading.set(true);
    this.alquileres$.list().subscribe({
      next:  (list) => { this.alquileres.set(list); this.loading.set(false); },
      error: ()     => { this.loading.set(false); },
    });
  }
}
