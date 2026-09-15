"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

export type EstadoRegistroVisita = {
  ok: boolean;
  mensaje: string;
  pase?: {
    nombre: string;
    destino: string;
    origen: string;
    motivo: string;
    acceso: string;
    expiraEn: string;
  };
};

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function registrarVisita(
  _estado: EstadoRegistroVisita,
  formData: FormData,
): Promise<EstadoRegistroVisita> {
  const { profile: guardia } = await requerirRol("guardia");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();
  const destinoNodoId = String(formData.get("destino_nodo_id") ?? "").trim();
  const origenNodoId = String(formData.get("origen_nodo_id") ?? "").trim();

  if (nombre.length < 2 || nombre.length > 120) {
    return { ok: false, mensaje: "Captura un nombre válido." };
  }
  if (telefono && !/^[0-9+()\-\s]{7,20}$/.test(telefono)) {
    return { ok: false, mensaje: "El teléfono contiene caracteres no válidos." };
  }
  if (motivo.length < 3 || motivo.length > 300) {
    return { ok: false, mensaje: "El motivo debe tener entre 3 y 300 caracteres." };
  }
  if (!UUID_RE.test(destinoNodoId)) {
    return { ok: false, mensaje: "Selecciona un destino." };
  }
  if (!UUID_RE.test(origenNodoId)) {
    return { ok: false, mensaje: "Selecciona la entrada por la que ingresa el visitante." };
  }

  const supabase = await createClient();

  const [{ data: destinoNodo, error: destinoError }, { data: origenNodo, error: origenError }] =
    await Promise.all([
      supabase
        .from("nodos")
        .select("id, nombre, piso, edificio_id, buscable, edificios(nombre)")
        .eq("id", destinoNodoId)
        .single(),
      supabase
        .from("nodos")
        .select("id, nombre, tipo")
        .eq("id", origenNodoId)
        .single(),
    ]);

  if (destinoError || !destinoNodo || !destinoNodo.buscable) {
    return { ok: false, mensaje: "El destino seleccionado ya no está disponible." };
  }
  if (origenError || !origenNodo || origenNodo.tipo !== "entrada") {
    return { ok: false, mensaje: "La entrada seleccionada ya no está disponible." };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiracion = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("registro_visitante").insert({
    guardia_profile_id: guardia.id,
    nombre,
    telefono: telefono || null,
    motivo,
    destino_nodo_id: destinoNodo.id,
    destino_edificio_id: destinoNodo.edificio_id,
    origen_nodo_id: origenNodo.id,
    access_token_hash: tokenHash,
    token_expires_at: expiracion,
  });

  if (error) {
    return { ok: false, mensaje: "No se pudo registrar la visita." };
  }

  revalidatePath("/guardia/dashboard");

  const edificioNombre = (destinoNodo.edificios as unknown as { nombre: string } | null)?.nombre;
  const destinoTexto = [destinoNodo.nombre, edificioNombre, `Piso ${destinoNodo.piso}`]
    .filter(Boolean)
    .join(" · ");

  return {
    ok: true,
    mensaje: "Visita registrada. Comparte este acceso con el visitante.",
    pase: {
      nombre,
      destino: destinoTexto,
      origen: origenNodo.nombre,
      motivo,
      acceso: `/visitante/ruta?token=${encodeURIComponent(token)}`,
      expiraEn: expiracion,
    },
  };
}

export async function finalizarVisita(visitaId: string): Promise<void> {
  await requerirRol("guardia");
  if (!UUID_RE.test(visitaId)) return;

  const supabase = await createClient();
  await supabase
    .from("registro_visitante")
    .update({ estado: "finalizado", hora_salida: new Date().toISOString() })
    .eq("id", visitaId)
    .eq("estado", "activo");
  revalidatePath("/guardia/dashboard");
}
