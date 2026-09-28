"use server";

import { revalidatePath } from "next/cache";
import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

export type EstadoCadena = { ok: boolean; mensaje: string };

const UUID_RE = /^[0-9a-f-]{36}$/i;
const TIPOS_VALIDOS = new Set([
  "entrada", "pasillo", "salon", "oficina", "bano", "escalera", "elevador", "servicio",
]);

type Punto = { lat: number; lng: number };

function leerPuntos(valor: FormDataEntryValue | null): Punto[] | null {
  const texto = String(valor ?? "");
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!Array.isArray(datos)) return null;

  const puntos: Punto[] = [];
  for (const item of datos) {
    if (
      !item ||
      typeof item !== "object" ||
      !("lat" in item) ||
      !("lng" in item) ||
      typeof (item as { lat: unknown }).lat !== "number" ||
      typeof (item as { lng: unknown }).lng !== "number"
    ) {
      return null;
    }
    const { lat, lng } = item as Punto;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }
    puntos.push({ lat, lng });
  }
  return puntos;
}

export async function crearCadenaNodos(
  _estado: EstadoCadena,
  formData: FormData,
): Promise<EstadoCadena> {
  await requerirRol("administrador");

  const edificioId = String(formData.get("edificio_id") ?? "").trim();
  const pisoTexto = String(formData.get("piso") ?? "").trim();
  const piso = pisoTexto === "" ? Number.NaN : Number(pisoTexto);
  const tipo = String(formData.get("tipo") ?? "").trim();
  const prefijo = String(formData.get("prefijo") ?? "").trim();
  const buscable = formData.get("buscable") === "on";
  const bidireccional = formData.get("bidireccional") === "on";
  const puntos = leerPuntos(formData.get("puntos"));

  if (!UUID_RE.test(edificioId)) {
    return { ok: false, mensaje: "Selecciona un edificio." };
  }
  if (!Number.isInteger(piso) || piso < -10 || piso > 100) {
    return { ok: false, mensaje: "El piso debe ser un entero entre -10 y 100." };
  }
  if (!TIPOS_VALIDOS.has(tipo)) {
    return { ok: false, mensaje: "Selecciona un tipo de nodo válido." };
  }
  if (prefijo.length < 2 || prefijo.length > 60) {
    return { ok: false, mensaje: "El prefijo del nombre debe tener entre 2 y 60 caracteres." };
  }
  if (!puntos || puntos.length < 2) {
    return { ok: false, mensaje: "Marca al menos dos puntos en el mapa." };
  }
  if (puntos.length > 60) {
    return { ok: false, mensaje: "Máximo 60 puntos por trazo. Divídelo en varios trazos." };
  }

  const nodos = puntos.map((punto, indice) => ({
    nombre: `${prefijo} ${indice + 1}`,
    tipo,
    edificio_id: edificioId,
    piso,
    lat: punto.lat,
    lng: punto.lng,
    buscable,
  }));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crear_cadena_nodos", {
    p_nodos: nodos,
    p_bidireccional: bidireccional,
  });

  if (error) {
    return { ok: false, mensaje: error.message || "No se pudo crear la cadena de nodos." };
  }

  revalidatePath("/admin/destinos");
  revalidatePath("/admin/conexiones");
  revalidatePath("/admin/edificios");

  const creados = Array.isArray(data) ? data.length : puntos.length;
  return {
    ok: true,
    mensaje: `Listo: se crearon ${creados} nodos y ${Math.max(creados - 1, 0)} conexiones.`,
  };
}
