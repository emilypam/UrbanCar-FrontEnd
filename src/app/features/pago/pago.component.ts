import {
  ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Input, OnInit, signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService }    from '@core/services/auth.service';
import { ReservasService } from '@core/services/reservas.service';
import { PagosService }   from '@core/services/pagos.service';
import { ToastService }   from '@core/services/toast.service';
import {
  cvvValidator, expiracionValidator, formatCardNumber, formatExpiry, tarjetaValidator,
} from '@core/validators/card.validator';
import type { CreatePagoRequest, MetodoPago, Reserva } from '@core/models/api.models';
import { formatUsd } from '@core/utils/date.utils';
import { fadeIn, fadeUp, slideStep } from '@core/animations/motion';

@Component({
  selector: 'app-pago',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, ReactiveFormsModule, RouterLink, LucideAngularModule],
  animations: [fadeIn, fadeUp, slideStep],
  template: `
    <section class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <!-- Cabecera -->
      <header class="mb-8" [@fadeUp]>
        <a routerLink="/cliente" class="btn-ghost -ml-2 mb-2 inline-flex">
          <lucide-icon name="arrow-left" class="w-4 h-4"></lucide-icon>
          Volver a mis reservas
        </a>
        <h1 class="text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <lucide-icon name="lock" class="w-6 h-6 text-primary-700"></lucide-icon>
          Pago seguro
        </h1>
        <p class="text-sm text-ink-muted mt-1">
          Completa el pago para confirmar tu reserva. Conexión cifrada (HTTPS).
        </p>
      </header>

      <!-- Loading -->
      @if (loading()) {
        <div class="card-pad flex items-center gap-2 text-ink-muted" [@fadeIn]>
          <lucide-icon name="loader-2" class="w-4 h-4 animate-spin text-primary-700"></lucide-icon>
          Cargando reserva…
        </div>
      }

      <!-- Error de carga -->
      @if (!loading() && errorCarga()) {
        <div class="card-pad text-danger flex items-start gap-3" [@fadeIn]>
          <lucide-icon name="alert-circle" class="w-5 h-5 mt-0.5 shrink-0"></lucide-icon>
          <div>
            <p class="font-medium">No pudimos cargar la reserva.</p>
            <p class="text-sm mt-1 text-ink-muted">{{ errorCarga() }}</p>
            <a routerLink="/cliente" class="btn-outline mt-3 inline-flex">Volver a mis reservas</a>
          </div>
        </div>
      }

      <!-- Confirmación de pago exitoso -->
      @if (pagoExitoso()) {
        <article class="card-pad text-center py-14 space-y-6 max-w-md mx-auto" [@slideStep]>
          <span class="inline-grid place-items-center w-20 h-20 rounded-full
                       bg-emerald-600 text-white shadow-soft mx-auto">
            <lucide-icon name="check-circle-2" class="w-11 h-11"></lucide-icon>
          </span>
          <div>
            <h2 class="text-xl font-semibold">¡Pago completado!</h2>
            <p class="text-ink-muted mt-2 leading-relaxed">{{ mensajeExito() }}</p>
          </div>
          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <a routerLink="/cliente" class="btn-outline inline-flex items-center justify-center gap-2">
              <lucide-icon name="list-checks" class="w-4 h-4"></lucide-icon>
              Ver mis reservas
            </a>
            <a routerLink="/" class="btn-primary inline-flex items-center justify-center gap-2">
              <lucide-icon name="arrow-left" class="w-4 h-4"></lucide-icon>
              Ir al inicio
            </a>
          </div>
        </article>
      }

      <!-- Formulario principal -->
      @if (!loading() && !errorCarga() && !pagoExitoso() && reserva(); as r) {
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">

          <!-- ══ COLUMNA IZQUIERDA: FORMULARIO ══ -->
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-6" [@slideStep]>

            <!-- Sección: Datos de pago -->
            <div class="card-pad space-y-5">
              <div class="pb-3 border-b border-surface-border">
                <h2 class="font-semibold flex items-center gap-2 text-lg">
                  <lucide-icon name="credit-card" class="w-5 h-5 text-primary-700"></lucide-icon>
                  Datos de pago
                </h2>
                <p class="text-sm text-ink-muted mt-0.5">
                  Reserva
                  <span class="font-mono font-semibold text-ink">
                    #{{ r.id.slice(0,8).toUpperCase() }}
                  </span>
                  · Total
                  <strong class="text-primary-700">{{ formatUsd(totalConIva()) }}</strong>
                </p>
              </div>

              <!-- Cuenta regresiva -->
              @if (r.expiresAt) {
                <div class="rounded-xl border px-4 py-3 text-sm flex items-center gap-3"
                     [ngClass]="countdownBannerClass()">
                  <lucide-icon name="clock" class="w-4 h-4 shrink-0"></lucide-icon>
                  @if (expirado()) {
                    <span>
                      <strong>Tiempo agotado.</strong>
                      La reserva expiró. Por favor realiza una nueva reserva.
                    </span>
                  } @else {
                    <span>
                      Tienes
                      <strong class="font-mono text-base tabular-nums">
                        {{ tiempoFormateado() }}
                      </strong>
                      para completar el pago o el vehículo quedará disponible.
                    </span>
                  }
                </div>
              }

              <!-- Método de pago -->
              <div>
                <label class="label mb-2">Selecciona el método de pago</label>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  @for (m of metodosPago; track m.value) {
                    <button type="button"
                            (click)="setMetodo(m.value)"
                            [ngClass]="metodoOptionClass(form.controls.metodoPago.value === m.value)"
                            class="text-left p-3 rounded-xl border transition-all flex items-center gap-2.5 group">
                      <span class="grid place-items-center w-8 h-8 rounded-lg shrink-0 transition-colors"
                            [ngClass]="form.controls.metodoPago.value === m.value
                              ? 'bg-primary-700 text-white'
                              : 'bg-surface-muted text-ink-muted group-hover:bg-primary-50 group-hover:text-primary-700'">
                        <lucide-icon [name]="m.icon" class="w-4 h-4"></lucide-icon>
                      </span>
                      <span class="text-sm font-medium leading-tight">{{ m.label }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Info de transferencia -->
              @if (form.controls.metodoPago.value === 'TRANSFERENCIA') {
                <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3
                            text-sm text-amber-800 flex items-start gap-2.5">
                  <lucide-icon name="info" class="w-4 h-4 mt-0.5 shrink-0"></lucide-icon>
                  <div>
                    <p class="font-semibold">Instrucciones de transferencia</p>
                    <p class="mt-0.5 text-amber-700">
                      Banco: UrbanCar EC · Cta. corriente: 2200-1234-56 ·
                      Referencia: <span class="font-mono">{{ r.id.slice(0,8).toUpperCase() }}</span>
                    </p>
                  </div>
                </div>
              }

              <!-- Info de efectivo -->
              @if (form.controls.metodoPago.value === 'EFECTIVO') {
                <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3
                            text-sm text-amber-800 flex items-start gap-2.5">
                  <lucide-icon name="info" class="w-4 h-4 mt-0.5 shrink-0"></lucide-icon>
                  <p>Deberás presentarte con el efectivo exacto al retirar el vehículo en la agencia.</p>
                </div>
              }

              <!-- Datos de tarjeta -->
              @if (esTarjeta()) {
                <fieldset formGroupName="tarjeta"
                          class="space-y-4 rounded-xl border border-primary-200
                                 bg-primary-50/20 p-5">
                  <legend class="text-sm font-semibold text-primary-800 px-1 flex items-center gap-1.5">
                    <lucide-icon name="credit-card" class="w-3.5 h-3.5"></lucide-icon>
                    Información de la tarjeta
                  </legend>

                  <!-- Número -->
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

                  <!-- Titular -->
                  <div>
                    <label class="label" for="cardTitular">Nombre del titular</label>
                    <input id="cardTitular" type="text" formControlName="titular"
                           class="input uppercase" autocomplete="cc-name"
                           placeholder="Como aparece en la tarjeta" maxlength="80" />
                    @if (showError('tarjeta.titular')) {
                      <p class="error">El titular debe tener al menos 3 caracteres.</p>
                    }
                  </div>

                  <!-- Expira + CVV -->
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="label" for="cardExpira">Fecha de expiración</label>
                      <input id="cardExpira" type="text" formControlName="expira"
                             (input)="onExpiryInput($event)"
                             class="input font-mono" autocomplete="cc-exp"
                             inputmode="numeric" placeholder="MM/YY" maxlength="5" />
                      @if (showError('tarjeta.expira')) {
                        <p class="error">{{ errorTarjetaExpira() }}</p>
                      }
                    </div>
                    <div>
                      <label class="label" for="cardCvv">
                        CVV
                        <span class="text-ink-muted font-normal text-xs ml-1">(respaldo)</span>
                      </label>
                      <input id="cardCvv" type="password" formControlName="cvv"
                             class="input font-mono tracking-widest"
                             autocomplete="cc-csc" inputmode="numeric"
                             placeholder="•••" maxlength="4" />
                      @if (showError('tarjeta.cvv')) {
                        <p class="error">CVV debe tener 3 o 4 dígitos.</p>
                      }
                    </div>
                  </div>

                  <!-- Seguridad -->
                  <div class="flex items-center gap-2 rounded-lg bg-surface px-3 py-2
                              border border-surface-border">
                    <lucide-icon name="shield" class="w-4 h-4 text-primary-600 shrink-0"></lucide-icon>
                    <p class="text-[11px] text-ink-muted leading-relaxed">
                      Tus datos viajan cifrados por HTTPS (TLS 1.3).
                      Nunca almacenamos el número completo ni el CVV.
                    </p>
                  </div>
                </fieldset>
              }
            </div>

            <!-- ── Sección: Datos de facturación ───────────────── -->
            <div class="card-pad space-y-4">
              <div class="flex items-center justify-between gap-3 pb-3 border-b border-surface-border">
                <h3 class="font-semibold flex items-center gap-2">
                  <lucide-icon name="file-text" class="w-4 h-4 text-primary-700"></lucide-icon>
                  Datos de facturación
                </h3>
                @if (!usarDatosPersonalizados()) {
                  <button type="button"
                          class="text-xs font-medium text-primary-600 hover:text-primary-700
                                 flex items-center gap-1 transition-colors"
                          (click)="toggleFacturacion()">
                    <lucide-icon name="pencil" class="w-3.5 h-3.5"></lucide-icon>
                    Cambiar datos
                  </button>
                } @else {
                  <button type="button"
                          class="text-xs font-medium text-ink-muted hover:text-ink
                                 flex items-center gap-1 transition-colors"
                          (click)="toggleFacturacion()">
                    <lucide-icon name="x" class="w-3.5 h-3.5"></lucide-icon>
                    Usar datos de perfil
                  </button>
                }
              </div>

              <!-- Vista: datos del perfil (por defecto) -->
              @if (!usarDatosPersonalizados()) {
                <div class="rounded-xl border border-surface-border bg-surface-muted p-4
                            flex items-start gap-3">
                  <span class="grid place-items-center w-8 h-8 rounded-lg bg-primary-50
                               text-primary-700 shrink-0 mt-0.5">
                    <lucide-icon name="user-round" class="w-4 h-4"></lucide-icon>
                  </span>
                  <div class="min-w-0 space-y-0.5">
                    @if (auth.displayName()) {
                      <p class="font-semibold text-ink truncate">{{ auth.displayName() }}</p>
                    }
                    <p class="text-xs text-ink-muted truncate">{{ auth.currentUser()?.email }}</p>
                    @if (auth.currentUser()?.cedula) {
                      <p class="text-xs text-ink-muted font-mono">
                        CI: {{ auth.currentUser()?.cedula }}
                      </p>
                    } @else {
                      <p class="text-xs text-amber-600 flex items-center gap-1 pt-0.5">
                        <lucide-icon name="alert-circle" class="w-3 h-3 shrink-0"></lucide-icon>
                        Sin cédula registrada — se recomienda agregarla en tu perfil.
                      </p>
                    }
                    <p class="text-[11px] text-ink-soft pt-1">
                      La factura electrónica se emitirá con estos datos.
                    </p>
                  </div>
                </div>
              }

              <!-- Vista: formulario personalizado -->
              @if (usarDatosPersonalizados()) {
                <div class="space-y-4">
                  <!-- Nota informativa -->
                  <div class="rounded-lg bg-primary-50 border border-primary-100 px-3 py-2.5
                              flex items-start gap-2">
                    <lucide-icon name="info" class="w-3.5 h-3.5 text-primary-600 mt-0.5 shrink-0"></lucide-icon>
                    <p class="text-xs text-primary-700">
                      Completa los datos que aparecerán en tu factura electrónica.
                      Los campos marcados con <strong>*</strong> son obligatorios.
                    </p>
                  </div>

                  <!-- RUC / Cédula -->
                  <div>
                    <label class="label" for="ruc">
                      RUC / Cédula *
                      <span class="text-ink-muted font-normal text-xs ml-1">
                        (10 dígitos cédula · 13 dígitos RUC)
                      </span>
                    </label>
                    <div class="relative">
                      <lucide-icon name="credit-card"
                        class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"></lucide-icon>
                      <input id="ruc" type="text" formControlName="rucCliente"
                             class="input pl-9 font-mono"
                             [class.border-danger]="showError('rucCliente')"
                             inputmode="numeric" maxlength="13"
                             placeholder="Ej. 1712345678 o 1712345678001" />
                    </div>
                    @if (showError('rucCliente')) {
                      <p class="error">
                        Ingresa tu cédula (10 dígitos) o RUC (13 dígitos).
                      </p>
                    }
                  </div>

                  <!-- Razón social -->
                  <div>
                    <label class="label" for="razon">Razón social / Nombre completo *</label>
                    <input id="razon" type="text" formControlName="razonSocial"
                           class="input" [class.border-danger]="showError('razonSocial')"
                           placeholder="Como debe aparecer en la factura" maxlength="200" />
                    @if (showError('razonSocial')) {
                      <p class="error">La razón social es obligatoria (mínimo 3 caracteres).</p>
                    }
                  </div>

                  <!-- Dirección + Teléfono -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="label" for="direccionFact">Dirección</label>
                      <div class="relative">
                        <lucide-icon name="map-pin"
                          class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"></lucide-icon>
                        <input id="direccionFact" type="text" formControlName="direccionFact"
                               class="input pl-9"
                               placeholder="Av. Ejemplo y Calle 1" maxlength="200" />
                      </div>
                    </div>
                    <div>
                      <label class="label" for="telefonoFact">Teléfono</label>
                      <div class="relative">
                        <lucide-icon name="phone"
                          class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"></lucide-icon>
                        <input id="telefonoFact" type="tel" formControlName="telefonoFact"
                               class="input pl-9"
                               placeholder="0999 999 999" maxlength="15" />
                      </div>
                    </div>
                  </div>

                  <!-- Email factura -->
                  <div>
                    <label class="label" for="emailFact">
                      Email para recibir la factura
                    </label>
                    <div class="relative">
                      <lucide-icon name="mail"
                        class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"></lucide-icon>
                      <input id="emailFact" type="email" formControlName="emailFact"
                             class="input pl-9" [class.border-danger]="showError('emailFact')"
                             placeholder="facturacion@empresa.com" />
                    </div>
                    @if (showError('emailFact')) {
                      <p class="error">Ingresa un email válido.</p>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Error global -->
            @if (errorMsg()) {
              <div class="rounded-xl border border-red-200 bg-red-50 text-danger
                          px-4 py-3 text-sm flex items-start gap-2">
                <lucide-icon name="alert-circle" class="w-4 h-4 mt-0.5 shrink-0"></lucide-icon>
                <span>{{ errorMsg() }}</span>
              </div>
            }

            <!-- Banner procesando -->
            @if (submitting()) {
              <div class="rounded-xl border border-primary-200 bg-primary-50 text-primary-800
                          px-4 py-3 text-sm flex items-center gap-3">
                <lucide-icon name="loader-2" class="w-5 h-5 animate-spin shrink-0"></lucide-icon>
                <div>
                  <p class="font-semibold">Procesando tu pago…</p>
                  <p class="text-xs text-primary-700 mt-0.5">
                    Por favor espera. No cierres ni recargues esta página.
                  </p>
                </div>
              </div>
            }

            <!-- Botón pagar -->
            <button type="submit" class="btn-primary w-full py-3.5 text-base font-semibold"
                    [disabled]="submitting() || expirado()">
              @if (submitting()) {
                <lucide-icon name="loader-2" class="w-5 h-5 animate-spin"></lucide-icon>
                Procesando pago…
              } @else {
                <lucide-icon name="lock" class="w-5 h-5"></lucide-icon>
                Pagar {{ formatUsd(totalConIva()) }}
              }
            </button>

            <p class="text-center text-xs text-ink-soft flex items-center justify-center gap-1.5">
              <lucide-icon name="shield" class="w-3.5 h-3.5"></lucide-icon>
              Pago cifrado y seguro. No almacenamos tu información de tarjeta.
            </p>
          </form>

          <!-- ══ COLUMNA DERECHA: RESUMEN ══ -->
          <aside class="lg:sticky lg:top-20 h-fit space-y-4" [@fadeUp]>

            <!-- Resumen reserva -->
            <div class="card-pad space-y-4">
              <h3 class="font-semibold flex items-center gap-2 pb-3 border-b border-surface-border">
                <lucide-icon name="file-text" class="w-4 h-4 text-primary-700"></lucide-icon>
                Resumen de la reserva
              </h3>

              <!-- Vehículo -->
              <div class="flex items-start gap-3">
                <span class="grid place-items-center w-10 h-10 rounded-xl bg-primary-50
                             text-primary-700 shrink-0">
                  <lucide-icon name="car" class="w-5 h-5"></lucide-icon>
                </span>
                <div class="min-w-0">
                  <p class="font-semibold text-ink leading-tight truncate">
                    {{ r.vehiculo?.modelo?.marca?.nombre }}
                    {{ r.vehiculo?.modelo?.nombre }}
                  </p>
                  <p class="text-xs text-ink-muted">
                    {{ r.vehiculo?.placa }}
                    · {{ r.dias }} día{{ r.dias !== 1 ? 's' : '' }}
                  </p>
                </div>
              </div>

              <!-- Desglose -->
              <dl class="text-sm divide-y divide-surface-border">
                <div class="py-2 flex justify-between">
                  <dt class="text-ink-muted">Vehículo ({{ r.dias }} día{{ r.dias !== 1 ? 's' : '' }})</dt>
                  <dd class="font-medium">{{ formatUsd(r.subtotalDias) }}</dd>
                </div>
                @if (r.subtotalExtras > 0) {
                  <div class="py-2 flex justify-between">
                    <dt class="text-ink-muted">Extras</dt>
                    <dd class="font-medium">{{ formatUsd(r.subtotalExtras) }}</dd>
                  </div>
                }
                @if (r.subtotalSeguro > 0) {
                  <div class="py-2 flex justify-between">
                    <dt class="text-ink-muted">Seguro</dt>
                    <dd class="font-medium">{{ formatUsd(r.subtotalSeguro) }}</dd>
                  </div>
                }
                <div class="py-2 flex justify-between">
                  <dt class="text-ink-muted">Subtotal</dt>
                  <dd class="font-medium">{{ formatUsd(subtotal()) }}</dd>
                </div>
                <div class="py-2 flex justify-between">
                  <dt class="text-ink-muted">IVA (15%)</dt>
                  <dd class="font-medium">{{ formatUsd(ivaEstimado()) }}</dd>
                </div>
                <div class="py-3 flex justify-between items-center">
                  <dt class="font-bold text-base">Total</dt>
                  <dd class="text-xl font-bold text-primary-700">
                    {{ formatUsd(totalConIva()) }}
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Método seleccionado -->
            <div class="card-pad flex items-center gap-3">
              <span class="grid place-items-center w-9 h-9 rounded-xl bg-primary-50 text-primary-700 shrink-0">
                <lucide-icon [name]="metodoActualIcon()" class="w-4 h-4"></lucide-icon>
              </span>
              <div>
                <p class="text-xs text-ink-muted">Método de pago</p>
                <p class="font-medium text-sm">{{ metodoActualLabel() }}</p>
              </div>
            </div>

            <!-- Garantías -->
            <div class="card-pad space-y-2.5 text-xs text-ink-muted">
              <div class="flex items-center gap-2">
                <lucide-icon name="shield-check" class="w-3.5 h-3.5 text-primary-600 shrink-0"></lucide-icon>
                <span>Pago seguro cifrado con TLS</span>
              </div>
              <div class="flex items-center gap-2">
                <lucide-icon name="file-text" class="w-3.5 h-3.5 text-primary-600 shrink-0"></lucide-icon>
                <span>Factura electrónica SRI incluida</span>
              </div>
              <div class="flex items-center gap-2">
                <lucide-icon name="check-circle-2" class="w-3.5 h-3.5 text-primary-600 shrink-0"></lucide-icon>
                <span>Confirmación inmediata por email</span>
              </div>
            </div>
          </aside>
        </div>
      }
    </section>
  `,
})
export class PagoComponent implements OnInit {
  @Input() reservaId?: string;

