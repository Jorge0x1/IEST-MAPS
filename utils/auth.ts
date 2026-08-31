import "server-only";

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

export async function obtenerSesionConPerfil() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, rol, nombre, correo")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return {
    profile: profile as {
      id: string;
      rol: RolUsuario;
      nombre: string | null;
      correo: string | null;
    },
  };
}

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
