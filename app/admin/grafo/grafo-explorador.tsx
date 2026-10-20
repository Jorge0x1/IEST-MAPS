"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { ETIQUETA_TIPO, ListaPasos } from "@/app/components/pasos-ruta";
import { diagnosticarGrafo } from "@/lib/rutas/diagnostico";
import { calcularRuta, type ResultadoRuta } from "@/lib/rutas/actions";
import { StatCard } from "../components/admin-ui";
import { COLOR_TIPO, COLOR_PROBLEMA } from "./colores";
import styles from "./grafo.module.css";

const MapaGrafo = dynamic(() => import("./mapa-grafo"), {
  ssr: false,
  loading: () => <div className={`${styles.mapa} flex items-center justify-center text-sm text-slate-500`}>Cargando mapa…</div>,
});

export type NodoGrafoAdmin = {
  id: string;
  nombre: string;
  tipo: string;
  piso: number;
  lat: number | null;
  lng: number | null;
  buscable: boolean;
  edificioNombre: string | null;
};

export type ConexionGrafoAdmin = {
  id: string;
  nodo_origen_id: string;
  nodo_destino_id: string;
  bidireccional: boolean;
};

export type FocoMapa = { id: string; vez: number } | null;

const MAX_POR_LISTA = 15;

function etiqueta(n: NodoGrafoAdmin) {
  return `${n.nombre} · ${n.edificioNombre ?? "Sin edificio"} · Piso ${n.piso}`;
}

