import { ChangeDetectionStrategy, Component, computed, Input, signal } from '@angular/core';
import { NgClass } from '@angular/common';

import type { ReservaStatus } from '@core/models/api.models';

const RESERVA_LABELS: Record<ReservaStatus, string> = {
  PENDIENTE:  'Pendiente',
  CONFIRMADA: 'Confirmada',
  ACTIVA:     'Activa',
  COMPLETADA: 'Completada',
  CANCELADA:  'Cancelada',
};

const RESERVA_CLASSES: Record<ReservaStatus, string> = {
  PENDIENTE:  'bg-amber-50 text-warning border-amber-200',
  CONFIRMADA: 'bg-primary-50 text-primary-800 border-primary-200',
  ACTIVA:     'bg-primary-700 text-white border-primary-800',
  COMPLETADA: 'bg-slate-100 text-ink border-slate-200',
  CANCELADA:  'bg-red-50 text-danger border-red-200',
};

@Component({
  selector: 'app-badge-status',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  template: `
    <span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5
                 text-xs font-medium uppercase tracking-wide"
          [ngClass]="cls()">
      <span class="w-1.5 h-1.5 rounded-full" [ngClass]="dot()"></span>
      {{ label() }}
    </span>
  `,
})
export class BadgeStatusComponent {
  @Input({ required: true }) set status(value: ReservaStatus) { this._status.set(value); }
  private readonly _status = signal<ReservaStatus>('PENDIENTE');

  protected readonly label = computed(() => RESERVA_LABELS[this._status()]);
  protected readonly cls   = computed(() => RESERVA_CLASSES[this._status()]);
  protected readonly dot   = computed(() => {
    const s = this._status();
    return s === 'ACTIVA'     ? 'bg-white'
         : s === 'CANCELADA'  ? 'bg-danger'
         : s === 'COMPLETADA' ? 'bg-ink-soft'
         : s === 'CONFIRMADA' ? 'bg-primary-700'
         :                      'bg-warning';
  });
}
