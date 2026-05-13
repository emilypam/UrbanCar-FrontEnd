import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { AdminService }          from '@core/services/admin.service';
import { CatalogosService }      from '@core/services/catalogos.service';
import { CatalogosStoreService } from '@core/services/catalogos-store.service';
import { ToastService }          from '@core/services/toast.service';
import { EmptyStateComponent }   from '@shared/components/empty-state/empty-state.component';
import { ModalComponent }        from '@shared/components/modal/modal.component';
import type { Marca, Modelo } from '@core/models/api.models';

@Component({
  selector: 'app-admin-modelos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, LucideAngularModule, EmptyStateComponent, ModalComponent],
  template: `
    <section class="px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <!-- Cabecera -->
      <header class="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p class="text-xs uppercase tracking-wider text-ink-soft">Catálogo</p>
          <h2 class="text-2xl font-semibold text-ink flex items-center gap-2">
            <lucide-icon name="car" class="w-6 h-6 text-primary-700"></lucide-icon>
            Modelos de vehículos
          </h2>
          <p class="text-sm text-ink-muted mt-0.5">{{ total() }} modelos registrados.</p>
        </div>
        <button type="button" class="btn-primary" (click)="openCreate()">
          <lucide-icon name="plus" class="w-4 h-4"></lucide-icon>
          Nuevo modelo
        </button>
      </header>

      <!-- Tabla -->
      <div class="card overflow-hidden">
        @if (loading()) {
          <div class="p-6 space-y-2">
            @for (i of [0,1,2,3,4]; track i) {
              <div class="skeleton h-10"></div>
            }
          </div>
        } @else if (modelos().length === 0) {
          <app-empty-state icon="car" title="Sin modelos"
                           description="Crea el primer modelo vinculado a una marca." />
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-surface-muted text-ink-muted text-xs uppercase tracking-wider">
                <tr>
                  <th class="text-left px-4 py-3 font-semibold">Marca</th>
                  <th class="text-left px-4 py-3 font-semibold">Nombre del modelo</th>
                  <th class="text-right px-4 py-3 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-border">
                @for (m of modelos(); track m.id) {
                  <tr class="hover:bg-primary-50/40 transition-colors">
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-50
                                   border border-primary-200 px-2.5 py-0.5 text-xs
                                   font-semibold text-primary-800">
                        {{ m.marca?.nombre ?? '—' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 font-medium">{{ m.nombre }}</td>
                    <td class="px-4 py-3 text-right">
                      <button type="button" class="btn-ghost text-xs text-danger"
                              (click)="confirmDelete.set(m)">
                        <lucide-icon name="trash-2" class="w-3.5 h-3.5"></lucide-icon>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>

    <!-- Modal nuevo modelo ──────────────────────────────────── -->
    <app-modal [open]="formOpen()" title="Nuevo modelo"
               subtitle="Vincula el modelo a una marca existente."
               (closed)="closeForm()">
      <ng-container body>
        <form [formGroup]="form" (ngSubmit)="guardar()" novalidate class="space-y-4" id="mo-form">
          <div>
            <label class="label" for="mo-marca">Marca *</label>
            <select id="mo-marca" formControlName="marcaId" class="input">
              <option value="" disabled>Selecciona una marca</option>
              @for (ma of marcas(); track ma.id) {
                <option [value]="ma.id">{{ ma.nombre }}</option>
              }
            </select>
            @if (showErr('marcaId')) { <p class="error">Selecciona una marca.</p> }
          </div>
          <div>
            <label class="label" for="mo-nombre">Nombre del modelo *</label>
            <input id="mo-nombre" type="text" formControlName="nombre" class="input"
                   placeholder="p. ej. Corolla, Ranger, Tucson…" />
            @if (showErr('nombre')) { <p class="error">Nombre requerido (mín. 2 caracteres).</p> }
          </div>
          @if (formError()) {
            <div class="rounded-xl border border-red-200 bg-red-50 text-danger
                        px-3 py-2 text-sm flex items-start gap-2">
              <lucide-icon name="alert-circle" class="w-4 h-4 mt-0.5"></lucide-icon>
              <span>{{ formError() }}</span>
            </div>
          }
        </form>
      </ng-container>
      <ng-container footer>
        <button type="button" class="btn-outline" (click)="closeForm()">Cancelar</button>
        <button type="submit" form="mo-form" class="btn-primary" [disabled]="saving()">
          @if (saving()) { <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon> }
          Crear modelo
        </button>
      </ng-container>
    </app-modal>

    <!-- Modal confirmar eliminar ───────────────────────────── -->
    <app-modal [open]="!!confirmDelete()" title="Eliminar modelo" size="sm"
               (closed)="confirmDelete.set(null)">
      <ng-container body>
        <p class="text-sm text-ink-muted">
          ¿Eliminar el modelo
          <strong class="text-ink">{{ confirmDelete()?.marca?.nombre }} {{ confirmDelete()?.nombre }}</strong>?
          No se puede eliminar si tiene vehículos activos asignados.
        </p>
        @if (deleteError()) {
          <div class="mt-3 rounded-xl border border-red-200 bg-red-50 text-danger
                      px-3 py-2 text-sm flex items-start gap-2">
            <lucide-icon name="alert-circle" class="w-4 h-4 mt-0.5"></lucide-icon>
            <span>{{ deleteError() }}</span>
          </div>
        }
      </ng-container>
      <ng-container footer>
        <button type="button" class="btn-outline"
                (click)="confirmDelete.set(null); deleteError.set(null)">Cancelar</button>
        <button type="button" class="btn-danger" [disabled]="deleting()"
                (click)="eliminar()">
          @if (deleting()) { <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon> }
          Eliminar
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class AdminModelosComponent implements OnInit {
  private readonly admin$    = inject(AdminService);
  private readonly catalogos = inject(CatalogosService);
  private readonly store     = inject(CatalogosStoreService);
  private readonly toast     = inject(ToastService);
  private readonly fb        = inject(FormBuilder);

  protected readonly loading       = signal(true);
  protected readonly saving        = signal(false);
  protected readonly deleting      = signal(false);
  protected readonly modelos       = signal<Modelo[]>([]);
  protected readonly marcas        = signal<Marca[]>([]);
  protected readonly formOpen      = signal(false);
  protected readonly confirmDelete = signal<Modelo | null>(null);
  protected readonly formError     = signal<string | null>(null);
  protected readonly deleteError   = signal<string | null>(null);

  protected readonly total = computed(() => this.modelos().length);

  protected readonly form = this.fb.nonNullable.group({
    marcaId: ['', Validators.required],
    nombre:  ['', [Validators.required, Validators.minLength(2)]],
  });

  ngOnInit(): void {
    this.cargar();
    this.catalogos.marcas().subscribe({
      next: (l) => this.marcas.set(l), error: () => this.marcas.set([]),
    });
  }

  protected showErr(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  protected openCreate(): void {
    this.form.reset({ marcaId: '', nombre: '' });
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void { this.formOpen.set(false); }

  protected guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.formError.set(null);
    const { marcaId, nombre } = this.form.getRawValue();

    this.admin$.crearModelo({ marcaId, nombre }).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.toast.success('Modelo creado');
        this.cargar();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.saving.set(false);
        this.formError.set(err?.error?.error?.message ?? 'No se pudo crear el modelo.');
      },
    });
  }

  protected eliminar(): void {
    const m = this.confirmDelete();
    if (!m) return;
    this.deleting.set(true);
    this.deleteError.set(null);

    this.admin$.eliminarModelo(m.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmDelete.set(null);
        this.toast.success('Modelo eliminado');
        this.cargar();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.deleting.set(false);
        this.deleteError.set(err?.error?.error?.message ?? 'No se pudo eliminar el modelo.');
      },
    });
  }

  private cargar(): void {
    this.loading.set(true);
    this.catalogos.modelos().subscribe({
      next: (list) => {
        this.modelos.set(list);
        this.loading.set(false);
        this.store.refreshModelos(); // sincroniza dropdown de vehículos
      },
      error: () => this.loading.set(false),
    });
  }
}
