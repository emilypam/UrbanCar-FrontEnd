import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, tap, throwError, type Observable } from 'rxjs';

import { environment } from '@env/environment';
import type {
  ApiSuccess,
  CreateVehiculoRequest,
  MarketplaceQuery,
  Paginated,
  UpdateVehiculoRequest,
  Vehiculo,
  VehiculoSearchQuery,
} from '@core/models/api.models';

/** Respuesta paginada del backend cuando `data` contiene `{ data: rows[] }`. */
interface PaginatedNest {
  data?: Vehiculo[];
  items?: Vehiculo[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

const STATUS_LABEL: Record<string, string> = {
  DISPONIBLE:    'Disponible',
  EN_USO:        'En uso',
  MANTENIMIENTO: 'Mantenimiento',
  INACTIVO:      'Inactivo',
};

function mapVehiculoFromApi(raw: any): Vehiculo {
  const status = raw?.status as string | undefined;
  const nombre =
    raw?.estado?.nombre ??
    (status ? STATUS_LABEL[status] ?? status : '—');
  return {
    ...raw,
    activo: raw?.isActive ?? raw?.activo ?? true,
    estado: raw?.estado ?? { id: raw?.estadoId ?? '', nombre },
  };
}

@Injectable({ providedIn: 'root' })
export class VehiculosService {
  private readonly http = inject(HttpClient);
  private readonly api  = environment.apiUrl;

  /** Catálogo público (sin filtro de fechas). */
  marketplace(query: MarketplaceQuery = {}): Observable<Vehiculo[]> {
    return this.http
      .get<ApiSuccess<unknown>>(`${this.api}/vehiculos/marketplace`, {
        params: this.toParams({ ...query }),
      })
      .pipe(
        map((r) => this.normalizeVehiculos(r.data)),
        catchError((err) => {
          console.error('[VehiculosService] marketplace error:', err);
          return throwError(() => err);
        }),
      );
  }

  /** Disponibilidad por rango de fechas (excluye solapamientos). */
  search(query: VehiculoSearchQuery): Observable<Vehiculo[]> {
    return this.http
      .get<ApiSuccess<unknown>>(`${this.api}/vehiculos/search`, {
        params: this.toParams({ ...query }),
      })
      .pipe(
        map((r) => this.normalizeVehiculos(r.data)),
        catchError((err) => {
          console.error('[VehiculosService] search error:', err);
          return throwError(() => err);
        }),
      );
  }

  /** Listado paginado (para admin). */
  list(page = 1, limit = 50): Observable<Paginated<Vehiculo>> {
    return this.http
      .get<ApiSuccess<Paginated<Vehiculo> | Vehiculo[] | PaginatedNest>>(`${this.api}/vehiculos`, {
        params: this.toParams({ page, limit }),
      })
      .pipe(
        map((r) => this.normalizePaginated(r.data, page, limit)),
        map((p) => ({ ...p, items: p.items.map(mapVehiculoFromApi) })),
      );
  }

  /** Detalle de vehículo por id. */
  getById(id: string): Observable<Vehiculo> {
    return this.http
      .get<ApiSuccess<Vehiculo>>(`${this.api}/vehiculos/${id}`)
      .pipe(map((r) => r.data));
  }

  create(payload: CreateVehiculoRequest): Observable<Vehiculo> {
    return this.http
      .post<ApiSuccess<Vehiculo>>(`${this.api}/vehiculos`, payload)
      .pipe(map((r) => r.data));
  }

  update(id: string, payload: UpdateVehiculoRequest): Observable<Vehiculo> {
    return this.http
      .patch<ApiSuccess<Vehiculo>>(`${this.api}/vehiculos/${id}`, payload)
      .pipe(map((r) => r.data));
  }

  remove(id: string): Observable<{ id: string }> {
    return this.http
      .delete<ApiSuccess<{ id: string }>>(`${this.api}/vehiculos/${id}`)
      .pipe(map((r) => r.data));
  }

  /** Cambiar estado del vehículo (Disponible / Mantenimiento / etc.).
   *  El campo `status` es un enum en el schema de Prisma. */
  changeEstado(id: string, status: string): Observable<Vehiculo> {
    return this.update(id, { status });
  }

  // ── Helpers ────────────────────────────────────────────────
  /**
   * Acepta tanto un array plano `[...]` como el objeto paginado `{ data: [...] }`
   * que devuelven indistintamente los endpoints de marketplace y search,
   * y normaliza cada vehículo con mapVehiculoFromApi.
   */
  private normalizeVehiculos(raw: unknown): Vehiculo[] {
    const arr: unknown[] = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as any)?.data) ? (raw as any).data : [];
    return arr.map(mapVehiculoFromApi);
  }

  /** Backend envuelve `{ data: rows[], total, page }` dentro de `response.data`. */
  private normalizePaginated(
    data: Paginated<Vehiculo> | Vehiculo[] | PaginatedNest | null | undefined,
    page: number, limit: number,
  ): Paginated<Vehiculo> {
    if (Array.isArray(data)) {
      return { items: data, total: data.length, page, limit };
    }
    const raw = data as PaginatedNest | Paginated<Vehiculo> | undefined;
    const rows = raw?.items ?? (raw as PaginatedNest)?.data ?? [];
    const total = raw?.total ?? rows.length;
    return {
      items: rows,
      total,
      page:  raw?.page  ?? page,
      limit: raw?.limit ?? limit,
      totalPages: raw?.totalPages,
    };
  }

  private toParams(input: object): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    }
    return p;
  }
}
