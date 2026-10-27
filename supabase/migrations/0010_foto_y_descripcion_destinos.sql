-- ============================================================================
-- 0010 — Descripción y foto de los destinos
-- ============================================================================
-- Cómo aplicar (igual que las anteriores): Supabase -> SQL Editor -> New query,
-- pegar este archivo completo y Run.
--
-- Qué hace:
--   1. Agrega a `nodos` la descripción (máx. 500 caracteres) y la ruta de la
--      foto dentro del bucket (`foto_path`, no la URL: así no depende del dominio).
--   2. Crea el bucket de Storage `destinos`, PÚBLICO para lectura: el visitante
--      no tiene sesión de Supabase y las fotos del campus no son sensibles.
--      Solo acepta JPEG de hasta 2 MB (el navegador del admin las reduce antes
--      de subirlas, a un máximo de 1280 px).
--   3. Solo el administrador puede subir, reemplazar o borrar archivos del bucket.
--
-- Convención de nombre: `<uuid>.jpg` en la raíz del bucket (uuid generado en el
-- navegador al subir). Una foto nueva siempre tiene nombre nuevo, así no hay
-- caché vieja en el navegador ni en la CDN.
-- ============================================================================

-- --- 1. Columnas en nodos -----------------------------------------------------

alter table public.nodos
  add column descripcion text,
  add column foto_path text;

alter table public.nodos
  add constraint nodos_descripcion_longitud
    check (descripcion is null or char_length(descripcion) <= 500),
  add constraint nodos_foto_path_formato
    check (
      foto_path is null
      or foto_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
    );

comment on column public.nodos.descripcion is 'Texto corto que ve el alumno/visitante junto a la foto del destino.';
comment on column public.nodos.foto_path is 'Ruta del archivo en el bucket público `destinos` (<uuid>.jpg).';

-- --- 2. Bucket público ----------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('destinos', 'destinos', true, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- --- 3. Políticas: la lectura pública no necesita política (URL pública);
--        todo lo demás es solo del administrador ---------------------------------

create policy "admin consulta archivos de destinos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'destinos' and public.rol_actual() = 'administrador');

create policy "admin sube fotos de destinos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'destinos' and public.rol_actual() = 'administrador');

create policy "admin reemplaza fotos de destinos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'destinos' and public.rol_actual() = 'administrador')
  with check (bucket_id = 'destinos' and public.rol_actual() = 'administrador');

create policy "admin borra fotos de destinos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'destinos' and public.rol_actual() = 'administrador');
