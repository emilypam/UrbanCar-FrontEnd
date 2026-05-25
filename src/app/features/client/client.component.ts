import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '@core/services/auth.service';
import { ReservasService } from '@core/services/reservas.service';
import { ToastService } from '@core/services/toast.service';
import { BadgeStatusComponent } from '@shared/components/badge-status/badge-status.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import type { Reserva } from '@core/models/api.models';

@Component({
  selector: 'app-client',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideAngularModule, RouterLink, DatePipe, CurrencyPipe,
    BadgeStatusComponent, EmptyStateComponent,
  ],
  template: `
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header class="mb-8 flex items-center gap-3">
        <span class="grid place-items-center w-11 h-11 rounded-2xl bg-primary-700 text-white shadow-soft">
          <lucide-icon name="user" class="w-5 h-5"></lucide-icon>
        </span>
        <div>
          <h1 class="text-2xl">Hola, {{ auth.displayName() }}</h1>
          <p class="text-ink-muted text-sm">Tu panel de cliente UrbanCar EC.</p>
        </div>
      </header>

      <!-- Skeleton -->
      @if (loading()) {
        <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Cargando reservas" aria-busy="true">
          @for (i of skeletons; track i) {
            <li class="card p-5 flex flex-col gap-3" aria-hidden="true">
              <div class="flex items-start justify-between gap-2">
                <div class="flex flex-col gap-2 flex-1">
                  <div class="skeleton h-5 w-3/5"></div>
                  <div class="skeleton h-3 w-2/5"></div>
                </div>
                <div class="skeleton h-6 w-20 rounded-full"></div>
              </div>
              <div class="skeleton h-3 w-4/5 mt-1"></div>
              <div class="skeleton h-3 w-1/3"></div>
              <div class="skeleton h-5 w-24 mt-auto"></div>
            </li>
          }
        </ul>
      }

      <!-- Empty state -->
      @else if (reservas().length === 0) {
        <app-empty-state
          icon="calendar-x"
          title="Aún no tienes alquileres registrados"
          description="Cuando realices una reserva, aparecerá aquí con todos los detalles."
        />
      }

      <!-- Lista de reservas -->
      @else {
        <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (r of reservas(); track r.id) {
            <li class="card p-5 flex flex-col gap-2">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="font-semibold text-ink leading-tight">
                    {{ r.vehiculo?.modelo?.marca?.nombre ?? '—' }}
                    {{ r.vehiculo?.modelo?.nombre ?? '' }}
                  </p>
                  <p class="text-xs text-ink-muted mt-0.5">
                    {{ r.vehiculo?.placa }} · {{ r.vehiculo?.anio }}
                  </p>
                </div>
                <app-badge-status [status]="r.status" />
              </div>

              <div class="flex items-center gap-1.5 text-sm text-ink-muted mt-1">
                <lucide-icon name="calendar" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                <span>{{ r.fechaInicio | date:'dd/MM/yyyy' }}</span>
                <span>→</span>
                <span>{{ r.fechaFin | date:'dd/MM/yyyy' }}</span>
                <span class="text-ink-soft">· {{ r.dias }} día{{ r.dias !== 1 ? 's' : '' }}</span>
              </div>

              <p class="text-primary-700 font-semibold text-base mt-auto pt-2 border-t border-surface">
                {{ r.total | currency:'USD':'symbol':'1.2-2' }}
              </p>

              <!-- Acción: Pagar Alquiler (solo PENDIENTE) -->
              @if (r.status === 'PENDIENTE') {
                <a [routerLink]="['/pago', r.id]"
                   class="btn-primary w-full mt-2 group"
                   [attr.aria-label]="'Pagar alquiler de ' + (r.vehiculo?.modelo?.nombre ?? 'reserva')">
                  <lucide-icon name="credit-card"
                    class="w-4 h-4 transition-transform group-hover:scale-110"></lucide-icon>
                  Pagar alquiler
                </a>
              }

              @if (r.status === 'PENDIENTE' || r.status === 'CONFIRMADA') {
                <button type="button"
                        (click)="cancelar(r)"
                        [disabled]="cancellingId() === r.id"
                        class="btn-outline w-full mt-2 text-danger border-red-200 hover:bg-red-50
                               flex items-center justify-center gap-2 disabled:opacity-50">
                  @if (cancellingId() === r.id) {
                    <lucide-icon name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
                  } @else {
                    <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
                  }
                  Cancelar reserva
                </button>
              }
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class ClientComponent implements OnInit {
  protected readonly auth    = inject(AuthService);
  private  readonly reservas$ = inject(ReservasService);
  private  readonly toast      = inject(ToastService);

  protected readonly loading      = signal(true);
  protected readonly reservas     = signal<Reserva[]>([]);
  protected readonly cancellingId = signal<string | null>(null);
  protected readonly skeletons = [0, 1, 2];

  ngOnInit(): void {
    this.loadReservas();
  }

  protected cancelar(r: Reserva): void {
    if (!confirm('¿Está seguro de cancelar la reserva?')) return;
    this.cancellingId.set(r.id);
    this.reservas$.cancel(r.id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.toast.success(
          'Reserva cancelada',
          'El vehículo puede volver a estar disponible para otros usuarios.',
        );
        this.loadReservas();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.cancellingId.set(null);
        const msg = err?.error?.error?.message
          ?? 'No se pudo cancelar la reserva. Inténtalo de nuevo.';
        this.toast.error('No se pudo cancelar', msg);
      },
    });
  }

  private loadReservas(): void {
    this.loading.set(true);
    this.reservas$.myReservations().subscribe({
      next:  (list) => { this.reservas.set(list); this.loading.set(false); },
      error: ()     => { this.loading.set(false); },
    });
  }
}
