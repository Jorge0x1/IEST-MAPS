"use client";

import { useTransition } from "react";
import { cambiarEstadoAcceso } from "./actions";

export function AccessButton({ profileId, activo }: { profileId: string; activo: boolean }) {
  const [pendiente, iniciarTransicion] = useTransition();
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() => iniciarTransicion(() => cambiarEstadoAcceso(profileId, !activo))}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${activo ? "border-red-200 text-red-700 hover:bg-red-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
    >
      {pendiente ? "Procesando…" : activo ? "Desactivar" : "Reactivar"}
    </button>
  );
}
