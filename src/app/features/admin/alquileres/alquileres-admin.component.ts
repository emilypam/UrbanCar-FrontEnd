import {
  ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { filter, interval } from 'rxjs';

import { AlquileresService } from '@core/services/alquileres.service';
import { AdminService }      from '@core/services/admin.service';
import { ToastService }      from '@core/services/toast.service';
import { VehiculosService }  from '@core/services/vehiculos.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ModalComponent }      from '@shared/components/modal/modal.component';
import { formatUsd } from '@core/utils/date.utils';
import type { Alquiler, AlquilerStatus, Factura, Vehiculo } from '@core/models/api.models';

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
          @if (lastUpdated()) {
            <p class="flex items-center gap-1.5 text-xs text-ink-soft mt-1">
              <span class="w-1.5 h-1.5 rounded-full bg-primary-700 animate-pulse"></span>
              En vivo · {{ lastUpdated() }}
            </p>
          }
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
                      @if (a.reserva?.vehiculo ?? vehiculosMap().get(a.reserva?.vehiculoId ?? ''); as v) {
                        <p class="font-medium text-ink">
                          {{ v.modelo?.marca?.nombre }}
                          <span class="text-ink-muted font-normal">{{ v.modelo?.nombre }}</span>
                        </p>
                        <p class="text-xs text-ink-muted">{{ v.placa }}</p>
                      } @else {
                        <span class="text-xs text-ink-soft">—</span>
                      }
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
                      {{ formatUsd(reservaTotal(a)) }}
                    </td>
                    <td class="px-5 py-3 text-right">
                      @if (a.status === 'ACTIVO') {
                        <button type="button"
                                class="btn-outline !py-1.5 !px-3 text-xs"
                                (click)="askDevolucion(a)">
                          <lucide-icon name="arrow-left-right" class="w-3.5 h-3.5"></lucide-icon>
                          Registrar devolución
                        </button>
                      } @else if (a.status === 'FINALIZADO') {
                        <button type="button"
                                class="btn-outline !py-1.5 !px-3 text-xs"
                                [disabled]="generandoFacturaId() === a.id"
                                (click)="generarFactura(a)">
                          @if (generandoFacturaId() === a.id) {
                            <lucide-icon name="loader-2" class="w-3.5 h-3.5 animate-spin"></lucide-icon>
                          } @else {
                            <lucide-icon name="receipt" class="w-3.5 h-3.5"></lucide-icon>
                          }
                          Generar factura
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
            @if (a.reserva?.vehiculo ?? vehiculosMap().get(a.reserva?.vehiculoId ?? ''); as v) {
              <p class="text-sm font-semibold">
                {{ v.modelo?.marca?.nombre }} {{ v.modelo?.nombre }}
                <span class="text-ink-muted font-normal">· {{ v.placa }}</span>
              </p>
            }
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

    <!-- ════ Modal Factura generada ════ -->
    <app-modal [open]="!!facturaPrevia()" size="md"
               title="Factura generada"
               [subtitle]="facturaPrevia()?.numeroFactura ?? ''"
               (closed)="facturaPrevia.set(null)">
      <ng-container body>
        @if (facturaPrevia(); as f) {
          <div class="space-y-5">
            <div class="flex justify-between text-sm">
              <div>
                <p class="text-xs text-ink-soft uppercase tracking-wider">Número</p>
                <p class="font-bold text-lg text-ink">{{ f.numeroFactura }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-ink-soft uppercase tracking-wider">Fecha de emisión</p>
                <p class="font-medium text-ink">
                  {{ f.createdAt | date:'dd/MM/yyyy' }}
                </p>
              </div>
            </div>

            @if (f.detalles?.length) {
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-surface-muted text-ink-muted text-xs uppercase tracking-wider">
                    <tr>
                      <th class="text-left px-3 py-2 font-semibold">Descripción</th>
                      <th class="text-right px-3 py-2 font-semibold">Cant.</th>
                      <th class="text-right px-3 py-2 font-semibold">Precio unit.</th>
                      <th class="text-right px-3 py-2 font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-border">
                    @for (d of f.detalles; track $index) {
                      <tr>
                        <td class="px-3 py-2">{{ d.descripcion }}</td>
                        <td class="px-3 py-2 text-right text-ink-muted">{{ d.cantidad }}</td>
                        <td class="px-3 py-2 text-right text-ink-muted">
                          {{ formatUsd(d.precioUnit) }}
                        </td>
                        <td class="px-3 py-2 text-right font-medium">
                          {{ formatUsd(d.subtotal) }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <div class="bg-surface-muted rounded-xl p-4 space-y-2 text-sm">
              <div class="flex justify-between text-ink-muted">
                <span>Subtotal</span><span>{{ formatUsd(f.subtotal) }}</span>
              </div>
              <div class="flex justify-between text-ink-muted">
                <span>IVA (15%)</span><span>{{ formatUsd(f.iva) }}</span>
              </div>
              <div class="flex justify-between font-bold text-base border-t border-surface-border pt-2 mt-1">
                <span class="text-ink">Total</span>
                <span class="text-primary-700">{{ formatUsd(f.total) }}</span>
              </div>
            </div>

            <p class="text-xs text-ink-soft text-center">
              Imprime esta factura y entrégala al cliente, o el cliente puede verla
              directamente desde su panel al iniciar sesión.
            </p>
          </div>
        }
      </ng-container>
      <ng-container footer>
        <button type="button" class="btn-outline" (click)="facturaPrevia.set(null)">Cerrar</button>
        <button type="button" class="btn-primary" (click)="imprimirFactura()">
          <lucide-icon name="printer" class="w-4 h-4"></lucide-icon>
          Imprimir para el cliente
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class AdminAlquileresComponent implements OnInit {
  private readonly alquileres$ = inject(AlquileresService);
  private readonly admin$       = inject(AdminService);
  private readonly toast        = inject(ToastService);
  private readonly fb           = inject(FormBuilder);
  private readonly vehiculos$   = inject(VehiculosService);
  private readonly destroyRef   = inject(DestroyRef);

  protected readonly formatUsd  = formatUsd;
  protected readonly estados    = ESTADOS_VEHICULO;
  protected readonly lastUpdated   = signal('');
  protected readonly facturaPrevia = signal<Factura | null>(null);

  protected readonly loading            = signal(true);
  protected readonly saving             = signal(false);
  protected readonly generandoFacturaId = signal<string | null>(null);
  protected readonly alquileres         = signal<Alquiler[]>([]);
  protected readonly vehiculos          = signal<Vehiculo[]>([]);
  protected readonly vehiculosMap       = computed(() =>
    new Map(this.vehiculos().map((v) => [v.id, v])));
  protected readonly total              = computed(() => this.alquileres().length);
  protected readonly devolviendo        = signal<Alquiler | null>(null);

  protected reservaTotal(a: Alquiler): number {
    const r = a.reserva as any;
    return Number(r?.totalAmount ?? r?.total ?? 0);
  }

  protected readonly devolucionForm = this.fb.nonNullable.group({
    kmEntrada:      [0,  [Validators.required, Validators.min(0)]],
    estadoVehiculo: ['', Validators.required],
    cargoExtra:     [0],
    observaciones:  [''],
  });

  protected statusCls(s: AlquilerStatus): string {
    return STATUS_CLASSES[s] ?? 'bg-slate-100 text-ink';
  }

  ngOnInit(): void {
    this.fetch();
    this.vehiculos$.list(1, 500).subscribe({
      next: (p) => this.vehiculos.set(p.items),
      error: () => {},
    });
    interval(30_000).pipe(
      filter(() => !this.devolviendo() && !this.saving()),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.silentFetch());
  }

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

  protected generarFactura(a: Alquiler): void {
    if (!a.reservaId || this.generandoFacturaId()) return;
    this.generandoFacturaId.set(a.id);
    const r = a.reserva as any;
    const detalles: object[] = [];
    if (Number(r?.precioBase) > 0) {
      detalles.push({ descripcion: `Renta del vehículo (${r.diasTotal ?? 1} días)`, cantidad: 1, precioUnit: Number(r.precioBase) });
    }
    if (Number(r?.precioSeguro) > 0) {
      detalles.push({ descripcion: 'Seguro', cantidad: 1, precioUnit: Number(r.precioSeguro) });
    }
    if (Number(r?.precioExtras) > 0) {
      detalles.push({ descripcion: 'Extras', cantidad: 1, precioUnit: Number(r.precioExtras) });
    }
    if (!detalles.length) {
      const total = Number(r?.totalAmount ?? r?.total ?? 0);
      detalles.push({ descripcion: 'Servicio de alquiler', cantidad: 1, precioUnit: total });
    }
    this.admin$.generarFactura(a.reservaId, detalles).subscribe({
      next: (f) => {
        this.generandoFacturaId.set(null);
        this.toast.success('Factura generada', `N° ${f.numeroFactura}`);
        this.facturaPrevia.set(f);
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.generandoFacturaId.set(null);
        const msg = err?.error?.error?.message ?? 'No se pudo generar la factura.';
        this.toast.error('Error', msg);
      },
    });
  }

  protected imprimirFactura(): void {
    const f = this.facturaPrevia();
    if (!f) return;
    const filas = f.detalles?.map((d) => `
      <tr>
        <td>${d.descripcion}</td>
        <td style="text-align:right">${d.cantidad}</td>
        <td style="text-align:right">$${Number(d.precioUnit).toFixed(2)}</td>
        <td style="text-align:right">$${Number(d.subtotal).toFixed(2)}</td>
      </tr>`).join('') ?? '';
    const fecha = new Date(f.createdAt)
      .toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Factura ${f.numeroFactura}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:40px;color:#111;max-width:680px;margin:auto}
        h2{margin:0 0 4px}.sub{color:#666;font-size:13px;margin-bottom:24px}
        .row{display:flex;justify-content:space-between;margin-bottom:24px}
        table{width:100%;border-collapse:collapse;margin-bottom:20px}
        th{background:#f3f4f6;padding:8px 10px;font-size:11px;text-transform:uppercase;text-align:left}
        td{padding:8px 10px;border-top:1px solid #e5e7eb;font-size:13px}
        .totales{background:#f9fafb;padding:16px 20px;border-radius:8px}
        .t-row{display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px;color:#555}
        .t-total{display:flex;justify-content:space-between;font-size:16px;font-weight:bold;
                 border-top:1px solid #d1d5db;padding-top:10px;margin-top:6px;color:#1e3a5f}
      </style></head><body>
      <h2>UrbanCar EC</h2><p class="sub">Factura Electrónica</p>
      <div class="row">
        <div><strong>N°:</strong> ${f.numeroFactura}</div>
        <div><strong>Fecha:</strong> ${fecha}</div>
      </div>
      ${filas ? `<table><thead><tr>
        <th>Descripción</th><th style="text-align:right">Cant.</th>
        <th style="text-align:right">Precio unit.</th><th style="text-align:right">Subtotal</th>
      </tr></thead><tbody>${filas}</tbody></table>` : ''}
      <div class="totales">
        <div class="t-row"><span>Subtotal</span><span>$${Number(f.subtotal).toFixed(2)}</span></div>
        <div class="t-row"><span>IVA (15%)</span><span>$${Number(f.iva).toFixed(2)}</span></div>
        <div class="t-total"><span>Total</span><span>$${Number(f.total).toFixed(2)}</span></div>
      </div></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 400); }
  }

  private fetch(): void {
    this.loading.set(true);
    this.alquileres$.list().subscribe({
      next: (list) => {
        this.alquileres.set(list);
        this.loading.set(false);
        this.lastUpdated.set(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }));
      },
      error: () => { this.loading.set(false); },
    });
  }

  private silentFetch(): void {
    this.alquileres$.list().subscribe({
      next: (list) => {
        this.alquileres.set(list);
        this.lastUpdated.set(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }));
      },
      error: () => {},
    });
  }
}
