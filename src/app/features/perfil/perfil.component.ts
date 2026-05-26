import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, ReactiveFormsModule],
  template: `
    <section class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <!-- ── Banner de perfil ────────────────────────────────── -->
      <div class="relative mb-8 rounded-2xl overflow-hidden shadow-soft
                  bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-6 sm:p-8">
        <!-- Decoración de fondo -->
        <div class="absolute top-0 right-0 w-64 h-64 rounded-full
                    bg-white/5 -translate-y-1/3 translate-x-1/4 pointer-events-none"></div>
        <div class="absolute bottom-0 left-0 w-40 h-40 rounded-full
                    bg-white/5 translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

        <div class="relative flex items-center gap-5 flex-wrap">
          <!-- Avatar -->
          <div class="w-20 h-20 shrink-0 rounded-2xl bg-white/20 backdrop-blur-sm
                      text-white flex items-center justify-center text-2xl font-bold
                      select-none ring-2 ring-white/30 shadow-inner">
            {{ initials() }}
          </div>

          <!-- Info usuario -->
          <div class="text-white min-w-0">
            <h1 class="text-2xl font-bold leading-tight truncate">{{ auth.displayName() }}</h1>
            <div class="flex items-center gap-2 mt-1.5 flex-wrap">
              <lucide-icon name="mail" class="w-3.5 h-3.5 opacity-70 shrink-0"></lucide-icon>
              <span class="text-sm opacity-90 truncate">{{ auth.currentUser()?.email }}</span>
              @if (auth.isAdmin()) {
                <span class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5
                             rounded-full bg-white text-primary-700 shadow-sm">
                  <lucide-icon name="shield-check" class="w-3 h-3"></lucide-icon>
                  ADMIN
                </span>
              } @else {
                <span class="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5
                             rounded-full bg-white/20 text-white border border-white/30">
                  CLIENTE
                </span>
              }
            </div>
          </div>

          <!-- Indicador de completitud -->
          <div class="ml-auto text-right text-white hidden sm:block">
            <p class="text-xs opacity-70 mb-1">Perfil completado</p>
            <p class="text-2xl font-bold">{{ completionPct() }}%</p>
            <div class="mt-1.5 h-1.5 w-24 rounded-full bg-white/20 overflow-hidden ml-auto">
              <div class="h-full rounded-full bg-white/80 transition-all duration-500"
                   [style.width.%]="completionPct()"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">

        <!-- ── Información personal ───────────────────────────── -->
        <div class="card p-6 flex flex-col gap-5">
          <div class="flex items-center gap-2 pb-3 border-b border-surface-border">
            <span class="grid place-items-center w-8 h-8 rounded-xl
                         bg-primary-50 text-primary-700 shrink-0">
              <lucide-icon name="user-round" class="w-4 h-4"></lucide-icon>
            </span>
            <div>
              <h2 class="font-semibold text-ink">Información personal</h2>
              <p class="text-xs text-ink-muted">Actualiza tus datos de contacto</p>
            </div>
          </div>

          <form [formGroup]="infoForm" (ngSubmit)="saveInfo()" class="flex flex-col gap-4" novalidate>

            <!-- Cédula — editable solo si no está registrada -->
            <div class="flex flex-col gap-1.5">
              @if (auth.currentUser()?.cedula) {
                <label class="label flex items-center gap-1.5">
                  <lucide-icon name="lock" class="w-3.5 h-3.5 text-ink-muted"></lucide-icon>
                  Número de cédula
                </label>
                <input type="text"
                       class="input bg-surface opacity-70 cursor-not-allowed"
                       [value]="auth.currentUser()!.cedula!"
                       readonly tabindex="-1" />
                <p class="text-xs text-ink-muted flex items-center gap-1">
                  <lucide-icon name="info" class="w-3 h-3 shrink-0"></lucide-icon>
                  No se puede modificar una vez registrada.
                </p>
              } @else {
                <label for="cedula" class="label flex items-center gap-1.5">
                  <lucide-icon name="credit-card" class="w-3.5 h-3.5 text-primary-600"></lucide-icon>
                  Número de cédula
                  <span class="ml-auto text-xs font-normal text-ink-muted">Opcional</span>
                </label>
                <input id="cedula" type="text" formControlName="cedula"
                       class="input" [class.border-danger]="isInvalid('cedula')"
                       [class.border-primary]="isCedulaValid()"
                       placeholder="Ej. 1712345678" maxlength="10"
                       autocomplete="off" inputmode="numeric" />
                @if (isInvalid('cedula')) {
                  <p class="text-xs text-danger flex items-center gap-1">
                    <lucide-icon name="alert-circle" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                    Cédula ecuatoriana inválida. Verifica los 10 dígitos.
                  </p>
                } @else if (isCedulaValid()) {
                  <p class="text-xs text-primary-600 flex items-center gap-1">
                    <lucide-icon name="check-circle-2" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                    Cédula válida.
                  </p>
                } @else {
                  <p class="text-xs text-ink-muted flex items-center gap-1">
                    <lucide-icon name="info" class="w-3 h-3 shrink-0"></lucide-icon>
                    Una vez guardada no podrás cambiarla.
                  </p>
                }
              }
            </div>

            <!-- Email — read-only -->
            <div class="flex flex-col gap-1.5">
              <label class="label flex items-center gap-1.5">
                <lucide-icon name="lock" class="w-3.5 h-3.5 text-ink-muted"></lucide-icon>
                Correo electrónico
              </label>
              <input type="email"
                     class="input bg-surface opacity-70 cursor-not-allowed"
                     [value]="auth.currentUser()?.email ?? ''"
                     readonly tabindex="-1" />
            </div>

            <!-- Nombres -->
            <div class="flex flex-col gap-1.5">
              <label for="nombres" class="label">Nombres</label>
              <input id="nombres" type="text" formControlName="nombres"
                     class="input" [class.border-danger]="isInvalid('nombres')"
                     placeholder="Tu nombre" autocomplete="given-name" />
              @if (isInvalid('nombres')) {
                <p class="text-xs text-danger flex items-center gap-1">
                  <lucide-icon name="alert-circle" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                  Solo letras, mínimo 2 caracteres.
                </p>
              }
            </div>

            <!-- Apellidos -->
            <div class="flex flex-col gap-1.5">
              <label for="apellidos" class="label">Apellidos</label>
              <input id="apellidos" type="text" formControlName="apellidos"
                     class="input" [class.border-danger]="isInvalid('apellidos')"
                     placeholder="Tus apellidos" autocomplete="family-name" />
              @if (isInvalid('apellidos')) {
                <p class="text-xs text-danger flex items-center gap-1">
                  <lucide-icon name="alert-circle" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                  Solo letras, mínimo 2 caracteres.
                </p>
              }
            </div>

            <!-- Teléfono -->
            <div class="flex flex-col gap-1.5">
              <label for="telefono" class="label">
                Teléfono
                <span class="text-ink-muted font-normal text-xs ml-1">(opcional)</span>
              </label>
              <input id="telefono" type="tel" formControlName="telefono"
                     class="input" placeholder="0999 999 999" autocomplete="tel" />
            </div>

            <button type="submit"
                    class="btn-primary mt-1 self-end"
                    [disabled]="saving() || infoForm.invalid || !infoForm.dirty">
              @if (saving()) {
                <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
                Guardando…
              } @else {
                <lucide-icon name="save" class="w-4 h-4"></lucide-icon>
                Guardar cambios
              }
            </button>
          </form>
        </div>

        <!-- ── Cambiar contraseña ──────────────────────────────── -->
        <div class="card p-6 flex flex-col gap-5">
          <div class="flex items-center gap-2 pb-3 border-b border-surface-border">
            <span class="grid place-items-center w-8 h-8 rounded-xl
                         bg-primary-50 text-primary-700 shrink-0">
              <lucide-icon name="key-round" class="w-4 h-4"></lucide-icon>
            </span>
            <div>
              <h2 class="font-semibold text-ink">Cambiar contraseña</h2>
              <p class="text-xs text-ink-muted">Mantén tu cuenta segura</p>
            </div>
          </div>

          <!-- Consejo de seguridad -->
          <div class="rounded-xl bg-primary-50 border border-primary-100
                      px-4 py-3 flex items-start gap-2.5">
            <lucide-icon name="info" class="w-4 h-4 text-primary-600 mt-0.5 shrink-0"></lucide-icon>
            <p class="text-xs text-primary-700 leading-relaxed">
              Usa al menos <strong>8 caracteres</strong> combinando letras y números para
              una contraseña más segura.
            </p>
          </div>

          <form [formGroup]="passForm" (ngSubmit)="changePassword()" class="flex flex-col gap-4" novalidate>

            <!-- Contraseña actual -->
            <div class="flex flex-col gap-1.5">
              <label for="currentPass" class="label">Contraseña actual</label>
              <div class="relative">
                <input id="currentPass"
                       [type]="showCurrent() ? 'text' : 'password'"
                       formControlName="currentPassword"
                       class="input pr-10"
                       [class.border-danger]="passInvalid('currentPassword')"
                       placeholder="••••••••" autocomplete="current-password" />
                <button type="button" tabindex="-1"
                        (click)="showCurrent.set(!showCurrent())"
                        class="absolute right-3 top-1/2 -translate-y-1/2
                               text-ink-muted hover:text-ink transition-colors">
                  <lucide-icon [name]="showCurrent() ? 'eye-off' : 'eye'" class="w-4 h-4"></lucide-icon>
                </button>
              </div>
              @if (passInvalid('currentPassword')) {
                <p class="text-xs text-danger flex items-center gap-1">
                  <lucide-icon name="alert-circle" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                  Campo requerido.
                </p>
              }
            </div>

            <!-- Nueva contraseña -->
            <div class="flex flex-col gap-1.5">
              <label for="newPass" class="label">Nueva contraseña</label>
              <div class="relative">
                <input id="newPass"
                       [type]="showNew() ? 'text' : 'password'"
                       formControlName="newPassword"
                       class="input pr-10"
                       [class.border-danger]="passInvalid('newPassword')"
                       placeholder="Mínimo 8 caracteres" autocomplete="new-password" />
                <button type="button" tabindex="-1"
                        (click)="showNew.set(!showNew())"
                        class="absolute right-3 top-1/2 -translate-y-1/2
                               text-ink-muted hover:text-ink transition-colors">
                  <lucide-icon [name]="showNew() ? 'eye-off' : 'eye'" class="w-4 h-4"></lucide-icon>
                </button>
              </div>
              @if (passInvalid('newPassword')) {
                <p class="text-xs text-danger flex items-center gap-1">
                  <lucide-icon name="alert-circle" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                  Mínimo 8 caracteres.
                </p>
              }
            </div>

            <!-- Confirmar contraseña -->
            <div class="flex flex-col gap-1.5">
              <label for="confirmPass" class="label">Confirmar nueva contraseña</label>
              <div class="relative">
                <input id="confirmPass"
                       [type]="showConfirm() ? 'text' : 'password'"
                       formControlName="confirmPassword"
                       class="input pr-10"
                       [class.border-danger]="passInvalid('confirmPassword') || passwordMismatch()"
                       placeholder="Repite la contraseña" autocomplete="new-password" />
                <button type="button" tabindex="-1"
                        (click)="showConfirm.set(!showConfirm())"
                        class="absolute right-3 top-1/2 -translate-y-1/2
                               text-ink-muted hover:text-ink transition-colors">
                  <lucide-icon [name]="showConfirm() ? 'eye-off' : 'eye'" class="w-4 h-4"></lucide-icon>
                </button>
              </div>
              @if (passwordMismatch()) {
                <p class="text-xs text-danger flex items-center gap-1">
                  <lucide-icon name="alert-circle" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                  Las contraseñas no coinciden.
                </p>
              }
            </div>

            <button type="submit"
                    class="btn-primary mt-1 self-end"
                    [disabled]="savingPassword() || passForm.invalid">
              @if (savingPassword()) {
                <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
                Cambiando…
              } @else {
                <lucide-icon name="key-round" class="w-4 h-4"></lucide-icon>
                Cambiar contraseña
              }
            </button>
          </form>
        </div>

      </div>
    </section>
  `,
})
export class PerfilComponent implements OnInit {
  protected readonly auth  = inject(AuthService);
  private  readonly toast  = inject(ToastService);

