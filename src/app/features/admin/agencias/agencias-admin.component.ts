import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { AdminService }         from '@core/services/admin.service';
import { CatalogosService }     from '@core/services/catalogos.service';
import { CatalogosStoreService } from '@core/services/catalogos-store.service';
import { ToastService }         from '@core/services/toast.service';
import { EmptyStateComponent }  from '@shared/components/empty-state/empty-state.component';
import { ModalComponent }       from '@shared/components/modal/modal.component';
import type { Agencia, Ciudad, Empresa } from '@core/models/api.models';

@Component({
  selector: 'app-admin-agencias',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, ReactiveFormsModule, LucideAngularModule, EmptyStateComponent, ModalComponent],
  template: `
    <section class="px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <!-- Cabecera -->
      <header class="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p class="text-xs uppercase tracking-wider text-ink-soft">Panel administrativo</p>
          <h2 class="text-2xl font-semibold text-ink">Agencias</h2>
          <p class="text-sm text-ink-muted mt-0.5">{{ total() }} agencia{{ total() !== 1 ? 's' : '' }} registradas.</p>
        </div>
        <button type="button" class="btn-primary" (click)="openCreate()">
          <lucide-icon name="plus" class="w-4 h-4"></lucide-icon>
          Nueva agencia
        </button>
      </header>

      <!-- Skeleton -->
      @if (loading()) {
        <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (i of [0,1,2,3,4,5]; track i) {
            <li class="card p-5 space-y-3" aria-hidden="true">
              <div class="flex items-center gap-3">
                <div class="skeleton w-10 h-10 rounded-xl shrink-0"></div>
                <div class="flex flex-col gap-2 flex-1">
                  <div class="skeleton h-4 w-3/5"></div>
                  <div class="skeleton h-3 w-2/5"></div>
                </div>
              </div>
              <div class="skeleton h-3 w-4/5"></div>
              <div class="skeleton h-3 w-1/3"></div>
            </li>
          }
        </ul>
      }

      <!-- Empty -->
      @else if (agencias().length === 0) {
        <app-empty-state
          icon="building-2"
          title="Sin agencias registradas"
          description="Crea la primera agencia para poder asignar vehículos."
        />
      }

      <!-- Cards -->
      @else {
        <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (a of agencias(); track a.id) {
            <li class="card p-5 flex flex-col gap-3">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-3">
                  <span class="grid place-items-center w-10 h-10 rounded-xl
                               bg-primary-50 text-primary-700 shrink-0">
                    <lucide-icon name="building-2" class="w-5 h-5"></lucide-icon>
                  </span>
                  <div>
                    <p class="font-semibold text-ink leading-tight">{{ a.nombre }}</p>
                    <p class="text-xs text-ink-muted">{{ a.empresa?.nombre ?? '—' }}</p>
                  </div>
                </div>
                <span class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5
                             text-[11px] font-medium shrink-0"
                      [ngClass]="a.activa
                        ? 'bg-primary-50 text-primary-800 border-primary-200'
                        : 'bg-red-50 text-danger border-red-200'">
                  <span class="w-1.5 h-1.5 rounded-full"
                        [ngClass]="a.activa ? 'bg-primary-700' : 'bg-danger'"></span>
                  {{ a.activa ? 'Activa' : 'Inactiva' }}
                </span>
              </div>

              <div class="space-y-1.5 text-sm text-ink-muted">
                <div class="flex items-start gap-2">
                  <lucide-icon name="map-pin" class="w-3.5 h-3.5 mt-0.5 shrink-0 text-ink-soft"></lucide-icon>
                  <span>{{ a.direccion || '—' }}</span>
                </div>
                @if (a.ciudad) {
                  <div class="flex items-center gap-2">
                    <lucide-icon name="globe" class="w-3.5 h-3.5 shrink-0 text-ink-soft"></lucide-icon>
                    <span>{{ a.ciudad.nombre }}</span>
                  </div>
                }
                @if (a.telefono) {
                  <div class="flex items-center gap-2">
                    <lucide-icon name="phone" class="w-3.5 h-3.5 shrink-0 text-ink-soft"></lucide-icon>
                    <span>{{ a.telefono }}</span>
                  </div>
                }
              </div>

              <!-- Acciones -->
              <div class="flex gap-2 pt-1 border-t border-surface-border mt-auto">
                <button type="button" class="btn-ghost text-xs flex-1"
                        (click)="openEdit(a)">
                  <lucide-icon name="pencil" class="w-3.5 h-3.5"></lucide-icon>
                  Editar
                </button>
                <button type="button" class="btn-ghost text-xs text-danger flex-1"
                        (click)="confirmDelete.set(a)">
                  <lucide-icon name="trash-2" class="w-3.5 h-3.5"></lucide-icon>
                  Eliminar
                </button>
              </div>
            </li>
          }
        </ul>
      }
    </section>

    <!-- Modal crear / editar ─────────────────────────────────── -->
    <app-modal
      [open]="formOpen()"
      [title]="editing() ? 'Editar agencia' : 'Nueva agencia'"
      subtitle="Completa los datos de la agencia."
      (closed)="closeForm()">
      <ng-container body>
        <form [formGroup]="form" (ngSubmit)="guardar()" novalidate class="space-y-4" id="ag-form">

          <div>
            <label class="label" for="ag-nombre">Nombre *</label>
            <input id="ag-nombre" type="text" formControlName="nombre" class="input"
                   placeholder="Agencia Norte Quito" />
            @if (showErr('nombre')) { <p class="error">Nombre requerido (mín. 3 caracteres).</p> }
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label" for="ag-empresa">Empresa *</label>
              <select id="ag-empresa" formControlName="empresaId" class="input">
                <option value="" disabled>Selecciona empresa</option>
                @for (e of empresas(); track e.id) {
                  <option [value]="e.id">{{ e.nombre }}</option>
                }
              </select>
              @if (showErr('empresaId')) { <p class="error">Requerido.</p> }
            </div>
            <div>
              <label class="label" for="ag-ciudad">Ciudad *</label>
              <select id="ag-ciudad" formControlName="ciudadId" class="input">
                <option value="" disabled>Selecciona ciudad</option>
                @for (c of ciudades(); track c.id) {
                  <option [value]="c.id">{{ c.nombre }}</option>
                }
              </select>
              @if (showErr('ciudadId')) { <p class="error">Requerido.</p> }
            </div>
          </div>

          <div>
            <label class="label" for="ag-dir">Dirección</label>
            <input id="ag-dir" type="text" formControlName="direccion" class="input"
                   placeholder="Av. Ejemplo y Calle 1" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label" for="ag-tel">Teléfono</label>
              <input id="ag-tel" type="tel" formControlName="telefono" class="input"
                     placeholder="02-555-1234" />
            </div>
            <div>
              <label class="label" for="ag-email">Email</label>
              <input id="ag-email" type="email" formControlName="email" class="input"
                     placeholder="agencia@empresa.ec" />
            </div>
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
        <button type="submit" form="ag-form" class="btn-primary" [disabled]="saving()">
          @if (saving()) {
            <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
          }
          {{ editing() ? 'Guardar cambios' : 'Crear agencia' }}
        </button>
      </ng-container>
    </app-modal>

    <!-- Modal confirmación eliminar ─────────────────────────── -->
    <app-modal
      [open]="!!confirmDelete()"
      title="Eliminar agencia"
      size="sm"
      (closed)="confirmDelete.set(null)">
      <ng-container body>
        <p class="text-sm text-ink-muted">
          ¿Eliminar <strong class="text-ink">{{ confirmDelete()?.nombre }}</strong>?
          Esta acción desactiva la agencia. Si tiene vehículos asignados,
          el sistema rechazará la operación.
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
        <button type="button" class="btn-outline" (click)="confirmDelete.set(null); deleteError.set(null)">
          Cancelar
        </button>
        <button type="button" class="btn-danger" [disabled]="deleting()"
                (click)="eliminar()">
          @if (deleting()) {
            <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
          }
          Eliminar
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class AdminAgenciasComponent implements OnInit {
  private readonly admin$    = inject(AdminService);
  private readonly catalogos = inject(CatalogosService);
  private readonly store     = inject(CatalogosStoreService);
  private readonly toast     = inject(ToastService);
  private readonly fb        = inject(FormBuilder);

  protected readonly loading       = signal(true);
  protected readonly saving        = signal(false);
  protected readonly deleting      = signal(false);
  protected readonly agencias      = signal<Agencia[]>([]);
  protected readonly empresas      = signal<Empresa[]>([]);
  protected readonly ciudades      = signal<Ciudad[]>([]);
  protected readonly formOpen      = signal(false);
  protected readonly editing       = signal<Agencia | null>(null);
  protected readonly confirmDelete = signal<Agencia | null>(null);
  protected readonly formError     = signal<string | null>(null);
  protected readonly deleteError   = signal<string | null>(null);

  protected readonly total = computed(() => this.agencias().length);

  protected readonly form = this.fb.nonNullable.group({
    nombre:    ['', [Validators.required, Validators.minLength(3)]],
    empresaId: ['', Validators.required],
    ciudadId:  ['', Validators.required],
    direccion: [''],
    telefono:  [''],
    email:     [''],
  });

  ngOnInit(): void {
    this.cargar();
    this.admin$.empresas().subscribe({
      next: (l) => this.empresas.set(l), error: () => this.empresas.set([]),
    });
    this.catalogos.ciudades().subscribe({
      next: (l) => this.ciudades.set(l), error: () => this.ciudades.set([]),
    });
  }

  protected showErr(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ nombre: '', empresaId: '', ciudadId: '', direccion: '', telefono: '', email: '' });
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(a: Agencia): void {
    this.editing.set(a);
    this.form.patchValue({
      nombre:    a.nombre ?? '',
      empresaId: a.empresaId,
      ciudadId:  a.ciudadId ?? '',
      direccion: a.direccion ?? '',
      telefono:  a.telefono  ?? '',
      email:     (a as any).email ?? '',
    });
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  protected guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.formError.set(null);

    const v = this.form.getRawValue();
    const payload = {
      nombre:    v.nombre,
      empresaId: v.empresaId,
      ciudadId:  v.ciudadId,
      direccion: v.direccion || undefined,
      telefono:  v.telefono  || undefined,
      email:     v.email     || undefined,
    };

    const id = this.editing()?.id;
    const op$ = id
      ? this.admin$.editarAgencia(id, payload)
      : this.admin$.crearAgencia(payload);

    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.toast.success(id ? 'Agencia actualizada' : 'Agencia creada');
        this.cargar();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.saving.set(false);
        this.formError.set(err?.error?.error?.message ?? 'No se pudo guardar la agencia.');
      },
    });
  }

  protected eliminar(): void {
    const a = this.confirmDelete();
    if (!a) return;
    this.deleting.set(true);
    this.deleteError.set(null);

    this.admin$.eliminarAgencia(a.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmDelete.set(null);
        this.toast.success('Agencia eliminada');
        this.cargar();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.deleting.set(false);
        this.deleteError.set(err?.error?.error?.message ?? 'No se pudo eliminar la agencia.');
      },
    });
  }

  private cargar(): void {
    this.loading.set(true);
    this.admin$.agencias().subscribe({
      next: (list) => {
        this.agencias.set(list);
        this.loading.set(false);
        this.store.refreshAgencias(); // sincroniza dropdown de vehículos
      },
      error: () => this.loading.set(false),
    });
  }
}
