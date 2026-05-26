import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService, type RegisterFormData } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { ADMIN_CODE, ROLES } from '@core/constants/app.constants';

/**
 * Componente de Registro.
 *
 * Regla de negocio crítica:
 *
 *   - El formulario incluye un campo opcional `adminCode` que SÓLO existe
 *     en el frontend (nunca se envía al backend).
 *   - Si `adminCode === 'PUCE2026'` se envía `role: 'ADMIN'` al backend.
 *   - En caso contrario se envía `role: 'CLIENTE'`.
 *
 * La derivación del rol se hace en `AuthService.register()` para mantener
 * la regla en una sola fuente de verdad.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule],
  template: `
    <section class="min-h-[calc(100vh-4rem)] grid place-items-center px-4 py-10
                    bg-gradient-to-b from-primary-50 via-surface-muted to-white">
      <div class="w-full max-w-2xl card-pad">
        <div class="flex items-center gap-3 mb-6">
          <span class="grid place-items-center w-11 h-11 rounded-2xl bg-primary-700 text-white shadow-soft">
            <lucide-icon name="user-plus" class="w-5 h-5"></lucide-icon>
          </span>
          <div>
            <h1 class="text-xl">Crear cuenta</h1>
            <p class="text-sm text-ink-muted">Únete a UrbanCar EC y reserva tu auto en minutos.</p>
          </div>
        </div>

        @if (errorMsg()) {
          <div class="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50
                      text-danger px-3 py-2 text-sm">
            <lucide-icon name="alert-circle" class="w-4 h-4 mt-0.5 shrink-0"></lucide-icon>
            <span>{{ errorMsg() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" class="grid grid-cols-1 sm:grid-cols-2 gap-4"
              novalidate>
          <div>
            <label class="label" for="nombres">Nombres</label>
            <input id="nombres" type="text" formControlName="nombres" class="input"
                   placeholder="Jorge Andrés" autocomplete="given-name" />
            @if (showError('nombres')) { <p class="error">Ingresa tus nombres.</p> }
          </div>

          <div>
            <label class="label" for="apellidos">Apellidos</label>
            <input id="apellidos" type="text" formControlName="apellidos" class="input"
                   placeholder="Pérez Mora" autocomplete="family-name" />
            @if (showError('apellidos')) { <p class="error">Ingresa tus apellidos.</p> }
          </div>

          <div class="sm:col-span-2">
            <label class="label" for="email">Correo electrónico</label>
            <div class="relative">
              <lucide-icon name="mail"
                class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"></lucide-icon>
              <input id="email" type="email" formControlName="email" autocomplete="email"
                     class="input pl-9" placeholder="tu@correo.com" />
            </div>
            @if (showError('email')) { <p class="error">Ingresa un correo válido.</p> }
          </div>

          <div>
            <label class="label" for="cedula">Cédula</label>
            <input id="cedula" type="text" formControlName="cedula" class="input"
                   inputmode="numeric" maxlength="13" placeholder="1716534228" />
            @if (showError('cedula')) { <p class="error">Ingresa tu número de cédula.</p> }
          </div>

          <div>
            <label class="label" for="telefono">Teléfono</label>
            <input id="telefono" type="tel" formControlName="telefono" class="input"
                   autocomplete="tel" placeholder="+593 99 999 9999" />
            @if (showError('telefono')) { <p class="error">Ingresa tu número de teléfono.</p> }
          </div>

          <div>
            <label class="label" for="password">Contraseña</label>
            <div class="relative">
              <lucide-icon name="lock"
                class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"></lucide-icon>
              <input id="password" [type]="showPwd() ? 'text' : 'password'"
                     formControlName="password" autocomplete="new-password"
                     class="input pl-9 pr-10" placeholder="Mínimo 6 caracteres" />
              <button type="button" (click)="togglePwd()"
                      class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg
                             text-ink-soft hover:text-primary-700"
                      [attr.aria-label]="showPwd() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                <lucide-icon [name]="showPwd() ? 'eye-off' : 'eye'" class="w-4 h-4"></lucide-icon>
              </button>
            </div>
            @if (showError('password')) {
              <p class="error">La contraseña debe tener al menos 6 caracteres.</p>
            }
          </div>

          <div>
            <label class="label" for="adminCode">
              Código de administrador <span class="text-ink-soft">(opcional)</span>
            </label>
            <div class="relative">
              <lucide-icon name="key-round"
                class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"></lucide-icon>
              <input id="adminCode" type="text" formControlName="adminCode"
                     class="input pl-9" placeholder="Sólo personal autorizado"
                     autocomplete="off" />
            </div>
            <p class="help">
              Si tu organización te entregó un código, ingrésalo para crear tu cuenta como
              <span class="font-medium text-primary-700">ADMIN</span>.
            </p>
          </div>

          <div class="sm:col-span-2">
            <div class="flex items-center justify-between rounded-xl border border-surface-border
                        bg-surface-muted px-4 py-3">
              <div class="flex items-center gap-2">
                <lucide-icon name="shield-check"
                             [class]="willBeAdmin()
                               ? 'w-5 h-5 text-primary-700'
                               : 'w-5 h-5 text-ink-soft'"></lucide-icon>
                <span class="text-sm">
                  Te registrarás como
                  <strong [class.text-primary-700]="willBeAdmin()">
                    {{ willBeAdmin() ? 'ADMIN' : 'CLIENTE' }}
                  </strong>
                </span>
              </div>
              <span [class]="willBeAdmin() ? 'badge-primary' : 'badge-info'">
                role = {{ willBeAdmin() ? 'ADMIN' : 'CLIENTE' }}
              </span>
            </div>
          </div>

          <button type="submit" class="btn-primary sm:col-span-2" [disabled]="loading()">
            @if (loading()) {
              <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
              Creando cuenta…
            } @else {
              <lucide-icon name="user-plus" class="w-4 h-4"></lucide-icon>
              Crear cuenta
            }
          </button>
        </form>

        <p class="mt-6 text-sm text-ink-muted text-center">
          ¿Ya tienes cuenta?
          <a routerLink="/auth/login" class="text-primary-700 font-semibold hover:underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </section>
  `,
})
export class RegisterComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly ROLES = ROLES;
  protected readonly loading  = signal(false);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly showPwd  = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombres:   ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    email:     ['', [Validators.required, Validators.email]],
    password:  ['', [Validators.required, Validators.minLength(6)]],
    cedula:    ['', [Validators.required]],
    telefono:  ['', [Validators.required]],
    adminCode: [''],
  });

  /** Reactive signal que refleja, en vivo, el `adminCode` ingresado. */
  private readonly adminCodeSignal = signal<string>('');

  /** Indica si el rol resultante para el backend será ADMIN. */
  protected readonly willBeAdmin = computed(
    () => this.adminCodeSignal().trim() === ADMIN_CODE,
  );

  constructor() {
    this.form.controls.adminCode.valueChanges.subscribe((value) => {
      this.adminCodeSignal.set(value ?? '');
    });
  }

  protected togglePwd(): void { this.showPwd.update((v) => !v); }

  protected showError(
    name: 'nombres' | 'apellidos' | 'email' | 'password' | 'cedula' | 'telefono',
  ): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  protected submit(): void {
    this.errorMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);

    // Pasamos el form completo (incluido adminCode) al servicio.
    // El AuthService es el único responsable de derivar el `role`
    // y NUNCA reenvía adminCode al backend.
    const payload: RegisterFormData = this.form.getRawValue();

    this.auth.register(payload).subscribe({
      next: () => {
        const isAdmin = this.auth.isAdmin();
        this.toast.success(
          isAdmin ? 'Cuenta administrador creada' : 'Cuenta creada con éxito',
          `Bienvenido ${this.auth.displayName()} a UrbanCar EC`,
        );
        void this.router.navigateByUrl(isAdmin ? '/admin' : '/cliente');
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.loading.set(false);
        const msg = err?.error?.error?.message ?? 'No se pudo crear la cuenta.';
        this.errorMsg.set(msg);
        this.toast.error('Registro fallido', msg);
      },
      complete: () => this.loading.set(false),
    });
  }
}
