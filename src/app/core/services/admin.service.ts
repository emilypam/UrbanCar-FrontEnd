import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { environment } from '@env/environment';
import type {
  Agencia,
  ApiSuccess,
  AuthUser,
  Categoria,
  CreateAgenciaRequest,
  CreateCategoriaRequest,
  CreateModeloRequest,
  DashboardStats,
  Empresa,
  Factura,
  HistorialEntry,
  KardexEntry,
  Modelo,
  OutboxEvent,
  Paginated,
} from '@core/models/api.models';

/**
 * Operaciones del panel de administración (`/api/v1/admin/*`).
 * Todas requieren rol ADMIN (gestionado por `adminGuard` y backend).
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly api  = environment.apiUrl;

  // ── Dashboard ──────────────────────────────────────────────
  dashboard(): Observable<DashboardStats> {
    return this.http
      .get<ApiSuccess<DashboardStats>>(`${this.api}/admin/dashboard`)
      .pipe(map((r) => r.data));
  }

  // ── Agencias ───────────────────────────────────────────────
  agencias(): Observable<Agencia[]> {
    return this.http
      .get<ApiSuccess<any>>(`${this.api}/agencias`)
      .pipe(map((r) => {
        const rows: any[] = Array.isArray(r.data) ? r.data : (r.data as any)?.data ?? [];
        return rows.map((a) => ({ ...a, activa: a.isActive ?? a.activa ?? true }));
      }));
  }

  crearAgencia(payload: CreateAgenciaRequest): Observable<Agencia> {
    return this.http
      .post<ApiSuccess<Agencia>>(`${this.api}/agencias`, payload)
      .pipe(map((r) => ({ ...r.data, activa: (r.data as any).isActive ?? true })));
  }

  editarAgencia(id: string, payload: Partial<CreateAgenciaRequest>): Observable<Agencia> {
    return this.http
      .patch<ApiSuccess<Agencia>>(`${this.api}/agencias/${id}`, payload)
      .pipe(map((r) => ({ ...r.data, activa: (r.data as any).isActive ?? true })));
  }

  eliminarAgencia(id: string): Observable<{ deleted: boolean }> {
    return this.http
      .delete<ApiSuccess<{ deleted: boolean }>>(`${this.api}/agencias/${id}`)
      .pipe(map((r) => r.data));
  }

  // ── Modelos ────────────────────────────────────────────────
  crearModelo(payload: CreateModeloRequest): Observable<Modelo> {
    return this.http
      .post<ApiSuccess<Modelo>>(`${this.api}/modelos`, payload)
      .pipe(map((r) => r.data));
  }

  eliminarModelo(id: string): Observable<{ deleted: boolean }> {
    return this.http
      .delete<ApiSuccess<{ deleted: boolean }>>(`${this.api}/modelos/${id}`)
      .pipe(map((r) => r.data));
  }

  // ── Categorias ─────────────────────────────────────────────
  crearCategoria(payload: CreateCategoriaRequest): Observable<Categoria> {
    return this.http
      .post<ApiSuccess<Categoria>>(`${this.api}/categorias`, payload)
      .pipe(map((r) => r.data));
  }

  eliminarCategoria(id: string): Observable<{ deleted: boolean }> {
    return this.http
      .delete<ApiSuccess<{ deleted: boolean }>>(`${this.api}/categorias/${id}`)
      .pipe(map((r) => r.data));
  }

  // ── Empresas ───────────────────────────────────────────────
  empresas(): Observable<Empresa[]> {
    return this.http
      .get<ApiSuccess<any>>(`${this.api}/empresas`)
      .pipe(map((r) => {
        const rows: any[] = Array.isArray(r.data) ? r.data : (r.data as any)?.data ?? [];
        return rows.map((e) => ({ ...e, activa: e.isActive ?? e.activa ?? true }));
      }));
  }

  // ── Clientes / Usuarios ────────────────────────────────────
  clientes(page = 1, limit = 500): Observable<AuthUser[]> {
    return this.paginated<AuthUser>('/usuarios', page, limit)
      .pipe(map((p) => p.items));
  }

  // ── Facturas ───────────────────────────────────────────────
  facturas(page = 1, limit = 500): Observable<Factura[]> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    return this.http
      .get<ApiSuccess<any>>(`${this.api}/facturas`, { params })
      .pipe(map((r) => {
        if (Array.isArray(r.data)) return r.data as Factura[];
        return ((r.data as any)?.data ?? []) as Factura[];
      }));
  }

  // ── Auditoría ──────────────────────────────────────────────
  historial(page = 1, limit = 50): Observable<Paginated<HistorialEntry>> {
    return this.paginated<HistorialEntry>('/historial', page, limit);
  }

  kardex(page = 1, limit = 50): Observable<Paginated<KardexEntry>> {
    return this.paginated<KardexEntry>('/kardex', page, limit);
  }

  outboxEvents(page = 1, limit = 50): Observable<Paginated<OutboxEvent>> {
    return this.paginated<OutboxEvent>('/outbox-events', page, limit);
  }

  // ── Helpers ────────────────────────────────────────────────
  private paginated<T>(
    path: string, page: number, limit: number,
  ): Observable<Paginated<T>> {
    const params = new HttpParams()
      .set('page',  String(page))
      .set('limit', String(limit));

    return this.http
      .get<ApiSuccess<Paginated<T> | T[]>>(`${this.api}${path}`, { params })
      .pipe(map((r) => this.normalize<T>(r.data, page, limit)));
  }

  private normalize<T>(
    data: Paginated<T> | T[] | null | undefined,
    page: number, limit: number,
  ): Paginated<T> {
    if (Array.isArray(data)) {
      return { items: data, total: data.length, page, limit };
    }
    const raw = data as any;
    return {
      items: raw?.items ?? raw?.data ?? [],
      total: raw?.total ?? 0,
      page:  raw?.page  ?? page,
      limit: raw?.limit ?? limit,
      totalPages: raw?.totalPages,
    };
  }
}
