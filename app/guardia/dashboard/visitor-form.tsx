"use client";

import { useActionState, useEffect, useRef } from "react";
import { registrarVisita, type EstadoRegistroVisita } from "./actions";
import { VisitorPass } from "./visitor-pass";

const estadoInicial: EstadoRegistroVisita = { ok: false, mensaje: "" };

export type NodoDestino = {
  id: string;
  nombre: string;
  piso: number;
  edificios: { nombre: string } | null;
};

export type NodoOrigen = {
  id: string;
  nombre: string;
  edificios: { nombre: string } | null;
};

function agruparPorEdificio<T extends { edificios: { nombre: string } | null }>(nodos: T[]) {
  const grupos = new Map<string, T[]>();
  for (const nodo of nodos) {
    const etiqueta = nodo.edificios?.nombre ?? "Sin edificio";
    grupos.set(etiqueta, [...(grupos.get(etiqueta) ?? []), nodo]);
  }
  return [...grupos.entries()];
}

export function VisitorForm({
  destinos,
  entradas,
}: {
  destinos: NodoDestino[];
  entradas: NodoOrigen[];
}) {
  const [estado, action, pendiente] = useActionState(registrarVisita, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado.ok]);

  const campo =
    "rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-950 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100";

  const gruposDestino = agruparPorEdificio(destinos);
  const gruposEntrada = agruparPorEdificio(entradas);
  const sinOpciones = destinos.length === 0 || entradas.length === 0;

  return (
    <div>
      <form ref={formRef} action={action} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Nombre del visitante
          <input name="nombre" required minLength={2} maxLength={120} className={campo} />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Teléfono
          <input
            name="telefono"
            type="tel"
            maxLength={20}
            placeholder="Opcional"
            className={campo}
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Entrada de acceso
          <select name="origen_nodo_id" required defaultValue="" className={`${campo} bg-white`}>
            <option value="" disabled>
              Selecciona la entrada
            </option>
            {gruposEntrada.map(([edificio, nodos]) => (
              <optgroup key={edificio} label={edificio}>
                {nodos.map((nodo) => (
                  <option key={nodo.id} value={nodo.id}>
                    {nodo.nombre}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Destino
          <select name="destino_nodo_id" required defaultValue="" className={`${campo} bg-white`}>
            <option value="" disabled>
              Selecciona un destino
            </option>
            {gruposDestino.map(([edificio, nodos]) => (
              <optgroup key={edificio} label={edificio}>
                {nodos.map((nodo) => (
                  <option key={nodo.id} value={nodo.id}>
                    {nodo.nombre} · Piso {nodo.piso}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Motivo
          <textarea
            name="motivo"
            required
            minLength={3}
            maxLength={300}
            rows={3}
            className={`${campo} resize-none`}
          />
        </label>

        <button
          disabled={pendiente || sinOpciones}
          className="rounded-lg bg-sky-700 px-5 py-2.5 font-semibold text-white hover:bg-sky-800 disabled:bg-slate-300"
        >
          {pendiente ? "Registrando…" : "Registrar visita"}
        </button>

        {sinOpciones ? (
          <p className="text-sm text-amber-700">
            Un administrador debe registrar al menos un destino buscable y una entrada.
          </p>
        ) : null}
        {estado.mensaje ? (
          <p
            role="status"
            className={`text-sm ${estado.ok ? "text-emerald-700" : "text-red-700"}`}
          >
            {estado.mensaje}
          </p>
        ) : null}
      </form>

      {estado.pase ? <VisitorPass key={estado.pase.acceso} pase={estado.pase} /> : null}
    </div>
  );
}