  protected readonly auth        = inject(AuthService);
  private readonly fb            = inject(FormBuilder);
  private readonly reservas$     = inject(ReservasService);
  private readonly pagos$        = inject(PagosService);
  private readonly toast         = inject(ToastService);
  private readonly router        = inject(Router);
  private readonly destroyRef    = inject(DestroyRef);

  protected readonly formatUsd = formatUsd;

  protected readonly loading       = signal(true);
  protected readonly submitting    = signal(false);
  protected readonly errorCarga    = signal<string | null>(null);
  protected readonly errorMsg      = signal<string | null>(null);
  protected readonly reserva       = signal<Reserva | null>(null);
  protected readonly pagoExitoso   = signal(false);
  protected readonly mensajeExito  = signal('Pago realizado con éxito');

  protected readonly usarDatosPersonalizados = signal(false);

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

  protected readonly metodosPago: ReadonlyArray<{ value: MetodoPago; label: string; icon: string }> = [
    { value: 'TARJETA_CREDITO', label: 'Tarjeta de crédito', icon: 'credit-card' },
    { value: 'TARJETA_DEBITO',  label: 'Tarjeta de débito',  icon: 'credit-card' },
    { value: 'TRANSFERENCIA',   label: 'Transferencia',      icon: 'building-2'  },
    { value: 'PAYPAL',          label: 'PayPal',             icon: 'globe'        },
    { value: 'EFECTIVO',        label: 'Efectivo',           icon: 'wallet'       },
  ];

