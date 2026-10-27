// Fotos de los destinos (migración 0010). Viven en el bucket público `destinos`
// de Supabase Storage; en la base solo se guarda la ruta del archivo.
// Sin dependencias del servidor, así que sirve en server y client components.

export const BUCKET_DESTINOS = "destinos";

// Formato que exige la migración 0010: <uuid v4 en minúsculas>.jpg
export const RE_FOTO_DESTINO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;

// URL pública de la foto, o null si el destino no tiene.
export function urlFotoDestino(path: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  return `${base}/storage/v1/object/public/${BUCKET_DESTINOS}/${path}`;
}
