import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { rutaParaRol, type RolUsuario } from "@/utils/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Google no devolvió un código de acceso")}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error?.message ?? "No se pudo crear la sesión")}`,
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("No se encontró el perfil del usuario")}`,
    );
  }

  return NextResponse.redirect(
    `${origin}${rutaParaRol(profile.rol as RolUsuario)}`,
  );
}
