"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { rutaParaRol, type RolUsuario } from "@/utils/auth";

export async function iniciarSesionConGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!origin) {
    redirect("/login?error=No%20se%20pudo%20determinar%20el%20origen");
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
        hd: "iest.edu.mx",
      },
    },
  });

  if (error || !data.url) {
    const message = encodeURIComponent(
      error?.message ?? "No se pudo iniciar sesión con Google",
    );
    redirect(`/login?error=${message}`);
  }

  redirect(data.url);
}

export type EstadoLogin = { error: string; correo: string };

// Acceso con correo y contraseña. Solo funciona para cuentas a las que un
// administrador les asignó contraseña (/admin/dashboard → "Acceso con
// contraseña"): cuentas de prueba por rol o usuarios que prefieren no usar
// Google. Las reglas de rol y de acceso activo son las mismas que con Google.
export async function iniciarSesionConContrasena(
  _estadoAnterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const contrasena = String(formData.get("contrasena") ?? "");

  if (!correo || !contrasena) {
    return { error: "Escribe tu correo y tu contraseña.", correo };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  });

  if (error || !data.user) {
    if (error?.status === 429) {
      return { error: "Demasiados intentos. Espera unos minutos y vuelve a intentar.", correo };
    }
    // Mismo mensaje para correo inexistente y contraseña incorrecta, para no
    // revelar qué cuentas existen.
    return { error: "Correo o contraseña incorrectos.", correo };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", data.user.id)
    .single();

  if (!profile || !profile.activo) {
    await supabase.auth.signOut();
    return {
      error: profile
        ? "El acceso de esta cuenta está desactivado. Contacta a un administrador."
        : "No se encontró el perfil del usuario.",
      correo,
    };
  }

  redirect(rutaParaRol(profile.rol as RolUsuario));
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
