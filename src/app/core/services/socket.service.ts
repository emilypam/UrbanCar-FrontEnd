import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Observable, Subject, filter, map } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '@env/environment';

interface WsMsg { event: string; data: unknown; }

const WS_EVENTS = [
  'reserva:creada', 'reserva:confirmada', 'reserva:cancelada', 'reserva:completada',
  'pago:procesado',  'pago:fallido',       'factura:generada',
  'alquiler:iniciado', 'devolucion:registrada',
  'vehiculo:actualizado', 'kardex:registrado',
] as const;

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private readonly socket: Socket;
  private readonly msgs$ = new Subject<WsMsg>();

  constructor(private readonly zone: NgZone) {
    this.socket = io(environment.wsUrl || window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    WS_EVENTS.forEach((evt) => {
      this.socket.on(evt, (data: unknown) => {
        this.zone.run(() => this.msgs$.next({ event: evt, data }));
      });
    });

    this.socket.on('connect',    () => console.log('[socket] conectado al bus-service'));
    this.socket.on('disconnect', () => console.log('[socket] desconectado del bus-service'));
    this.socket.on('connect_error', (e) => console.warn('[socket] error de conexión:', e.message));
  }

  on(event: string): Observable<unknown> {
    return this.msgs$.pipe(
      filter((m) => m.event === event),
      map((m) => m.data),
    );
  }

  onAny(...events: string[]): Observable<unknown> {
    return this.msgs$.pipe(
      filter((m) => events.includes(m.event)),
      map((m) => m.data),
    );
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}
