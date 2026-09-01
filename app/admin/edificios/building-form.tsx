"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  actualizarEdificio,
  crearEdificio,
  type EstadoEdificio,
} from "./actions";

const estadoInicial: EstadoEdificio = { ok: false, mensaje: "" };

type EdificioInicial = {
  id: string;
  nombre: string;
  descripcion: string | null;
  lat: number | null;
  lng: number | null;
};

export function BuildingForm({ edificio }: { edificio?: EdificioInicial }) {
  const action = edificio
    ? actualizarEdificio.bind(null, edificio.id)
    : crearEdificio;
  const [estado, formAction, pendiente] = useActionState(action, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok && !edificio) formRef.current?.reset();
  }, [estado.ok, edificio]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Nombre
        <input name="nombre" required minLength={2} maxLength={100} defaultValue={edificio?.nombre} placeholder="Ej. Edificio de Ingeniería" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-950" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Descripción
        <textarea name="descripcion" maxLength={500} rows={3} defaultValue={edificio?.descripcion ?? ""} placeholder="Referencia o servicios principales" className="resize-none rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-950" />
      </label>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">Latitud<input name="lat" type="number" step="any" min={-90} max={90} defaultValue={edificio?.lat ?? ""} placeholder="22.233..." className="min-w-0 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-950" /></label>
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">Longitud<input name="lng" type="number" step="any" min={-180} max={180} defaultValue={edificio?.lng ?? ""} placeholder="-97.861..." className="min-w-0 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-950" /></label>
      </div>
      <p className="text-xs leading-5 text-slate-500">Las coordenadas son opcionales por ahora, pero después ubicarán el edificio sobre el mapa real.</p>
      <div className="flex items-center justify-between gap-4">
        {estado.mensaje ? <p role="status" className={`text-sm ${estado.ok ? "text-emerald-700" : "text-red-700"}`}>{estado.mensaje}</p> : <span />}
        <button disabled={pendiente} className="rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:bg-slate-300">{pendiente ? "Guardando…" : edificio ? "Guardar cambios" : "Crear edificio"}</button>
      </div>
    </form>
  );
}
