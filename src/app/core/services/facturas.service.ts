import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import { environment } from '@env/environment';
import type { ApiSuccess, Factura } from '@core/models/api.models';

/** Acceso a facturas para usuarios autenticados (no requiere rol ADMIN). */
@Injectable({ providedIn: 'root' })
export class FacturasService {
  private readonly http = inject(HttpClient);
  private readonly api  = environment.apiUrl;

  /** Devuelve la primera factura de una reserva, o null si aún no existe. */
  getByReserva(reservaId: string): Observable<Factura | null> {
    const params = new HttpParams().set('reservaId', reservaId);
    return this.http
      .get<ApiSuccess<any>>(`${this.api}/facturas`, { params })
      .pipe(
        map((r) => {
          const items: Factura[] = Array.isArray(r.data)
            ? r.data
            : ((r.data as any)?.data ?? []);
          return items[0] ?? null;
        }),
        catchError(() => of(null)),
      );
  }
}
