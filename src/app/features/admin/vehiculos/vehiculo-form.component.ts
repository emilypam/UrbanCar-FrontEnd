import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, inject, Input,
  OnChanges, OnInit, Output, signal, type SimpleChanges,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { CatalogosService }       from '@core/services/catalogos.service';
import { CatalogosStoreService }  from '@core/services/catalogos-store.service';
import { placaValidator, positiveNumberValidator } from '@core/validators/placa.validator';
import type {
  CreateVehiculoRequest, TipoCombustible, TipoTransmision, Vehiculo,
} from '@core/models/api.models';

@Component({
  selector: 'app-vehiculo-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, LucideAngularModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate
          class="grid grid-cols-1 sm:grid-cols-2 gap-4" [id]="formId">

      <div class="sm:col-span-2">
        <label class="label" for="vf-placa">Placa *</label>
        <input id="vf-placa" type="text" formControlName="placa" class="input uppercase"
               placeholder="ABC-1234" maxlength="8"
               (input)="upperCasePlaca($event)" />
        @if (showError('placa', 'required')) {
          <p class="error">La placa es obligatoria.</p>
        } @else if (showError('placa', 'placa')) {
          <p class="error">Formato inválido. Ejemplos: ABC-1234, AB-1234.</p>
        } @else {
          <p class="help">Formato Ecuador: 2-3 letras + 3-4 dígitos (con guion opcional).</p>
        }
      </div>

      <div>
        <label class="label" for="vf-modelo">Modelo *</label>
        <select id="vf-modelo" formControlName="modeloId" class="input">
          <option [value]="''" disabled>Selecciona un modelo</option>
          @for (m of modelos(); track m.id) {
            <option [value]="m.id">{{ m.marca?.nombre }} — {{ m.nombre }}</option>
          }
        </select>
        @if (showError('modeloId', 'required')) { <p class="error">Selecciona un modelo.</p> }
      </div>

      <div>
        <label class="label" for="vf-categoria">Categoría *</label>
        <select id="vf-categoria" formControlName="categoriaId" class="input">
          <option [value]="''" disabled>Selecciona una categoría</option>
          @for (c of categorias(); track c.id) {
            <option [value]="c.id">{{ c.nombre }}</option>
          }
        </select>
        @if (showError('categoriaId', 'required')) { <p class="error">Selecciona una categoría.</p> }
      </div>

      <div>
        <label class="label" for="vf-combustible">Combustible *</label>
        <select id="vf-combustible" formControlName="tipoCombustibleId" class="input">
          <option [value]="''" disabled>Selecciona</option>
          @for (t of combustibles; track t.id) {
            <option [value]="t.id">{{ t.nombre }}</option>
          }
        </select>
        @if (showError('tipoCombustibleId', 'required')) { <p class="error">Requerido.</p> }
      </div>

      <div>
        <label class="label" for="vf-transmision">Transmisión *</label>
        <select id="vf-transmision" formControlName="tipoTransmisionId" class="input">
          <option [value]="''" disabled>Selecciona</option>
          @for (t of transmisiones; track t.id) {
            <option [value]="t.id">{{ t.nombre }}</option>
          }
        </select>
        @if (showError('tipoTransmisionId', 'required')) { <p class="error">Requerido.</p> }
      </div>

      <div>
        <label class="label" for="vf-agencia">Agencia *</label>
        <select id="vf-agencia" formControlName="agenciaId" class="input">
          <option [value]="''" disabled>Selecciona una agencia</option>
          @for (a of agencias(); track a.id) {
            <option [value]="a.id">{{ a.nombre }}</option>
          }
        </select>
        @if (showError('agenciaId', 'required')) { <p class="error">Selecciona una agencia.</p> }
      </div>

      <div>
        <label class="label" for="vf-color">Color *</label>
        <input id="vf-color" type="text" formControlName="color" class="input"
               placeholder="Blanco" />
        @if (showError('color', 'required')) { <p class="error">El color es obligatorio.</p> }
      </div>

      <div>
        <label class="label" for="vf-anio">Año *</label>
        <input id="vf-anio" type="number" formControlName="anio" class="input"
               [min]="minYear" [max]="maxYear" />
        @if (showError('anio', 'required')) { <p class="error">Requerido.</p> }
        @else if (form.controls.anio.errors?.['min']) { <p class="error">Mínimo {{ minYear }}.</p> }
        @else if (form.controls.anio.errors?.['max']) { <p class="error">Máximo {{ maxYear }}.</p> }
      </div>

      <div>
        <label class="label" for="vf-pasajeros">Pasajeros</label>
        <input id="vf-pasajeros" type="number" formControlName="numeroPasajeros"
               class="input" min="1" max="20" />
      </div>

      <div>
        <label class="label" for="vf-kilometraje">Kilometraje</label>
        <input id="vf-kilometraje" type="number" formControlName="kilometraje"
               class="input" min="0" />
      </div>

      <div>
        <label class="label" for="vf-precio">Precio por día (USD) *</label>
        <input id="vf-precio" type="number" formControlName="precioDia"
               class="input" step="0.01" min="0.01" />
        @if (showError('precioDia', 'required')) { <p class="error">El precio es obligatorio.</p> }
        @else if (showError('precioDia', 'positive') || showError('precioDia', 'numeric')) {
          <p class="error">Debe ser un número mayor a cero.</p>
        }
      </div>

      <div class="sm:col-span-2">
        <label class="label" for="vf-imagen">URL de la imagen</label>
        <input id="vf-imagen" type="url" formControlName="imagenUrl" class="input"
               placeholder="https://…" />
      </div>

      <div class="sm:col-span-2">
        <label class="label" for="vf-descripcion">Descripción</label>
        <textarea id="vf-descripcion" formControlName="descripcion"
                  class="input min-h-[80px]"
                  placeholder="Características destacadas, equipamiento incluido…"></textarea>
      </div>

      @if (errorMsg()) {
        <div class="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 text-danger
                    px-3 py-2 text-sm flex items-start gap-2">
          <lucide-icon name="alert-circle" class="w-4 h-4 mt-0.5"></lucide-icon>
          <span>{{ errorMsg() }}</span>
        </div>
      }
    </form>
  `,
})
export class VehiculoFormComponent implements OnInit, OnChanges {
  /** Vehículo a editar. `null` → modo creación. */
  @Input() vehiculo: Vehiculo | null = null;
  /** Id usado para enlazar el botón submit externo (`form="vf-form"`). */
  @Input() formId = 'vf-form';

  @Output() readonly saved      = new EventEmitter<CreateVehiculoRequest>();
  @Output() readonly validityCh = new EventEmitter<boolean>();

  private readonly fb       = inject(FormBuilder);
  private readonly catalogos = inject(CatalogosService);
  private readonly store     = inject(CatalogosStoreService);
  private readonly cd        = inject(ChangeDetectorRef);

  protected readonly minYear = 1990;
  protected readonly maxYear = new Date().getFullYear() + 1;

  protected readonly errorMsg = signal<string | null>(null);

  // Señales reactivas — se actualizan automáticamente cuando el admin crea nuevos items
  protected readonly modelos    = this.store.modelos;
  protected readonly categorias = this.store.categorias;
  protected readonly agencias   = this.store.agencias;

  // Estáticos: combustible y transmisión no cambian durante la sesión
  protected combustibles:  TipoCombustible[] = [];
  protected transmisiones: TipoTransmision[] = [];

  protected readonly form = this.fb.nonNullable.group({
    placa:             ['', [Validators.required, placaValidator]],
    modeloId:          ['', [Validators.required]],
    categoriaId:       ['', [Validators.required]],
    tipoCombustibleId: ['', [Validators.required]],
    tipoTransmisionId: ['', [Validators.required]],
    agenciaId:         ['', [Validators.required]],
    color:             ['', [Validators.required]],
    anio:              [this.maxYear - 1, [Validators.required, Validators.min(this.minYear), Validators.max(this.maxYear)]],
    numeroPasajeros:   [5,  [Validators.min(1), Validators.max(20)]],
    kilometraje:       [0,  [Validators.min(0)]],
    precioDia:         [0,  [Validators.required, positiveNumberValidator]],
    imagenUrl:         [''],
    descripcion:       [''],
  });

  ngOnInit(): void {
    // Recarga siempre al abrir el formulario para reflejar items recién creados
    this.store.refreshModelos();
    this.store.refreshCategorias();
    this.store.refreshAgencias();

    this.catalogos.tiposCombustible().subscribe({
      next: (l) => { this.combustibles  = l; this.cd.markForCheck(); },
      error: ()  => { this.combustibles  = []; },
    });
    this.catalogos.tiposTransmision().subscribe({
      next: (l) => { this.transmisiones = l; this.cd.markForCheck(); },
      error: ()  => { this.transmisiones = []; },
    });

    this.form.statusChanges.subscribe((s) => this.validityCh.emit(s === 'VALID'));
    this.validityCh.emit(this.form.valid);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehiculo']) this.patchFromVehiculo();
  }

  protected showError(name: keyof typeof this.form.controls, key: string): boolean {
    const c = this.form.controls[name];
    return !!(c.errors?.[key] && (c.dirty || c.touched));
  }

  protected upperCasePlaca(ev: Event): void {
    const el = ev.target as HTMLInputElement;
    const upper = el.value.toUpperCase();
    if (el.value !== upper) {
      this.form.controls.placa.setValue(upper, { emitEvent: false });
    }
  }

  /** Llamado por el modal padre desde su botón submit. */
  submit(): void {
    this.errorMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Revisa los campos marcados en rojo.');
      return;
    }
    const v = this.form.getRawValue();
    const payload: CreateVehiculoRequest = {
      placa:             v.placa.toUpperCase(),
      agenciaId:         v.agenciaId,
      modeloId:          v.modeloId,
      categoriaId:       v.categoriaId,
      tipoCombustibleId: v.tipoCombustibleId,
      tipoTransmisionId: v.tipoTransmisionId,
      color:             v.color,
      anio:              Number(v.anio),
      kilometraje:       Number(v.kilometraje),
      numeroPasajeros:   Number(v.numeroPasajeros),
      precioDia:         Number(v.precioDia),
      imagenUrl:         v.imagenUrl?.trim()   || undefined,
      descripcion:       v.descripcion?.trim() || undefined,
    };
    this.saved.emit(payload);
  }

  private patchFromVehiculo(): void {
    if (!this.vehiculo) {
      this.form.reset({
        placa: '', modeloId: '', categoriaId: '',
        tipoCombustibleId: '', tipoTransmisionId: '', agenciaId: '',
        color: '', anio: this.maxYear - 1,
        numeroPasajeros: 5, kilometraje: 0, precioDia: 0,
        imagenUrl: '', descripcion: '',
      });
      return;
    }
    const v = this.vehiculo;
    this.form.patchValue({
      placa:             v.placa,
      modeloId:          v.modeloId,
      categoriaId:       v.categoriaId,
      tipoCombustibleId: v.tipoCombustibleId,
      tipoTransmisionId: v.tipoTransmisionId,
      agenciaId:         v.agenciaId,
      color:             v.color,
      anio:              v.anio,
      numeroPasajeros:   v.numeroPasajeros,
      kilometraje:       v.kilometraje,
      precioDia:         v.precioDia,
      imagenUrl:         v.imagenUrl ?? '',
      descripcion:       v.descripcion ?? '',
    });
  }
}
