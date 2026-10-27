"use client";

// Vista del visitante con visita activa: mapa a pantalla completa, barra
// flotante con su nombre y panel inferior deslizable con la ruta, los datos de
// la visita y "Finalizar mi visita". Misma estructura que la vista del alumno.

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { DetalleDestino } from "@/app/components/detalle-destino";
import { ListaPasos } from "@/app/components/pasos-ruta";
import { ALTURA_PANEL_MINIMO, PanelDeslizable, type EstadoPanel } from "@/app/components/panel-deslizable";
import type { ResultadoRuta } from "@/lib/rutas/actions";
import { puntosDeRuta } from "@/lib/rutas/mapa";
import { useEscritorio } from "@/app/components/use-escritorio";

// Leaflet usa `window`: solo se carga en el navegador.
const MapaLeafletRuta = dynamic(() => import("@/app/components/mapa-leaflet-ruta"), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500">Cargando mapa…</div>,
});

// Alto aproximado de la barra flotante, para que la ruta no quede debajo.
const MARGEN_SUPERIOR_MAPA = 72;
// Ancho de la columna de tarjetas en escritorio (368 px + 16 px de separación).
const ANCHO_COLUMNA_ESCRITORIO = 384;

type Props = {
  nombre: string;
  destinoNombre: string | null;
  destinoPiso: number | null;
  destinoDescripcion: string | null;
  destinoFotoUrl: string | null;
  origenNombre: string | null;
  motivo: string | null;
  // Ya formateada en el servidor para evitar diferencias de zona horaria al hidratar.
  horaEntrada: string;
  ruta: ResultadoRuta | null;
  token: string;
  sinEscaleras: boolean;
  finalizar: () => Promise<void>;
};

export function VistaVisitante({ nombre, destinoNombre, destinoPiso, destinoDescripcion, destinoFotoUrl, origenNombre, motivo, horaEntrada, ruta, token, sinEscaleras, finalizar }: Props) {
  // Con ruta, el panel arranca abajo para dejar ver el mapa; sin ella, a media altura.
  const [estadoPanel, setEstadoPanel] = useState<EstadoPanel>(ruta?.ok ? "minimo" : "medio");
  const escritorio = useEscritorio();

  const { puntos, omitidos } = useMemo(
    () => (ruta?.ok ? puntosDeRuta(ruta.pasos) : { puntos: [], omitidos: 0 }),
    [ruta],
  );

  const enlaceAlterno = `/visitante/ruta?token=${encodeURIComponent(token)}${sinEscaleras ? "" : "&sinEscaleras=1"}`;
  const alternar = (
    <Link href={enlaceAlterno} replace scroll={false} className="text-sm font-semibold text-sky-700 underline-offset-2 hover:underline">
      {sinEscaleras ? "Ver ruta con escaleras" : "Evitar escaleras"}
    </Link>
  );

  const lugarDestino = [destinoPiso !== null ? `Piso ${destinoPiso}` : null, origenNombre ? `Entras por ${origenNombre}` : null].filter(Boolean).join(" · ");

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-slate-100">
      {/* `isolate` encierra los z-index internos de Leaflet para que no tapen la barra ni el panel. */}
      <div className="absolute inset-0 isolate">
        <MapaLeafletRuta
          puntos={puntos}
          className="h-full w-full"
          margenSuperior={escritorio ? 0 : MARGEN_SUPERIOR_MAPA}
          margenInferior={escritorio ? 0 : ALTURA_PANEL_MINIMO}
          margenIzquierdo={escritorio ? ANCHO_COLUMNA_ESCRITORIO : 0}
          controlesZoom={escritorio}
        />
      </div>

      {/* Barra flotante */}
      <div className="absolute inset-x-3 top-3 z-30 mx-auto max-w-xl md:inset-x-auto md:left-4 md:top-4 md:mx-0 md:w-[368px]">
        <div className="flex items-center justify-between gap-3 rounded-full bg-white px-4 py-2.5 shadow-lg ring-1 ring-black/5">
          <p className="min-w-0 truncate font-semibold text-slate-900">Hola, {nombre}</p>
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Visita activa</span>
        </div>
      </div>

      <PanelDeslizable
        etiqueta="Tu visita"
        estado={estadoPanel}
        onCambiarEstado={setEstadoPanel}
        cabecera={
          <div aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tu destino</p>
            <h2 className="text-xl font-bold leading-tight text-slate-950">{destinoNombre ?? "Destino por confirmar"}</h2>
            {lugarDestino ? <p className="mt-0.5 text-sm text-slate-600">{lugarDestino}</p> : null}
            {ruta?.ok ? (
              <p className="mt-2 text-sm font-semibold text-[var(--brand-primary-active)]">
                {ruta.pasos.length} pasos{sinEscaleras ? " · sin escaleras" : ""}
              </p>
            ) : ruta ? (
              <p className="mt-2 text-sm font-semibold text-amber-800">No pudimos calcular tu ruta</p>
            ) : null}
          </div>
        }
      >
        <div className="grid gap-5">
          {ruta && !ruta.ok ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
              <p className="text-sm text-amber-800">{ruta.mensaje}</p>
              {ruta.motivo === "bloqueado_por_escaleras" ? <div className="mt-3">{alternar}</div> : null}
            </div>
          ) : null}

          {ruta?.ok ? (
            <div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">Mapa de prueba</span>
                {alternar}
              </div>
              {omitidos > 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  {omitidos === 1 ? "1 paso sin ubicación no aparece" : `${omitidos} pasos sin ubicación no aparecen`} en el mapa.
                </p>
              ) : null}
              <ListaPasos pasos={ruta.pasos} />
            </div>
          ) : null}

          {/* Primero cómo llegar (pasos) y después cómo reconocer el lugar. */}
          <DetalleDestino nombre={destinoNombre ?? "tu destino"} descripcion={destinoDescripcion} fotoUrl={destinoFotoUrl} titulo="Así reconocerás tu destino" />

          <dl className="grid gap-4 rounded-xl bg-slate-50 p-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Motivo</dt>
              <dd className="mt-1 text-slate-700">{motivo ?? "No especificado"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hora de entrada</dt>
              <dd className="mt-1 text-slate-700">{horaEntrada}</dd>
            </div>
          </dl>

          <form action={finalizar}>
            <button type="submit" className="w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800">
              Finalizar mi visita
            </button>
          </form>
        </div>
      </PanelDeslizable>
    </main>
  );
}