  protected readonly saving         = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly showCurrent    = signal(false);
  protected readonly showNew        = signal(false);
  protected readonly showConfirm    = signal(false);

  protected readonly initials = computed(() => {
    const u = this.auth.currentUser();
    if (!u) return '?';
    return `${u.nombres?.[0] ?? ''}${u.apellidos?.[0] ?? ''}`.toUpperCase();
  });

  /** Porcentaje de campos completados (cedula, telefono, nombres, apellidos). */
  protected readonly completionPct = computed(() => {
    const u = this.auth.currentUser();
    if (!u) return 0;
    const fields = [u.nombres, u.apellidos, u.cedula, u.telefono];
    const filled = fields.filter((f) => !!f?.trim()).length;
    return Math.round((filled / fields.length) * 100);
  });

  protected readonly infoForm = new FormGroup({
    cedula:    new FormControl('', [PerfilComponent.validateCedula]),
    nombres:   new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/),
    ]),
    apellidos: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/),
    ]),
    telefono: new FormControl(''),
  });

  protected readonly passForm = new FormGroup(
    {
      currentPassword: new FormControl('', Validators.required),
      newPassword:     new FormControl('', [Validators.required, Validators.minLength(8)]),
      confirmPassword: new FormControl('', Validators.required),
    },
    { validators: PerfilComponent.matchPasswords },
  );

  protected readonly passwordMismatch = computed(() =>
    !!(this.passForm.errors?.['passwordMismatch'] && this.passForm.get('confirmPassword')?.touched),
  );

  ngOnInit(): void {
    const u = this.auth.currentUser();
    if (u) {
      this.infoForm.patchValue({
        nombres:   u.nombres,
        apellidos: u.apellidos,
        telefono:  u.telefono ?? '',
      });
    }
    // Sincroniza con el servidor para obtener campos como cédula que
    // pueden no estar en el snapshot de localStorage.
    this.auth.refreshProfile().subscribe({ error: () => {} });
  }

  protected isInvalid(field: string): boolean {
    const c = this.infoForm.get(field);
    return !!(c?.invalid && c.touched);
  }

  protected isCedulaValid(): boolean {
    const c = this.infoForm.get('cedula');
    return !!(c?.valid && c.value?.trim() && c.touched);
  }

  protected passInvalid(field: string): boolean {
    const c = this.passForm.get(field);
    return !!(c?.invalid && c.touched);
  }

  protected saveInfo(): void {
    if (this.infoForm.invalid || this.saving()) return;
    this.saving.set(true);
    const { nombres, apellidos, telefono, cedula } = this.infoForm.getRawValue();
    const payload: Record<string, string | undefined> = {
      nombres:   nombres!,
      apellidos: apellidos!,
      telefono:  telefono?.trim() || undefined,
    };
    if (!this.auth.currentUser()?.cedula && cedula?.trim()) {
      payload['cedula'] = cedula.trim();
    }
    this.auth.updateProfile(payload as any).subscribe({
      next: () => {
        this.saving.set(false);
        this.infoForm.markAsPristine();
        this.toast.success('Perfil actualizado', 'Tus datos fueron guardados correctamente.');
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.saving.set(false);
        const msg = err?.error?.error?.message ?? 'No se pudo guardar. Inténtalo de nuevo.';
        this.toast.error('Error al guardar', msg);
      },
    });
  }

  protected changePassword(): void {
    if (this.passForm.invalid || this.savingPassword()) return;
    this.savingPassword.set(true);
    const { currentPassword, newPassword } = this.passForm.getRawValue();
    this.auth.changePassword({ currentPassword: currentPassword!, newPassword: newPassword! })
      .subscribe({
        next: () => {
          this.savingPassword.set(false);
          this.passForm.reset();
          this.toast.success('Contraseña actualizada', 'Tu contraseña fue cambiada correctamente.');
        },
        error: (err: { error?: { error?: { message?: string } } }) => {
          this.savingPassword.set(false);
          const msg = err?.error?.error?.message ?? 'La contraseña actual es incorrecta.';
          this.toast.error('Error', msg);
        },
      });
  }

  private static matchPasswords(group: AbstractControl): ValidationErrors | null {
    const np = group.get('newPassword')?.value;
    const cp = group.get('confirmPassword')?.value;
    return np && cp && np !== cp ? { passwordMismatch: true } : null;
  }

  /** Valida cédula ecuatoriana (personas naturales, 10 dígitos). */
  private static validateCedula(control: AbstractControl): ValidationErrors | null {
    const value = (control.value as string)?.trim();
    if (!value) return null;
    if (!/^\d{10}$/.test(value)) return { cedula: true };
    const province = parseInt(value.slice(0, 2), 10);
    if (province < 1 || province > 24) return { cedula: true };
    if (parseInt(value[2], 10) > 5) return { cedula: true };
    const coeffs = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let v = parseInt(value[i], 10) * coeffs[i];
      if (v > 9) v -= 9;
      sum += v;
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(value[9], 10) ? null : { cedula: true };
  }
}
