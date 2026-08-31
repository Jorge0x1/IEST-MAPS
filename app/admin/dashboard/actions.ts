"use server";

import { revalidatePath } from "next/cache";
import { requerirRol, type RolUsuario } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

export type EstadoCambioRol = {
  ok: boolean;
  mensaje: string;
};

const rolesValidos = new Set<RolUsuario>([
  "administrador",
  "guardia",
  "alumno",
  "visitante",
]);

export async function cambiarRol(
  profileId: string,
  _estadoAnterior: EstadoCambioRol,
  formData: FormData,
): Promise<EstadoCambioRol> {
  const { profile: administrador } = await requerirRol("administrador");
  const rol = formData.get("rol");

  if (typeof rol !== "string" || !rolesValidos.has(rol as RolUsuario)) {
    return { ok: false, mensaje: "El rol seleccionado no es válido." };
  }

  if (profileId === administrador.id) {
    return {
      ok: false,
      mensaje: "No puedes cambiar tu propio rol.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ rol, updated_at: new Date().toISOString() })
    .eq("id", profileId);

  if (error) {
    return {
      ok: false,
      mensaje: "No se pudo actualizar el rol. Inténtalo nuevamente.",
    };
  }

  revalidatePath("/admin/dashboard");
  return { ok: true, mensaje: "Rol actualizado." };
}
