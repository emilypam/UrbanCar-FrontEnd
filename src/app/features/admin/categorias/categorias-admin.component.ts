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
import type { Categoria } from '@core/models/api.models';

@Component({
  selector: 'app-admin-categorias',
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
            <lucide-icon name="tag" class="w-6 h-6 text-primary-700"></lucide-icon>
            Categorías de vehículos
          </h2>
          <p class="text-sm text-ink-muted mt-0.5">{{ total() }} categorías registradas.</p>
        </div>
        <button type="button" class="btn-primary" (click)="openCreate()">
          <lucide-icon name="plus" class="w-4 h-4"></lucide-icon>
          Nueva categoría
        </button>
      </header>

      <!-- Tabla -->
      <div class="card overflow-hidden">
        @if (loading()) {
          <div class="p-6 space-y-2">
            @for (i of [0,1,2,3]; track i) {
              <div class="skeleton h-12"></div>
            }
          </div>
        } @else if (categorias().length === 0) {
          <app-empty-state icon="tag" title="Sin categorías"
                           description="Las categorías clasifican el tipo de vehículo (SUV, Sedan, etc.)." />
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-surface-muted text-ink-muted text-xs uppercase tracking-wider">
                <tr>
                  <th class="text-left px-4 py-3 font-semibold">Categoría</th>
                  <th class="text-left px-4 py-3 font-semibold">Descripción</th>
                  <th class="text-right px-4 py-3 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-border">
                @for (cat of categorias(); track cat.id) {
                  <tr class="hover:bg-primary-50/40 transition-colors">
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-50
                                   border border-primary-200 px-2.5 py-0.5 text-xs
                                   font-semibold text-primary-800">
                        <lucide-icon name="tag" class="w-3 h-3"></lucide-icon>
                        {{ cat.nombre }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-ink-muted">{{ cat.descripcion || '—' }}</td>
                    <td class="px-4 py-3 text-right">
                      <button type="button" class="btn-ghost text-xs text-danger"
                              (click)="confirmDelete.set(cat)">
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

    <!-- Modal nueva categoría ───────────────────────────────── -->
    <app-modal [open]="formOpen()" title="Nueva categoría"
               subtitle="Define el tipo de vehículo (SUV, Sedan, Pickup…)."
               (closed)="closeForm()">
      <ng-container body>
        <form [formGroup]="form" (ngSubmit)="guardar()" novalidate class="space-y-4" id="cat-form">
          <div>
            <label class="label" for="cat-nombre">Nombre *</label>
            <input id="cat-nombre" type="text" formControlName="nombre" class="input"
                   placeholder="SUV, Sedan, Pickup…" />
            @if (showErr('nombre')) { <p class="error">Nombre requerido (mín. 2 caracteres).</p> }
          </div>
          <div>
            <label class="label" for="cat-desc">Descripción</label>
            <textarea id="cat-desc" formControlName="descripcion"
                      class="input min-h-[70px]"
                      placeholder="Descripción breve de la categoría…"></textarea>
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
        <button type="submit" form="cat-form" class="btn-primary" [disabled]="saving()">
          @if (saving()) { <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon> }
          Crear categoría
        </button>
      </ng-container>
    </app-modal>

    <!-- Modal confirmar eliminar ────────────────────────────── -->
    <app-modal [open]="!!confirmDelete()" title="Eliminar categoría" size="sm"
               (closed)="confirmDelete.set(null)">
      <ng-container body>
        <p class="text-sm text-ink-muted">
          ¿Eliminar la categoría
          <strong class="text-ink">{{ confirmDelete()?.nombre }}</strong>?
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
export class AdminCategoriasComponent implements OnInit {
  private readonly admin$    = inject(AdminService);
  private readonly catalogos = inject(CatalogosService);
  private readonly store     = inject(CatalogosStoreService);
  private readonly toast     = inject(ToastService);
  private readonly fb        = inject(FormBuilder);

  protected readonly loading       = signal(true);
  protected readonly saving        = signal(false);
  protected readonly deleting      = signal(false);
  protected readonly categorias    = signal<Categoria[]>([]);
  protected readonly formOpen      = signal(false);
  protected readonly confirmDelete = signal<Categoria | null>(null);
  protected readonly formError     = signal<string | null>(null);
  protected readonly deleteError   = signal<string | null>(null);

  protected readonly total = computed(() => this.categorias().length);

  protected readonly form = this.fb.nonNullable.group({
    nombre:      ['', [Validators.required, Validators.minLength(2)]],
    descripcion: [''],
  });

  ngOnInit(): void { this.cargar(); }

  protected showErr(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  protected openCreate(): void {
    this.form.reset({ nombre: '', descripcion: '' });
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void { this.formOpen.set(false); }

  protected guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.formError.set(null);
    const { nombre, descripcion } = this.form.getRawValue();

    this.admin$.crearCategoria({ nombre, descripcion: descripcion || undefined }).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.toast.success('Categoría creada');
        this.cargar();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.saving.set(false);
        this.formError.set(err?.error?.error?.message ?? 'No se pudo crear la categoría.');
      },
    });
  }

  protected eliminar(): void {
    const cat = this.confirmDelete();
    if (!cat) return;
    this.deleting.set(true);
    this.deleteError.set(null);

    this.admin$.eliminarCategoria(cat.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmDelete.set(null);
        this.toast.success('Categoría eliminada');
        this.cargar();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.deleting.set(false);
        this.deleteError.set(err?.error?.error?.message ?? 'No se pudo eliminar la categoría.');
      },
    });
  }

  private cargar(): void {
    this.loading.set(true);
    this.catalogos.categorias().subscribe({
      next: (list) => {
        this.categorias.set(list);
        this.loading.set(false);
        this.store.refreshCategorias(); // sincroniza dropdown de vehículos
      },
      error: () => this.loading.set(false),
    });
  }
}
