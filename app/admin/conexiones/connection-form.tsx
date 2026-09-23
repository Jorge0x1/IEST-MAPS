"use client";

import { useActionState, useEffect, useRef } from "react";
import { actualizarConexion, crearConexion, type EstadoConexion } from "./actions";
import styles from "./conexiones.module.css";

const estadoInicial: EstadoConexion = { ok: false, mensaje: "" };

export type NodoOpcion = {
  id: string;
  nombre: string;
  tipo: string;
  piso: number;
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
  const grupos = agruparPorEdificio(nodos);

  useEffect(() => {
    if (estado.ok && !conexion) formRef.current?.reset();
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
