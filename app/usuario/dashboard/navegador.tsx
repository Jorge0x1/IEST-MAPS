"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useMemo, useRef, useState, useTransition } from "react";
import { ETIQUETA_TIPO, ListaPasos, contarPasos } from "@/app/components/pasos-ruta";
import { DetalleDestino } from "@/app/components/detalle-destino";
import { ALTURA_PANEL_MINIMO, PanelDeslizable, type EstadoPanel } from "@/app/components/panel-deslizable";
import { buscarDestinos } from "@/lib/busqueda";
import { calcularRuta, type ResultadoRuta } from "@/lib/rutas/actions";
import { puntosDeRuta } from "@/lib/rutas/mapa";
import { useEscritorio } from "@/app/components/use-escritorio";
import { MenuCuenta } from "./menu-cuenta";

// Leaflet usa `window`: solo se carga en el navegador.
const MapaLeafletRuta = dynamic(() => import("@/app/components/mapa-leaflet-ruta"), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500">Cargando mapa…</div>,
});

export type DestinoAlumno = {
  id: string;
  nombre: string;
  alias: string[];
  tipo: string;
  piso: number;
  edificioNombre: string | null;
  descripcion: string | null;
  fotoUrl: string | null;
};

export type EntradaAlumno = {
  id: string;
  nombre: string;
  edificioNombre: string | null;
};

const MAX_RESULTADOS = 8;
// Alto aproximado de la barra de búsqueda flotante, para que la ruta no quede debajo.
const MARGEN_SUPERIOR_MAPA = 72;
// Ancho de la columna de tarjetas en escritorio (368 px + 16 px de separación).
const ANCHO_COLUMNA_ESCRITORIO = 384;

function lugar(edificio: string | null, piso: number) {
  return [edificio, `Piso ${piso}`].filter(Boolean).join(" · ");
}

type OpcionOrigen = { id: string; nombre: string; detalle: string | null };
type GrupoOrigen = { etiqueta: string; opciones: OpcionOrigen[] };

// Puntos de partida: primero las entradas y luego el resto de los destinos
// buscables agrupados por edificio, para poder probar rutas entre salones.
// Cuando llegue el GPS, el origen será la posición del usuario.
function agruparOrigenes(entradas: EntradaAlumno[], destinos: DestinoAlumno[]): GrupoOrigen[] {
  const grupos: GrupoOrigen[] = [];
  if (entradas.length > 0) {
    grupos.push({
      etiqueta: "Entradas",
      opciones: entradas.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        detalle: e.edificioNombre && e.edificioNombre !== e.nombre ? e.edificioNombre : null,
      })),
    });
  }

  const idsEntrada = new Set(entradas.map((e) => e.id));
  const porEdificio = new Map<string, OpcionOrigen[]>();
  for (const d of destinos) {
    if (idsEntrada.has(d.id)) continue;
    const clave = d.edificioNombre ?? "Sin edificio";
    const lista = porEdificio.get(clave) ?? [];
    lista.push({ id: d.id, nombre: d.nombre, detalle: `Piso ${d.piso}` });
    porEdificio.set(clave, lista);
  }
  const edificios = [...porEdificio.keys()].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  for (const etiqueta of edificios) grupos.push({ etiqueta, opciones: porEdificio.get(etiqueta)! });

  return grupos;
}

