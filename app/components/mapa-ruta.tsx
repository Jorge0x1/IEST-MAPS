"use client";

// Envoltura del mapa de la ruta: calcula los puntos (lib/rutas/mapa.ts),
// avisa de los pasos sin ubicación y carga Leaflet solo en el navegador.
// La usan la vista del alumno y la del visitante.

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { PasoRutaDetallado } from "@/lib/rutas/actions";
import { puntosDeRuta } from "@/lib/rutas/mapa";

const MapaLeafletRuta = dynamic(() => import("./mapa-leaflet-ruta"), {
  ssr: false,
  loading: () => <div className="flex h-[320px] items-center justify-center text-sm text-slate-500 sm:h-[380px]">Cargando mapa…</div>,
});

export function MapaRuta({ pasos }: { pasos: PasoRutaDetallado[] }) {
  const { puntos, omitidos } = useMemo(() => puntosDeRuta(pasos), [pasos]);

  if (puntos.length === 0) {
    return <p className="mt-4 rounded-lg bg-white p-3 text-sm text-slate-500">Los puntos de esta ruta todavía no tienen ubicación, así que no se puede mostrar en el mapa.</p>;
  }

  return (
    <figure className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <MapaLeafletRuta puntos={puntos} />
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
        <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">Mapa de prueba</span>
        {omitidos > 0 ? (
          <span>{omitidos === 1 ? "1 paso sin ubicación no aparece" : `${omitidos} pasos sin ubicación no aparecen`} en el mapa.</span>
        ) : (
          <span>Los números coinciden con la lista de pasos.</span>
        )}
      </figcaption>
    </figure>
  );
}
