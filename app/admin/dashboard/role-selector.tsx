"use client";

import { useActionState } from "react";
import { cambiarRol, type EstadoCambioRol } from "./actions";
import type { RolUsuario } from "@/utils/auth";

const estadoInicial: EstadoCambioRol = { ok: false, mensaje: "" };

export function RoleSelector({
  profileId,
  rolActual,
  deshabilitado,
}: {
  profileId: string;
  rolActual: RolUsuario;
  deshabilitado: boolean;
}) {
  const action = cambiarRol.bind(null, profileId);
  const [estado, formAction, pendiente] = useActionState(action, estadoInicial);

  return (
    <form action={formAction} className="flex min-w-56 flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <select
          name="rol"
          defaultValue={rolActual}
          disabled={deshabilitado || pendiente}
          aria-label="Rol del usuario"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <option value="administrador">Administrador</option>
          <option value="guardia">Guardia</option>
          <option value="alumno">Alumno</option>
          <option value="visitante">Visitante</option>
        </select>
        <button
          type="submit"
          disabled={deshabilitado || pendiente}
          className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pendiente ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {deshabilitado ? (
        <span className="text-xs text-slate-500">Tu cuenta</span>
      ) : estado.mensaje ? (
        <span className={`text-xs ${estado.ok ? "text-emerald-700" : "text-red-700"}`} role="status">
          {estado.mensaje}
        </span>
      ) : null}
    </form>
  );
}
