-- Amplia el catálogo de nodos para distinguir destinos visibles en búsquedas.

alter type public.tipo_nodo add value if not exists 'servicio';

alter table public.nodos
  add column buscable boolean not null default false;

create index nodos_buscables_idx
  on public.nodos (buscable, edificio_id, piso)
  where buscable = true;

