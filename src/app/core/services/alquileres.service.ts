import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { environment } from '@env/environment';
import type {
  Alquiler,
  ApiSuccess,
  CreateAlquilerRequest,
  CreateDevolucionRequest,
  Devolucion,
} from '@core/models/api.models';

@Injectable({ providedIn: 'root' })
export class AlquileresService {
  private readonly http = inject(HttpClient);
  private readonly api  = environment.apiUrl;

  list(): Observable<Alquiler[]> {
    return this.http
      .get<ApiSuccess<any>>(`${this.api}/alquileres`)
      .pipe(map((r) => {
        const raw = r.data;
        return Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];
      }));
  }

  create(payload: CreateAlquilerRequest): Observable<Alquiler> {
    return this.http
      .post<ApiSuccess<Alquiler>>(`${this.api}/alquileres`, payload)
      .pipe(map((r) => r.data));
  }

  registrarDevolucion(payload: CreateDevolucionRequest): Observable<Devolucion> {
    return this.http
      .post<ApiSuccess<Devolucion>>(`${this.api}/devoluciones`, payload)
      .pipe(map((r) => r.data));
  }
}
