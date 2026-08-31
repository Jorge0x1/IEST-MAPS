"use server";

import { revalidatePath } from "next/cache";
import { requerirRol, type RolUsuario } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

export type EstadoCambioRol = {
  ok: boolean;
  mensaje: string;
};

const rolesInstitucionales = new Set<RolUsuario>([
  "administrador",
  "guardia",
  "alumno",
]);

function correoInstitucionalValido(correo: string) {
  return /^[^\s@]+@iest\.edu\.mx$/i.test(correo);
}

export async function guardarAlta(
  _estadoAnterior: EstadoCambioRol,
  formData: FormData,
): Promise<EstadoCambioRol> {
  const { profile: administrador } = await requerirRol("administrador");
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const rol = String(formData.get("rol") ?? "") as RolUsuario;

  if (!correoInstitucionalValido(correo)) {
    return { ok: false, mensaje: "Ingresa un correo válido @iest.edu.mx." };
  }
  if (nombre.length > 100) {
    return { ok: false, mensaje: "El nombre no puede exceder 100 caracteres." };
  }
  if (!rolesInstitucionales.has(rol)) {
    return { ok: false, mensaje: "Selecciona un rol institucional válido." };
  }

  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("profiles")
    .select("id")
    .eq("correo", correo)
    .maybeSingle();

  if (existente?.id === administrador.id && rol !== "administrador") {
    return { ok: false, mensaje: "No puedes cambiar tu propio rol." };
  }

  const ahora = new Date().toISOString();
  const { error: altaError } = await supabase
    .from("usuarios_autorizados")
    .upsert(
      {
        correo,
        nombre: nombre || null,
        rol,
        estado: existente ? "activo" : "pendiente",
        profile_id: existente?.id ?? null,
        activated_at: existente ? ahora : null,
        updated_at: ahora,
      },
      { onConflict: "correo" },
    );

  if (altaError) {
    return { ok: false, mensaje: "No se pudo guardar el alta. Revisa si el correo ya existe." };
  }

  if (existente) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ rol, activo: true, nombre: nombre || undefined, updated_at: ahora })
      .eq("id", existente.id);
    if (profileError) {
      return { ok: false, mensaje: "El alta se guardó, pero no se pudo actualizar el perfil existente." };
    }
  }

  revalidatePath("/admin/dashboard");
  return {
    ok: true,
    mensaje: existente ? "Usuario actualizado y activado." : "Correo autorizado. Esperando su primer acceso.",
  };
}

export async function cambiarRol(
  profileId: string,
  _estadoAnterior: EstadoCambioRol,
  formData: FormData,
): Promise<EstadoCambioRol> {
  const { profile: administrador } = await requerirRol("administrador");
  const rol = formData.get("rol");

  if (typeof rol !== "string" || !rolesInstitucionales.has(rol as RolUsuario)) {
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


  await supabase
    .from("usuarios_autorizados")
    .update({ rol, updated_at: new Date().toISOString() })
    .eq("profile_id", profileId);

  revalidatePath("/admin/dashboard");
  return { ok: true, mensaje: "Rol actualizado." };
}

export async function cambiarEstadoAcceso(
  profileId: string,
  activar: boolean,
): Promise<void> {
  const { profile: administrador } = await requerirRol("administrador");
  if (profileId === administrador.id) return;

  const supabase = await createClient();
  const ahora = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({ activo: activar, updated_at: ahora })
    .eq("id", profileId);

  if (error) return;

  await supabase
    .from("usuarios_autorizados")
    .update({ estado: activar ? "activo" : "desactivado", updated_at: ahora })
    .eq("profile_id", profileId);

  revalidatePath("/admin/dashboard");
}

export async function eliminarAltaPendiente(altaId: string): Promise<void> {
  await requerirRol("administrador");
  const supabase = await createClient();
  await supabase
    .from("usuarios_autorizados")
    .delete()
    .eq("id", altaId)
    .is("profile_id", null);
  revalidatePath("/admin/dashboard");
}
