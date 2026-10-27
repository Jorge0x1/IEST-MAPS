"use server";

import { revalidatePath } from "next/cache";
import { requerirRol, type RolUsuario } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";

export type EstadoCambioRol = {
  ok: boolean;
  mensaje: string;
};

export type ResultadoCambioAcceso =
  | { ok: true }
  | { ok: false; mensaje: string };

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

// Crea una cuenta con contraseña (p. ej. de prueba para cada rol) o asigna
// contraseña a un usuario que ya existe, para que entre sin Google.
//
// Primero pasa por guardarAlta: valida correo @iest.edu.mx, nombre y rol,
// impide cambiar el rol propio y deja el rol reservado en usuarios_autorizados,
// de donde lo toma el trigger crear_profile_para_nuevo_usuario al crear la
// cuenta. Después usa la API de administración de Auth, que requiere el
// cliente service role (solo tras validar que quien llama es administrador).
export async function guardarAccesoConContrasena(
  estadoAnterior: EstadoCambioRol,
  formData: FormData,
): Promise<EstadoCambioRol> {
  await requerirRol("administrador");
  const contrasena = String(formData.get("contrasena") ?? "");
  if (contrasena.length < 8 || contrasena.length > 72) {
    return { ok: false, mensaje: "La contraseña debe tener entre 8 y 72 caracteres." };
  }

  const alta = await guardarAlta(estadoAnterior, formData);
  if (!alta.ok) return alta;

  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("profiles")
    .select("id")
    .eq("correo", correo)
    .maybeSingle();

  const authAdmin = createServiceClient().auth.admin;

  if (existente) {
    const { error } = await authAdmin.updateUserById(existente.id, { password: contrasena });
    revalidatePath("/admin/dashboard");
    if (error) {
      return { ok: false, mensaje: `Se guardó el rol, pero no se pudo asignar la contraseña: ${error.message}` };
    }
    return { ok: true, mensaje: "Contraseña asignada. Ya puede entrar con correo y contraseña." };
  }

  const { error } = await authAdmin.createUser({
    email: correo,
    password: contrasena,
    // La crea un administrador: no se manda correo de confirmación (los
    // correos de prueba pueden no existir).
    email_confirm: true,
    user_metadata: nombre ? { full_name: nombre } : {},
  });
  revalidatePath("/admin/dashboard");
  if (error) {
    return { ok: false, mensaje: `El correo quedó autorizado, pero no se pudo crear la cuenta: ${error.message}` };
  }
  return { ok: true, mensaje: "Cuenta creada. Ya puede entrar con correo y contraseña." };
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
): Promise<ResultadoCambioAcceso> {
  const { profile: administrador } = await requerirRol("administrador");
  if (profileId === administrador.id) {
    return {
      ok: false,
      mensaje: "No puedes cambiar el acceso de tu propia cuenta.",
    };
  }

  const supabase = await createClient();
  const ahora = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({ activo: activar, updated_at: ahora })
    .eq("id", profileId);

  if (error) {
    return {
      ok: false,
      mensaje: "No fue posible actualizar el acceso. Inténtalo nuevamente.",
    };
  }

  await supabase
    .from("usuarios_autorizados")
    .update({ estado: activar ? "activo" : "desactivado", updated_at: ahora })
    .eq("profile_id", profileId);

  revalidatePath("/admin/dashboard");
  return { ok: true };
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
