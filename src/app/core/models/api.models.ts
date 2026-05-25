/**
 * UrbanCar EC — Contratos de la API REST `/api/v1`.
 *
 * Estos tipos se derivan del archivo openapi.yaml del backend
 * (carpeta backend `openapi.yaml`). Mantenerlos sincronizados
 * cuando el backend cambie.
 */

import type { Role } from '@core/constants/app.constants';

// ──────────────────────────────────────────────────────────────
//  Envoltorios de respuesta estándar
// ──────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

// ──────────────────────────────────────────────────────────────
//  Auth
// ──────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nombres: string;
  apellidos: string;
  cedula?: string;
  telefono?: string;
  ciudadId?: string;
  /**
   * Rol enviado al backend.  El frontend lo deriva del campo
   * `adminCode` del formulario de registro:
   *   adminCode === 'PUCE2026' → 'ADMIN', si no → 'CLIENTE'.
   */
  role?: Role;
}

export interface AuthUser {
  id: string;
  email: string;
  nombres: string;
  apellidos: string;
  role: Role;
  telefono?: string | null;
  cedula?: string | null;
  ciudadId?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

// ──────────────────────────────────────────────────────────────
//  Catálogos
// ──────────────────────────────────────────────────────────────

export interface Provincia {
  id: string;
  nombre: string;
}

export interface Ciudad {
  id: string;
  nombre: string;
  provinciaId: string;
  provincia?: Provincia;
}

export interface Marca {
  id: string;
  nombre: string;
  logoUrl?: string;
}

export interface Modelo {
  id: string;
  nombre: string;
  marcaId: string;
  marca?: Marca;
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface TipoCombustible {
  id: string;
  nombre: string;
}

export interface TipoTransmision {
  id: string;
  nombre: string;
}

export interface EstadoVehiculo {
  id: string;
  nombre: string;
}

export interface Extra {
  id: string;
  nombre: string;
  descripcion?: string;
  precioDia: number;
}

export interface Seguro {
  id: string;
  nombre: string;
  descripcion?: string;
  precioDia: number;
}

export interface Tarifa {
  id: string;
  nombre: string;
  categoriaId?: string;
  precioBase: number;
}

export interface CreateModeloRequest {
  marcaId: string;
  nombre: string;
}

export interface CreateCategoriaRequest {
  nombre: string;
  descripcion?: string;
}

export interface CreateAgenciaRequest {
  nombre: string;
  empresaId: string;
  ciudadId: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export interface CanalVenta {
  id: string;
  nombre: string;
}

// ──────────────────────────────────────────────────────────────
//  Empresas y agencias
// ──────────────────────────────────────────────────────────────

export interface Empresa {
  id: string;
  nombre: string;
  ruc?: string;
  email?: string;
  telefono?: string;
  activa: boolean;
}

export interface Agencia {
  id: string;
  nombre: string;
  direccion: string;
  telefono?: string;
  empresaId: string;
  ciudadId: string;
  empresa?: Empresa;
  ciudad?: Ciudad;
  activa: boolean;
}

// ──────────────────────────────────────────────────────────────
//  Vehículos
// ──────────────────────────────────────────────────────────────

export interface Vehiculo {
  id: string;
  placa: string;
  agenciaId: string;
  modeloId: string;
  categoriaId: string;
  tipoCombustibleId: string;
  tipoTransmisionId: string;
  estadoId?: string;
  color: string;
  anio: number;
  kilometraje: number;
  numeroPasajeros: number;
  precioDia: number;
  imagenUrl?: string;
  descripcion?: string;
  activo: boolean;
  status?: string;
  modelo?: Modelo;
  categoria?: Categoria;
  tipoCombustible?: TipoCombustible;
  tipoTransmision?: TipoTransmision;
  agencia?: Agencia;
  estado?: EstadoVehiculo;
}

export interface CreateVehiculoRequest {
  placa: string;
  agenciaId: string;
  modeloId: string;
  categoriaId: string;
  tipoCombustibleId: string;
  tipoTransmisionId: string;
  color: string;
  anio: number;
  kilometraje?: number;
  numeroPasajeros?: number;
  precioDia: number;
  imagenUrl?: string;
  descripcion?: string;
}

export type UpdateVehiculoRequest = Partial<CreateVehiculoRequest> & {
  activo?: boolean;
  estadoId?: string;
  status?: string;
};

export interface VehiculoSearchQuery {
  fechaInicio: string;
  fechaFin: string;
  ciudadId?: string;
  categoriaId?: string;
  tipoCombustibleId?: string;
  tipoTransmisionId?: string;
}

export interface MarketplaceQuery {
  ciudadId?: string;
  categoriaId?: string;
  tipoCombustibleId?: string;
  tipoTransmisionId?: string;
}

// ──────────────────────────────────────────────────────────────
//  Reservas
// ──────────────────────────────────────────────────────────────

export type ReservaStatus =
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'ACTIVA'
  | 'COMPLETADA'
  | 'CANCELADA';

export interface ReservaExtraItem {
  extraId: string;
  cantidad?: number;
}

export interface CreateReservaRequest {
  vehiculoId: string;
  agenciaId: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD
  seguroId?: string;
  canalVentaId?: string;
  extras?: ReservaExtraItem[];
  notas?: string;
}

export interface UpdateReservaStatusRequest {
  status: ReservaStatus;
}

export interface Reserva {
  id: string;
  correlationId?: string;
  usuarioId: string;
  vehiculoId: string;
  agenciaId: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  subtotalDias: number;
  subtotalExtras: number;
  subtotalSeguro: number;
  total: number;
  status: ReservaStatus;
  notas?: string;
  /** ISO datetime string: bloqueo de 15 min expira aquí (null tras pago exitoso). */
  expiresAt?: string | null;
  createdAt: string;
  vehiculo?: Vehiculo;
  agencia?: Agencia;
  seguro?: Seguro;
  extras?: Array<{ extra: Extra; cantidad: number; subtotal: number }>;
}

// ──────────────────────────────────────────────────────────────
//  Alquileres
// ──────────────────────────────────────────────────────────────

export type AlquilerStatus = 'ACTIVO' | 'FINALIZADO';

export interface CreateAlquilerRequest {
  reservaId: string;
  kmSalida: number;
  observaciones?: string;
}

export interface Alquiler {
  id: string;
  reservaId: string;
  kmSalida: number;
  kmEntrada?: number;
  status: AlquilerStatus;
  fechaInicio: string;
  fechaFin?: string;
  observaciones?: string;
  reserva?: Reserva;
}

// ──────────────────────────────────────────────────────────────
//  Devoluciones
// ──────────────────────────────────────────────────────────────

export interface CreateDevolucionRequest {
  alquilerId: string;
  kmEntrada: number;
  estadoVehiculo: string;
  cargoExtra?: number;
  observaciones?: string;
}

export interface Devolucion {
  id: string;
  alquilerId: string;
  kmEntrada: number;
  estadoVehiculo: string;
  cargoExtra: number;
  observaciones?: string;
  fechaDevolucion: string;
  alquiler?: Alquiler;
}

// ──────────────────────────────────────────────────────────────
//  Pagos
// ──────────────────────────────────────────────────────────────

export type MetodoPago =
  | 'EFECTIVO'
  | 'TARJETA_CREDITO'
  | 'TARJETA_DEBITO'
  | 'TRANSFERENCIA'
  | 'PAYPAL'
  | 'OTRO';

export type PagoStatus = 'PENDIENTE' | 'COMPLETADO' | 'FALLIDO' | 'REEMBOLSADO';

/** Datos de tarjeta validados por el componente (NO se persisten en backend). */
export interface TarjetaInput {
  numero:  string;          // 16 dígitos sin espacios — validado con Luhn
  expira:  string;          // MM/YY no expirada
  cvv:     string;          // 3 o 4 dígitos
  titular: string;          // nombre del titular
}

export interface CreatePagoRequest {
  reservaId:    string;
  monto:        number;
  metodoPago:   MetodoPago;
  referencia?:  string;
  tarjeta?:     TarjetaInput;
  rucCliente?:  string;
  razonSocial?: string;
}

export interface Pago {
  id:           string;
  reservaId:    string;
  monto:        number;
  metodoPago:   MetodoPago;
  status:       PagoStatus;
  referencia?:  string;
  createdAt:    string;
  reserva?:     Reserva;
}

/** Respuesta del cliente tras POST /api/v1/pagos — sin datos de factura. */
export interface PagoClienteResponse {
  message: string;
}

/** Solo uso interno/admin: respuesta histórica con pago + factura. */
export interface PagoConFactura {
  pago:    Pago;
  factura: Factura;
}

// ──────────────────────────────────────────────────────────────
//  Facturas
// ──────────────────────────────────────────────────────────────

export interface CreateFacturaRequest {
  reservaId: string;
  pagoId?: string;
  rucCliente?: string;
  razonSocial?: string;
}

export interface FacturaDetalle {
  id: string;
  facturaId: string;
  descripcion: string;
  cantidad: number;
  precioUnit: number;
  subtotal: number;
}

export interface Factura {
  id: string;
  /** Compatibilidad con frontend antiguo. */
  numero?: string;
  numeroFactura: string;
  reservaId: string;
  pagoId?: string;
  rucCliente?: string;
  razonSocial?: string;
  subtotal: number;
  iva: number;
  total: number;
  /** Compatibilidad con frontend antiguo. */
  fechaEmision?: string;
  createdAt: string;
  detalles?: FacturaDetalle[];
  reserva?: Reserva;
}

// ──────────────────────────────────────────────────────────────
//  Admin
// ──────────────────────────────────────────────────────────────

export interface DashboardStats {
  vehiculos:  { total: number; disponibles: number };
  reservas:   { total: number; activas: number };
  usuarios:   { total: number };
  alquileres: { total: number };
  facturas:   { total: number };
  ingresos:   { total: number };
}

export interface HistorialEntry {
  id: string;
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId?: string;
  payload?: unknown;
  createdAt: string;
}

export interface KardexEntry {
  id: string;
  vehiculoId: string;
  estadoAnterior?: string;
  estadoNuevo: string;
  /** Campo real del backend: `evento` (renombrado desde `motivo`). */
  evento: string;
  usuarioId?: string;
  createdAt: string;
}

export interface OutboxEvent {
  id: string;
  /** Campo real del backend: `evento` (anteriormente `eventType`). */
  evento: string;
  /** Campo real del backend: `usuarioId` (anteriormente `aggregateId`). */
  usuarioId?: string;
  correlationId?: string;
  payload: unknown;
  /** Campo real del backend: `procesadoAt` (anteriormente `publishedAt`). */
  procesadoAt?: string | null;
  status?: string;
  createdAt: string;
}