export function Navegador({ destinos, entradas, nombreUsuario }: { destinos: DestinoAlumno[]; entradas: EntradaAlumno[]; nombreUsuario: string }) {
  const [consulta, setConsulta] = useState("");
  const [destino, setDestino] = useState<DestinoAlumno | null>(null);
  const [origenId, setOrigenId] = useState(entradas[0]?.id ?? "");
  const [evitarEscaleras, setEvitarEscaleras] = useState(false);
  const [ruta, setRuta] = useState<ResultadoRuta | null>(null);
  const [estadoPanel, setEstadoPanel] = useState<EstadoPanel>("medio");
  const [calculando, startTransition] = useTransition();
  const escritorio = useEscritorio();
  // Solo se muestra la respuesta de la última solicitud, aunque lleguen desordenadas.
  const solicitud = useRef(0);

  const consultaDiferida = useDeferredValue(consulta);
  const resultados = useMemo(
    () => buscarDestinos(destinos, consultaDiferida, MAX_RESULTADOS),
    [destinos, consultaDiferida],
  );

  const { puntos, omitidos } = useMemo(
    () => (ruta?.ok ? puntosDeRuta(ruta.pasos) : { puntos: [], omitidos: 0 }),
    [ruta],
  );

  const gruposOrigen = useMemo(() => agruparOrigenes(entradas, destinos), [entradas, destinos]);
  const origen = useMemo(
    () => gruposOrigen.flatMap((g) => g.opciones).find((o) => o.id === origenId) ?? null,
    [gruposOrigen, origenId],
  );
  const mismoPunto = destino !== null && destino.id === origenId;

  function elegirDestino(d: DestinoAlumno) {
    solicitud.current++;
    setDestino(d);
    setRuta(null);
    setConsulta("");
    setEstadoPanel("medio");
  }

  function volverABuscar() {
    solicitud.current++;
    setDestino(null);
    setRuta(null);
  }

  // Vuelve a las opciones (punto de partida, escaleras) sin perder el destino elegido.
  function editarRuta() {
    solicitud.current++;
    setRuta(null);
    setEstadoPanel("medio");
  }

  // Cambiar una opción invalida la ruta mostrada: se vuelve a pedir con el botón.
  function cambiarOrigen(id: string) {
    solicitud.current++;
    setOrigenId(id);
    setRuta(null);
  }

  function cambiarEscaleras(valor: boolean) {
    solicitud.current++;
    setEvitarEscaleras(valor);
    setRuta(null);
  }

  function pedirRuta(opciones = { evitarEscaleras }) {
    if (!destino || !origenId || destino.id === origenId) return;
    const numero = ++solicitud.current;
    const inicio = origenId;
    const fin = destino.id;
    startTransition(async () => {
      let resultado: ResultadoRuta;
      try {
        resultado = await calcularRuta(inicio, fin, opciones);
      } catch {
        resultado = { ok: false, motivo: "error_servidor", mensaje: "No pudimos calcular la ruta. Revisa tu conexión e intenta de nuevo." };
      }
      if (numero === solicitud.current) {
        setRuta(resultado);
        // Con ruta, el panel baja para dejar ver el mapa; con error, se queda a la vista.
        setEstadoPanel(resultado.ok ? "minimo" : "medio");
      }
    });
  }

  function verConEscaleras() {
    setEvitarEscaleras(false);
    pedirRuta({ evitarEscaleras: false });
  }

  const hayBusqueda = !destino && consultaDiferida.trim() !== "";

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-slate-100">
      {/* `isolate` encierra los z-index internos de Leaflet para que no tapen la barra ni el panel. */}
      <div className="absolute inset-0 isolate">
        {/* Móvil: la barra queda arriba y el panel abajo. Escritorio: ambos son tarjetas a la izquierda. */}
        <MapaLeafletRuta
          puntos={puntos}
          className="h-full w-full"
          margenSuperior={escritorio ? 0 : MARGEN_SUPERIOR_MAPA}
          margenInferior={!escritorio && destino ? ALTURA_PANEL_MINIMO : 0}
          margenIzquierdo={escritorio && destino ? ANCHO_COLUMNA_ESCRITORIO : 0}
          controlesZoom={escritorio}
        />
      </div>

      {/* Barra de búsqueda flotante */}
      <div className="absolute inset-x-3 top-3 z-30 mx-auto max-w-xl md:inset-x-auto md:left-4 md:top-4 md:mx-0 md:w-[368px]">
        <div className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5 shadow-lg ring-1 ring-black/5">
          {destino ? (
            <>
              <button
                type="button"
                onClick={volverABuscar}
                aria-label="Quitar destino y volver a buscar"
                className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
              </button>
              <p className="min-w-0 flex-1 truncate font-semibold text-slate-900">{destino.nombre}</p>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                autoComplete="off"
                aria-label="Busca un salón, oficina o servicio"
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                placeholder="Busca un salón, oficina o servicio"
                className="min-w-0 flex-1 bg-transparent py-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </>
          )}
          <MenuCuenta nombre={nombreUsuario} />
        </div>

        {!destino && destinos.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-lg ring-1 ring-black/5">Todavía no hay destinos registrados en el mapa del campus.</p>
        ) : null}

        {hayBusqueda ? (
          <div className="mt-2 max-h-[60dvh] overflow-y-auto rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
            {resultados.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No encontramos “{consultaDiferida.trim()}”. Prueba con otro nombre o número.</p>
            ) : (
              <ul aria-label="Resultados de búsqueda" className="divide-y divide-[var(--border)]">
                {resultados.map((d) => (
                  <li key={d.id}>
                    <button type="button" onClick={() => elegirDestino(d)} className="block w-full px-4 py-3 text-left hover:bg-[var(--brand-primary-soft)]">
                      <span className="block font-semibold text-slate-900">{d.nombre}</span>
                      <span className="block text-sm text-slate-500">{ETIQUETA_TIPO[d.tipo] ?? d.tipo} · {lugar(d.edificioNombre, d.piso)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {/* Panel inferior con el destino, las opciones y los pasos */}
      {destino ? (
        <PanelDeslizable
          etiqueta={`Destino: ${destino.nombre}`}
          estado={estadoPanel}
          onCambiarEstado={setEstadoPanel}
          cabecera={
            <div aria-live="polite">
              <h2 className="text-xl font-bold leading-tight text-slate-950">{destino.nombre}</h2>
              <p className="mt-0.5 text-sm text-slate-600">{ETIQUETA_TIPO[destino.tipo] ?? destino.tipo} · {lugar(destino.edificioNombre, destino.piso)}</p>
              {ruta?.ok ? (
                <p className="mt-2 text-sm font-semibold text-[var(--brand-primary-active)]">
                  {contarPasos(ruta.pasos)} pasos · Desde {origen?.nombre ?? "el punto de partida"}{evitarEscaleras ? " · sin escaleras" : ""}
                </p>
              ) : origen && !mismoPunto ? (
                <button
                  type="button"
                  onClick={() => pedirRuta()}
                  disabled={calculando}
                  className="mt-3 w-full rounded-xl bg-[var(--brand-primary)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--brand-primary-hover)] disabled:cursor-wait disabled:opacity-70"
                >
                  {calculando ? "Calculando…" : "Iniciar ruta"}
                </button>
              ) : null}
            </div>
          }
        >
          {ruta && ruta.ok ? (
            <div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">Mapa de prueba</span>
                <span>
                  {omitidos > 0
                    ? `${omitidos === 1 ? "1 paso sin ubicación no aparece" : `${omitidos} pasos sin ubicación no aparecen`} en el mapa`
                    : "Los números coinciden con el mapa"}
                </span>
              </div>
              <ListaPasos pasos={ruta.pasos} />
              {destino.fotoUrl || destino.descripcion ? (
                <div className="mt-5">
                  <DetalleDestino nombre={destino.nombre} descripcion={destino.descripcion} fotoUrl={destino.fotoUrl} titulo="Así reconocerás tu destino" />
                </div>
              ) : null}
              <div className="mt-5 grid gap-2">
                <button type="button" onClick={editarRuta} className="rounded-xl border border-[var(--border-strong)] bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                  Cambiar punto de partida u opciones
                </button>
                <button type="button" onClick={volverABuscar} className="rounded-xl px-5 py-3 font-semibold text-[var(--brand-primary-active)] hover:bg-[var(--brand-primary-soft)]">
                  Cancelar ruta
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <DetalleDestino nombre={destino.nombre} descripcion={destino.descripcion} fotoUrl={destino.fotoUrl} />
              {destino.alias.length > 0 ? <p className="text-sm text-slate-500">También conocido como: {destino.alias.join(", ")}</p> : null}

              {gruposOrigen.length === 0 ? (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Aún no hay puntos registrados en el mapa, así que no se puede calcular una ruta.</p>
              ) : (
                <>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                    Sales de
                    <select
                      value={origenId}
                      onChange={(e) => cambiarOrigen(e.target.value)}
                      className="rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-base font-normal text-slate-900"
                    >
                      {origen ? null : <option value="" disabled>Elige desde dónde sales</option>}
                      {gruposOrigen.map((g) => (
                        <optgroup key={g.etiqueta} label={g.etiqueta}>
                          {g.opciones.map((o) => (
                            <option key={o.id} value={o.id}>{o.detalle ? `${o.nombre} · ${o.detalle}` : o.nombre}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <span className="text-xs font-normal text-slate-500">Puede ser una entrada o cualquier salón, oficina o servicio.</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={evitarEscaleras} onChange={(e) => cambiarEscaleras(e.target.checked)} className="h-4 w-4 accent-[var(--brand-primary)]" />
                    Evitar escaleras (usar elevadores)
                  </label>

                  {mismoPunto ? <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">Ya estás en {destino.nombre}: el punto de partida es tu destino.</p> : null}
                </>
              )}

              {ruta && !ruta.ok ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
                  <p className="font-medium text-amber-900">No pudimos calcular tu ruta</p>
                  <p className="mt-1 text-sm text-amber-800">{ruta.mensaje}</p>
                  {ruta.motivo === "bloqueado_por_escaleras" ? (
                    <button type="button" onClick={verConEscaleras} className="mt-3 text-sm font-semibold text-sky-700 underline-offset-2 hover:underline">
                      Ver ruta con escaleras
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </PanelDeslizable>
      ) : null}
    </main>
  );
}
