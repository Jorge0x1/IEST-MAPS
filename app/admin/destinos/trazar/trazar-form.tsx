"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { crearCadenaNodos, type EstadoCadena } from "./actions";
import type { PuntoTrazo } from "../../components/path-drawer";

const PathDrawer = dynamic(
  () => import("../../components/path-drawer").then((modulo) => modulo.PathDrawer),
  {
    ssr: false,
    loading: () => <div className="h-[420px] w-full animate-pulse rounded-xl border border-slate-200 bg-slate-100" />,
  },
);

const estadoInicial: EstadoCadena = { ok: false, mensaje: "" };

const tipos = [
  ["pasillo", "Pasillo"], ["entrada", "Entrada"], ["salon", "Salón"],
  ["oficina", "Oficina"], ["bano", "Baño"], ["escalera", "Escalera"],
  ["elevador", "Elevador"], ["servicio", "Servicio"],
] as const;

export function TrazarForm({ edificios }: { edificios: { id: string; nombre: string }[] }) {
  const [puntos, setPuntos] = useState<PuntoTrazo[]>([]);
  const [estado, formAction, pendiente] = useActionState(crearCadenaNodos, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  // Tras un guardado exitoso se limpian los puntos. Se ajusta el estado durante
  // el render al detectar un resultado nuevo (patrón recomendado por React) en
  // vez de hacerlo dentro de un efecto.
  const [estadoPrevio, setEstadoPrevio] = useState(estado);
  if (estado !== estadoPrevio) {
    setEstadoPrevio(estado);
    if (estado.ok) setPuntos([]);
  }

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Edificio
          <select name="edificio_id" required defaultValue="" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950">
            <option value="" disabled>Selecciona un edificio</option>
            {edificios.map((edificio) => <option key={edificio.id} value={edificio.id}>{edificio.nombre}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Piso
          <input name="piso" type="number" required step={1} min={-10} max={100} defaultValue={0} className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-950" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Tipo de los puntos
          <select name="tipo" required defaultValue="pasillo" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950">
            {tipos.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Prefijo del nombre
          <input name="prefijo" required minLength={2} maxLength={60} placeholder="Ej. Pasillo edificio A" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-950" />
          <span className="text-xs font-normal text-slate-500">Cada punto se numera solo, agregando 1, 2, 3… al prefijo.</span>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <input name="bidireccional" type="checkbox" defaultChecked className="mt-0.5 size-4 accent-sky-700" />
          <span><strong className="block font-semibold text-slate-900">Bidireccional</strong>Aplica a todas las conexiones del trazo.</span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <input name="buscable" type="checkbox" className="mt-0.5 size-4 accent-sky-700" />
          <span><strong className="block font-semibold text-slate-900">Buscables</strong>Actívalo solo si estos puntos deben aparecer como destino (ej. una fila de salones).</span>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Toca el mapa en el orden en que se recorre el pasillo.</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{puntos.length} punto(s)</span>
      </div>

      <PathDrawer puntos={puntos} onPuntosChange={setPuntos} />
      <input type="hidden" name="puntos" value={JSON.stringify(puntos)} />

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setPuntos((actual) => actual.slice(0, -1))} disabled={puntos.length === 0} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          Deshacer último punto
        </button>
        <button type="button" onClick={() => setPuntos([])} disabled={puntos.length === 0} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
          Limpiar
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        {estado.mensaje ? <p role="status" className={`text-sm ${estado.ok ? "text-emerald-700" : "text-red-700"}`}>{estado.mensaje}</p> : <span />}
        <button disabled={pendiente || puntos.length < 2 || edificios.length === 0} className="rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:bg-slate-300">
          {pendiente ? "Guardando…" : `Crear ${puntos.length} nodo(s) y ${Math.max(puntos.length - 1, 0)} conexión(es)`}
        </button>
      </div>
    </form>
  );
}
