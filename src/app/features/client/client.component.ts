import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, forkJoin, interval, map, of } from 'rxjs';

import { AuthService }     from '@core/services/auth.service';
import { ReservasService } from '@core/services/reservas.service';
import { FacturasService } from '@core/services/facturas.service';
import { ToastService }    from '@core/services/toast.service';
import { SocketService }   from '@core/services/socket.service';
import { BadgeStatusComponent } from '@shared/components/badge-status/badge-status.component';
import { EmptyStateComponent }  from '@shared/components/empty-state/empty-state.component';
import { ModalComponent }       from '@shared/components/modal/modal.component';
import type { Factura, Reserva } from '@core/models/api.models';

@Component({
  selector: 'app-client',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideAngularModule, RouterLink, DatePipe, CurrencyPipe,
    BadgeStatusComponent, EmptyStateComponent, ModalComponent,
  ],
  template: `
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header class="mb-8 flex items-center gap-3">
        <span class="grid place-items-center w-11 h-11 rounded-2xl bg-primary-700 text-white shadow-soft">
          <lucide-icon name="user" class="w-5 h-5"></lucide-icon>
        </span>
        <div class="flex-1">
          <h1 class="text-2xl">Hola, {{ auth.displayName() }}</h1>
          <p class="text-ink-muted text-sm">Tu panel de cliente UrbanCar EC.</p>
        </div>
        @if (lastUpdated()) {
          <span class="hidden sm:flex items-center gap-1.5 text-xs text-ink-soft ml-auto">
            <span class="w-2 h-2 rounded-full bg-primary-700 animate-pulse"></span>
            En vivo · {{ lastUpdated() }}
          </span>
        }
      </header>

      <!-- Skeleton -->
      @if (loading()) {
        <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Cargando reservas" aria-busy="true">
          @for (i of skeletons; track i) {
            <li class="card p-5 flex flex-col gap-3" aria-hidden="true">
              <div class="flex items-start justify-between gap-2">
                <div class="flex flex-col gap-2 flex-1">
                  <div class="skeleton h-5 w-3/5"></div>
                  <div class="skeleton h-3 w-2/5"></div>
                </div>
                <div class="skeleton h-6 w-20 rounded-full"></div>
              </div>
              <div class="skeleton h-3 w-4/5 mt-1"></div>
              <div class="skeleton h-3 w-1/3"></div>
              <div class="skeleton h-5 w-24 mt-auto"></div>
            </li>
          }
        </ul>
      }

      <!-- Empty state -->
      @else if (reservas().length === 0) {
        <app-empty-state
          icon="calendar-x"
          title="Aún no tienes alquileres registrados"
          description="Cuando realices una reserva, aparecerá aquí con todos los detalles."
        />
      }

      <!-- Lista de reservas -->
      @else {
        <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (r of reservas(); track r.id) {
            <li class="card p-5 flex flex-col gap-2">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="font-semibold text-ink leading-tight">
                    {{ r.vehiculo?.modelo?.marca?.nombre ?? '—' }}
                    {{ r.vehiculo?.modelo?.nombre ?? '' }}
                  </p>
                  <p class="text-xs text-ink-muted mt-0.5">
                    {{ r.vehiculo?.placa }} · {{ r.vehiculo?.anio }}
                  </p>
                </div>
                <app-badge-status [status]="r.status" />
              </div>

              <div class="flex items-center gap-1.5 text-sm text-ink-muted mt-1">
                <lucide-icon name="calendar" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                <span>{{ r.fechaInicio | date:'dd/MM/yyyy' }}</span>
                <span>→</span>
                <span>{{ r.fechaFin | date:'dd/MM/yyyy' }}</span>
                <span class="text-ink-soft">· {{ r.dias }} día{{ r.dias !== 1 ? 's' : '' }}</span>
              </div>

              <p class="text-primary-700 font-semibold text-base mt-auto pt-2 border-t border-surface">
                {{ r.total | currency:'USD':'symbol':'1.2-2' }}
              </p>

              <!-- Factura disponible -->
              @if (facturasMap().has(r.id)) {
                <button type="button"
                        class="btn-outline w-full flex items-center justify-center gap-2 text-sm"
                        (click)="verFactura(facturasMap().get(r.id)!)">
                  <lucide-icon name="file-text" class="w-4 h-4"></lucide-icon>
                  Ver factura
                </button>
              }

              <!-- Pagar (PENDIENTE) -->
              @if (r.status === 'PENDIENTE') {
                <a [routerLink]="['/pago', r.id]"
                   class="btn-primary w-full mt-1 group"
                   [attr.aria-label]="'Pagar alquiler de ' + (r.vehiculo?.modelo?.nombre ?? 'reserva')">
                  <lucide-icon name="credit-card"
                    class="w-4 h-4 transition-transform group-hover:scale-110"></lucide-icon>
                  Pagar alquiler
                </a>
              }

              @if (r.status === 'PENDIENTE' || r.status === 'CONFIRMADA') {
                <button type="button"
                        (click)="cancelar(r)"
                        [disabled]="cancellingId() === r.id"
                        class="btn-outline w-full text-danger border-red-200 hover:bg-red-50
                               flex items-center justify-center gap-2 disabled:opacity-50">
                  @if (cancellingId() === r.id) {
                    <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
                  } @else {
                    <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
                  }
                  Cancelar reserva
                </button>
              }
            </li>
          }
        </ul>
      }
    </section>

    <!-- ════ Modal de Factura ════ -->
    <app-modal [open]="!!facturaModal()" size="md"
               title="Factura electrónica"
               [subtitle]="facturaModal()?.numeroFactura ?? ''"
               (closed)="facturaModal.set(null)">
      <ng-container body>
        @if (facturaModal(); as f) {
          <div class="space-y-5">
            <!-- Cabecera -->
            <div class="flex justify-between text-sm">
              <div>
                <p class="text-xs text-ink-soft uppercase tracking-wider">Número</p>
                <p class="font-bold text-lg text-ink">{{ f.numeroFactura }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-ink-soft uppercase tracking-wider">Fecha de emisión</p>
                <p class="font-medium text-ink">
                  {{ (f.fechaEmision ?? f.createdAt) | date:'dd/MM/yyyy' }}
                </p>
              </div>
            </div>

            <!-- Detalles de líneas -->
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
                        <td class="px-3 py-2 text-ink">{{ d.descripcion }}</td>
                        <td class="px-3 py-2 text-right text-ink-muted">{{ d.cantidad }}</td>
                        <td class="px-3 py-2 text-right text-ink-muted">
                          {{ d.precioUnit | currency:'USD':'symbol':'1.2-2' }}
                        </td>
                        <td class="px-3 py-2 text-right font-medium text-ink">
                          {{ d.subtotal | currency:'USD':'symbol':'1.2-2' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <!-- Totales -->
            <div class="bg-surface-muted rounded-xl p-4 space-y-2 text-sm">
              <div class="flex justify-between text-ink-muted">
                <span>Subtotal</span>
                <span>{{ f.subtotal | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
              <div class="flex justify-between text-ink-muted">
                <span>IVA (15%)</span>
                <span>{{ f.iva | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
              <div class="flex justify-between font-bold text-base border-t border-surface-border pt-2 mt-1">
                <span class="text-ink">Total</span>
                <span class="text-primary-700">{{ f.total | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
            </div>
          </div>
        }
      </ng-container>
      <ng-container footer>
        <button type="button" class="btn-outline" (click)="facturaModal.set(null)">Cerrar</button>
        <button type="button" class="btn-primary" (click)="imprimirFactura()">
          <lucide-icon name="printer" class="w-4 h-4"></lucide-icon>
          Imprimir
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class ClientComponent implements OnInit {
  protected readonly auth      = inject(AuthService);
  private  readonly reservas$  = inject(ReservasService);
  private  readonly facturas$  = inject(FacturasService);
  private  readonly toast      = inject(ToastService);
  private  readonly socket$    = inject(SocketService);
  private  readonly destroyRef = inject(DestroyRef);

  protected readonly loading      = signal(true);
  protected readonly reservas     = signal<Reserva[]>([]);
  protected readonly cancellingId = signal<string | null>(null);
  protected readonly lastUpdated  = signal('');
  protected readonly facturasMap  = signal<Map<string, Factura>>(new Map());
  protected readonly facturaModal = signal<Factura | null>(null);
  protected readonly skeletons    = [0, 1, 2];

  ngOnInit(): void {
    this.loadReservas();

    this.socket$.onAny(
      'reserva:creada', 'reserva:cancelada', 'reserva:confirmada',
      'reserva:completada', 'pago:procesado',
    ).pipe(takeUntilDestroyed(this.destroyRef))
     .subscribe(() => this.silentRefresh());

    interval(30_000).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.silentRefresh());
  }

  protected verFactura(f: Factura): void {
    this.facturaModal.set(f);
  }

  protected imprimirFactura(): void {
    const f = this.facturaModal();
    if (!f) return;
    const filas = f.detalles?.map((d) => `
      <tr>
        <td>${d.descripcion}</td>
        <td style="text-align:right">${d.cantidad}</td>
        <td style="text-align:right">$${Number(d.precioUnit).toFixed(2)}</td>
        <td style="text-align:right">$${Number(d.subtotal).toFixed(2)}</td>
      </tr>`).join('') ?? '';

    const fecha = new Date(f.fechaEmision ?? f.createdAt)
      .toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Factura ${f.numeroFactura}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:40px;color:#111;max-width:680px;margin:auto}
        h2{margin:0 0 4px}
        .sub{color:#666;font-size:13px;margin-bottom:24px}
        .row{display:flex;justify-content:space-between;margin-bottom:24px}
        table{width:100%;border-collapse:collapse;margin-bottom:20px}
        th{background:#f3f4f6;padding:8px 10px;font-size:11px;text-transform:uppercase;text-align:left}
        td{padding:8px 10px;border-top:1px solid #e5e7eb;font-size:13px}
        .totales{background:#f9fafb;padding:16px 20px;border-radius:8px}
        .t-row{display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px;color:#555}
        .t-total{display:flex;justify-content:space-between;font-size:16px;font-weight:bold;
                 border-top:1px solid #d1d5db;padding-top:10px;margin-top:6px;color:#1e3a5f}
      </style>
    </head><body>
      <h2>UrbanCar EC</h2>
      <p class="sub">Factura Electrónica</p>
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
      </div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    }
  }

  protected cancelar(r: Reserva): void {
    if (!confirm('¿Está seguro de cancelar la reserva?')) return;
    this.cancellingId.set(r.id);
    this.reservas$.cancel(r.id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.toast.success(
          'Reserva cancelada',
          'El vehículo puede volver a estar disponible para otros usuarios.',
        );
        this.loadReservas();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.cancellingId.set(null);
        const msg = err?.error?.error?.message
          ?? 'No se pudo cancelar la reserva. Inténtalo de nuevo.';
        this.toast.error('No se pudo cancelar', msg);
      },
    });
  }

  private loadReservas(): void {
    this.loading.set(true);
    this.reservas$.myReservations().subscribe({
      next: (list) => {
        this.reservas.set(list);
        this.loading.set(false);
        this.lastUpdated.set(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }));
        this.loadFacturas(list);
      },
      error: () => { this.loading.set(false); },
    });
  }

  private silentRefresh(): void {
    this.reservas$.myReservations().subscribe({
      next: (list) => {
        this.reservas.set(list);
        this.lastUpdated.set(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }));
        this.loadFacturas(list);
      },
      error: () => {},
    });
  }

  private loadFacturas(reservas: Reserva[]): void {
    if (!reservas.length) return;
    const calls = reservas.map((r) =>
      this.facturas$.getByReserva(r.id).pipe(
        map((f) => ({ id: r.id, factura: f })),
        catchError(() => of({ id: r.id, factura: null })),
      ),
    );
    forkJoin(calls).subscribe((results) => {
      const m = new Map<string, Factura>();
      results.forEach(({ id, factura }) => { if (factura) m.set(id, factura); });
      this.facturasMap.set(m);
    });
  }
}
