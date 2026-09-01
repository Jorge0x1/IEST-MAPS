"use server";

import { revalidatePath } from "next/cache";
import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

export type EstadoEdificio = { ok: boolean; mensaje: string };
type DatosEdificio = {
  nombre: string;
  descripcion: string | null;
  lat: number | null;
  lng: number | null;
};
type ValidacionEdificio =
  | { ok: false; error: string }
  | { ok: true; data: DatosEdificio };

function leerCoordenada(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : Number.NaN;
}

function validarEdificio(formData: FormData): ValidacionEdificio {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const lat = leerCoordenada(formData.get("lat"));
  const lng = leerCoordenada(formData.get("lng"));

  if (nombre.length < 2 || nombre.length > 100) {
    return { ok: false, error: "El nombre debe tener entre 2 y 100 caracteres." };
  }
  if (descripcion.length > 500) {
    return { ok: false, error: "La descripción no puede exceder 500 caracteres." };
  }
  if ((lat === null) !== (lng === null)) {
    return { ok: false, error: "Captura ambas coordenadas o deja ambas vacías." };
  }
  if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
    return { ok: false, error: "La latitud debe estar entre -90 y 90." };
  }
  if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
    return { ok: false, error: "La longitud debe estar entre -180 y 180." };
  }

  return { ok: true, data: { nombre, descripcion: descripcion || null, lat, lng } };
}

export async function crearEdificio(
  _estado: EstadoEdificio,
  formData: FormData,
): Promise<EstadoEdificio> {
  await requerirRol("administrador");
  const validacion = validarEdificio(formData);
  if (!validacion.ok) return { ok: false, mensaje: validacion.error };

  const supabase = await createClient();
  const { error } = await supabase.from("edificios").insert(validacion.data);
  if (error) return { ok: false, mensaje: "No se pudo crear el edificio." };

  revalidatePath("/admin/edificios");
  return { ok: true, mensaje: "Edificio creado correctamente." };
}

export async function actualizarEdificio(
  edificioId: string,
  _estado: EstadoEdificio,
  formData: FormData,
): Promise<EstadoEdificio> {
  await requerirRol("administrador");
  const validacion = validarEdificio(formData);
  if (!validacion.ok) return { ok: false, mensaje: validacion.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("edificios")
    .update(validacion.data)
    .eq("id", edificioId);
  if (error) return { ok: false, mensaje: "No se pudo actualizar el edificio." };

  revalidatePath("/admin/edificios");
  return { ok: true, mensaje: "Cambios guardados." };
}

export async function eliminarEdificio(edificioId: string): Promise<EstadoEdificio> {
  await requerirRol("administrador");
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("nodos")
    .select("id", { count: "exact", head: true })
    .eq("edificio_id", edificioId);

  if (countError) return { ok: false, mensaje: "No se pudo verificar el contenido del edificio." };
  if ((count ?? 0) > 0) {
    return { ok: false, mensaje: `No se puede eliminar: contiene ${count} nodo(s).` };
  }

  const { error } = await supabase.from("edificios").delete().eq("id", edificioId);
  if (error) return { ok: false, mensaje: "No se pudo eliminar el edificio." };

  revalidatePath("/admin/edificios");
  return { ok: true, mensaje: "Edificio eliminado." };
}
