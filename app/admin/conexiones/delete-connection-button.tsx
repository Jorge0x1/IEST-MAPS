"use client";

import { useState, useTransition } from "react";
import { eliminarConexion } from "./actions";

export function DeleteConnectionButton({ conexionId }: { conexionId: string }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [mensaje, setMensaje] = useState("");

  function eliminar() {
    if (!window.confirm("¿Eliminar esta conexión? Esta acción no se puede deshacer.")) return;
    setMensaje("");
    iniciarTransicion(async () => {
      const resultado = await eliminarConexion(conexionId);
      if (!resultado.ok) setMensaje(resultado.mensaje);
    });
  }

  return (
    <div className="text-right">
      <button type="button" onClick={eliminar} disabled={pendiente} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
        {pendiente ? "Eliminando…" : "Eliminar"}
      </button>
      {mensaje ? <p role="alert" className="mt-2 max-w-52 text-xs text-red-700">{mensaje}</p> : null}
    </div>
  );
}
