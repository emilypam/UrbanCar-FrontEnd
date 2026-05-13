import {
  ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Input, OnInit, signal,
} from '@angular/core';
import { CurrencyPipe, NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { ReservasService } from '@core/services/reservas.service';
import { PagosService } from '@core/services/pagos.service';
import { ToastService } from '@core/services/toast.service';
import {
  cvvValidator, expiracionValidator, formatCardNumber, formatExpiry, tarjetaValidator,
} from '@core/validators/card.validator';
import type {
  CreatePagoRequest, MetodoPago, Reserva,
} from '@core/models/api.models';
import { formatUsd } from '@core/utils/date.utils';
import { fadeIn, fadeUp, slideStep } from '@core/animations/motion';

/**
 * Componente de Pago + Facturación Automática.
 *
 *   - Recibe `:reservaId` desde la ruta `/pago/:reservaId`
 *     (gracias a `withComponentInputBinding()` en `app.config.ts`).
 *   - Carga la reserva y bloquea la pantalla si:
 *       - Está cancelada / completada.
 *       - Ya tiene un pago COMPLETADO.
 *   - Aplica validaciones reactivas estrictas (Luhn, MM/YY, CVV, titular).
 *   - Llama `POST /api/v1/pagos`. La respuesta solo confirma el éxito (sin factura).
 */
@Component({
  selector: 'app-pago',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgClass, ReactiveFormsModule, RouterLink, LucideAngularModule,
    CurrencyPipe, NgClass,
  ],
  animations: [fadeIn, fadeUp, slideStep],
  template: `
    <section class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <!-- Cabecera ─────────────────────────────────────────── -->
      <header class="mb-8 flex items-start justify-between gap-4 flex-wrap" [@fadeUp]>
        <div>
          <a routerLink="/cliente" class="btn-ghost -ml-2 mb-1">
            <lucide-icon name="arrow-left" class="w-4 h-4"></lucide-icon>
            Volver a mis reservas
          </a>
          <h1 class="text-2xl sm:text-3xl font-semibold flex items-center gap-2">
            <lucide-icon name="credit-card" class="w-6 h-6 text-primary-700"></lucide-icon>
            Finalizar pago
          </h1>
          <p class="text-sm text-ink-muted mt-1">
            Completa el pago para confirmar tu reserva.
          </p>
        </div>
      </header>

      <!-- Loading ──────────────────────────────────────────── -->
      @if (loading()) {
        <div class="card-pad flex items-center gap-2 text-ink-muted" [@fadeIn]>
          <lucide-icon name="loader-2" class="w-4 h-4 animate-spin text-primary-700"></lucide-icon>
          Cargando reserva…
        </div>
      }

      <!-- Error de carga / reserva inválida ────────────────── -->
      @if (!loading() && errorCarga()) {
        <div class="card-pad text-danger flex items-start gap-3" [@fadeIn]>
          <lucide-icon name="alert-circle" class="w-5 h-5 mt-0.5"></lucide-icon>
          <div>
            <p class="font-medium">No pudimos cargar la reserva.</p>
            <p class="text-sm mt-1 text-ink-muted">{{ errorCarga() }}</p>
            <a routerLink="/cliente" class="btn-outline mt-3">Volver a mis reservas</a>
          </div>
        </div>
      }

      <!-- Pantalla de confirmación (sin datos de factura) ───── -->
      @if (pagoExitoso()) {
        <article class="card-pad text-center py-12 space-y-6 max-w-md mx-auto" [@slideStep]>
          <span class="inline-grid place-items-center w-16 h-16 rounded-full bg-emerald-600 text-white shadow-soft mx-auto">
            <lucide-icon name="check-circle-2" class="w-10 h-10"></lucide-icon>
          </span>
          <div>
            <h2 class="text-xl font-semibold">Confirmación</h2>
            <p class="text-ink-muted mt-2">{{ mensajeExito() }}</p>
          </div>
          <a routerLink="/" class="btn-primary inline-flex items-center justify-center gap-2">
            <lucide-icon name="arrow-left" class="w-4 h-4"></lucide-icon>
            Volver al inicio
          </a>
        </article>
      }

      <!-- Formulario de pago ────────────────────────────────── -->
      @if (!loading() && !errorCarga() && !pagoExitoso() && reserva(); as r) {
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">

        <!-- COLUMNA FORM -->
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="card-pad space-y-6"
              [@slideStep]>
          <header>
            <h2 class="font-semibold flex items-center gap-2 text-lg">
              <lucide-icon name="credit-card" class="w-5 h-5 text-primary-700"></lucide-icon>
              Datos de pago
            </h2>
            <p class="text-sm text-ink-muted mt-1">
              Reserva <span class="font-mono font-semibold">#{{ r.id.slice(0,8).toUpperCase() }}</span>
              · Total a pagar <strong class="text-primary-700">{{ formatUsd(totalConIva()) }}</strong>
            </p>
          </header>

          <!-- Cuenta regresiva -->
          @if (r.expiresAt) {
            <div class="rounded-xl border px-4 py-3 text-sm flex items-center gap-3"
                 [ngClass]="countdownBannerClass()">
              <lucide-icon name="clock" class="w-4 h-4 shrink-0"></lucide-icon>
              @if (expirado()) {
                <span><strong>Tiempo agotado.</strong>
                  La reserva expiró. Por favor haz una nueva reserva.</span>
              } @else {
                <span>
                  Tienes <strong class="font-mono text-base tabular-nums">{{ tiempoFormateado() }}</strong>
                  para completar el pago o el vehículo se liberará.
                </span>
              }
            </div>
          }

          <!-- Método de pago -->
          <div>
            <label class="label">Método de pago</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              @for (m of metodosPago; track m.value) {
                <button type="button"
                        (click)="setMetodo(m.value)"
                        [ngClass]="metodoOptionClass(form.controls.metodoPago.value === m.value)"
                        class="text-left p-3 rounded-xl border transition-colors flex items-center gap-2">
                  <lucide-icon [name]="m.icon" class="w-4 h-4 text-primary-700"></lucide-icon>
                  <span class="text-sm font-medium">{{ m.label }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Datos de tarjeta (sólo si aplica) -->
          @if (esTarjeta()) {
            <fieldset formGroupName="tarjeta" class="space-y-4 rounded-xl border border-primary-100
                          bg-primary-50/30 p-4">
              <legend class="text-sm font-semibold text-primary-800 px-1">
                Información de la tarjeta
              </legend>

              <div>
                <label class="label" for="cardNumero">Número de tarjeta</label>
                <div class="relative">
                  <lucide-icon name="credit-card"
                    class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"></lucide-icon>
                  <input id="cardNumero" type="text" formControlName="numero"
                         (input)="onCardNumberInput($event)"
                         class="input pl-9 font-mono tracking-wider"
                         autocomplete="cc-number" inputmode="numeric"
                         placeholder="1234 5678 9012 3456" maxlength="19" />
                </div>
                @if (showError('tarjeta.numero')) {
                  <p class="error">{{ errorTarjetaNumero() }}</p>
                }
              </div>

              <div>
                <label class="label" for="cardTitular">Nombre del titular</label>
                <input id="cardTitular" type="text" formControlName="titular"
                       class="input" autocomplete="cc-name"
                       placeholder="Como aparece en la tarjeta" maxlength="80" />
                @if (showError('tarjeta.titular')) {
                  <p class="error">El titular debe tener al menos 3 caracteres.</p>
                }
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="label" for="cardExpira">Expira (MM/YY)</label>
                  <input id="cardExpira" type="text" formControlName="expira"
                         (input)="onExpiryInput($event)"
                         class="input font-mono" autocomplete="cc-exp"
                         inputmode="numeric" placeholder="MM/YY" maxlength="5" />
                  @if (showError('tarjeta.expira')) {
                    <p class="error">{{ errorTarjetaExpira() }}</p>
                  }
                </div>

                <div>
                  <label class="label" for="cardCvv">CVV</label>
                  <input id="cardCvv" type="text" formControlName="cvv"
                         class="input font-mono tracking-widest"
                         autocomplete="cc-csc" inputmode="numeric"
                         placeholder="•••" maxlength="4" />
                  @if (showError('tarjeta.cvv')) {
                    <p class="error">CVV debe tener 3 o 4 dígitos.</p>
                  }
                </div>
              </div>

              <p class="text-[11px] text-ink-soft flex items-center gap-1.5">
                <lucide-icon name="shield" class="w-3 h-3"></lucide-icon>
                Tus datos se transmiten cifrados por HTTPS. Nunca almacenamos el número
                completo ni el CVV.
              </p>
            </fieldset>
          }

          <!-- Datos de facturación -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-ink flex items-center gap-1.5">
              <lucide-icon name="file-text" class="w-4 h-4 text-primary-700"></lucide-icon>
              Datos de facturación
              <span class="text-ink-soft font-normal">(opcional)</span>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="label" for="ruc">RUC / Cédula</label>
                <input id="ruc" type="text" formControlName="rucCliente" class="input font-mono"
                       inputmode="numeric" maxlength="13"
                       placeholder="Si se omite, se usa la del usuario" />
              </div>
              <div>
                <label class="label" for="razon">Razón social</label>
                <input id="razon" type="text" formControlName="razonSocial" class="input"
                       maxlength="200"
                       placeholder="Si se omite, se usa el nombre del usuario" />
              </div>
            </div>
          </div>

          <!-- Error global -->
          @if (errorMsg()) {
            <div class="rounded-xl border border-red-200 bg-red-50 text-danger
                        px-3 py-2 text-sm flex items-start gap-2">
              <lucide-icon name="alert-circle" class="w-4 h-4 mt-0.5"></lucide-icon>
              <span>{{ errorMsg() }}</span>
            </div>
          }

          <!-- Procesando -->
          @if (submitting()) {
            <div class="rounded-xl border border-primary-200 bg-primary-50 text-primary-800
                        px-4 py-3 text-sm flex items-center gap-3">
              <lucide-icon name="loader-2" class="w-5 h-5 animate-spin shrink-0"></lucide-icon>
              <div>
                <p class="font-semibold">Procesando pago…</p>
                <p class="text-xs text-primary-700 mt-0.5">
                  Por favor espera, no cierres ni recargues la página.
                </p>
              </div>
            </div>
          }

          <button type="submit" class="btn-primary w-full" [disabled]="submitting() || expirado()">
            @if (submitting()) {
              <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
              Procesando pago…
            } @else {
              <lucide-icon name="lock" class="w-4 h-4"></lucide-icon>
              Pagar {{ formatUsd(totalConIva()) }}
            }
          </button>
        </form>

        <!-- COLUMNA RESUMEN -->
        <aside class="lg:sticky lg:top-20 h-fit" [@fadeUp]>
          <div class="card-pad space-y-3">
            <h3 class="font-semibold flex items-center gap-2">
              <lucide-icon name="file-text" class="w-4 h-4 text-primary-700"></lucide-icon>
              Resumen de la reserva
            </h3>

            <div class="text-sm">
              <p class="font-medium">
                {{ r.vehiculo?.modelo?.marca?.nombre }} {{ r.vehiculo?.modelo?.nombre }}
              </p>
              <p class="text-xs text-ink-muted">
                {{ r.vehiculo?.placa }} · {{ r.dias }} día{{ r.dias !== 1 ? 's' : '' }}
              </p>
            </div>

            <dl class="text-sm divide-y divide-surface-border">
              <div class="py-2 flex justify-between">
                <dt class="text-ink-muted">Vehículo</dt>
                <dd class="font-medium">{{ formatUsd(r.subtotalDias) }}</dd>
              </div>
              <div class="py-2 flex justify-between">
                <dt class="text-ink-muted">Extras</dt>
                <dd class="font-medium">{{ formatUsd(r.subtotalExtras) }}</dd>
              </div>
              <div class="py-2 flex justify-between">
                <dt class="text-ink-muted">Seguro</dt>
                <dd class="font-medium">{{ formatUsd(r.subtotalSeguro) }}</dd>
              </div>
              <div class="py-2 flex justify-between">
                <dt class="text-ink-muted">IVA (15%)</dt>
                <dd class="font-medium">{{ formatUsd(ivaEstimado()) }}</dd>
              </div>
              <div class="py-3 flex justify-between items-end">
                <dt class="font-semibold">Total a pagar</dt>
                <dd class="text-xl font-bold text-primary-700">
                  {{ formatUsd(totalConIva()) }}
                </dd>
              </div>
            </dl>

            <p class="text-[11px] text-ink-soft">
              El cargo final lo determina el backend al procesar la transacción.
            </p>
          </div>
        </aside>
      </div>
      }
    </section>
  `,
})
export class PagoComponent implements OnInit {
  /** Inyectado vía `withComponentInputBinding()` desde la ruta. */
  @Input() reservaId?: string;

