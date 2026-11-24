-- 0012 — Rutas de evacuación: marca nodos como salida de emergencia o punto de reunión.
--
-- Es una columna aparte y no un valor nuevo de `tipo_nodo` porque un mismo nodo puede ser,
-- por ejemplo, una entrada (origen de visitantes, ver 0005) y también una salida de
-- emergencia. null = el nodo no es parte de la evacuación.

alter table public.nodos
  add column evacuacion text;

alter table public.nodos
  add constraint nodos_evacuacion_valida
    check (evacuacion is null or evacuacion in ('salida', 'punto_reunion'));

-- Pocas filas marcadas entre cientos de nodos: índice parcial.
create index nodos_evacuacion_idx on public.nodos (evacuacion) where evacuacion is not null;

-- marcadores_mapa() devuelve ahora `evacuacion` e incluye los nodos marcados, para
-- dibujar salidas y puntos de reunión. Cambia el tipo de retorno, así que hay que
-- borrarla y crearla de nuevo (CREATE OR REPLACE no lo permite).
drop function public.marcadores_mapa();

create function public.marcadores_mapa()
returns table (
  id uuid,
  nombre text,
  tipo text,
  icono text,
  logo_path text,
  piso integer,
  lat double precision,
  lng double precision,
  buscable boolean,
  evacuacion text
)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, n.nombre, n.tipo::text, n.icono, n.logo_path, n.piso, n.lat, n.lng, n.buscable, n.evacuacion
  from public.nodos n
  where n.lat is not null
    and n.lng is not null
    and (n.icono is not null or n.evacuacion is not null or n.tipo in ('escalera', 'elevador', 'bano'))
  order by n.piso, n.nombre;
$$;

revoke all on function public.marcadores_mapa() from public;
grant execute on function public.marcadores_mapa() to anon, authenticated;

comment on function public.marcadores_mapa() is 'Iconos del mapa (alumno y visitante): solo campos públicos de los nodos con categoría, marcados para evacuación o de tipo escalera/elevador/bano.';
