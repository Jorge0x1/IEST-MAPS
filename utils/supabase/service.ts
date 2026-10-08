// ⚠️ CLIENTE CON SERVICE ROLE: IGNORA TODAS LAS POLÍTICAS RLS.
//
// Solo debe importarse desde archivos de Server Actions que tengan "use server"
// en la primera línea (hoy: lib/rutas/actions.ts). Nunca desde un componente,
// una página, un layout ni nada que pueda terminar en el bundle del navegador.
// `server-only` hace que el build falle si alguien lo importa desde el cliente.
//
// Cada acción que lo use debe validar por su cuenta quién llama (sesión, rol o
// token de visitante) y devolver solo los campos que la interfaz necesita.
//
// SUPABASE_SERVICE_ROLE_KEY va en .env.local SIN prefijo NEXT_PUBLIC_, para que
// Next.js nunca la incluya en el JavaScript del cliente.
import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_URL) en .env.local.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