  // Servicios
  private readonly fb         = inject(FormBuilder);
  private readonly reservas$  = inject(ReservasService);
  private readonly pagos$     = inject(PagosService);
  private readonly toast      = inject(ToastService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // Helpers
  protected readonly formatUsd = formatUsd;

  // Estado del componente
  protected readonly loading      = signal(true);
  protected readonly submitting   = signal(false);
  protected readonly errorCarga   = signal<string | null>(null);
  protected readonly errorMsg     = signal<string | null>(null);
  protected readonly reserva      = signal<Reserva | null>(null);
  protected readonly pagoExitoso    = signal(false);
  protected readonly mensajeExito   = signal('Pago realizado con éxito');

  // Cuenta regresiva de 15 minutos
  protected readonly tiempoRestante  = signal(0);
  protected readonly expirado        = computed(() => {
    const r = this.reserva();
    return !!r?.expiresAt && this.tiempoRestante() <= 0;
  });
  protected readonly tiempoFormateado = computed(() => {
    const s = this.tiempoRestante();
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  });
  private countdownHandle: ReturnType<typeof setInterval> | null = null;

  // Catálogo de métodos disponibles
  protected readonly metodosPago: ReadonlyArray<{ value: MetodoPago; label: string; icon: string }> = [
    { value: 'TARJETA_CREDITO', label: 'Tarjeta de crédito', icon: 'credit-card' },
    { value: 'TARJETA_DEBITO',  label: 'Tarjeta de débito',  icon: 'credit-card' },
    { value: 'TRANSFERENCIA',   label: 'Transferencia',      icon: 'wallet' },
    { value: 'PAYPAL',          label: 'PayPal',             icon: 'wallet' },
    { value: 'EFECTIVO',        label: 'Efectivo',           icon: 'wallet' },
  ];

  // Form reactivo principal — la sub-tarjeta sólo es validable cuando aplica.
  protected readonly form = this.fb.nonNullable.group({
    metodoPago:  this.fb.nonNullable.control<MetodoPago>('TARJETA_CREDITO'),
    rucCliente:  this.fb.nonNullable.control(''),
    razonSocial: this.fb.nonNullable.control(''),
    tarjeta: this.fb.nonNullable.group({
      numero:  ['', [Validators.required, tarjetaValidator]],
      titular: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
      expira:  ['', [Validators.required, expiracionValidator]],
      cvv:     ['', [Validators.required, cvvValidator]],
    }),
  });

  /** Signal que refleja, en vivo, si el método actual requiere tarjeta. */
  protected readonly esTarjeta = signal(true);

  // ── Cálculos derivados ────────────────────────────────────
  /** Subtotal sin IVA = vehículo + extras + seguro. */
  protected readonly subtotal = computed(() => {
    const r = this.reserva();
    if (!r) return 0;
    return Math.round((
      Number(r.subtotalDias ?? 0) +
      Number(r.subtotalExtras ?? 0) +
      Number(r.subtotalSeguro ?? 0)
    ) * 100) / 100;
  });

  /** IVA (15 %) sobre el subtotal. */
  protected readonly ivaEstimado = computed(
    () => Math.round(this.subtotal() * 0.15 * 100) / 100,
  );

  /** Total = subtotal + IVA. */
  protected readonly totalConIva = computed(
    () => Math.round((this.subtotal() + this.ivaEstimado()) * 100) / 100,
  );

  // ── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    this.toggleTarjetaValidators();
    this.form.controls.metodoPago.valueChanges.subscribe(() => this.toggleTarjetaValidators());
    this.cargarReserva();
  }

