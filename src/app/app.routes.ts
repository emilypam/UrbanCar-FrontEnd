import type { Routes } from '@angular/router';

import { authGuard }  from '@core/guards/auth.guard';
import { adminGuard } from '@core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@features/home/home.component').then(m => m.HomeComponent),
    title: 'UrbanCar EC — Inicio',
  },
  {
    path: 'marketplace',
    loadComponent: () =>
      import('@features/marketplace/marketplace.component').then(m => m.MarketplaceComponent),
    title: 'UrbanCar EC — Marketplace',
  },

  // ── Autenticación ─────────────────────────────────────────
  {
    path: 'auth/login',
    loadComponent: () =>
      import('@features/auth/login/login.component').then(m => m.LoginComponent),
    title: 'UrbanCar EC — Iniciar sesión',
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('@features/auth/register/register.component').then(m => m.RegisterComponent),
    title: 'UrbanCar EC — Registro',
  },

  // ── Cliente (autenticado) ─────────────────────────────────
  {
    path: 'cliente',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@features/client/client.component').then(m => m.ClientComponent),
    title: 'UrbanCar EC — Mis reservas',
  },
  {
    path: 'reserva/:vehiculoId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@features/reserva/reserva.component').then(m => m.ReservaComponent),
    title: 'UrbanCar EC — Completar reserva',
  },
  {
    path: 'pago/:reservaId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@features/pago/pago.component').then(m => m.PagoComponent),
    title: 'UrbanCar EC — Pago y Facturación',
  },

  // ── Admin (rol === 'ADMIN') ───────────────────────────────
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('@features/admin/admin.component').then(m => m.AdminComponent),
    title: 'UrbanCar EC — Panel administrativo',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@features/admin/dashboard/dashboard.component')
            .then(m => m.AdminDashboardComponent),
        title: 'UrbanCar EC — Dashboard',
      },
      {
        path: 'vehiculos',
        loadComponent: () =>
          import('@features/admin/vehiculos/vehiculos-admin.component')
            .then(m => m.AdminVehiculosComponent),
        title: 'UrbanCar EC — Gestión de Flota',
      },
      {
        path: 'reservas',
        loadComponent: () =>
          import('@features/admin/reservas/reservas-admin.component')
            .then(m => m.AdminReservasComponent),
        title: 'UrbanCar EC — Reservas y Pagos',
      },
      {
        path: 'alquileres',
        loadComponent: () =>
          import('@features/admin/alquileres/alquileres-admin.component')
            .then(m => m.AdminAlquileresComponent),
        title: 'UrbanCar EC — Alquileres',
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('@features/admin/clientes/clientes-admin.component')
            .then(m => m.AdminClientesComponent),
        title: 'UrbanCar EC — Clientes',
      },
      {
        path: 'facturas',
        loadComponent: () =>
          import('@features/admin/facturas/facturas-admin.component')
            .then(m => m.AdminFacturasComponent),
        title: 'UrbanCar EC — Facturas',
      },
      {
        path: 'agencias',
        loadComponent: () =>
          import('@features/admin/agencias/agencias-admin.component')
            .then(m => m.AdminAgenciasComponent),
        title: 'UrbanCar EC — Agencias',
      },
      {
        path: 'modelos',
        loadComponent: () =>
          import('@features/admin/modelos/modelos-admin.component')
            .then(m => m.AdminModelosComponent),
        title: 'UrbanCar EC — Modelos',
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('@features/admin/categorias/categorias-admin.component')
            .then(m => m.AdminCategoriasComponent),
        title: 'UrbanCar EC — Categorías',
      },
      {
        path: 'kardex',
        loadComponent: () =>
          import('@features/admin/kardex/kardex.component')
            .then(m => m.AdminKardexComponent),
        title: 'UrbanCar EC — Kardex',
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