export function GrafoExplorador({ nodos, conexiones }: { nodos: NodoGrafoAdmin[]; conexiones: ConexionGrafoAdmin[] }) {
  const [piso, setPiso] = useState<number | null>(null);
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [eligiendo, setEligiendo] = useState<"origen" | "destino">("origen");
  const [evitarEscaleras, setEvitarEscaleras] = useState(false);
  const [ruta, setRuta] = useState<ResultadoRuta | null>(null);
  const [foco, setFoco] = useState<FocoMapa>(null);
  const [calculando, startTransition] = useTransition();
  const solicitud = useRef(0);

  const diagnostico = useMemo(() => diagnosticarGrafo(nodos, conexiones), [nodos, conexiones]);
  const porId = useMemo(() => new Map(nodos.map((n) => [n.id, n])), [nodos]);
  const pisos = useMemo(() => [...new Set(nodos.map((n) => n.piso))].sort((a, b) => a - b), [nodos]);
  const problemas = useMemo(
    () =>
      new Set([
        ...diagnostico.desconectados,
        ...diagnostico.aislados,
        ...diagnostico.destinosInalcanzables,
        ...diagnostico.pasillosBuscables,
        ...diagnostico.transicionesSinOtroPiso,
      ]),
    [diagnostico],
  );
  const opciones = useMemo(() => [...nodos].sort((a, b) => etiqueta(a).localeCompare(etiqueta(b), "es")), [nodos]);
  const rutaIds = useMemo(() => (ruta?.ok ? ruta.pasos.map((p) => p.id) : []), [ruta]);

  const secciones = [
    { titulo: "Fuera de la red principal", detalle: "Tienen conexiones, pero no llegan a las entradas.", ids: diagnostico.desconectados },
    { titulo: "Sin ninguna conexión", detalle: "Nodos aislados.", ids: diagnostico.aislados },
    { titulo: "Destinos inalcanzables", detalle: "Buscables que no están en la red principal.", ids: diagnostico.destinosInalcanzables },
    { titulo: "Pasillos marcados como destino", detalle: "Suele ser un error: aparecen en la búsqueda del alumno.", ids: diagnostico.pasillosBuscables },
    { titulo: "Escaleras o elevadores sin otro piso", detalle: "No conectan con ningún nodo de un piso distinto.", ids: diagnostico.transicionesSinOtroPiso },
    { titulo: "Sin coordenadas", detalle: "No se pueden dibujar en el mapa.", ids: diagnostico.sinCoordenadas },
  ].filter((s) => s.ids.length > 0);

  function limpiarRuta() {
    solicitud.current++;
    setRuta(null);
  }

  function elegirEnMapa(id: string) {
    if (eligiendo === "origen") {
      setOrigenId(id);
      setEligiendo("destino");
    } else {
      setDestinoId(id);
      setEligiendo("origen");
    }
    limpiarRuta();
  }

  function probar() {
    if (!origenId || !destinoId || origenId === destinoId) return;
    const numero = ++solicitud.current;
    const opcionesRuta = { evitarEscaleras };
    startTransition(async () => {
      let resultado: ResultadoRuta;
      try {
        resultado = await calcularRuta(origenId, destinoId, opcionesRuta);
      } catch {
        resultado = { ok: false, motivo: "error_servidor", mensaje: "No se pudo calcular la ruta. Intenta de nuevo." };
      }
      if (numero === solicitud.current) setRuta(resultado);
    });
  }

  const fueraDeRed = diagnostico.desconectados.length + diagnostico.aislados.length;
  const selectClase = "w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 py-2 text-sm text-slate-900";

  return (
    <>
      <section aria-label="Resumen del grafo" className={styles.statsGrid}>
        <StatCard label="Nodos" value={nodos.length} tone="info" />
        <StatCard label="Conexiones" value={conexiones.length} tone="brand" />
        <StatCard label="Fuera de la red principal" value={fueraDeRed} tone={fueraDeRed > 0 ? "danger" : "success"} />
        <StatCard label="Destinos inalcanzables" value={diagnostico.destinosInalcanzables.length} tone={diagnostico.destinosInalcanzables.length > 0 ? "warning" : "success"} />
      </section>

      <div className={styles.layout}>
        <section className={styles.panel} aria-labelledby="mapa-grafo-title">
          <div className={`${styles.panelHeader} flex flex-wrap items-end justify-between gap-3`}>
            <div>
              <p className={styles.panelKicker}>Red de navegación</p>
              <h2 id="mapa-grafo-title" className={styles.panelTitle}>Nodos y conexiones</h2>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              Piso
              <select
                value={piso === null ? "todos" : String(piso)}
                onChange={(e) => setPiso(e.target.value === "todos" ? null : Number(e.target.value))}
                className="rounded-lg border border-[var(--border-strong)] bg-white px-2 py-1.5 text-sm font-normal"
              >
                <option value="todos">Todos</option>
                {pisos.map((p) => (
                  <option key={p} value={p}>Piso {p}</option>
                ))}
              </select>
            </label>
          </div>

          {nodos.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Todavía no hay nodos. Créalos en Destinos y nodos o con el trazador.</p>
          ) : (
            <MapaGrafo
              nodos={nodos}
              conexiones={conexiones}
              principal={diagnostico.principal}
              problemas={problemas}
              piso={piso}
              rutaIds={rutaIds}
              origenId={origenId}
              destinoId={destinoId}
              foco={foco}
              onElegirNodo={elegirEnMapa}
            />
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[var(--border)] px-4 py-3 text-xs text-slate-600">
            {Object.entries(COLOR_TIPO).map(([tipo, color]) => (
              <span key={tipo} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                {ETIQUETA_TIPO[tipo] ?? tipo}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_PROBLEMA }} />Con problema
            </span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-violet-600" />Entre pisos</span>
            <span className="flex items-center gap-1.5"><span className="h-0 w-5 border-t-2 border-dashed border-slate-500" />Un solo sentido</span>
            <span className="flex items-center gap-1.5"><span className="h-1 w-5 rounded bg-[var(--brand-primary)]" />Ruta probada</span>
          </div>

          {ruta ? (
            <div className="border-t border-[var(--border)] p-4">
              {ruta.ok ? (
                <>
                  <p className="text-sm font-semibold text-slate-800">
                    Ruta de {ruta.pasos.length} pasos · costo total {ruta.costoTotal.toFixed(1)}
                  </p>
                  <ListaPasos pasos={ruta.pasos} />
                </>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
                  <p className="font-semibold">Sin ruta</p>
                  <p className="mt-1">{ruta.mensaje}</p>
                </div>
              )}
            </div>
          ) : null}
        </section>

        <div className={styles.sideColumn}>
          <section className={styles.panel} aria-labelledby="probar-ruta-title">
            <div className={styles.panelHeader}>
              <p className={styles.panelKicker}>Motor de rutas</p>
              <h2 id="probar-ruta-title" className={styles.panelTitle}>Probar ruta</h2>
            </div>
            <div className={`${styles.panelBody} grid gap-3`}>
              <p className="text-xs text-slate-500">
                Elige en las listas o haz clic en un punto del mapa. El próximo clic elige el{" "}
                <button type="button" onClick={() => setEligiendo(eligiendo === "origen" ? "destino" : "origen")} className="font-semibold text-[var(--brand-primary-active)] underline underline-offset-2">
                  {eligiendo}
                </button>
                .
              </p>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Origen
                <select value={origenId} onChange={(e) => { setOrigenId(e.target.value); limpiarRuta(); }} className={selectClase}>
                  <option value="">Selecciona…</option>
                  {opciones.map((n) => <option key={n.id} value={n.id}>{etiqueta(n)}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Destino
                <select value={destinoId} onChange={(e) => { setDestinoId(e.target.value); limpiarRuta(); }} className={selectClase}>
                  <option value="">Selecciona…</option>
                  {opciones.map((n) => <option key={n.id} value={n.id}>{etiqueta(n)}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={evitarEscaleras} onChange={(e) => { setEvitarEscaleras(e.target.checked); limpiarRuta(); }} className="h-4 w-4 accent-[var(--brand-primary)]" />
                Evitar escaleras
              </label>
              {origenId && origenId === destinoId ? (
                <p className="text-xs text-amber-800">El origen y el destino son el mismo nodo.</p>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={probar}
                  disabled={calculando || !origenId || !destinoId || origenId === destinoId}
                  className="flex-1 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {calculando ? "Calculando…" : "Calcular ruta"}
                </button>
                <button
                  type="button"
                  onClick={() => { setOrigenId(""); setDestinoId(""); setEligiendo("origen"); limpiarRuta(); }}
                  className="rounded-lg border border-[var(--border-strong)] px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="problemas-title">
            <div className={styles.panelHeader}>
              <p className={styles.panelKicker}>Diagnóstico</p>
              <h2 id="problemas-title" className={styles.panelTitle}>
                {secciones.length === 0 ? "Sin problemas detectados" : "Problemas detectados"}
              </h2>
            </div>
            <div className={`${styles.panelBody} grid gap-4`}>
              {secciones.length === 0 ? (
                <p className="text-sm text-slate-600">Todos los nodos están conectados a la red principal.</p>
              ) : (
                <>
                  <p className="text-xs text-slate-500">
                    Red principal: la que contiene más entradas ({diagnostico.principal.size} nodos de {nodos.length}).
                    Toca un nombre para ubicarlo en el mapa.
                  </p>
                  {secciones.map((s) => (
                    <div key={s.titulo}>
                      <p className="text-sm font-semibold text-slate-900">{s.titulo} <span className="font-normal text-slate-500">({s.ids.length})</span></p>
                      <p className="text-xs text-slate-500">{s.detalle}</p>
                      <ul className="mt-1.5 grid gap-1">
                        {s.ids.slice(0, MAX_POR_LISTA).map((id) => {
                          const n = porId.get(id)!;
                          const conCoords = n.lat !== null && n.lng !== null;
                          return (
                            <li key={id}>
                              <button
                                type="button"
                                disabled={!conCoords}
                                onClick={() => { setPiso(null); setFoco({ id, vez: Date.now() }); }}
                                className="w-full truncate rounded-md px-2 py-1 text-left text-sm text-slate-700 hover:bg-[var(--brand-primary-soft)] disabled:cursor-default disabled:hover:bg-transparent"
                                title={etiqueta(n)}
                              >
                                {n.nombre} <span className="text-xs text-slate-500">· {ETIQUETA_TIPO[n.tipo] ?? n.tipo} · P{n.piso}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      {s.ids.length > MAX_POR_LISTA ? <p className="mt-1 px-2 text-xs text-slate-500">y {s.ids.length - MAX_POR_LISTA} más…</p> : null}
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
