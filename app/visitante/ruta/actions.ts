"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function finalizarMiVisita(token: string): Promise<void> {
  if (!token || token.length > 200) return;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = await createClient();
  await supabase.rpc("finalizar_visita_por_token", { p_token_hash: tokenHash });
  revalidatePath("/visitante/ruta");
}
