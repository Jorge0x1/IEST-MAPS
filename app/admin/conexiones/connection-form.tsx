"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { actualizarConexion, crearConexion, type EstadoConexion } from "./actions";
import styles from "./conexiones.module.css";

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

  useEffect(() => {
    if (estado.ok && !conexion) {
      formRef.current?.reset();
      setOrigenId("");
      setDestinoId("");
      costoTocadoRef.current = false;
    }
  }, [estado.ok, conexion]);

  return (
    <form ref={formRef} action={formAction} className={styles.connectionForm}>
      <div className={styles.nodeSelectors}>
        <label className={styles.field}>
          <span>Nodo de origen</span>
          <select
            name="nodo_origen_id"
            required
            defaultValue={conexion?.nodo_origen_id ?? ""}
            className={styles.control}
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

        <div className={styles.selectorLink} aria-hidden="true">
          <span />
          <span />
        </div>

        <label className={styles.field}>
          <span>Nodo de destino</span>
          <select
            name="nodo_destino_id"
            required
            defaultValue={conexion?.nodo_destino_id ?? ""}
            className={styles.control}
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

      <div className={styles.connectionSettings}>
        <label className={styles.field}>
          <span>Costo (opcional)</span>
          <input
            name="costo"
            type="number"
            min={0}
            step="any"
            defaultValue={conexion?.costo ?? ""}
            placeholder="Distancia, tiempo o peso manual"
            className={styles.control}
          />
        </label>
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

        <label className={styles.directionOption}>
          <input
            name="bidireccional"
            type="checkbox"
            defaultChecked={conexion?.bidireccional ?? true}
            className={styles.checkbox}
          />
          <span>
            <strong>Bidireccional</strong>
            Se puede recorrer en ambos sentidos. Desactívalo para una conexión de un solo sentido.
          </span>
        </label>
      </div>

      <div className={styles.formFooter}>
        {estado.mensaje ? (
          <p role="status" className={`${styles.formMessage} ${estado.ok ? styles.formMessageSuccess : ""}`}>
            {estado.mensaje}
          </p>
        ) : <span className={styles.formSpacer} />}
        <button disabled={pendiente || nodos.length < 2} className={styles.primaryButton}>
          {pendiente ? "Guardando…" : conexion ? "Guardar cambios" : "Crear conexión"}
        </button>
      </div>
    </form>
  );
}
