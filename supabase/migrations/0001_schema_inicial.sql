-- ============================================================================
-- IEST-MAPS v2 — Schema inicial (Postgres / Supabase)
-- ============================================================================
-- Cómo aplicar este archivo (sin necesidad de instalar la CLI de Supabase):
--   1. Entra a tu proyecto en supabase.com -> SQL Editor -> New query.
--   2. Pega todo este archivo y dale Run.
-- Si más adelante usan la CLI de Supabase, este mismo archivo puede vivir en
-- supabase/migrations/0001_schema_inicial.sql y aplicarse con `supabase db push`.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. profiles — 1:1 con auth.users, agrega el rol de cada usuario
-- ----------------------------------------------------------------------------

create type public.rol_usuario as enum ('administrador', 'guardia', 'alumno', 'visitante');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol public.rol_usuario not null default 'alumno',
  nombre text,
  correo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Datos de perfil y rol de cada usuario. Se crea automáticamente al registrarse (ver trigger más abajo).';

-- ----------------------------------------------------------------------------
-- 2. Trigger: restringir el dominio de correo institucional
-- ----------------------------------------------------------------------------
-- Supabase no tiene una opción nativa para restringir el login de Google por
-- dominio, así que se valida aquí. Los usuarios anónimos (visitantes) no
-- tienen correo y se dejan pasar sin esta validación.

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
  return new;
end;
$$;

create trigger validar_dominio_institucional
  before insert on auth.users
  for each row
  execute function public.validar_dominio_institucional();

-- ----------------------------------------------------------------------------
-- 3. Trigger: crear el profile automáticamente al crear el usuario en auth
-- ----------------------------------------------------------------------------
-- Rol por defecto: 'visitante' si es un usuario anónimo (QR del guardia),
-- 'alumno' en cualquier otro caso. Los roles 'administrador' y 'guardia' se
-- asignan a mano después, desde el panel de administrador (nadie se
-- auto-asigna esos roles con solo iniciar sesión).

create or replace function public.crear_profile_para_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, rol, correo)
  values (
    new.id,
    case when new.is_anonymous then 'visitante'::public.rol_usuario else 'alumno'::public.rol_usuario end,
    new.email
  );
  return new;
end;
$$;

create trigger crear_profile_para_nuevo_usuario
  after insert on auth.users
  for each row
  execute function public.crear_profile_para_nuevo_usuario();

-- ----------------------------------------------------------------------------
-- 4. Helper: rol del usuario actual (evita recursión de RLS sobre profiles)
-- ----------------------------------------------------------------------------

create or replace function public.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.profiles where id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- 5. edificios
-- ----------------------------------------------------------------------------

create table public.edificios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6. nodos — grafo del campus (entradas, pasillos, salones, oficinas, etc.)
-- ----------------------------------------------------------------------------

create type public.tipo_nodo as enum (
  'entrada', 'pasillo', 'salon', 'oficina', 'bano',
  'escalera', 'elevador', 'edificio'
);