  protected readonly form = this.fb.nonNullable.group({
    metodoPago:    this.fb.nonNullable.control<MetodoPago>('TARJETA_CREDITO'),
    rucCliente:    this.fb.nonNullable.control(''),
    razonSocial:   this.fb.nonNullable.control(''),
    direccionFact: this.fb.nonNullable.control(''),
    telefonoFact:  this.fb.nonNullable.control(''),
    emailFact:     this.fb.nonNullable.control('', Validators.email),
    tarjeta: this.fb.nonNullable.group({
      numero:  ['', [Validators.required, tarjetaValidator]],
      titular: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
      expira:  ['', [Validators.required, expiracionValidator]],
      cvv:     ['', [Validators.required, cvvValidator]],
    }),
  });

  protected readonly esTarjeta = signal(true);

  protected readonly subtotal = computed(() => {
    const r = this.reserva();
    if (!r) return 0;
    return Math.round((
      Number(r.subtotalDias ?? 0) +
      Number(r.subtotalExtras ?? 0) +
      Number(r.subtotalSeguro ?? 0)
    ) * 100) / 100;
  });

  protected readonly ivaEstimado = computed(
    () => Math.round(this.subtotal() * 0.15 * 100) / 100,
  );

  protected readonly totalConIva = computed(
    () => Math.round((this.subtotal() + this.ivaEstimado()) * 100) / 100,
  );

