"use client";

import { useActionState, useEffect, useRef } from "react";
import { guardarAlta, type EstadoCambioRol } from "./actions";

const estadoInicial: EstadoCambioRol = { ok: false, mensaje: "" };

export function CreateUserForm() {
  const [estado, action, pendiente] = useActionState(guardarAlta, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado.ok]);

  return (
    <form ref={formRef} action={action} className="grid gap-4 lg:grid-cols-[1fr_1.4fr_0.8fr_auto] lg:items-end">
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Nombre
        <input name="nombre" maxLength={100} placeholder="Nombre de la persona" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 placeholder:text-slate-400" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Correo institucional
        <input name="correo" type="email" required pattern="[^@\s]+@iest\.edu\.mx" placeholder="nombre@iest.edu.mx" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 placeholder:text-slate-400" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Rol inicial
        <select name="rol" defaultValue="alumno" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900">
          <option value="alumno">Alumno</option>
          <option value="guardia">Guardia</option>
          <option value="administrador">Administrador</option>
        </select>
      </label>
      <button disabled={pendiente} className="rounded-lg bg-sky-700 px-5 py-2.5 font-semibold text-white hover:bg-sky-800 disabled:bg-slate-300">
        {pendiente ? "Guardando…" : "Dar de alta"}
      </button>
      {estado.mensaje ? <p role="status" className={`text-sm lg:col-span-4 ${estado.ok ? "text-emerald-700" : "text-red-700"}`}>{estado.mensaje}</p> : null}
    </form>
  );
}
