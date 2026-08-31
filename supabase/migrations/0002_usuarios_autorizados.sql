-- ============================================================================
-- IEST-MAPS v2 — Altas previas, roles asignados y revocación de acceso
-- ============================================================================

create extension if not exists citext;

alter table public.profiles
  add column if not exists activo boolean not null default true;

create table public.usuarios_autorizados (
  id uuid primary key default gen_random_uuid(),
  correo citext not null unique,
  nombre text,
  rol public.rol_usuario not null default 'alumno',
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'activo', 'desactivado')),
  profile_id uuid unique references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz,
  constraint usuarios_autorizados_sin_visitantes
    check (rol <> 'visitante'::public.rol_usuario),
  constraint usuarios_autorizados_correo_institucional
    check (correo::text ilike '%@iest.edu.mx')
);

alter table public.usuarios_autorizados enable row level security;

create policy "solo admin lee usuarios autorizados"
  on public.usuarios_autorizados for select
  to authenticated
  using (public.rol_actual() = 'administrador');

create policy "solo admin crea usuarios autorizados"
  on public.usuarios_autorizados for insert
  to authenticated
  with check (public.rol_actual() = 'administrador');

create policy "solo admin actualiza usuarios autorizados"
  on public.usuarios_autorizados for update
  to authenticated
  using (public.rol_actual() = 'administrador')
  with check (public.rol_actual() = 'administrador');

create policy "solo admin borra usuarios autorizados"
  on public.usuarios_autorizados for delete
  to authenticated
  using (public.rol_actual() = 'administrador');

-- Un usuario desactivado deja de tener rol efectivo para las políticas RLS.
create or replace function public.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.profiles where id = auth.uid() and activo = true
$$;

create or replace function public.usuario_activo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and activo = true
  )
$$;

-- Mantiene la restricción institucional y rechaza altas previamente revocadas.
create or replace function public.validar_dominio_institucional()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_anonymous is not true
     and new.email is not null
     and new.email not ilike '%@iest.edu.mx' then
    raise exception 'Solo se permite el acceso con correo institucional (@iest.edu.mx)';
  end if;

  if new.email is not null and exists (
    select 1 from public.usuarios_autorizados
    where correo = new.email and estado = 'desactivado'
  ) then
    raise exception 'El acceso de esta cuenta está desactivado';
  end if;

  return new;
end;
$$;

-- Al primer login toma el nombre y rol preasignados, y activa el alta pendiente.
create or replace function public.crear_profile_para_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  alta public.usuarios_autorizados%rowtype;
  rol_inicial public.rol_usuario;
  nombre_inicial text;
begin
  if new.email is not null then
    select * into alta
    from public.usuarios_autorizados
    where correo = new.email;
  end if;

  rol_inicial := case
    when new.is_anonymous then 'visitante'::public.rol_usuario
    when alta.id is not null then alta.rol
    else 'alumno'::public.rol_usuario
  end;

  nombre_inicial := coalesce(
    alta.nombre,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name'
  );

  insert into public.profiles (id, rol, nombre, correo, activo)
  values (new.id, rol_inicial, nombre_inicial, new.email, true);

  if alta.id is not null then
    update public.usuarios_autorizados
    set profile_id = new.id,
        estado = 'activo',
        activated_at = now(),
        updated_at = now()
    where id = alta.id;
  end if;

  return new;
end;
$$;

-- Las cuentas privilegiadas existentes aparecen también en el registro de altas.
insert into public.usuarios_autorizados (
  correo, nombre, rol, estado, profile_id, activated_at
)
select correo, nombre, rol, 'activo', id, created_at
from public.profiles
where correo is not null and rol in ('administrador', 'guardia')
on conflict (correo) do nothing;

-- Los usuarios autenticados pero desactivados tampoco pueden leer el grafo.
drop policy if exists "cualquier usuario autenticado lee edificios" on public.edificios;
create policy "usuarios activos leen edificios"
  on public.edificios for select to authenticated
  using (public.usuario_activo());

drop policy if exists "cualquier usuario autenticado lee nodos" on public.nodos;
create policy "usuarios activos leen nodos"
  on public.nodos for select to authenticated
  using (public.usuario_activo());

drop policy if exists "cualquier usuario autenticado lee conexiones" on public.conexiones;
create policy "usuarios activos leen conexiones"
  on public.conexiones for select to authenticated
  using (public.usuario_activo());

drop policy if exists "el visitante ve su propio registro" on public.registro_visitante;
create policy "el visitante activo ve su propio registro"
  on public.registro_visitante for select to authenticated
  using (visitante_profile_id = auth.uid() and public.usuario_activo());
