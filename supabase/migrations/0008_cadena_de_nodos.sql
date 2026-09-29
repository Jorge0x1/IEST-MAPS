-- ============================================================================
-- IEST-MAPS v2 — Trazar una cadena de nodos y conexiones de un solo golpe
-- ============================================================================
-- Cargar el grafo nodo por nodo y conexión por conexión desde el panel de
-- admin no escala para un pasillo completo. Esta migración agrega:
--
--   1. distancia_metros: fórmula de Haversine, para calcular costo (la
--      distancia real) a partir de las coordenadas de dos nodos en vez de
--      pedirlo a mano.
--   2. crear_cadena_nodos: recibe una lista ordenada de puntos y crea, en una
--      sola transacción, un nodo por punto y una conexión entre cada par
--      consecutivo (con el costo ya calculado). Si algo falla a la mitad
--      (por ejemplo dos puntos duplicados que disparan el trigger de
--      conexiones sin duplicados), se revierte todo — no deja una cadena a
--      medias.
--
-- Es SECURITY INVOKER (el valor por defecto): las políticas RLS de insert en
-- nodos/conexiones (solo administrador) se siguen aplicando tal cual, así que
-- no hace falta duplicar esa validación aquí.

create or replace function public.distancia_metros(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
)
returns double precision
language sql
immutable
as $$
  select 6371000 * acos(
    least(1.0, greatest(-1.0,
      sin(radians(lat1)) * sin(radians(lat2))
      + cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2 - lng1))
    ))
  )
$$;

create or replace function public.crear_cadena_nodos(
  p_nodos jsonb,
  p_bidireccional boolean default true
)
returns table (id uuid, nombre text)
language plpgsql
set search_path = public
as $$
declare
  nodo jsonb;
  nuevo_id uuid;
  anterior_id uuid;
  lat_anterior double precision;
  lng_anterior double precision;
  lat_actual double precision;
  lng_actual double precision;
  costo_calc numeric;
  ids uuid[] := '{}';
begin
  if jsonb_typeof(p_nodos) is distinct from 'array' or jsonb_array_length(p_nodos) < 2 then
    raise exception 'Se necesitan al menos dos puntos para crear una cadena';
  end if;

  for nodo in select * from jsonb_array_elements(p_nodos)
  loop
    lat_actual := nullif(nodo->>'lat', '')::double precision;
    lng_actual := nullif(nodo->>'lng', '')::double precision;

    insert into public.nodos (nombre, tipo, edificio_id, piso, lat, lng, buscable)
    values (
      nodo->>'nombre',
      (nodo->>'tipo')::public.tipo_nodo,
      nullif(nodo->>'edificio_id', '')::uuid,
      (nodo->>'piso')::integer,
      lat_actual,
      lng_actual,
      coalesce((nodo->>'buscable')::boolean, false)
    )
    returning nodos.id into nuevo_id;

    ids := array_append(ids, nuevo_id);

    if anterior_id is not null then
      costo_calc := null;
      if lat_anterior is not null and lng_anterior is not null
         and lat_actual is not null and lng_actual is not null then
        costo_calc := round(
          public.distancia_metros(lat_anterior, lng_anterior, lat_actual, lng_actual)::numeric,
          2
        );
      end if;

      insert into public.conexiones (nodo_origen_id, nodo_destino_id, bidireccional, costo)
      values (anterior_id, nuevo_id, p_bidireccional, costo_calc);
    end if;

    anterior_id := nuevo_id;
    lat_anterior := lat_actual;
    lng_anterior := lng_actual;
  end loop;

  return query select n.id, n.nombre from public.nodos n where n.id = any(ids);
end;
$$;

revoke all on function public.crear_cadena_nodos(jsonb, boolean) from public;
grant execute on function public.crear_cadena_nodos(jsonb, boolean) to authenticated;
