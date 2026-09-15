-- ============================================================================
-- IEST-MAPS v2 — Conexiones sin duplicados y sin costos negativos
-- ============================================================================
-- El self-loop (un nodo conectado consigo mismo) ya estaba bloqueado desde
-- 0001 con conexiones_no_self_loop. Esta migración cierra los otros dos
-- puntos del checklist: evitar conexiones duplicadas (incluida la misma
-- arista registrada al revés cuando es bidireccional) y costos negativos.

alter table public.conexiones
  add constraint conexiones_costo_no_negativo check (costo is null or costo >= 0);

create or replace function public.validar_conexion_no_duplicada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.conexiones c
    where c.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and (
        -- misma dirección exacta
        (c.nodo_origen_id = new.nodo_origen_id and c.nodo_destino_id = new.nodo_destino_id)
        or (
          -- dirección invertida: solo es duplicado si alguna de las dos ya
          -- cubre ambos sentidos (bidireccional)
          c.nodo_origen_id = new.nodo_destino_id
          and c.nodo_destino_id = new.nodo_origen_id
          and (c.bidireccional or new.bidireccional)
        )
      )
  ) then
    raise exception 'Ya existe una conexión entre estos dos nodos';
  end if;
  return new;
end;
$$;

drop trigger if exists validar_conexion_no_duplicada on public.conexiones;
create trigger validar_conexion_no_duplicada
  before insert or update on public.conexiones
  for each row
  execute function public.validar_conexion_no_duplicada();