  ngOnInit(): void {
    this.toggleTarjetaValidators();
    this.form.controls.metodoPago.valueChanges.subscribe(() => this.toggleTarjetaValidators());
    this.cargarReserva();
  }

  // ── Método de pago ────────────────────────────────────────
  protected setMetodo(m: MetodoPago): void {
    this.form.controls.metodoPago.setValue(m);
  }

  protected metodoOptionClass(active: boolean): string {
    return active
      ? 'border-primary bg-primary-50 ring-2 ring-primary/30'
      : 'border-surface-border hover:border-primary/60 bg-white';
  }

  protected metodoActualLabel(): string {
    return this.metodosPago.find((m) => m.value === this.form.controls.metodoPago.value)?.label ?? '';
  }

  protected metodoActualIcon(): string {
    return this.metodosPago.find((m) => m.value === this.form.controls.metodoPago.value)?.icon ?? 'credit-card';
  }

  // ── Facturación personalizada ─────────────────────────────
  protected toggleFacturacion(): void {
    const nuevo = !this.usarDatosPersonalizados();
    this.usarDatosPersonalizados.set(nuevo);
    const ruc   = this.form.controls.rucCliente;
    const razon = this.form.controls.razonSocial;
    if (nuevo) {
      ruc.setValidators([Validators.required, Validators.minLength(10)]);
      razon.setValidators([Validators.required, Validators.minLength(3)]);
    } else {
      ruc.clearValidators();
      razon.clearValidators();
      this.form.patchValue({
        rucCliente: '', razonSocial: '',
        direccionFact: '', telefonoFact: '', emailFact: '',
      });
    }
    ruc.updateValueAndValidity();
    razon.updateValueAndValidity();
  }

