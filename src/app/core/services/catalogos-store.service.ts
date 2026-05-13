import { Injectable, inject, signal } from '@angular/core';

import type { Agencia, Categoria, Marca, Modelo } from '@core/models/api.models';
import { AdminService }    from './admin.service';
import { CatalogosService } from './catalogos.service';

/**
 * Store reactivo singleton para los catálogos mutables del admin.
 *
 * Los componentes de catálogo (Modelos, Categorías, Agencias) llaman
 * `refresh*()` tras cada mutación; el formulario de vehículo lee los
 * signals y se actualiza automáticamente sin recargar la página.
 */
@Injectable({ providedIn: 'root' })
export class CatalogosStoreService {
  private readonly catalogos = inject(CatalogosService);
  private readonly admin     = inject(AdminService);

  readonly marcas     = signal<Marca[]>([]);
  readonly modelos    = signal<Modelo[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly agencias   = signal<Agencia[]>([]);

  refreshMarcas():     void { this.catalogos.marcas().subscribe(l     => this.marcas.set(l)); }
  refreshModelos():    void { this.catalogos.modelos().subscribe(l    => this.modelos.set(l)); }
  refreshCategorias(): void { this.catalogos.categorias().subscribe(l => this.categorias.set(l)); }
  refreshAgencias():   void { this.admin.agencias().subscribe(l       => this.agencias.set(l)); }
}
