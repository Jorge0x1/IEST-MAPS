"use server";

import { revalidatePath } from "next/cache";
import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

export type EstadoConexion = { ok: boolean; mensaje: string };

const UUID_RE = /^[0-9a-f-]{36}$/i;
const MENSAJE_DUPLICADA = "Ya existe una conexión entre estos dos nodos";

type DatosConexion = {
  nodo_origen_id: string;
  nodo_destino_id: string;
  costo: number | null;
  bidireccional: boolean;
};

function leerCosto(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : Number.NaN;
}

function validarConexion(
  formData: FormData,
): { ok: true; data: DatosConexion } | { ok: false; error: string } {
  const nodoOrigenId = String(formData.get("nodo_origen_id") ?? "").trim();
  const nodoDestinoId = String(formData.get("nodo_destino_id") ?? "").trim();
  const costo = leerCosto(formData.get("costo"));

  if (!UUID_RE.test(nodoOrigenId)) {
    return { ok: false, error: "Selecciona el nodo de origen." };
  }
  if (!UUID_RE.test(nodoDestinoId)) {
    return { ok: false, error: "Selecciona el nodo de destino." };
  }
  if (nodoOrigenId === nodoDestinoId) {
    return { ok: false, error: "El origen y el destino no pueden ser el mismo nodo." };
  }
  if (Number.isNaN(costo)) {
    return { ok: false, error: "El costo debe ser un número." };
  }
  if (costo !== null && costo < 0) {
    return { ok: false, error: "El costo no puede ser negativo." };
  }

  return {
    ok: true,
    data: {
      nodo_origen_id: nodoOrigenId,
      nodo_destino_id: nodoDestinoId,
      costo,
      bidireccional: formData.get("bidireccional") === "on",
    },
  };
}

async function nodosExisten(ids: string[]) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("nodos").select("id").in("id", ids);
  return !error && (data?.length ?? 0) === new Set(ids).size;
}

function mensajeAmigable(error: { message?: string } | null, generico: string) {
  if (error?.message === MENSAJE_DUPLICADA) return error.message;
  return generico;
}

export async function crearConexion(
  _estado: EstadoConexion,
  formData: FormData,
): Promise<EstadoConexion> {
  await requerirRol("administrador");
  const validacion = validarConexion(formData);
  if (!validacion.ok) return { ok: false, mensaje: validacion.error };
  if (!(await nodosExisten([validacion.data.nodo_origen_id, validacion.data.nodo_destino_id]))) {
    return { ok: false, mensaje: "Alguno de los nodos seleccionados ya no existe." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("conexiones").insert(validacion.data);
  if (error) return { ok: false, mensaje: mensajeAmigable(error, "No se pudo crear la conexión.") };

  revalidatePath("/admin/conexiones");
  return { ok: true, mensaje: "Conexión creada correctamente." };
}

export async function actualizarConexion(
  conexionId: string,
  _estado: EstadoConexion,
  formData: FormData,
): Promise<EstadoConexion> {
  await requerirRol("administrador");
  const validacion = validarConexion(formData);
  if (!validacion.ok) return { ok: false, mensaje: validacion.error };
  if (!(await nodosExisten([validacion.data.nodo_origen_id, validacion.data.nodo_destino_id]))) {
    return { ok: false, mensaje: "Alguno de los nodos seleccionados ya no existe." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("conexiones")
    .update(validacion.data)
    .eq("id", conexionId);
  if (error) return { ok: false, mensaje: mensajeAmigable(error, "No se pudieron guardar los cambios.") };

  revalidatePath("/admin/conexiones");
  return { ok: true, mensaje: "Cambios guardados." };
}

export async function eliminarConexion(conexionId: string): Promise<EstadoConexion> {
  await requerirRol("administrador");
  const supabase = await createClient();
  const { error } = await supabase.from("conexiones").delete().eq("id", conexionId);
  if (error) return { ok: false, mensaje: "No se pudo eliminar la conexión." };

  revalidatePath("/admin/conexiones");
  return { ok: true, mensaje: "Conexión eliminada." };
}
