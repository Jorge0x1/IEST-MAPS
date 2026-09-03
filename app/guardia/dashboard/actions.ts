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
    motivo: string;
    acceso: string;
    expiraEn: string;
  };
};

export async function registrarVisita(
  _estado: EstadoRegistroVisita,
  formData: FormData,
): Promise<EstadoRegistroVisita> {
  const { profile: guardia } = await requerirRol("guardia");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();
  const destinoEdificioId = String(formData.get("destino_edificio_id") ?? "").trim();

  if (nombre.length < 2 || nombre.length > 120) {
    return { ok: false, mensaje: "Captura un nombre válido." };
  }
  if (telefono && !/^[0-9+()\-\s]{7,20}$/.test(telefono)) {
    return { ok: false, mensaje: "El teléfono contiene caracteres no válidos." };
  }
  if (motivo.length < 3 || motivo.length > 300) {
    return { ok: false, mensaje: "El motivo debe tener entre 3 y 300 caracteres." };
  }
  if (!/^[0-9a-f-]{36}$/i.test(destinoEdificioId)) {
    return { ok: false, mensaje: "Selecciona un edificio de destino." };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiracion = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  const supabase = await createClient();
  const { data: edificio, error: edificioError } = await supabase
    .from("edificios")
    .select("nombre")
    .eq("id", destinoEdificioId)
    .single();

  if (edificioError || !edificio) {
    return { ok: false, mensaje: "El edificio seleccionado no está disponible." };
  }

  const { error } = await supabase.from("registro_visitante").insert({
    guardia_profile_id: guardia.id,
    nombre,
    telefono: telefono || null,
    motivo,
    destino_edificio_id: destinoEdificioId,
    access_token_hash: tokenHash,
    token_expires_at: expiracion,
  });

  if (error) {
    return { ok: false, mensaje: "No se pudo registrar la visita." };
  }

  revalidatePath("/guardia/dashboard");
  return {
    ok: true,
    mensaje: "Visita registrada. Comparte este acceso con el visitante.",
    pase: {
      nombre,
      destino: edificio.nombre,
      motivo,
      acceso: `/visitante/ruta?token=${encodeURIComponent(token)}`,
      expiraEn: expiracion,
    },
  };
}

export async function finalizarVisita(visitaId: string): Promise<void> {
  await requerirRol("guardia");
  const supabase = await createClient();
  await supabase
    .from("registro_visitante")
    .update({ estado: "finalizado", hora_salida: new Date().toISOString() })
    .eq("id", visitaId)
    .eq("estado", "activo");
  revalidatePath("/guardia/dashboard");
}
