import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

import { AdminService } from '@core/services/admin.service';
import { ToastService } from '@core/services/toast.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { formatUsd } from '@core/utils/date.utils';
import type { Factura } from '@core/models/api.models';

@Component({
  selector: 'app-admin-facturas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, LucideAngularModule, EmptyStateComponent],
  template: `
    <section class="px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <header class="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p class="text-xs uppercase tracking-wider text-ink-soft">Panel administrativo</p>
          <h2 class="text-2xl font-semibold text-ink">Facturas</h2>
        </div>
        <div class="text-right">
          <p class="text-xs text-ink-soft uppercase tracking-wider">Total emitido</p>
          <p class="text-xl font-bold text-primary-700">{{ formatUsd(totalEmitido()) }}</p>
        </div>
      </header>

      <!-- Skeleton -->
      @if (loading()) {
        <div class="card overflow-hidden">
          <div class="divide-y divide-surface-border">
            @for (i of [0,1,2,3,4]; track i) {
              <div class="px-5 py-3.5 flex items-center gap-4" aria-hidden="true">
                <div class="skeleton h-3 w-24"></div>
                <div class="skeleton h-3 w-28"></div>
                <div class="skeleton h-3 flex-1"></div>
                <div class="skeleton h-3 w-20"></div>
                <div class="skeleton h-3 w-20"></div>
                <div class="skeleton h-4 w-24"></div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Empty -->
      @else if (facturas().length === 0) {
        <app-empty-state
          icon="receipt"
          title="Sin facturas emitidas"
          description="Las facturas se generan automáticamente al completar un pago."
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
                  <th class="px-5 py-3 text-left font-medium">N° Factura</th>
                  <th class="px-5 py-3 text-left font-medium">Fecha</th>
                  <th class="px-5 py-3 text-left font-medium">Cliente / RUC</th>
                  <th class="px-5 py-3 text-right font-medium">Subtotal</th>
                  <th class="px-5 py-3 text-right font-medium">IVA</th>
                  <th class="px-5 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-border">
                @for (f of facturas(); track f.id) {
                  <tr class="hover:bg-surface-muted/50 transition-colors">
                    <td class="px-5 py-3 font-mono font-semibold text-primary-700">
                      {{ f.numeroFactura }}
                    </td>
                    <td class="px-5 py-3 text-ink-muted">
                      {{ (f.fechaEmision ?? f.createdAt) | date:'dd/MM/yyyy' }}
                    </td>
                    <td class="px-5 py-3">
                      <p class="font-medium text-ink">{{ f.razonSocial ?? '—' }}</p>
                      <p class="text-xs text-ink-muted font-mono">{{ f.rucCliente ?? '' }}</p>
                    </td>
                    <td class="px-5 py-3 text-right text-ink-muted">
                      {{ formatUsd(f.subtotal) }}
                    </td>
                    <td class="px-5 py-3 text-right text-ink-muted">
                      {{ formatUsd(f.iva) }}
                    </td>
                    <td class="px-5 py-3 text-right font-bold text-primary-700">
                      {{ formatUsd(f.total) }}
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr class="bg-primary-900 text-white text-sm">
                  <td colspan="5" class="px-5 py-3 font-semibold">Total acumulado</td>
                  <td class="px-5 py-3 text-right font-bold">
                    {{ formatUsd(totalEmitido()) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminFacturasComponent implements OnInit {
  private readonly admin$ = inject(AdminService);
  private readonly toast    = inject(ToastService);

  protected readonly formatUsd    = formatUsd;
  protected readonly loading      = signal(true);
  protected readonly facturas     = signal<Factura[]>([]);
  protected readonly totalEmitido = computed(() =>
    this.facturas().reduce((acc, f) => acc + Number(f.total ?? 0), 0),
  );

  ngOnInit(): void {
    this.admin$.facturas().subscribe({
      next:  (list) => { this.facturas.set(list); this.loading.set(false); },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.loading.set(false);
        this.toast.error(
          'No se pudieron cargar las facturas',
          err?.error?.error?.message ?? '¿Sesión de administrador válida?',
        );
      },
    });
  }
}
