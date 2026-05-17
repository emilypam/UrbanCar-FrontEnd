import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { environment } from '@env/environment';
import type {
  ApiSuccess,
  CreateReservaRequest,
  Reserva,
  ReservaStatus,
} from '@core/models/api.models';

/**
 * Backend (Prisma) devuelve los siguientes nombres de columna:
 *   - `diasTotal`     → total de días
 *   - `precioBase`    → subtotal del vehículo (precioDia × días)
 *   - `precioExtras`  → subtotal de extras
 *   - `precioSeguro`  → subtotal del seguro
 *   - `totalAmount`   → total general
 *
 * El frontend, sin embargo, expone esos valores con nombres "amigables"
 * (`dias`, `subtotalDias`, …, `total`).  Esta función normaliza la respuesta
 * conservando los nombres originales para retrocompatibilidad y agregando
 * los campos derivados que consumen los componentes.
 */
function normalizeReserva(raw: any): Reserva {
  if (!raw || typeof raw !== 'object') return raw;

  const dias            = Number(raw.diasTotal     ?? raw.dias            ?? 0);
  const subtotalDias    = Number(raw.precioBase    ?? raw.subtotalDias    ?? 0);
  const subtotalExtras  = Number(raw.precioExtras  ?? raw.subtotalExtras  ?? 0);
  const subtotalSeguro  = Number(raw.precioSeguro  ?? raw.subtotalSeguro  ?? 0);
  const total           = Number(raw.totalAmount   ?? raw.total           ?? 0);

  return {
    ...raw,
    dias,
    subtotalDias,
    subtotalExtras,
    subtotalSeguro,
    total,
    fechaInicio: typeof raw.fechaInicio === 'string'
      ? raw.fechaInicio.slice(0, 10)
      : raw.fechaInicio,
    fechaFin: typeof raw.fechaFin === 'string'
      ? raw.fechaFin.slice(0, 10)
      : raw.fechaFin,
  } as Reserva;
}

@Injectable({ providedIn: 'root' })
export class ReservasService {
  private readonly http = inject(HttpClient);
  private readonly api  = environment.apiUrl;

  create(payload: CreateReservaRequest): Observable<Reserva> {
    return this.http
      .post<ApiSuccess<Reserva>>(`${this.api}/reservas`, payload)
      .pipe(map((r) => normalizeReserva(r.data)));
  }

  myReservations(): Observable<Reserva[]> {
    return this.http
      .get<ApiSuccess<any>>(`${this.api}/reservas/my`)
      .pipe(map((r) => {
        const raw = r.data;
        const items: any[] = Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];
        return items.map(normalizeReserva);
      }));
  }

  /** Listado global (admin). Solicita un límite alto para poblar la tabla. */
  listAll(page = 1, limit = 500): Observable<Reserva[]> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    return this.http
      .get<ApiSuccess<any>>(`${this.api}/reservas`, { params })
      .pipe(map((r) => {
        const raw = r.data;
        const items: any[] = Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];
        return items.map(normalizeReserva);
      }));
  }

  getById(id: string): Observable<Reserva> {
    return this.http
      .get<ApiSuccess<Reserva>>(`${this.api}/reservas/${id}`)
      .pipe(map((r) => normalizeReserva(r.data)));
  }

  cancel(id: string): Observable<Reserva> {
    return this.http
      .patch<ApiSuccess<Reserva>>(`${this.api}/reservas/${id}/cancelar`, {})
      .pipe(map((r) => normalizeReserva(r.data)));
  }

  /** Cambia el status de una reserva (admin). */
  updateStatus(id: string, status: ReservaStatus): Observable<Reserva> {
    return this.http
      .patch<ApiSuccess<Reserva>>(`${this.api}/reservas/${id}`, { status })
      .pipe(map((r) => normalizeReserva(r.data)));
  }
}
