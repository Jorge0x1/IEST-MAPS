"use client";

import { useDeferredValue, useId, useMemo, useRef, useState, useTransition } from "react";
import { ETIQUETA_TIPO, ListaPasos } from "@/app/components/pasos-ruta";
import { buscarDestinos } from "@/lib/busqueda";
import { calcularRuta, type ResultadoRuta } from "@/lib/rutas/actions";

export type DestinoAlumno = {
  id: string;
  nombre: string;
  alias: string[];
  tipo: string;
  piso: number;
  edificioNombre: string | null;
};

export type EntradaAlumno = {
  id: string;
  nombre: string;
  edificioNombre: string | null;
};

const MAX_RESULTADOS = 8;

function lugar(edificio: string | null, piso: number) {
  return [edificio, `Piso ${piso}`].filter(Boolean).join(" · ");
}

export function Navegador({ destinos, entradas }: { destinos: DestinoAlumno[]; entradas: EntradaAlumno[] }) {
  const [consulta, setConsulta] = useState("");
  const [destino, setDestino] = useState<DestinoAlumno | null>(null);
  const [entradaId, setEntradaId] = useState(entradas[0]?.id ?? "");
  const [evitarEscaleras, setEvitarEscaleras] = useState(false);
  const [ruta, setRuta] = useState<ResultadoRuta | null>(null);
  const [calculando, startTransition] = useTransition();
  // Solo se muestra la respuesta de la última solicitud, aunque lleguen desordenadas.
  const solicitud = useRef(0);
  const idBusqueda = useId();

  const consultaDiferida = useDeferredValue(consulta);
  const resultados = useMemo(
    () => buscarDestinos(destinos, consultaDiferida, MAX_RESULTADOS),
    [destinos, consultaDiferida],
  );

  const entrada = entradas.find((e) => e.id === entradaId) ?? null;
  const mismoPunto = destino !== null && destino.id === entradaId;

  function elegirDestino(d: DestinoAlumno) {
    setDestino(d);
    setRuta(null);
  }

  function volverABuscar() {
    solicitud.current++;
    setDestino(null);
    setRuta(null);
  }

  // Cambiar una opción invalida la ruta mostrada: se vuelve a pedir con el botón.
  function cambiarEntrada(id: string) {
    solicitud.current++;
    setEntradaId(id);
    setRuta(null);
  }

  function cambiarEscaleras(valor: boolean) {
    solicitud.current++;
    setEvitarEscaleras(valor);
    setRuta(null);
  }

  function pedirRuta(opciones = { evitarEscaleras }) {
    if (!destino || !entradaId || destino.id === entradaId) return;
    const numero = ++solicitud.current;
    const origen = entradaId;
    const fin = destino.id;
    startTransition(async () => {
      let resultado: ResultadoRuta;
      try {
        resultado = await calcularRuta(origen, fin, opciones);
      } catch {
        resultado = { ok: false, motivo: "error_servidor", mensaje: "No pudimos calcular la ruta. Revisa tu conexión e intenta de nuevo." };
      }
      if (numero === solicitud.current) setRuta(resultado);
    });
  }

  function verConEscaleras() {
    setEvitarEscaleras(false);
    pedirRuta({ evitarEscaleras: false });
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand-primary)]">IEST-MAPS</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-950">¿A dónde vas?</h1>

      {!destino ? (
        <section className="mt-6">
          <label htmlFor={idBusqueda} className="text-sm font-semibold text-slate-700">Busca un salón, oficina o servicio</label>
          <input
            id={idBusqueda}
            type="search"
            autoComplete="off"
            autoFocus
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Ej. salón 604, biblioteca, servicios escolares"
            className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-white px-4 py-3 text-base text-slate-900 shadow-sm placeholder:text-slate-400"
          />

          {destinos.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Todavía no hay destinos registrados en el mapa del campus.</p>
          ) : consultaDiferida.trim() === "" ? (
            <p className="mt-4 text-sm text-slate-500">Escribe el nombre o un alias del lugar; no importan los acentos.</p>
          ) : resultados.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No encontramos “{consultaDiferida.trim()}”. Prueba con otro nombre o número.</p>
          ) : (
            <ul className="mt-4 grid gap-2" aria-label="Resultados de búsqueda">
              {resultados.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => elegirDestino(d)}
                    className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-left shadow-sm transition hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)]"
                  >
                    <span className="block font-semibold text-slate-900">{d.nombre}</span>
                    <span className="block text-sm text-slate-500">{ETIQUETA_TIPO[d.tipo] ?? d.tipo} · {lugar(d.edificioNombre, d.piso)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="mt-6 grid gap-5">
          <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Destino</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">{destino.nombre}</h2>
                <p className="text-sm text-slate-600">{ETIQUETA_TIPO[destino.tipo] ?? destino.tipo} · {lugar(destino.edificioNombre, destino.piso)}</p>
                {destino.alias.length > 0 ? (
                  <p className="mt-2 text-sm text-slate-500">También conocido como: {destino.alias.join(", ")}</p>
                ) : null}
              </div>
              <button type="button" onClick={volverABuscar} className="shrink-0 text-sm font-semibold text-[var(--brand-primary-active)] underline-offset-2 hover:underline">
                Cambiar
              </button>
            </div>

            {entradas.length === 0 ? (
              <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Aún no hay entradas registradas en el mapa, así que no se puede calcular una ruta.</p>
            ) : (
              <div className="mt-5 grid gap-4">
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Entras por
                  <select
                    value={entradaId}
                    onChange={(e) => cambiarEntrada(e.target.value)}
                    className="rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-base font-normal text-slate-900"
                  >
                    {entradas.map((e) => (
                      <option key={e.id} value={e.id}>{e.nombre}{e.edificioNombre && e.edificioNombre !== e.nombre ? ` · ${e.edificioNombre}` : ""}</option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={evitarEscaleras} onChange={(e) => cambiarEscaleras(e.target.checked)} className="h-4 w-4 accent-[var(--brand-primary)]" />
                  Evitar escaleras (usar elevadores)
                </label>

                {mismoPunto ? (
                  <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">Ya estás en {destino.nombre}: la entrada elegida es tu destino.</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => pedirRuta()}
                    disabled={calculando}
                    className="rounded-xl bg-[var(--brand-primary)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--brand-primary-hover)] disabled:cursor-wait disabled:opacity-70"
                  >
                    {calculando ? "Calculando…" : ruta ? "Recalcular ruta" : "Iniciar ruta"}
                  </button>
                )}
              </div>
            )}
          </div>

          {ruta && !ruta.ok ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5" role="alert">
              <p className="font-medium text-amber-900">No pudimos calcular tu ruta</p>
              <p className="mt-1 text-sm text-amber-800">{ruta.mensaje}</p>
              {ruta.motivo === "bloqueado_por_escaleras" ? (
                <button type="button" onClick={verConEscaleras} className="mt-3 text-sm font-semibold text-sky-700 underline-offset-2 hover:underline">
                  Ver ruta con escaleras
                </button>
              ) : null}
            </div>
          ) : null}

          {ruta && ruta.ok ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5" aria-live="polite">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium text-slate-800">
                  Desde {entrada?.nombre ?? "la entrada"}{evitarEscaleras ? " · sin escaleras" : ""}
                </p>
                <p className="text-sm text-slate-500">{ruta.pasos.length} pasos</p>
              </div>
              <ListaPasos pasos={ruta.pasos} />
              <button type="button" onClick={volverABuscar} className="mt-5 w-full rounded-xl border border-[var(--border-strong)] bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                Cancelar ruta
              </button>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
