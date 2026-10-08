-- ============================================================================
-- IEST-MAPS v2 — La visita pública expone los IDs de origen y destino
-- ============================================================================
-- El motor de rutas (lib/rutas) necesita los IDs de los nodos de origen y
-- destino de la visita para calcular el recorrido del visitante. Hasta 0005,
-- obtener_visita_por_token solo devolvía los nombres ya resueltos.
--
-- Requiere 0005 (origen/destino por nodo). Como cambian las columnas de
-- salida, hay que recrear la función (CREATE OR REPLACE no permite cambiar las
-- columnas de un RETURNS TABLE). Se conservan todas las columnas anteriores.

drop function if exists public.obtener_visita_por_token(text);

create function public.obtener_visita_por_token(p_token_hash text)
returns table (
  id uuid,
  nombre text,
  motivo text,
  estado text,
  hora_entrada timestamptz,
  hora_salida timestamptz,
  destino_nombre text,
  destino_piso integer,
  origen_nombre text,
  origen_nodo_id uuid,
  destino_nodo_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    rv.id,
    rv.nombre,
    rv.motivo,
    rv.estado,
    rv.hora_entrada,
    rv.hora_salida,
    coalesce(dn.nombre, e.nombre) as destino_nombre,
    dn.piso as destino_piso,
    orn.nombre as origen_nombre,
    rv.origen_nodo_id,
    rv.destino_nodo_id
  from public.registro_visitante rv
  left join public.edificios e on e.id = rv.destino_edificio_id
  left join public.nodos dn on dn.id = rv.destino_nodo_id
  left join public.nodos orn on orn.id = rv.origen_nodo_id
  where rv.access_token_hash = p_token_hash
    and rv.token_expires_at > now()
  limit 1
$$;

revoke all on function public.obtener_visita_por_token(text) from public;
grant execute on function public.obtener_visita_por_token(text) to anon, authenticated;
