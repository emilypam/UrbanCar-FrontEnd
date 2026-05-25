import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
  ViewChild,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

import { VehiculosService } from '@core/services/vehiculos.service';
import { ToastService }     from '@core/services/toast.service';
import type {
  CreateVehiculoRequest, Vehiculo,
} from '@core/models/api.models';
import { formatUsd } from '@core/utils/date.utils';
import { fadeIn, fadeUp } from '@core/animations/motion';

import { ModalComponent }       from '@shared/components/modal/modal.component';
import { EmptyStateComponent }  from '@shared/components/empty-state/empty-state.component';
import { PaginatorComponent }   from '@shared/components/paginator/paginator.component';
import { VehiculoFormComponent } from './vehiculo-form.component';

@Component({
  selector: 'app-admin-vehiculos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgClass, LucideAngularModule,
    ModalComponent, EmptyStateComponent, VehiculoFormComponent, PaginatorComponent,
  ],
  animations: [fadeIn, fadeUp],
  template: `
    <section class="px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <!-- Cabecera -->
      <header class="flex items-end justify-between flex-wrap gap-3" [@fadeUp]>
        <div>
          <p class="text-xs uppercase tracking-wider text-ink-soft">Operaciones</p>
          <h2 class="text-2xl font-semibold flex items-center gap-2">
            <lucide-icon name="car" class="w-6 h-6 text-primary-700"></lucide-icon>
            Gestión de Flota
          </h2>
          <p class="text-sm text-ink-muted mt-1">
            {{ total() }} vehículos registrados.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <input type="search" [value]="query()" (input)="setQuery($event)"
                 class="input max-w-xs" placeholder="Buscar placa, modelo o marca…" />
          <button type="button" class="btn-primary" (click)="openCreate()">
            <lucide-icon name="plus" class="w-4 h-4"></lucide-icon>
            Nuevo vehículo
          </button>
        </div>
      </header>

      <!-- Tabla -->
      <article class="card overflow-hidden" [@fadeUp]>
        @if (loading()) {
          <div class="p-6 space-y-2" [@fadeIn]>
            @for (i of [0,1,2,3,4,5]; track i) {
              <div class="skeleton h-12"></div>
            }
          </div>
        } @else if (filtered().length === 0) {
          <app-empty-state icon="car" title="Sin vehículos"
                           description="No encontramos vehículos con esos criterios. Crea uno nuevo o ajusta la búsqueda." />
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-surface-muted text-ink-muted text-xs uppercase tracking-wider">
                <tr>
                  <th class="text-left px-4 py-3 font-semibold">Vehículo</th>
                  <th class="text-left px-4 py-3 font-semibold">Placa</th>
                  <th class="text-left px-4 py-3 font-semibold">Categoría</th>
                  <th class="text-left px-4 py-3 font-semibold">Agencia</th>
                  <th class="text-left px-4 py-3 font-semibold">Estado</th>
                  <th class="text-right px-4 py-3 font-semibold">Precio/día</th>
                  <th class="text-right px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-border">
                @for (v of filtered(); track v.id) {
                  <tr class="hover:bg-primary-50/40 transition-colors">
                    <td class="px-4 py-3">
                      <p class="font-medium leading-tight">
                        {{ v.modelo?.marca?.nombre }}
                        <span class="text-ink-muted font-normal">{{ v.modelo?.nombre }}</span>
                      </p>
                      <p class="text-xs text-ink-soft">{{ v.color }} · {{ v.anio }}</p>
                    </td>
                    <td class="px-4 py-3 font-mono text-xs">{{ v.placa }}</td>
                    <td class="px-4 py-3 text-ink-muted">{{ v.categoria?.nombre ?? '—' }}</td>
                    <td class="px-4 py-3 text-ink-muted">{{ v.agencia?.nombre ?? '—' }}</td>
                    <td class="px-4 py-3">
                      <span [ngClass]="estadoClass(v)"
                            class="inline-flex items-center gap-1.5 rounded-full border
                                   px-2.5 py-0.5 text-xs font-medium">
                        <span class="w-1.5 h-1.5 rounded-full" [ngClass]="estadoDot(v)"></span>
                        {{ v.estado?.nombre ?? (v.activo ? 'Disponible' : 'Inactivo') }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right font-bold text-primary-700">
                      {{ formatUsd(v.precioDia) }}
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-end gap-1">
                        @if (canSetMantenimiento(v)) {
                          <button type="button" class="btn-ghost text-warning"
                                  title="Enviar a mantenimiento"
                                  (click)="setEstado(v, 'Mantenimiento')">
                            <lucide-icon name="wrench" class="w-4 h-4"></lucide-icon>
                          </button>
                        } @else if (canSetDisponible(v)) {
                          <button type="button" class="btn-ghost text-primary-700"
                                  title="Marcar como disponible"
                                  (click)="setEstado(v, 'Disponible')">
                            <lucide-icon name="power" class="w-4 h-4"></lucide-icon>
                          </button>
                        }
                        <button type="button" class="btn-ghost"
                                title="Editar" (click)="openEdit(v)">
                          <lucide-icon name="pencil" class="w-4 h-4"></lucide-icon>
                        </button>
                        <button type="button" class="btn-ghost text-danger hover:bg-red-50"
                                title="Eliminar" (click)="askDelete(v)">
                          <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <app-paginator
              [total]="total()" [page]="page()" [limit]="limit()"
              (pageChange)="setPage($event)"
              (limitChange)="setLimit($event)" />
        }
      </article>
    </section>

    <!-- ════════ Modal Crear / Editar ════════ -->
    <app-modal [open]="formOpen()" size="xl"
               [title]="editing() ? 'Editar vehículo' : 'Nuevo vehículo'"
               [subtitle]="editing() ? editing()!.placa : 'Completa los datos para registrar un nuevo auto'"
               (closed)="closeForm()">
      <ng-container body>
        <app-vehiculo-form #form [vehiculo]="editing()"
                           (saved)="persist($event)"
                           (validityCh)="formValid.set($event)" />
      </ng-container>
      <ng-container footer>
        <button type="button" class="btn-outline" (click)="closeForm()" [disabled]="saving()">
          Cancelar
        </button>
        <button type="button" class="btn-primary"
                [disabled]="!formValid() || saving()"
                (click)="form.submit()">
          @if (saving()) {
            <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
            Guardando…
          } @else {
            <lucide-icon name="save" class="w-4 h-4"></lucide-icon>
            {{ editing() ? 'Guardar cambios' : 'Crear vehículo' }}
          }
        </button>
      </ng-container>
    </app-modal>

    <!-- ════════ Modal Confirmar eliminación ════════ -->
    <app-modal [open]="!!deleting()" size="sm" title="Eliminar vehículo"
               subtitle="Esta acción es irreversible (soft delete)."
               (closed)="cancelDelete()">
      <ng-container body>
        <p class="text-sm">
          ¿Eliminar el vehículo
          <strong>{{ deleting()?.placa }}</strong>
          ({{ deleting()?.modelo?.marca?.nombre }} {{ deleting()?.modelo?.nombre }})?
        </p>
      </ng-container>
      <ng-container footer>
        <button type="button" class="btn-outline" (click)="cancelDelete()" [disabled]="saving()">
          Cancelar
        </button>
        <button type="button" class="btn-primary bg-danger hover:bg-red-700"
                [disabled]="saving()" (click)="confirmDelete()">
          @if (saving()) {
            <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
            Eliminando…
          } @else {
            <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
            Eliminar
          }
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class AdminVehiculosComponent implements OnInit {
  private readonly vehiculos$ = inject(VehiculosService);
  private readonly toast      = inject(ToastService);

  protected readonly formatUsd = formatUsd;

  protected readonly loading   = signal(true);
  protected readonly saving    = signal(false);
  protected readonly vehiculos = signal<Vehiculo[]>([]);
  protected readonly query     = signal('');

  // ── Paginación (server-side via /vehiculos?page&limit) ──
  protected readonly page  = signal(1);
  protected readonly limit = signal(20);
  protected readonly total = signal(0);

  protected readonly editing   = signal<Vehiculo | null>(null);
  protected readonly formOpen  = signal(false);
  protected readonly formValid = signal(false);
  protected readonly deleting  = signal<Vehiculo | null>(null);

  @ViewChild('form') private form?: VehiculoFormComponent;

  /**
   * Resultados visibles: arranca con el page actual del servidor y filtra
   * con la búsqueda libre (rápida) sobre la página visible.
   */
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.vehiculos();
    return this.vehiculos().filter((v) =>
      v.placa.toLowerCase().includes(q) ||
      (v.modelo?.nombre ?? '').toLowerCase().includes(q) ||
      (v.modelo?.marca?.nombre ?? '').toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.fetch();
  }

  // ── Búsqueda y paginación ────────────────────────────────
  protected setQuery(ev: Event): void {
    this.query.set((ev.target as HTMLInputElement).value);
  }
  protected setPage(p: number):  void { this.page.set(p);  this.fetch(); }
  protected setLimit(l: number): void { this.limit.set(l); this.page.set(1); this.fetch(); }

  // ── Modales CRUD ─────────────────────────────────────────
  protected openCreate(): void {
    this.editing.set(null);
    this.formValid.set(false);
    this.formOpen.set(true);
  }
  protected openEdit(v: Vehiculo): void {
    this.editing.set(v);
    this.formValid.set(false);
    this.formOpen.set(true);
  }
  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  protected askDelete(v: Vehiculo): void { this.deleting.set(v); }
  protected cancelDelete(): void          { this.deleting.set(null); }

  // ── Persistencia ─────────────────────────────────────────
  protected persist(payload: CreateVehiculoRequest): void {
    this.saving.set(true);
    const editing = this.editing();
    const obs = editing
      ? this.vehiculos$.update(editing.id, payload)
      : this.vehiculos$.create(payload);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(
          editing ? 'Vehículo actualizado' : 'Vehículo creado',
          payload.placa,
        );
        this.closeForm();
        this.fetch();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.saving.set(false);
        this.toast.error(
          editing ? 'No se pudo actualizar' : 'No se pudo crear',
          err?.error?.error?.message ?? 'Revisa los datos e inténtalo de nuevo.',
        );
      },
    });
  }

  protected confirmDelete(): void {
    const v = this.deleting();
    if (!v) return;
    this.saving.set(true);
    this.vehiculos$.remove(v.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Vehículo eliminado', v.placa);
        this.deleting.set(null);
        this.fetch();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.saving.set(false);
        this.toast.error('No se pudo eliminar',
          err?.error?.error?.message ?? 'Intenta nuevamente.');
      },
    });
  }

  // ── Cambio de estado ─────────────────────────────────────
  /** Solo DISPONIBLE puede ir a mantenimiento. */
  protected canSetMantenimiento(v: Vehiculo): boolean {
    return v.status === 'DISPONIBLE';
  }
  protected canSetDisponible(v: Vehiculo): boolean {
    return v.status === 'MANTENIMIENTO';
  }

  private readonly LABEL_TO_STATUS: Record<'Disponible' | 'Mantenimiento', string> = {
    Disponible:    'DISPONIBLE',
    Mantenimiento: 'MANTENIMIENTO',
  };

  protected setEstado(v: Vehiculo, label: 'Disponible' | 'Mantenimiento'): void {
    const newStatus = this.LABEL_TO_STATUS[label];
    this.vehiculos$.changeEstado(v.id, newStatus).subscribe({
      next: () => {
        this.toast.success('Estado actualizado', `${v.placa} → ${label}`);
        this.fetch();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.toast.error('No se pudo cambiar el estado',
          err?.error?.error?.message ?? 'Intenta nuevamente.');
      },
    });
  }

  // ── Estilos por estado ───────────────────────────────────
  protected estadoClass(v: Vehiculo): string {
    const n = (v.estado?.nombre ?? '').toLowerCase();
    if (/uso/.test(n))         return 'bg-primary-700 text-white border-primary-800';
    if (/mantenim/.test(n))    return 'bg-amber-50 text-warning border-amber-200';
    if (/reservad/.test(n))    return 'bg-primary-50 text-primary-800 border-primary-200';
    if (/disponible/.test(n) || v.activo) return 'bg-primary-50 text-primary-700 border-primary-200';
    return 'bg-slate-100 text-ink border-slate-200';
  }
  protected estadoDot(v: Vehiculo): string {
    const n = (v.estado?.nombre ?? '').toLowerCase();
    if (/uso/.test(n))         return 'bg-white';
    if (/mantenim/.test(n))    return 'bg-warning';
    if (/reservad/.test(n))    return 'bg-primary-700';
    return 'bg-primary-700';
  }

  private fetch(): void {
    this.loading.set(true);
    this.vehiculos$.list(this.page(), this.limit()).subscribe({
      next: (p) => {
        this.vehiculos.set(p.items);
        this.total.set(p.total);
        this.loading.set(false);
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.vehiculos.set([]);
        this.total.set(0);
        this.loading.set(false);
        this.toast.error('No se pudo cargar la flota',
          err?.error?.error?.message ?? 'Verifica el backend.');
      },
    });
  }
}
