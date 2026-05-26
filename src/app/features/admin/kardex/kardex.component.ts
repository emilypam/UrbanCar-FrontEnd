import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

import { AdminService }  from '@core/services/admin.service';
import { ToastService }  from '@core/services/toast.service';
import type {
  HistorialEntry, KardexEntry, OutboxEvent, Paginated,
} from '@core/models/api.models';
import { fadeIn, fadeUp } from '@core/animations/motion';

import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PaginatorComponent } from '@shared/components/paginator/paginator.component';

type TabId = 'kardex' | 'historial' | 'outbox';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-admin-kardex',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, LucideAngularModule, EmptyStateComponent, PaginatorComponent],
  animations: [fadeIn, fadeUp],
  template: `
    <section class="px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <header [@fadeUp]>
        <p class="text-xs uppercase tracking-wider text-ink-soft">Trazabilidad</p>
        <h2 class="text-2xl font-semibold flex items-center gap-2">
          <lucide-icon name="history" class="w-6 h-6 text-primary-700"></lucide-icon>
          Auditoría
        </h2>
        <p class="text-sm text-ink-muted mt-1">
          Vista de sólo lectura: kardex de vehículos, historial de acciones
          y eventos outbox preparados para el Reto 2.
        </p>
      </header>

      <!-- Tabs -->
      <nav class="flex gap-1 border-b border-surface-border" [@fadeUp]>
        @for (t of tabs; track t.id) {
          <button type="button"
                  (click)="setTab(t.id)"
                  [ngClass]="tabClass(activeTab() === t.id)">
            <lucide-icon [name]="t.icon" class="w-4 h-4"></lucide-icon>
            {{ t.label }}
          </button>
        }
      </nav>

      <article class="card overflow-hidden" [@fadeUp]>
        @if (loading()) {
          <div class="p-6 space-y-2" [@fadeIn]>
            @for (i of [0,1,2,3,4,5,6]; track i) {
              <div class="skeleton h-12"></div>
            }
          </div>
        } @else if (currentItems().length === 0) {
          <app-empty-state icon="history" title="Sin eventos registrados"
                           [description]="emptyMsg()" />
        } @else {

          @switch (activeTab()) {
            @case ('kardex') {
              <div class="overflow-x-auto" [@fadeIn]>
                <table class="w-full text-sm">
                  <thead class="bg-surface-muted text-ink-muted text-xs uppercase tracking-wider">
                    <tr>
                      <th class="text-left px-4 py-3 font-semibold">Fecha</th>
                      <th class="text-left px-4 py-3 font-semibold">Vehículo</th>
                      <th class="text-left px-4 py-3 font-semibold">De</th>
                      <th class="text-left px-4 py-3 font-semibold">A</th>
                      <th class="text-left px-4 py-3 font-semibold">Motivo</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-border">
                    @for (k of kardexItems(); track k.id) {
                      <tr class="hover:bg-primary-50/40 transition-colors">
                        <td class="px-4 py-3 text-ink-muted whitespace-nowrap">
                          {{ formatDt(k.createdAt) }}
                        </td>
                        <td class="px-4 py-3 font-mono text-xs">{{ shortId(k.vehiculoId) }}</td>
                        <td class="px-4 py-3 text-ink-muted">{{ k.estadoAnterior ?? '—' }}</td>
                        <td class="px-4 py-3">
                          <span class="badge-primary">{{ k.estadoNuevo }}</span>
                        </td>
                        <td class="px-4 py-3 text-sm">{{ k.evento }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            @case ('historial') {
              <div class="overflow-x-auto" [@fadeIn]>
                <table class="w-full text-sm">
                  <thead class="bg-surface-muted text-ink-muted text-xs uppercase tracking-wider">
                    <tr>
                      <th class="text-left px-4 py-3 font-semibold">Fecha</th>
                      <th class="text-left px-4 py-3 font-semibold">Usuario</th>
                      <th class="text-left px-4 py-3 font-semibold">Acción</th>
                      <th class="text-left px-4 py-3 font-semibold">Entidad</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-border">
                    @for (h of historialItems(); track h.id) {
                      <tr class="hover:bg-primary-50/40 transition-colors">
                        <td class="px-4 py-3 text-ink-muted whitespace-nowrap">
                          {{ formatDt(h.createdAt) }}
                        </td>
                        <td class="px-4 py-3 font-mono text-xs">{{ shortId(h.usuarioId) }}</td>
                        <td class="px-4 py-3">
                          <span class="badge-info">{{ h.accion }}</span>
                        </td>
                        <td class="px-4 py-3 text-ink-muted">
                          {{ h.entidad }}
                          @if (h.entidadId) {
                            <span class="font-mono text-xs">· {{ shortId(h.entidadId) }}</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            @case ('outbox') {
              <div class="overflow-x-auto" [@fadeIn]>
                <table class="w-full text-sm">
                  <thead class="bg-surface-muted text-ink-muted text-xs uppercase tracking-wider">
                    <tr>
                      <th class="text-left px-4 py-3 font-semibold">Fecha</th>
                      <th class="text-left px-4 py-3 font-semibold">Evento</th>
                      <th class="text-left px-4 py-3 font-semibold">Aggregate</th>
                      <th class="text-left px-4 py-3 font-semibold">Publicado</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-border">
                    @for (e of outboxItems(); track e.id) {
                      <tr class="hover:bg-primary-50/40 transition-colors">
                        <td class="px-4 py-3 text-ink-muted whitespace-nowrap">
                          {{ formatDt(e.createdAt) }}
                        </td>
                        <td class="px-4 py-3">
                          <span class="badge-primary">{{ e.evento }}</span>
                        </td>
                        <td class="px-4 py-3 font-mono text-xs">{{ shortId(e.usuarioId) }}</td>
                        <td class="px-4 py-3 text-ink-muted">
                          {{ e.procesadoAt ? formatDt(e.procesadoAt) : 'Pendiente' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }

          <app-paginator
              [total]="pageInfo().total" [page]="page()" [limit]="limit()"
              (pageChange)="setPage($event)"
              (limitChange)="setLimit($event)" />
        }
      </article>
    </section>
  `,
})
export class AdminKardexComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected readonly tabs: Tab[] = [
    { id: 'kardex',    label: 'Kardex de vehículos', icon: 'car' },
    { id: 'historial', label: 'Historial de acciones', icon: 'file-text' },
    { id: 'outbox',    label: 'Eventos outbox',  icon: 'sparkles' },
  ];

  protected readonly activeTab = signal<TabId>('kardex');
  protected readonly loading   = signal(true);

  protected readonly kardexItems    = signal<KardexEntry[]>([]);
  protected readonly historialItems = signal<HistorialEntry[]>([]);
  protected readonly outboxItems    = signal<OutboxEvent[]>([]);

  // Paginación server-side independiente para cada tab.
  protected readonly page  = signal(1);
  protected readonly limit = signal(20);

  private readonly _page = signal<Paginated<unknown>>({
    items: [], total: 0, page: 1, limit: 20,
  });
  protected readonly pageInfo = this._page.asReadonly();

  protected readonly currentItems = computed(() => {
    switch (this.activeTab()) {
      case 'kardex':    return this.kardexItems();
      case 'historial': return this.historialItems();
      case 'outbox':    return this.outboxItems();
    }
  });

  protected readonly emptyMsg = computed(() => {
    switch (this.activeTab()) {
      case 'kardex':    return 'Aún no se han registrado movimientos de vehículos.';
      case 'historial': return 'Aún no hay acciones de usuarios registradas.';
      case 'outbox':    return 'Aún no se han generado eventos para integraciones.';
    }
  });

  ngOnInit(): void { this.fetch(); }

  protected setTab(id: TabId): void {
    if (this.activeTab() === id) return;
    this.activeTab.set(id);
    this.page.set(1);
    this.fetch();
  }

  protected setPage(p: number):  void { this.page.set(p);  this.fetch(); }
  protected setLimit(l: number): void { this.limit.set(l); this.page.set(1); this.fetch(); }

  protected tabClass(active: boolean): string {
    return active
      ? 'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-primary text-primary-700'
      : 'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-ink-muted hover:text-primary-700';
  }

  protected shortId(id?: string | null): string {
    return id ? id.slice(0, 8).toUpperCase() : '—';
  }
  protected formatDt(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-EC', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  // ── Carga ────────────────────────────────────────────────
  private fetch(): void {
    this.loading.set(true);
    const tab  = this.activeTab();
    const page = this.page();
    const lim  = this.limit();

    const reset = (label: string) => {
      this._page.set({ items: [], total: 0, page, limit: lim });
      this.loading.set(false);
      this.toast.error(`No se pudo cargar ${label}`, 'Verifica la conexión con el servidor.');
    };

    if (tab === 'kardex') {
      this.admin.kardex(page, lim).subscribe({
        next: (p) => { this.kardexItems.set(p.items); this._page.set(p); this.loading.set(false); },
        error: () => { this.kardexItems.set([]); reset('el kardex'); },
      });
    } else if (tab === 'historial') {
      this.admin.historial(page, lim).subscribe({
        next: (p) => { this.historialItems.set(p.items); this._page.set(p); this.loading.set(false); },
        error: () => { this.historialItems.set([]); reset('el historial'); },
      });
    } else {
      this.admin.outboxEvents(page, lim).subscribe({
        next: (p) => { this.outboxItems.set(p.items); this._page.set(p); this.loading.set(false); },
        error: () => { this.outboxItems.set([]); reset('los eventos outbox'); },
      });
    }
  }
}