  // ── Inputs de tarjeta ─────────────────────────────────────
  protected onCardNumberInput(ev: Event): void {
    const input     = ev.target as HTMLInputElement;
    const formatted = formatCardNumber(input.value);
    if (formatted !== input.value) {
      input.value = formatted;
      this.form.controls.tarjeta.controls.numero.setValue(formatted, { emitEvent: false });
      this.form.controls.tarjeta.controls.numero.updateValueAndValidity();
    }
  }

  protected onExpiryInput(ev: Event): void {
    const input     = ev.target as HTMLInputElement;
    const formatted = formatExpiry(input.value);
    if (formatted !== input.value) {
      input.value = formatted;
      this.form.controls.tarjeta.controls.expira.setValue(formatted, { emitEvent: false });
      this.form.controls.tarjeta.controls.expira.updateValueAndValidity();
    }
  }

  // ── Errores de formulario ─────────────────────────────────
  protected showError(path: string): boolean {
    const c = this.form.get(path);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  protected errorTarjetaNumero(): string {
    const c = this.form.get('tarjeta.numero');
    if (!c) return '';
    if (c.hasError('required'))        return 'El número de tarjeta es obligatorio.';
    if (c.hasError('tarjetaLongitud')) return 'Debe contener exactamente 16 dígitos.';
    if (c.hasError('tarjetaLuhn'))     return 'Número de tarjeta inválido (Luhn).';
    return '';
  }

  protected errorTarjetaExpira(): string {
    const c = this.form.get('tarjeta.expira');
    if (!c) return '';
    if (c.hasError('required'))       return 'La fecha de expiración es obligatoria.';
    if (c.hasError('expiraFormato'))  return 'Formato inválido. Usa MM/YY (ej. 09/27).';
    if (c.hasError('expiraExpirada')) return 'La tarjeta ha expirado.';
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
      this.errorMsg.set('La reserva ha expirado. Por favor realiza una nueva reserva.');
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
      rucCliente:  this.usarDatosPersonalizados() && v.rucCliente  ? v.rucCliente  : undefined,
      razonSocial: this.usarDatosPersonalizados() && v.razonSocial ? v.razonSocial : undefined,
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
        this.mensajeExito.set(
          res.message ?? 'Pago realizado con éxito. Tu factura ha sido generada y enviada a tu correo.',
        );
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
          this.errorCarga.set(
            ['CANCELADA', 'COMPLETADA'].includes(r.status)
              ? `La reserva está en estado ${r.status} y no admite pagos.`
              : `Esta reserva ya no admite pago en línea (estado: ${r.status}).`,
          );
        } else if (r.expiresAt && new Date(r.expiresAt) < new Date()) {
          this.errorCarga.set('Tu reserva ha expirado (15 min). Por favor realiza una nueva reserva.');
        } else {
          this.reserva.set(r);
          if (r.expiresAt) this.iniciarCountdown(r.expiresAt);
        }
        this.loading.set(false);
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.errorCarga.set(
          err?.error?.error?.message
          ?? 'No se pudo cargar la reserva. Verifica que exista y te pertenezca.',
        );
        this.loading.set(false);
      },
    });
  }

  // ── Validadores condicionales ─────────────────────────────
  private toggleTarjetaValidators(): void {
    const metodo  = this.form.controls.metodoPago.value;
    const grupo   = this.form.controls.tarjeta;
    const requiere = this.esTarjetaSync(metodo);

    const { numero, titular, expira, cvv } = grupo.controls;
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

  private esTarjetaSync(m: MetodoPago): boolean {
    return m === 'TARJETA_CREDITO' || m === 'TARJETA_DEBITO';
  }
}
