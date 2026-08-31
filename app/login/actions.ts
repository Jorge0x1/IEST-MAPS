"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

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

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
