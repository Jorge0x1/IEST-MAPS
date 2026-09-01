-- ============================================================================
-- IEST-MAPS v2 — Visitas con destino por edificio y acceso mediante token
-- ============================================================================

alter table public.registro_visitante
  alter column visitante_profile_id drop not null;

alter table public.registro_visitante
  add column if not exists destino_edificio_id uuid
    references public.edificios (id) on delete restrict,
  add column if not exists access_token_hash text unique,
  add column if not exists token_expires_at timestamptz;

create index if not exists registro_visitante_destino_edificio_idx
  on public.registro_visitante (destino_edificio_id);

drop policy if exists "solo guardia registra visitantes" on public.registro_visitante;
create policy "guardia registra sus visitantes"
  on public.registro_visitante for insert
  to authenticated
  with check (
    public.rol_actual() = 'guardia'
    and guardia_profile_id = auth.uid()
  );

-- Devuelve únicamente la información necesaria para la pantalla del visitante.
create or replace function public.obtener_visita_por_token(p_token_hash text)
returns table (
  id uuid,
  nombre text,
  motivo text,
  estado text,
  hora_entrada timestamptz,
  hora_salida timestamptz,
  destino_edificio_id uuid,
  destino_nombre text
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
    rv.destino_edificio_id,
    e.nombre
  from public.registro_visitante rv
  left join public.edificios e on e.id = rv.destino_edificio_id
  where rv.access_token_hash = p_token_hash
    and rv.token_expires_at > now()
  limit 1
$$;

create or replace function public.finalizar_visita_por_token(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.registro_visitante
  set estado = 'finalizado', hora_salida = now()
  where access_token_hash = p_token_hash
    and token_expires_at > now()
    and estado = 'activo';
  return found;
end;
$$;

revoke all on function public.obtener_visita_por_token(text) from public;
revoke all on function public.finalizar_visita_por_token(text) from public;
grant execute on function public.obtener_visita_por_token(text) to anon, authenticated;
grant execute on function public.finalizar_visita_por_token(text) to anon, authenticated;
