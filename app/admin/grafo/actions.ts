"use server";

// Edición rápida del grafo desde el mapa (/admin/grafo, modo "Conectar").
// Mismas reglas que /admin/conexiones; el costo se calcula aquí con la
// distancia real entre los dos nodos para no confiar en el cliente.

import { revalidatePath } from "next/cache";
import { distanciaMetros } from "@/lib/geo";
import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

export type ResultadoEdicionGrafo =
  | { ok: true; mensaje: string; conexionId?: string }
  | { ok: false; mensaje: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MENSAJE_DUPLICADA = "Ya existe una conexión entre estos dos nodos";

function revalidar() {
  revalidatePath("/admin/grafo");
  revalidatePath("/admin/conexiones");
}

export async function conectarNodos(
  origenId: string,
  destinoId: string,
  bidireccional: boolean,
): Promise<ResultadoEdicionGrafo> {
  await requerirRol("administrador");
  if (!UUID_RE.test(origenId) || !UUID_RE.test(destinoId)) {
    return { ok: false, mensaje: "Nodos inválidos." };
  }
  if (origenId === destinoId) {
    return { ok: false, mensaje: "No se puede conectar un nodo consigo mismo." };
  }

  const supabase = await createClient();
  const { data: nodos, error: errorNodos } = await supabase
    .from("nodos")
    .select("id, lat, lng")
    .in("id", [origenId, destinoId]);
  if (errorNodos || nodos?.length !== 2) {
    return { ok: false, mensaje: "Alguno de los nodos ya no existe." };
  }

  const a = nodos.find((n) => n.id === origenId)!;
  const b = nodos.find((n) => n.id === destinoId)!;
  const costo =
    a.lat !== null && a.lng !== null && b.lat !== null && b.lng !== null
      ? Math.round(distanciaMetros(a.lat, a.lng, b.lat, b.lng) * 100) / 100
      : null;

  const { data, error } = await supabase
    .from("conexiones")
    .insert({ nodo_origen_id: origenId, nodo_destino_id: destinoId, costo, bidireccional })
    .select("id")
    .single();
  if (error) {
    return {
      ok: false,
      mensaje: error.message === MENSAJE_DUPLICADA ? "Esos dos nodos ya están conectados." : "No se pudo crear la conexión.",
    };
  }

  revalidar();
  return { ok: true, mensaje: costo !== null ? `Conectados (${costo.toFixed(1)} m).` : "Conectados.", conexionId: data.id };
}

export async function borrarConexionGrafo(conexionId: string): Promise<ResultadoEdicionGrafo> {
  await requerirRol("administrador");
  if (!UUID_RE.test(conexionId)) return { ok: false, mensaje: "Conexión inválida." };
  const supabase = await createClient();
  const { error } = await supabase.from("conexiones").delete().eq("id", conexionId);
  if (error) return { ok: false, mensaje: "No se pudo eliminar la conexión." };
  revalidar();
  return { ok: true, mensaje: "Conexión eliminada." };
}

export async function cambiarSentidoConexion(
  conexionId: string,
  bidireccional: boolean,
): Promise<ResultadoEdicionGrafo> {
  await requerirRol("administrador");
  if (!UUID_RE.test(conexionId)) return { ok: false, mensaje: "Conexión inválida." };
  const supabase = await createClient();
  const { error } = await supabase.from("conexiones").update({ bidireccional }).eq("id", conexionId);
  if (error) return { ok: false, mensaje: "No se pudo cambiar el sentido." };
  revalidar();
  return { ok: true, mensaje: bidireccional ? "Ahora es bidireccional." : "Ahora es de un solo sentido." };
}
