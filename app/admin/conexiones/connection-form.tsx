"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { actualizarConexion, crearConexion, type EstadoConexion } from "./actions";
import { distanciaMetros } from "../components/geo";

const estadoInicial: EstadoConexion = { ok: false, mensaje: "" };

export type NodoOpcion = {
  id: string;
  nombre: string;
  tipo: string;
  piso: number;
  lat: number | null;
  lng: number | null;
  edificios: { nombre: string } | null;
};

export type ConexionInicial = {
  id: string;
  nodo_origen_id: string;
  nodo_destino_id: string;
  costo: number | null;
  bidireccional: boolean;
};

const etiquetasTipo: Record<string, string> = {
  entrada: "Entrada", pasillo: "Pasillo", salon: "Salón", oficina: "Oficina",
  bano: "Baño", escalera: "Escalera", elevador: "Elevador", servicio: "Servicio", edificio: "Edificio",
};

function agruparPorEdificio(nodos: NodoOpcion[]) {
  const grupos = new Map<string, NodoOpcion[]>();
  for (const nodo of nodos) {
    const etiqueta = nodo.edificios?.nombre ?? "Sin edificio";
    grupos.set(etiqueta, [...(grupos.get(etiqueta) ?? []), nodo]);
  }
  return [...grupos.entries()];
}

export function ConnectionForm({ nodos, conexion }: { nodos: NodoOpcion[]; conexion?: ConexionInicial }) {
  const action = conexion ? actualizarConexion.bind(null, conexion.id) : crearConexion;
  const [estado, formAction, pendiente] = useActionState(action, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);
  const costoInputRef = useRef<HTMLInputElement>(null);
  // En edición no queremos pisar un costo ya guardado apenas se monta el
  // formulario; solo se recalcula si el admin cambia el origen o destino.
  const costoTocadoRef = useRef(Boolean(conexion));

  const [origenId, setOrigenId] = useState(conexion?.nodo_origen_id ?? "");
  const [destinoId, setDestinoId] = useState(conexion?.nodo_destino_id ?? "");

  const grupos = agruparPorEdificio(nodos);
  const nodosPorId = useMemo(() => new Map(nodos.map((nodo) => [nodo.id, nodo])), [nodos]);

  // Tras crear una conexión se limpian los selects. Se ajusta el estado durante
  // el render al detectar un resultado nuevo (patrón recomendado por React) en
  // vez de hacerlo dentro de un efecto.
  const [estadoPrevio, setEstadoPrevio] = useState(estado);
  if (estado !== estadoPrevio) {
    setEstadoPrevio(estado);
    if (estado.ok && !conexion) {
      setOrigenId("");
      setDestinoId("");
    }
  }

  useEffect(() => {
    if (estado.ok && !conexion) {
      formRef.current?.reset();
      costoTocadoRef.current = false;
    }
  }, [estado, conexion]);

  useEffect(() => {
    if (costoTocadoRef.current) return;
    const origen = nodosPorId.get(origenId);
    const destino = nodosPorId.get(destinoId);
    if (!origen || !destino || origen.lat === null || origen.lng === null || destino.lat === null || destino.lng === null) {
      return;
    }
    const distancia = distanciaMetros(origen.lat, origen.lng, destino.lat, destino.lng);
    if (costoInputRef.current) {
      costoInputRef.current.value = distancia.toFixed(2);
    }
  }, [origenId, destinoId, nodosPorId]);

  const campoSelect = "rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950";
  const hayCoordenadas =
    nodosPorId.get(origenId)?.lat != null &&
    nodosPorId.get(origenId)?.lng != null &&
    nodosPorId.get(destinoId)?.lat != null &&
    nodosPorId.get(destinoId)?.lng != null;

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">
          Nodo de origen
          <select
            name="nodo_origen_id"
            required
            value={origenId}
            onChange={(evento) => setOrigenId(evento.target.value)}
            className={campoSelect}
          >
            <option value="" disabled>Selecciona un nodo</option>
            {grupos.map(([edificio, opciones]) => (
              <optgroup key={edificio} label={edificio}>
                {opciones.map((nodo) => (
                  <option key={nodo.id} value={nodo.id}>
                    {nodo.nombre} · {etiquetasTipo[nodo.tipo] ?? nodo.tipo} · Piso {nodo.piso}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">
          Nodo de destino
          <select
            name="nodo_destino_id"
            required
            value={destinoId}
            onChange={(evento) => setDestinoId(evento.target.value)}
            className={campoSelect}
          >
            <option value="" disabled>Selecciona un nodo</option>
            {grupos.map(([edificio, opciones]) => (
              <optgroup key={edificio} label={edificio}>
                {opciones.map((nodo) => (
                  <option key={nodo.id} value={nodo.id}>
                    {nodo.nombre} · {etiquetasTipo[nodo.tipo] ?? nodo.tipo} · Piso {nodo.piso}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Costo (opcional)
        <input
          ref={costoInputRef}
          name="costo"
          type="number"
          min={0}
          step="any"
          defaultValue={conexion?.costo ?? ""}
          onChange={() => {
            costoTocadoRef.current = true;
          }}
          placeholder="Distancia, tiempo o peso manual"
          className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-950"
        />
        <span className="text-xs font-normal text-slate-500">
          {hayCoordenadas
            ? "Se sugirió la distancia real en metros entre ambos nodos; puedes cambiarla."
            : "Sin coordenadas en alguno de los dos nodos no se puede sugerir la distancia."}
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <input name="bidireccional" type="checkbox" defaultChecked={conexion?.bidireccional ?? true} className="mt-0.5 size-4 accent-sky-700" />
        <span>
          <strong className="block font-semibold text-slate-900">Bidireccional</strong>
          Se puede recorrer en ambos sentidos. Desactívalo para una conexión de un solo sentido.
        </span>
      </label>

      <div className="flex items-center justify-between gap-4">
        {estado.mensaje ? <p role="status" className={`text-sm ${estado.ok ? "text-emerald-700" : "text-red-700"}`}>{estado.mensaje}</p> : <span />}
        <button disabled={pendiente || nodos.length < 2} className="rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:bg-slate-300">
          {pendiente ? "Guardando…" : conexion ? "Guardar cambios" : "Crear conexión"}
        </button>
      </div>
    </form>
  );
}
