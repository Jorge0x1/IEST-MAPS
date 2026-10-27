import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type RolUsuario =
  | "administrador"
  | "guardia"
  | "alumno"
  | "visitante";

const dashboardPorRol: Record<RolUsuario, string> = {
  administrador: "/admin/dashboard",
  guardia: "/guardia/dashboard",
  alumno: "/usuario/dashboard",
  visitante: "/visitante/ruta",
};

export function rutaParaRol(rol: RolUsuario) {
  return dashboardPorRol[rol];
}

// `cache` evita repetir la consulta del perfil cuando el layout y la página de
// una misma petición piden la sesión.
export const obtenerSesionConPerfil = cache(async () => {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, rol, nombre, correo, activo")
    .eq("id", userId)
    .single();

  if (profileError || !profile || !profile.activo) {
    return null;
  }

  return {
    profile: profile as {
      id: string;
      rol: RolUsuario;
      nombre: string | null;
      correo: string | null;
      activo: boolean;
    },
  };
});

export async function requerirRol(rolPermitido: RolUsuario) {
  const sesion = await obtenerSesionConPerfil();

  if (!sesion) {
    redirect("/login");
  }

  if (sesion.profile.rol !== rolPermitido) {
    redirect(rutaParaRol(sesion.profile.rol));
  }

  return sesion;
}
