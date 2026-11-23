-- ============================================================================
-- 0011 — Iconos y logos de los destinos en el mapa
-- ============================================================================
-- Cómo aplicar (igual que las anteriores): Supabase -> SQL Editor -> New query,
-- pegar este archivo completo y Run.
--
-- Qué hace:
--   1. Agrega a `nodos` la categoría del icono en el mapa (`icono`) y la ruta del
--      logo dentro del bucket `destinos` (`logo_path`, <uuid>.png|webp).
--   2. El bucket `destinos` acepta también PNG y WebP (los logos necesitan
--      transparencia). SVG NO: en un bucket público un SVG puede llevar scripts.
--   3. Crea `marcadores_mapa()`: devuelve solo los campos públicos de los nodos que
--      se dibujan como icono (con categoría, o escaleras, elevadores y baños). Es
--      `security definer` para que el visitante, que no tiene sesión de Supabase,
--      también los vea sin abrir la tabla `nodos` a `anon`.
--
-- Requiere 0010 (bucket `destinos`).
-- ============================================================================

-- --- 1. Columnas en nodos -----------------------------------------------------

alter table public.nodos
  add column icono text,
  add column logo_path text;

alter table public.nodos
  add constraint nodos_icono_valido
    check (icono is null or icono in ('comida', 'cafe', 'monumento', 'tienda', 'deporte', 'servicio')),
  add constraint nodos_logo_path_formato
    check (
      logo_path is null
      or logo_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|webp)$'
    );

comment on column public.nodos.icono is 'Categoría del icono en el mapa (comida, cafe, monumento, tienda, deporte, servicio). Null = sin icono propio.';
comment on column public.nodos.logo_path is 'Logo opcional en el bucket público `destinos` (<uuid>.png|webp). Reemplaza al icono genérico.';

-- --- 2. Bucket: JPEG (fotos) + PNG/WebP (logos) ---------------------------------

update storage.buckets
  set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id = 'destinos';

-- --- 3. Marcadores públicos del mapa --------------------------------------------

create or replace function public.marcadores_mapa()
returns table (
  id uuid,
  nombre text,
  tipo text,
  icono text,
  logo_path text,
  piso integer,
  lat double precision,
  lng double precision,
  buscable boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, n.nombre, n.tipo::text, n.icono, n.logo_path, n.piso, n.lat, n.lng, n.buscable
  from public.nodos n
  where n.lat is not null
    and n.lng is not null
    and (n.icono is not null or n.tipo in ('escalera', 'elevador', 'bano'))
  order by n.piso, n.nombre;
$$;

revoke all on function public.marcadores_mapa() from public;
grant execute on function public.marcadores_mapa() to anon, authenticated;

comment on function public.marcadores_mapa() is 'Iconos del mapa (alumno y visitante): solo campos públicos de los nodos con categoría o de tipo escalera/elevador/bano.';
