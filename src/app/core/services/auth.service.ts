import { computed, Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '@env/environment';
import { ROLES, STORAGE_KEYS, type Role } from '@core/constants/app.constants';
import type {
  ApiSuccess,
  AuthResponse,
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
} from '@core/models/api.models';

/**
 * Datos del formulario de Registro tal y como vienen del componente.
 * `adminCode` es un campo "frontend-only" que decide el rol enviado al backend.
 */
export interface RegisterFormData {
  email: string;
  password: string;
  nombres: string;
  apellidos: string;
  cedula?: string;
  telefono?: string;
  ciudadId?: string;
  /** Campo extra que SOLO existe en el front. */
  adminCode?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly apiUrl = environment.apiUrl;

  // ── Estado reactivo basado en Signals ───────────────────────
  private readonly _currentUser = signal<AuthUser | null>(this.loadUserFromStorage());
  private readonly _token       = signal<string | null>(this.loadTokenFromStorage());

  /** Usuario autenticado en la sesión actual (signal de sólo lectura). */
  readonly currentUser  = this._currentUser.asReadonly();
  readonly token        = this._token.asReadonly();

  /** `true` si hay un token JWT válido en memoria/almacenamiento. */
  readonly isAuthenticated = computed(() => this._token() !== null && this._currentUser() !== null);

  /** `true` si el usuario actual es ADMIN. */
  readonly isAdmin = computed(() => this._currentUser()?.role === ROLES.ADMIN);

  /** Nombre completo para usar en navbar / saludos. */
  readonly displayName = computed(() => {
    const u = this._currentUser();
    return u ? `${u.nombres} ${u.apellidos}`.trim() : '';
  });

  // ── Operaciones públicas ────────────────────────────────────

  login(payload: LoginRequest): Observable<ApiSuccess<AuthResponse>> {
    return this.http
      .post<ApiSuccess<AuthResponse>>(`${this.apiUrl}/auth/login`, payload)
      .pipe(tap((res) => this.persistSession(res.data)));
  }

  /**
   * Registra al usuario.
   *
   * Regla crítica:
   *   - Si `form.adminCode === environment.adminCode` (PUCE2026)
   *     → enviar `role: 'ADMIN'`.
   *   - En cualquier otro caso → enviar `role: 'CLIENTE'`.
   *
   * El campo `adminCode` NUNCA se envía al backend.
   */
  register(form: RegisterFormData): Observable<ApiSuccess<AuthResponse>> {
    const role: Role = this.resolveRoleFromAdminCode(form.adminCode);

    const body: RegisterRequest = {
      email:     form.email,
      password:  form.password,
      nombres:   form.nombres,
      apellidos: form.apellidos,
      cedula:    form.cedula?.trim()   || undefined,
      telefono:  form.telefono?.trim() || undefined,
      ciudadId:  form.ciudadId         || undefined,
      role,
    };

    return this.http
      .post<ApiSuccess<AuthResponse>>(`${this.apiUrl}/auth/register`, body)
      .pipe(tap((res) => this.persistSession(res.data)));
  }

  /** Refresca el perfil desde `GET /auth/me`. */
  refreshProfile(): Observable<ApiSuccess<AuthUser>> {
    return this.http
      .get<ApiSuccess<AuthUser>>(`${this.apiUrl}/auth/me`)
      .pipe(tap((res) => this.setUser(res.data)));
  }

  /** Actualiza nombres, apellidos y teléfono del usuario autenticado. */
  updateProfile(data: UpdateProfileRequest): Observable<ApiSuccess<AuthUser>> {
    return this.http
      .patch<ApiSuccess<AuthUser>>(`${this.apiUrl}/auth/me`, data)
      .pipe(tap((res) => this.setUser(res.data)));
  }

  /** Cambia la contraseña verificando la actual primero. */
  changePassword(data: ChangePasswordRequest): Observable<ApiSuccess<{ message: string }>> {
    return this.http.patch<ApiSuccess<{ message: string }>>(`${this.apiUrl}/auth/me/password`, data);
  }

  /** Cierra sesión y redirige al login. */
  logout(redirectTo: string = '/auth/login'): void {
    this._currentUser.set(null);
    this._token.set(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.user);
    } catch {
      /* almacenamiento no disponible (SSR / private mode) */
    }
    void this.router.navigate([redirectTo]);
  }

  /** Lectura sincrónica del token (la usa el JwtInterceptor). */
  getToken(): string | null {
    return this._token();
  }

  // ── Internos ────────────────────────────────────────────────

  private resolveRoleFromAdminCode(code: string | undefined): Role {
    return code?.trim() === environment.adminCode ? ROLES.ADMIN : ROLES.CLIENTE;
  }

  private persistSession(data: AuthResponse): void {
    this.setUser(data.user);
    this.setToken(data.token);
  }

  private setUser(user: AuthUser): void {
    const normalized: AuthUser = {
      ...user,
      role: (user.role?.toUpperCase() ?? ROLES.CLIENTE) as Role,
    };
    this._currentUser.set(normalized);
    try { localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(normalized)); } catch { /* no-op */ }
  }

  private setToken(token: string): void {
    this._token.set(token);
    try { localStorage.setItem(STORAGE_KEYS.token, token); } catch { /* no-op */ }
  }

  private loadTokenFromStorage(): string | null {
    try { return localStorage.getItem(STORAGE_KEYS.token); } catch { return null; }
  }

  private loadUserFromStorage(): AuthUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.user);
      if (!raw) return null;
      const user = JSON.parse(raw) as AuthUser;
      return { ...user, role: (user.role?.toUpperCase() ?? ROLES.CLIENTE) as Role };
    } catch {
      return null;
    }
  }
}