  // ── Navegación / acciones ─────────────────────────────────
  protected setMetodo(m: MetodoPago): void {
    this.form.controls.metodoPago.setValue(m);
  }

  protected metodoOptionClass(active: boolean): string {
    return active
      ? 'border-primary bg-primary-50 ring-2 ring-primary/30'
      : 'border-surface-border hover:border-primary/60 bg-white';
  }

  protected onCardNumberInput(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const formatted = formatCardNumber(input.value);
    if (formatted !== input.value) {
      input.value = formatted;
      this.form.controls.tarjeta.controls.numero.setValue(formatted, { emitEvent: false });
      this.form.controls.tarjeta.controls.numero.updateValueAndValidity();
    }
  }
  protected onExpiryInput(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const formatted = formatExpiry(input.value);
    if (formatted !== input.value) {
      input.value = formatted;
      this.form.controls.tarjeta.controls.expira.setValue(formatted, { emitEvent: false });
      this.form.controls.tarjeta.controls.expira.updateValueAndValidity();
    }
  }

  // ── Visualización de errores ──────────────────────────────
  protected showError(path: string): boolean {
    const c = this.form.get(path);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  protected errorTarjetaNumero(): string {
    const c = this.form.get('tarjeta.numero');
    if (!c) return '';
    if (c.hasError('required'))         return 'El número de tarjeta es obligatorio.';
    if (c.hasError('tarjetaLongitud'))  return 'Debe contener exactamente 16 dígitos.';
    if (c.hasError('tarjetaLuhn'))      return 'Número de tarjeta inválido (algoritmo de Luhn).';
    return '';
  }

  protected errorTarjetaExpira(): string {
    const c = this.form.get('tarjeta.expira');
    if (!c) return '';
    if (c.hasError('required'))       return 'La fecha de expiración es obligatoria.';
    if (c.hasError('expiraFormato'))  return 'Formato inválido. Usa MM/YY (mes 01-12).';
    if (c.hasError('expiraExpirada')) return 'La tarjeta está expirada.';
    return '';
  }

  // ── Cuenta regresiva ──────────────────────────────────────
  protected countdownBannerClass(): string {
    const t = this.tiempoRestante();
    if (t <= 0)   return 'border-red-300 bg-red-50 text-red-800';
    if (t <= 60)  return 'border-red-200 bg-red-50/60 text-red-700';
    if (t <= 180) return 'border-amber-200 bg-amber-50 text-amber-800';
    return 'border-primary-200 bg-primary-50 text-primary-800';
  }

  private iniciarCountdown(expiresAt: string): void {
    const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    this.tiempoRestante.set(remaining);
    if (remaining <= 0) return;

    this.countdownHandle = setInterval(() => {
      this.tiempoRestante.update((t) => Math.max(0, t - 1));
    }, 1000);

    this.destroyRef.onDestroy(() => {
      if (this.countdownHandle !== null) {
        clearInterval(this.countdownHandle);
        this.countdownHandle = null;
      }
    });
  }

  // ── Submit ────────────────────────────────────────────────
  protected submit(): void {
    this.errorMsg.set(null);
    if (this.expirado()) {
      this.errorMsg.set('La reserva ha expirado. Por favor haz una nueva reserva.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const r = this.reserva();
    if (!r) return;

    const v = this.form.getRawValue();
    const payload: CreatePagoRequest = {
      reservaId:   r.id,
      monto:       this.totalConIva(),
      metodoPago:  v.metodoPago,
      rucCliente:  v.rucCliente  || undefined,
      razonSocial: v.razonSocial || undefined,
    };

    if (this.esTarjetaSync(v.metodoPago)) {
      payload.tarjeta = {
        numero:  v.tarjeta.numero.replace(/\s/g, ''),
        expira:  v.tarjeta.expira,
        cvv:     v.tarjeta.cvv,
        titular: v.tarjeta.titular,
      };
    }

    this.submitting.set(true);
    this.pagos$.create(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.mensajeExito.set(res.message ?? 'Pago realizado con éxito. Tu factura ha sido generada.');
        this.pagoExitoso.set(true);
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.submitting.set(false);
        const msg = err?.error?.error?.message
                ?? 'No se pudo procesar el pago. Verifica los datos e inténtalo de nuevo.';
        this.errorMsg.set(msg);
        this.toast.error('Pago rechazado', msg);
      },
    });
  }

  // ── Carga inicial ─────────────────────────────────────────
  private cargarReserva(): void {
    if (!this.reservaId) {
      this.errorCarga.set('No se proporcionó el ID de la reserva.');
      this.loading.set(false);
      return;
    }

    this.reservas$.getById(this.reservaId).subscribe({
      next: (r) => {
        if (r.status !== 'PENDIENTE') {
          if (['CANCELADA', 'COMPLETADA'].includes(r.status)) {
            this.errorCarga.set(`La reserva está en estado ${r.status} y no admite pagos.`);
          } else {
            this.errorCarga.set(
              `Esta reserva ya no admite pago en línea (estado: ${r.status}).`,
            );
          }
        } else if (r.expiresAt && new Date(r.expiresAt) < new Date()) {
          this.errorCarga.set('Tu reserva ha expirado (15 min). Por favor haz una nueva reserva.');
        } else {
          this.reserva.set(r);
          if (r.expiresAt) this.iniciarCountdown(r.expiresAt);
        }
        this.loading.set(false);
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        const msg = err?.error?.error?.message
                ?? 'No se pudo cargar la reserva. Verifica que exista y te pertenezca.';
        this.errorCarga.set(msg);
        this.loading.set(false);
      },
    });
  }

  // ── Validadores condicionales ─────────────────────────────
  /**
   * Activa o desactiva los validadores del subgrupo `tarjeta` según el método
   * de pago.  Esto evita que el form quede `INVALID` por la tarjeta cuando el
   * usuario eligió EFECTIVO o TRANSFERENCIA.
   */
  private toggleTarjetaValidators(): void {
    const metodo = this.form.controls.metodoPago.value;
    const grupo  = this.form.controls.tarjeta;
    const requiere = this.esTarjetaSync(metodo);

    const numero  = grupo.controls.numero;
    const titular = grupo.controls.titular;
    const expira  = grupo.controls.expira;
    const cvv     = grupo.controls.cvv;

    if (requiere) {
      numero.setValidators([Validators.required, tarjetaValidator]);
      titular.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(80)]);
      expira.setValidators([Validators.required, expiracionValidator]);
      cvv.setValidators([Validators.required, cvvValidator]);
      grupo.enable({ emitEvent: false });
    } else {
      numero.clearValidators();
      titular.clearValidators();
      expira.clearValidators();
      cvv.clearValidators();
      grupo.disable({ emitEvent: false });
    }
    [numero, titular, expira, cvv].forEach((c) => c.updateValueAndValidity({ emitEvent: false }));

    this.esTarjeta.set(requiere);
  }

  /** Versión sincrónica para usar dentro de `submit()`. */
  private esTarjetaSync(m: MetodoPago): boolean {
    return m === 'TARJETA_CREDITO' || m === 'TARJETA_DEBITO';
  }
}
