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
    <section class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      <!-- Avatar + nombre + rol -->
      <header class="mb-8 flex items-center gap-5">
        <div class="w-20 h-20 shrink-0 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-800
                    text-white flex items-center justify-center text-2xl font-bold shadow-soft select-none">
          {{ initials() }}
        </div>
        <div>
          <h1 class="text-2xl font-semibold text-ink">{{ auth.displayName() }}</h1>
          <div class="flex items-center gap-2 mt-1.5 flex-wrap">
            <lucide-icon name="mail" class="w-3.5 h-3.5 text-ink-muted shrink-0"></lucide-icon>
            <span class="text-sm text-ink-muted">{{ auth.currentUser()?.email }}</span>
            @if (auth.isAdmin()) {
              <span class="badge-primary">
                <lucide-icon name="shield-check" class="w-3 h-3"></lucide-icon>
                ADMIN
              </span>
            } @else {
              <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5
                           rounded-full bg-surface text-ink-muted border border-surface-border">
                CLIENTE
              </span>
            }
          </div>
        </div>
      </header>

      <div class="grid gap-6 lg:grid-cols-2">

        <!-- ── Información personal ───────────────────────────── -->
        <div class="card p-6 flex flex-col gap-5">
          <div class="flex items-center gap-2 pb-3 border-b border-surface-border">
            <span class="grid place-items-center w-8 h-8 rounded-xl bg-primary-50 text-primary-700 shrink-0">
              <lucide-icon name="user-round" class="w-4 h-4"></lucide-icon>
            </span>
            <h2 class="font-semibold text-ink">Información personal</h2>
          </div>

          <form [formGroup]="infoForm" (ngSubmit)="saveInfo()" class="flex flex-col gap-4" novalidate>

            <!-- Cédula — siempre read-only -->
            <div class="flex flex-col gap-1.5">
              <label class="label flex items-center gap-1.5">
                <lucide-icon name="lock" class="w-3.5 h-3.5 text-ink-muted"></lucide-icon>
                Número de cédula
              </label>
              <input type="text"
                     class="input bg-surface opacity-70 cursor-not-allowed"
                     [value]="auth.currentUser()?.cedula ?? 'No registrada'"
                     readonly tabindex="-1" />
              <p class="text-xs text-ink-muted">No se puede modificar.</p>
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
            <span class="grid place-items-center w-8 h-8 rounded-xl bg-primary-50 text-primary-700 shrink-0">
              <lucide-icon name="key-round" class="w-4 h-4"></lucide-icon>
            </span>
            <h2 class="font-semibold text-ink">Cambiar contraseña</h2>
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
                        (click)="showCurrent.update(v => !v)"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors">
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
                        (click)="showNew.update(v => !v)"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors">
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
                        (click)="showConfirm.update(v => !v)"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors">
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

  protected readonly infoForm = new FormGroup({
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
  }

  protected isInvalid(field: string): boolean {
    const c = this.infoForm.get(field);
    return !!(c?.invalid && c.touched);
  }

  protected passInvalid(field: string): boolean {
    const c = this.passForm.get(field);
    return !!(c?.invalid && c.touched);
  }

  protected saveInfo(): void {
    if (this.infoForm.invalid || this.saving()) return;
    this.saving.set(true);
    const { nombres, apellidos, telefono } = this.infoForm.getRawValue();
    this.auth.updateProfile({
      nombres:   nombres!,
      apellidos: apellidos!,
      telefono:  telefono?.trim() || undefined,
    }).subscribe({
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
}