create table public.nodos (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_nodo not null,
  nombre text not null,
  nombres_alternativos text[] not null default '{}',
  lat double precision not null,
  lng double precision not null,
  piso integer not null default 0,
  edificio_id uuid references public.edificios (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index nodos_edificio_id_idx on public.nodos (edificio_id);

-- Búsqueda de destino por nombre (usuario/visitante buscando "salón 204", etc.)
create extension if not exists pg_trgm;
create index nodos_nombre_trgm_idx on public.nodos using gin (nombre gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 7. conexiones — aristas del grafo, entre dos nodos
-- ----------------------------------------------------------------------------

create table public.conexiones (
  id uuid primary key default gen_random_uuid(),
  nodo_origen_id uuid not null references public.nodos (id) on delete cascade,
  nodo_destino_id uuid not null references public.nodos (id) on delete cascade,
  costo numeric,
  bidireccional boolean not null default true,
  created_at timestamptz not null default now(),
  constraint conexiones_no_self_loop check (nodo_origen_id <> nodo_destino_id)
);

create index conexiones_origen_idx on public.conexiones (nodo_origen_id);
create index conexiones_destino_idx on public.conexiones (nodo_destino_id);

-- ----------------------------------------------------------------------------
-- 8. registro_visitante
-- ----------------------------------------------------------------------------

create table public.registro_visitante (
  id uuid primary key default gen_random_uuid(),
  visitante_profile_id uuid not null references public.profiles (id) on delete cascade,
  guardia_profile_id uuid not null references public.profiles (id),
  nombre text not null,
  telefono text,
  motivo text,
  origen_nodo_id uuid references public.nodos (id),
  destino_nodo_id uuid references public.nodos (id),
  estado text not null default 'activo' check (estado in ('activo', 'finalizado')),
  hora_entrada timestamptz not null default now(),
  hora_salida timestamptz
);

create index registro_visitante_estado_idx on public.registro_visitante (estado);
create index registro_visitante_visitante_idx on public.registro_visitante (visitante_profile_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.edificios enable row level security;
alter table public.nodos enable row level security;
alter table public.conexiones enable row level security;
alter table public.registro_visitante enable row level security;

-- --- profiles ---------------------------------------------------------------

create policy "cada quien ve su propio profile, admin ve todos"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.rol_actual() = 'administrador');

create policy "solo admin actualiza profiles (roles, nombres)"
  on public.profiles for update
  to authenticated
  using (public.rol_actual() = 'administrador');

-- No hay policy de insert: los profiles solo se crean por el trigger
-- (security definer), nunca directo desde el cliente.

-- --- edificios / nodos / conexiones ------------------------------------------
-- Los 4 roles necesitan leer el grafo para calcular/mostrar rutas.
-- Solo el administrador lo edita (CRUD del grafo).

create policy "cualquier usuario autenticado lee edificios"
  on public.edificios for select
  to authenticated
  using (true);

create policy "solo admin escribe edificios"
  on public.edificios for insert to authenticated with check (public.rol_actual() = 'administrador');
create policy "solo admin actualiza edificios"
  on public.edificios for update to authenticated using (public.rol_actual() = 'administrador');
create policy "solo admin borra edificios"
  on public.edificios for delete to authenticated using (public.rol_actual() = 'administrador');

create policy "cualquier usuario autenticado lee nodos"
  on public.nodos for select
  to authenticated
  using (true);

create policy "solo admin escribe nodos"
  on public.nodos for insert to authenticated with check (public.rol_actual() = 'administrador');
create policy "solo admin actualiza nodos"
  on public.nodos for update to authenticated using (public.rol_actual() = 'administrador');
create policy "solo admin borra nodos"
  on public.nodos for delete to authenticated using (public.rol_actual() = 'administrador');

create policy "cualquier usuario autenticado lee conexiones"
  on public.conexiones for select
  to authenticated
  using (true);

create policy "solo admin escribe conexiones"
  on public.conexiones for insert to authenticated with check (public.rol_actual() = 'administrador');
create policy "solo admin actualiza conexiones"
  on public.conexiones for update to authenticated using (public.rol_actual() = 'administrador');
create policy "solo admin borra conexiones"
  on public.conexiones for delete to authenticated using (public.rol_actual() = 'administrador');

-- --- registro_visitante -------------------------------------------------------

create policy "guardia y admin ven todos los registros de visita"
  on public.registro_visitante for select
  to authenticated
  using (public.rol_actual() in ('guardia', 'administrador'));

create policy "el visitante ve su propio registro"
  on public.registro_visitante for select
  to authenticated
  using (visitante_profile_id = auth.uid());

create policy "solo guardia registra visitantes"
  on public.registro_visitante for insert
  to authenticated
  with check (public.rol_actual() = 'guardia');

create policy "guardia y admin actualizan (ej. finalizar visita)"
  on public.registro_visitante for update
  to authenticated
  using (public.rol_actual() in ('guardia', 'administrador'));
