"use server";

import { revalidatePath } from "next/cache";
import { BUCKET_DESTINOS, RE_FOTO_DESTINO } from "@/lib/fotos";
import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

export type EstadoDestino = { ok: boolean; mensaje: string };

const tiposNodo = [
  "entrada", "pasillo", "salon", "oficina", "bano",
  "escalera", "elevador", "servicio", "edificio",
] as const;

type TipoNodo = (typeof tiposNodo)[number];
type DatosDestino = {
  nombre: string;
  tipo: TipoNodo;
  nombres_alternativos: string[];
  edificio_id: string;
  piso: number;
  lat: number | null;
  lng: number | null;
  buscable: boolean;
  descripcion: string | null;
  foto_path: string | null;
};

const MAX_DESCRIPCION = 500;

// Borra una foto del bucket. Si falla no se interrumpe nada: lo peor es un
// archivo huérfano en Storage, y se deja registro para limpiarlo a mano.
async function borrarFoto(supabase: Awaited<ReturnType<typeof createClient>>, ruta: string) {
  const { error } = await supabase.storage.from(BUCKET_DESTINOS).remove([ruta]);
  if (error) console.error("[destinos] No se pudo borrar la foto", ruta, error.message);
}

function leerEntero(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();
  if (!texto) return Number.NaN;
  return Number(texto);
}

function leerCoordenada(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : Number.NaN;
}

function validarDestino(formData: FormData): { ok: true; data: DatosDestino } | { ok: false; error: string } {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "") as TipoNodo;
  const edificioId = String(formData.get("edificio_id") ?? "").trim();
  const piso = leerEntero(formData.get("piso"));
  const lat = leerCoordenada(formData.get("lat"));
  const lng = leerCoordenada(formData.get("lng"));
  const aliasesTexto = String(formData.get("nombres_alternativos") ?? "");
  const nombresAlternativos = [...new Set(
    aliasesTexto.split(",").map((alias) => alias.trim()).filter(Boolean),
  )];

  if (nombre.length < 2 || nombre.length > 120) {
    return { ok: false, error: "El nombre debe tener entre 2 y 120 caracteres." };
  }
  if (!tiposNodo.includes(tipo)) {
    return { ok: false, error: "Selecciona un tipo de nodo válido." };
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(edificioId)) {
    return { ok: false, error: "Selecciona un edificio válido." };
  }
  if (!Number.isInteger(piso) || piso < -10 || piso > 100) {
    return { ok: false, error: "El piso debe ser un entero entre -10 y 100." };
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
  if (nombresAlternativos.some((alias) => alias.length > 100) || nombresAlternativos.length > 20) {
    return { ok: false, error: "Agrega como máximo 20 alias de hasta 100 caracteres." };
  }
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (descripcion.length > MAX_DESCRIPCION) {
    return { ok: false, error: `La descripción puede tener como máximo ${MAX_DESCRIPCION} caracteres.` };
  }
  const fotoPath = String(formData.get("foto_path") ?? "").trim();
  if (fotoPath && !RE_FOTO_DESTINO.test(fotoPath)) {
    return { ok: false, error: "La foto no es válida. Vuelve a subirla." };
  }

  return {
    ok: true,
    data: {
      nombre,
      tipo,
      nombres_alternativos: nombresAlternativos,
      edificio_id: edificioId,
      piso,
      lat,
      lng,
      buscable: formData.get("buscable") === "on",
      descripcion: descripcion || null,
      foto_path: fotoPath || null,
    },
  };
}

async function edificioExiste(edificioId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("edificios").select("id").eq("id", edificioId).maybeSingle();
  return !error && Boolean(data);
}

export async function crearDestino(_estado: EstadoDestino, formData: FormData): Promise<EstadoDestino> {
  await requerirRol("administrador");
  const validacion = validarDestino(formData);
  if (!validacion.ok) return { ok: false, mensaje: validacion.error };
  if (!(await edificioExiste(validacion.data.edificio_id))) {
    return { ok: false, mensaje: "El edificio seleccionado ya no existe." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("nodos").insert(validacion.data);
  if (error) return { ok: false, mensaje: "No se pudo crear el destino." };

  revalidatePath("/admin/destinos");
  revalidatePath("/admin/edificios");
  return { ok: true, mensaje: "Destino creado correctamente." };
}

export async function actualizarDestino(
  destinoId: string,
  _estado: EstadoDestino,
  formData: FormData,
): Promise<EstadoDestino> {
  await requerirRol("administrador");
  const validacion = validarDestino(formData);
  if (!validacion.ok) return { ok: false, mensaje: validacion.error };
  if (!(await edificioExiste(validacion.data.edificio_id))) {
    return { ok: false, mensaje: "El edificio seleccionado ya no existe." };
  }

  const supabase = await createClient();
  const { data: previo } = await supabase.from("nodos").select("foto_path").eq("id", destinoId).maybeSingle();
  const { error } = await supabase.from("nodos").update(validacion.data).eq("id", destinoId);
  if (error) return { ok: false, mensaje: "No se pudieron guardar los cambios." };

  // Si la foto cambió o se quitó, la anterior ya no se usa en ningún lado.
  if (previo?.foto_path && previo.foto_path !== validacion.data.foto_path) {
    await borrarFoto(supabase, previo.foto_path);
  }

  revalidatePath("/admin/destinos");
  revalidatePath("/admin/edificios");
  return { ok: true, mensaje: "Cambios guardados." };
}

export async function eliminarDestino(destinoId: string): Promise<EstadoDestino> {
  await requerirRol("administrador");
  const supabase = await createClient();
  const { count, error: conexionesError } = await supabase
    .from("conexiones")
    .select("id", { count: "exact", head: true })
    .or(`nodo_origen_id.eq.${destinoId},nodo_destino_id.eq.${destinoId}`);

  if (conexionesError) return { ok: false, mensaje: "No se pudo verificar el uso del nodo." };
  if ((count ?? 0) > 0) {
    return { ok: false, mensaje: `No se puede eliminar: tiene ${count} conexión(es).` };
  }

  const { data: previo } = await supabase.from("nodos").select("foto_path").eq("id", destinoId).maybeSingle();
  const { error } = await supabase.from("nodos").delete().eq("id", destinoId);
  if (error) return { ok: false, mensaje: "No se puede eliminar porque el nodo está en uso." };
  if (previo?.foto_path) await borrarFoto(supabase, previo.foto_path);

  revalidatePath("/admin/destinos");
  revalidatePath("/admin/edificios");
  return { ok: true, mensaje: "Destino eliminado." };
}

