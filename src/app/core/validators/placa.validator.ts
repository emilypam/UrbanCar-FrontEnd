import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador de placa vehicular ecuatoriana.
 *
 * Acepta los formatos vigentes:
 *   - `ABC-1234`  (3 letras + 4 dígitos, con guion opcional)
 *   - `ABC-123`   (3 letras + 3 dígitos, formatos antiguos)
 *   - `AB-1234`   (2 letras + 4 dígitos, motos)
 *   - `ABC-1234A` (letra final opcional, placas especiales)
 *
 * Convierte automáticamente a mayúsculas durante la validación.
 */
const PLACA_PATTERN = /^[A-Z]{2,3}-?\d{3,4}[A-Z]?$/;

export const placaValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const raw = (control.value as string | null | undefined)?.toString().trim().toUpperCase();
  if (!raw) return null;
  return PLACA_PATTERN.test(raw) ? null : { placa: true };
};

/**
 * Validador de número estrictamente positivo (mayor que 0).
 * Útil para precios y cantidades.
 */
export const positiveNumberValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const v = control.value;
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return { numeric: true };
  return n > 0 ? null : { positive: true };
};
