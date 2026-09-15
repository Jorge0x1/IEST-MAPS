-- ============================================================================
-- IEST-MAPS v2 — Visitas ligadas a nodos específicos (destino y origen)
-- ============================================================================
-- Hasta ahora el guardia solo elegía un edificio como destino
-- (destino_edificio_id) aunque la tabla ya tenía columnas para un nodo de
-- destino y un nodo de origen. Esta migración hace que esas columnas se usen
-- de verdad: el destino pasa a ser un nodo buscable concreto (con su piso) y
-- el origen es un nodo de tipo 'entrada'. destino_edificio_id se conserva
-- para no romper registros anteriores, pero ahora se deriva automáticamente
-- del nodo elegido en vez de capturarse por separado.

create index if not exists registro_visitante_destino_nodo_idx
  on public.registro_visitante (destino_nodo_id);
create index if not exists registro_visitante_origen_nodo_idx
  on public.registro_visitante (origen_nodo_id);

-- ----------------------------------------------------------------------------
-- Validación a nivel de base de datos: el destino debe ser un nodo buscable
-- y el origen debe ser una entrada. La app ya valida esto antes de insertar,
-- pero esto evita que un registro inconsistente llegue por cualquier otro
-- camino (RPC futura, SQL editor, etc.).
-- ----------------------------------------------------------------------------

create or replace function public.validar_visita_nodos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  destino_buscable boolean;
  origen_tipo public.tipo_nodo;
begin
  if new.destino_nodo_id is not null then
    select buscable into destino_buscable
    from public.nodos where id = new.destino_nodo_id;

    if destino_buscable is null then
      raise exception 'El nodo de destino no existe';
    elsif not destino_buscable then
      raise exception 'El nodo de destino debe ser un destino buscable';
    end if;
  end if;

  if new.origen_nodo_id is not null then
    select tipo into origen_tipo
    from public.nodos where id = new.origen_nodo_id;

    if origen_tipo is null then
      raise exception 'El nodo de origen no existe';
    elsif origen_tipo <> 'entrada' then
      raise exception 'El nodo de origen debe ser una entrada';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validar_visita_nodos on public.registro_visitante;
create trigger validar_visita_nodos
  before insert or update on public.registro_visitante
  for each row
  execute function public.validar_visita_nodos();

-- ----------------------------------------------------------------------------
-- La función pública del visitante ahora también expone el piso del destino
-- y el nombre de la entrada asignada. Como cambian las columnas de salida,
-- hay que recrear la función (CREATE OR REPLACE no permite cambiar las
-- columnas de un RETURNS TABLE).
-- ----------------------------------------------------------------------------

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
  origen_nombre text
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
    orn.nombre as origen_nombre
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
