"use client";

import { useActionState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { actualizarDestino, crearDestino, type EstadoDestino } from "./actions";

const LocationPicker = dynamic(
  () => import("../components/location-picker").then((modulo) => modulo.LocationPicker),
  {
    ssr: false,
    loading: () => <div className="h-[220px] w-full animate-pulse rounded-xl border border-slate-200 bg-slate-100" />,
  },
);

const estadoInicial: EstadoDestino = { ok: false, mensaje: "" };

export type EdificioOpcion = { id: string; nombre: string };
export type DestinoInicial = {
  id: string;
  nombre: string;
  tipo: string;
  nombres_alternativos: string[];
  edificio_id: string;
  piso: number;
  lat: number | null;
  lng: number | null;
  buscable: boolean;
};

const tipos = [
  ["entrada", "Entrada"], ["pasillo", "Pasillo"], ["salon", "Salón"],
  ["oficina", "Oficina"], ["bano", "Baño"], ["escalera", "Escalera"],
  ["elevador", "Elevador"], ["servicio", "Servicio"], ["edificio", "Edificio"],
] as const;

export function DestinationForm({ edificios, destino }: { edificios: EdificioOpcion[]; destino?: DestinoInicial }) {
  const action = destino ? actualizarDestino.bind(null, destino.id) : crearDestino;
  const [estado, formAction, pendiente] = useActionState(action, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok && !destino) formRef.current?.reset();
  }, [estado.ok, destino]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Nombre
        <input name="nombre" required minLength={2} maxLength={120} defaultValue={destino?.nombre} placeholder="Ej. Salón 204" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-950" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Tipo
          <select name="tipo" required defaultValue={destino?.tipo ?? "salon"} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950">
            {tipos.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Piso
          <input name="piso" type="number" required step={1} min={-10} max={100} defaultValue={destino?.piso ?? 0} className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-950" />
        </label>
      </div>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Edificio
        <select name="edificio_id" required defaultValue={destino?.edificio_id ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950">
          <option value="" disabled>Selecciona un edificio</option>
          {edificios.map((edificio) => <option key={edificio.id} value={edificio.id}>{edificio.nombre}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Alias
        <input name="nombres_alternativos" maxLength={2000} defaultValue={destino?.nombres_alternativos.join(", ")} placeholder="Ej. aula 204, salón de segundo" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-950" />
        <span className="text-xs font-normal text-slate-500">Separa cada nombre alternativo con una coma.</span>
      </label>
      <LocationPicker latName="lat" lngName="lng" lat={destino?.lat ?? null} lng={destino?.lng ?? null} />
      <p className="text-xs leading-5 text-slate-500">Toca el mapa para ubicar el nodo, o déjalo así y complétalo después.</p>
      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <input name="buscable" type="checkbox" defaultChecked={destino?.buscable ?? true} className="mt-0.5 size-4 accent-sky-700" />
        <span><strong className="block font-semibold text-slate-900">Visible como destino</strong>Los alumnos y guardias podrán encontrarlo en búsquedas.</span>
      </label>
      <div className="flex items-center justify-between gap-4">
        {estado.mensaje ? <p role="status" className={`text-sm ${estado.ok ? "text-emerald-700" : "text-red-700"}`}>{estado.mensaje}</p> : <span />}
        <button disabled={pendiente || edificios.length === 0} className="rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:bg-slate-300">{pendiente ? "Guardando…" : destino ? "Guardar cambios" : "Crear destino"}</button>
      </div>
    </form>
  );
}
